import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, MapPin, MessageCircle, Users } from 'lucide-react'
import { DisplayText } from '@/components/comic/ComicPrimitives'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { cn } from '@/lib/utils'
import { SessionPicker } from '@/components/events/SessionPicker'
import { registrationState } from '@/lib/api/events'
import { getStudentRegistrations, cancelRegistration, changeSession, type MyRegistration } from '@/lib/api/registration'
import { chosenSlot, formatDateTime, formatDay, hasSessions, isPostponed, sessionLabel, slotDate, slotLabel } from '@/lib/eventDisplay'

type Filter = 'active' | 'cancelled'

/** The slot this registration is in: its chosen session, else the event's first slot. */
function slotOf(reg: MyRegistration) {
  return chosenSlot(reg.event, reg.slot_id) ?? reg.event?.schedule_slots?.[0]
}

/** When the event starts, for ordering. Events with no date yet go last. */
function startTime(reg: MyRegistration): number {
  const slot = slotOf(reg)
  if (slot?.starts_at) return new Date(slot.starts_at).getTime()
  const day = slotDate(slot)
  return day ? new Date(`${day}T00:00:00+05:30`).getTime() : Infinity
}

/** Ids of confirmed registrations whose timed slots overlap another confirmed registration's. */
function findClashes(registrations: MyRegistration[]): Set<string> {
  const timed = registrations
    .filter((r) => r.registration_status === 'confirmed')
    .map((r) => ({ id: r.id, slot: slotOf(r) }))
    .filter((x) => x.slot?.starts_at && x.slot?.ends_at && x.slot.status !== 'cancelled' && x.slot.status !== 'rescheduled')
    .map((x) => ({ id: x.id, start: new Date(x.slot!.starts_at!).getTime(), end: new Date(x.slot!.ends_at!).getTime() }))
  const clashes = new Set<string>()
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (timed[i].start < timed[j].end && timed[j].start < timed[i].end) {
        clashes.add(timed[i].id)
        clashes.add(timed[j].id)
      }
    }
  }
  return clashes
}

