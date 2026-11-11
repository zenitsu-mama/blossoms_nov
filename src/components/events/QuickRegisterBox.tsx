import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, Info, LogIn, MessageCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SessionPicker } from '@/components/events/SessionPicker'
import { TeamRegistrationModal } from '@/components/events/TeamRegistrationModal'
import { useAuth } from '@/lib/auth/authStore'
import { registrationState } from '@/lib/api/events'
import { changeSession, getStudentRegistrations, registerIndividualEvent } from '@/lib/api/registration'
import { chosenSlot, hasSessions, sessionLabel } from '@/lib/eventDisplay'
import type { Event } from '@/types'

/** Register box inside the event popup: sign-in prompt, solo register, team builder, or "you're in". */
export function QuickRegisterBox({ event }: { event: Event }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [teamOpen, setTeamOpen] = useState(false)
  const [slotId, setSlotId] = useState<string | null>(null)
  const multi = hasSessions(event)
  const reg = registrationState(event)
  // Where to come back to after signing in or completing the profile
  const returnTo = `/events?event=${event.slug}`

  const { data: mine = [] } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: getStudentRegistrations,
    enabled: Boolean(auth.student),
  })
  const existing = mine.find((r) => r.event_id === event.id && r.registration_status !== 'cancelled')

  const goToProfile = () => navigate(`/app/profile?next=${encodeURIComponent(returnTo)}`)

  const register = useMutation({
    mutationFn: () => registerIndividualEvent(event.id, slotId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message)
        queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      } else if (res.error_code === 'PROFILE_INCOMPLETE') {
        toast.error(res.message)
        goToProfile()
      } else {
        toast.error(res.message)
      }
    },
  })

  const switchSession = useMutation({
    mutationFn: (to: string) => changeSession(existing!.id, to),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message)
        queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      } else {
        toast.error(res.message)
      }
    },
  })

  function needsPhone(): boolean {
    if (auth.student?.profileComplete) return false
    toast('Add your phone number first. Event heads use it to reach you.', { icon: '📱' })
    goToProfile()
    return true
  }

  /** Blocks registering until a session is picked, for events held more than once. */
  function needsSession(): boolean {
    if (!multi || slotId) return false
    toast.error('Pick a session first.')
    return true
  }

  const box = 'bg-blossoms-yellow/40 border-2 border-ink rounded-xl p-3 shadow-[2px_2px_0px_var(--color-ink)] mb-4'
  const canSolo = event.event_format !== 'team'
  const canTeam = event.event_format !== 'individual'

  if (event.is_mandatory) {
    return (
      <div className={box}>
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Info className="w-4 h-4 text-primary" aria-hidden="true" /> Mandatory for every student
        </p>
        <p className="text-xs text-ink/70 mt-1">No registration needed. Just turn up at the time and venue shown; attendance is taken there.</p>
      </div>
    )
  }

  if (event.registration_enabled === false) return null

  if (!reg.open && !existing) {
    return (
      <div className={box}>
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Info className="w-4 h-4 text-primary" aria-hidden="true" /> {reg.label}
        </p>
      </div>
    )
  }

  if (!auth.student) {
    return (
      <div className={`${box} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <p className="text-sm font-semibold text-ink">Sign in with your register number to register.</p>
        <Button size="sm" asChild className="font-display uppercase tracking-wider">
          <Link to={`/login?role=student&redirect=${encodeURIComponent(returnTo)}`}>
            <LogIn className="w-4 h-4" /> Sign in
          </Link>
        </Button>
      </div>
    )
  }

  if (existing) {
    const current = chosenSlot(event, existing.slot_id)
    // Solo entrants and team leaders can move to the other session while registration is open.
    const canSwitch = multi && reg.open && (!existing.team || existing.team.is_leader)
    return (
      <div className={`${box} flex flex-wrap items-center justify-between gap-2`}>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <CheckCircle2 className="w-4 h-4 text-blossoms-green" aria-hidden="true" />
            {existing.team ? `Registered with team ${existing.team.team_name}` : 'You are registered'}
          </p>
          {multi && (
            <p className={current ? 'text-xs font-semibold text-ink/70 ml-5' : 'text-xs font-bold text-comic-red-deep ml-5'}>
              {current ? sessionLabel(current) : 'Pick a session below'}
            </p>
          )}
        </div>
        {canSwitch && (
          <div className="basis-full">
            <SessionPicker
              slots={event.schedule_slots ?? []}
              value={current?.id ?? null}
              onChange={(id) => id !== current?.id && switchSession.mutate(id)}
              label={existing.team ? 'Your team’s session (tap to switch)' : 'Your session (tap to switch)'}
              disabled={switchSession.isPending}
            />
          </div>
        )}
        <div className="flex gap-2">
          {existing.whatsapp_group_url && (
            <Button size="sm" variant="secondary" asChild>
              <a href={existing.whatsapp_group_url} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" /> WhatsApp group
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/my-events">My events</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`${box} flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3`}>
        <div>
          <p className="text-xs font-bold text-ink">{auth.student.name}</p>
          <p className="text-[11px] text-ink/70 tabular-nums">
            {auth.student.registerNumber} · {auth.student.className}
          </p>
        </div>
        {multi && (
          <div className="sm:basis-full sm:order-last">
            <SessionPicker
              slots={event.schedule_slots ?? []}
              value={slotId}
              onChange={setSlotId}
              label={canTeam && !canSolo ? 'Pick your team’s session' : 'This event runs twice. Pick your session'}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {canSolo && (
            <Button
              size="sm"
              isLoading={register.isPending}
              onClick={() => !needsSession() && !needsPhone() && register.mutate()}
              className="font-display tracking-wider uppercase text-xs sm:text-sm"
            >
              {canTeam ? 'Register solo' : 'Register'}
            </Button>
          )}
          {canTeam && (
            <Button
              size="sm"
              variant={canSolo ? 'secondary' : 'primary'}
              onClick={() => !needsSession() && !needsPhone() && setTeamOpen(true)}
              className="font-display tracking-wider uppercase text-xs sm:text-sm"
            >
              <Users className="w-4 h-4" /> {canSolo ? 'Register a team' : 'Build your team'}
            </Button>
          )}
        </div>
      </div>
      {teamOpen && (
        <TeamRegistrationModal
          event={event}
          slotId={slotId}
          onClose={() => setTeamOpen(false)}
          onSuccess={() => {
            setTeamOpen(false)
            queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
          }}
        />
      )}
    </>
  )
}