export default function MyEventsPage() {
  const [filter, setFilter] = useState<Filter>('active')
  const queryClient = useQueryClient()

  const { data: registrations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: getStudentRegistrations,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelRegistration(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message)
        queryClient.invalidateQueries()
      } else {
        toast.error(res.message)
      }
    },
  })

  const clashes = findClashes(registrations)
  const filtered = registrations
    .filter((r) => (filter === 'active' ? r.registration_status !== 'cancelled' : r.registration_status === 'cancelled'))
    .sort((a, b) => startTime(a) - startTime(b))

  return (
    <div className="mx-auto max-w-[800px] px-4 py-6 space-y-6">
      <div>
        <DisplayText as="h1" className="text-4xl">My events</DisplayText>
        <p className="text-ink/60 text-sm mt-1">Everything you're registered for, in the order it happens, including teams others added you to.</p>
      </div>

      <div role="group" aria-label="Filter registrations" className="flex gap-2">
        {(['active', 'cancelled'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              'px-4 py-1.5 rounded-full border-2 border-ink text-sm font-semibold transition-colors capitalize',
              filter === f ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-gutter'
            )}
          >
            {f === 'active' ? 'Registered' : 'Cancelled'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : isError ? (
        <ErrorState description="Could not load your registrations." retry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <div className="comic-card p-12 text-center">
          <p className="font-display text-2xl text-ink mb-2">{filter === 'active' ? 'No events yet' : 'Nothing cancelled'}</p>
          {filter === 'active' && (
            <>
              <p className="text-ink/60 text-sm mb-6">Every student takes part in at least one Blossoms event.</p>
              <Button asChild>
                <Link to="/events">Find an event</Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Your registrations">
          {filtered.map((reg) => (
            <RegistrationCard key={reg.id} reg={reg} clash={clashes.has(reg.id)} onCancel={() => cancelMutation.mutate(reg.id)} cancelling={cancelMutation.isPending} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RegistrationCard({ reg, clash, onCancel, cancelling }: { reg: MyRegistration; clash: boolean; onCancel: () => void; cancelling: boolean }) {
  const queryClient = useQueryClient()
  const multi = hasSessions(reg.event)
  const chosen = chosenSlot(reg.event, reg.slot_id)
  const slot = slotOf(reg)
  const active = reg.registration_status !== 'cancelled'
  const canCancel = active && (!reg.team || reg.team.is_leader)
  const canSwitch = multi && active && (!reg.team || reg.team.is_leader) && Boolean(reg.event && registrationState(reg.event).open)

  const switchSession = useMutation({
    mutationFn: (slotId: string) => changeSession(reg.id, slotId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message)
        queryClient.invalidateQueries()
      } else {
        toast.error(res.message)
      }
    },
  })

  return (
    <li className="comic-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <Badge variant="outline">{reg.event?.category?.name ?? 'Event'}</Badge>
          <h2 className="font-display text-2xl text-ink mt-2">{reg.event?.title ?? 'Event'}</h2>
          <p className="text-sm text-ink/70 mt-1">{multi && !chosen && !isPostponed(slot) ? formatDay(slotDate(slot)) : slotLabel(slot)}</p>
          {multi && (
            <p className={cn('text-sm font-bold', chosen ? 'text-ink' : 'text-comic-red-deep')}>
              {chosen ? sessionLabel(chosen) : 'Session not chosen yet'}
            </p>
          )}
          {slot?.venue && (
            <p className="text-sm text-ink/70 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {slot.venue.name}
            </p>
          )}
          <p className="text-xs text-ink/40 mt-1">Registered {formatDateTime(reg.registered_at)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={reg.registration_status === 'confirmed' ? 'registered' : reg.registration_status === 'waitlisted' ? 'waitlist' : 'cancelled'}>
            {reg.registration_status === 'confirmed' ? 'Confirmed' : reg.registration_status === 'waitlisted' ? 'Waitlisted' : 'Cancelled'}
          </Badge>
          {clash && (
            <Badge variant="red">
              <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" /> Clashes with another event
            </Badge>
          )}
          {reg.attendance_status && (
            <Badge variant={reg.attendance_status === 'present' ? 'green' : 'red'}>
              {reg.attendance_status === 'present' ? 'Attended' : 'Marked absent'}
            </Badge>
          )}
        </div>
      </div>

      {reg.team && (
        <div className="mb-3 rounded-xl border-2 border-ink/20 bg-paper p-3">
          <p className="text-sm font-bold text-ink flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" aria-hidden="true" /> Team {reg.team.team_name}
          </p>
          <ul className="mt-1.5 grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-ink/80">
            {reg.team.members.map((m) => (
              <li key={m.register_number}>
                {m.full_name} <span className="text-ink/50 tabular-nums">· {m.register_number}</span>
                {m.is_leader && <span className="ml-1 font-bold text-primary">(leader)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canSwitch && reg.event && (
        <div className="mb-3">
          <SessionPicker
            slots={reg.event.schedule_slots ?? []}
            value={chosen?.id ?? null}
            onChange={(id) => id !== chosen?.id && switchSession.mutate(id)}
            label={chosen ? (reg.team ? 'Switch your team’s session' : 'Switch session') : 'Pick your session'}
            disabled={switchSession.isPending}
          />
        </div>
      )}
      {multi && active && !canSwitch && reg.team && !reg.team.is_leader && (
        <p className="mb-3 text-xs text-ink/50">Your team leader picks the team’s session.</p>
      )}

      <div className="flex gap-2 flex-wrap pt-2 border-t border-ink/10">
        {active && reg.whatsapp_group_url && (
          <Button size="sm" variant="secondary" asChild>
            <a href={reg.whatsapp_group_url} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" /> Join WhatsApp group
            </a>
          </Button>
        )}
        {reg.event?.slug && (
          <Button size="sm" variant="outline" asChild>
            <Link to={`/events/${reg.event.slug}`}>Event page</Link>
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="ghost"
            className="text-comic-red-deep"
            isLoading={cancelling}
            onClick={() => {
              const msg = reg.team ? `Withdraw team ${reg.team.team_name} from ${reg.event?.title}? Every member is removed.` : `Cancel your registration for ${reg.event?.title}?`
              void confirmDialog(msg, { danger: true, title: reg.team ? 'Withdraw team' : 'Cancel registration', confirmLabel: reg.team ? 'Withdraw team' : 'Cancel registration', cancelLabel: 'Keep it' }).then((ok) => ok && onCancel())
            }}
          >
            {reg.team ? 'Withdraw team' : 'Cancel registration'}
          </Button>
        )}
        {active && reg.team && !reg.team.is_leader && (
          <p className="text-xs text-ink/50 self-center">Only your team leader can withdraw this entry.</p>
        )}
      </div>
    </li>
  )
}
