import { Link } from 'react-router-dom'
import { Compass, ArrowRight, Clock, MapPin, Bell, CheckCircle2, Phone, Target } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DisplayText, ComicPanel, ComicCaptionBox } from '@/components/comic/ComicPrimitives'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getStudentRegistrations } from '@/lib/api/registration'
import { getMyNotifications } from '@/lib/api/notifications'
import { useAuth } from '@/lib/auth/authStore'
import { formatDateTime, slotLabel } from '@/lib/eventDisplay'
import { eventSortKey } from '@/lib/api/events'
import { getFestSettings } from '@/lib/api/admin'

/** Used until fest_settings loads, or if it can't be read. Admins change it under Points & teams. */
const DEFAULT_MIN_EVENTS = 2

export default function StudentDashboard() {
  const { student } = useAuth()
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: getStudentRegistrations,
  })
  const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: getMyNotifications })
  const { data: settings } = useQuery({ queryKey: ['fest-settings'], queryFn: getFestSettings })

  if (!student) return null

  const active = registrations.filter((r) => r.registration_status !== 'cancelled')
  // The minimum counts events the student chose: mandatory events don't count (same rule as the admin Defaulters list).
  const minEvents = settings?.min_chosen_events ?? DEFAULT_MIN_EVENTS
  const chosen = active.filter((r) => !r.event?.is_mandatory)
  const chosenRegistered = chosen.filter((r) => r.registration_status === 'confirmed').length
  const chosenParticipated = chosen.filter((r) => r.attendance_status === 'present').length
  const goalMet = chosenRegistered >= minEvents && chosenParticipated >= minEvents
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const upcoming = active
    .filter((r) => r.event && eventSortKey(r.event).slice(0, 10) >= today)
    .sort((a, b) => eventSortKey(a.event!).localeCompare(eventSortKey(b.event!)))
  const next = upcoming[0]

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 space-y-6">
      <ComicCaptionBox>BLOSSOMS 2026-27 · STUDENT PORTAL</ComicCaptionBox>

      <div className="bg-white p-5 rounded-2xl border-2 border-ink shadow-[3px_3px_0px_var(--color-ink)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <DisplayText as="h1" className="text-4xl text-ink">Hey, {student.name.split(' ')[0]}!</DisplayText>
          <p className="text-ink/70 mt-1 font-medium text-sm tabular-nums">
            {student.className ? `${student.className} · ` : ''}
            {student.registerNumber}
          </p>
        </div>
        {student.profileComplete ? (
          <Badge variant="registered">
            <CheckCircle2 className="w-3.5 h-3.5" /> Profile complete
          </Badge>
        ) : (
          <Button size="sm" variant="secondary" asChild>
            <Link to="/app/profile">
              <Phone className="w-4 h-4" /> Add phone number
            </Link>
          </Button>
        )}
      </div>

      <GoalBanner minEvents={minEvents} goalMet={goalMet} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label="Registered" value={chosenRegistered} min={minEvents} sub="events signed up" tone="text-primary" />
        <Stat label="Participated" value={chosenParticipated} min={minEvents} sub="marked present" tone="text-blossoms-green" />
        <div className="comic-card p-5 col-span-2 sm:col-span-1 bg-paper flex flex-col justify-center items-center text-center">
          <p className="font-display text-base text-ink mb-2">
            {active.length === 0 ? 'Pick your first event' : 'Want to join more?'}
          </p>
          <Button size="sm" variant="outline" className="w-full font-display tracking-wider uppercase" asChild>
            <Link to="/events">
              <Compass className="w-4 h-4" /> Browse events
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-36 w-full" />
      ) : next?.event ? (
        <section aria-labelledby="next-event-heading">
          <h2 id="next-event-heading" className="font-display text-2xl text-ink mb-3">Up next</h2>
          <ComicPanel>
            <Badge variant="outline">{next.event.category?.name}</Badge>
            <p className="font-display text-3xl text-ink mt-2">{next.event.title}</p>
            <p className="text-sm text-ink/70 mt-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" aria-hidden="true" /> {slotLabel(next.event.schedule_slots?.[0])}
            </p>
            {next.event.schedule_slots?.[0]?.venue && (
              <p className="text-sm text-ink/70 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-comic-red-deep" aria-hidden="true" /> {next.event.schedule_slots[0].venue.name}
              </p>
            )}
            {next.team && <p className="text-sm font-semibold text-ink mt-2">Team {next.team.team_name}</p>}
            <Button size="sm" variant="outline" className="mt-4" asChild>
              <Link to="/app/my-events">
                All my events <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </ComicPanel>
        </section>
      ) : null}

      <section aria-labelledby="updates-heading">
        <h2 id="updates-heading" className="font-display text-2xl text-ink mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5" aria-hidden="true" /> Updates
        </h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-ink/60">No updates yet. Team invites, results and notices from organisers show up here.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="comic-card p-4 bg-white">
                <p className={n.read_at ? 'text-sm text-ink' : 'text-sm font-bold text-ink'}>{n.title}</p>
                <p className="text-xs text-ink/70 mt-0.5">{n.body}</p>
                <p className="text-[11px] text-ink/40 mt-1">{formatDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Tells the student the participation minimum, or that they've met it. */
export function GoalBanner({ minEvents, goalMet }: { minEvents: number; goalMet: boolean }) {
  if (minEvents <= 0) return null
  return (
    <section
      aria-labelledby="goal-heading"
      className={`p-4 rounded-2xl border-2 border-ink shadow-[3px_3px_0px_var(--color-ink)] ${goalMet ? 'bg-blossoms-green/15' : 'bg-comic-yellow'}`}
    >
      <h2 id="goal-heading" className="font-display text-xl text-ink flex items-center gap-2">
        {goalMet ? <CheckCircle2 className="w-5 h-5 text-blossoms-green" aria-hidden="true" /> : <Target className="w-5 h-5" aria-hidden="true" />}
        {goalMet ? 'Minimum done!' : `Take part in at least ${minEvents} events`}
      </h2>
      <p className="text-sm text-ink/80 mt-0.5">
        {goalMet
          ? `You have registered for and taken part in ${minEvents} or more events. Join more if you like.`
          : `Every student must register for and take part in at least ${minEvents} Blossoms events. Mandatory events don't count towards this.`}
      </p>
    </section>
  )
}

/** A count against the minimum, e.g. "1 / 2", with a bar that fills as the student gets there. */
export function Stat({ label, value, min, sub, tone }: { label: string; value: number; min: number; sub: string; tone: string }) {
  const done = min > 0 && value >= min
  const pct = min > 0 ? Math.min(100, Math.round((value / min) * 100)) : 100
  return (
    <div className="comic-card p-5 text-center bg-white">
      <p className={`font-display text-xs uppercase tracking-wider font-bold mb-1 ${tone}`}>{label}</p>
      <p className={`font-display text-5xl tabular-nums ${tone}`}>
        {value}
        {min > 0 && <span className="text-2xl text-ink/40"> / {min}</span>}
      </p>
      {min > 0 && (
        <div
          role="progressbar"
          aria-label={`${label}: ${value} of ${min}`}
          aria-valuemin={0}
          aria-valuemax={min}
          aria-valuenow={Math.min(value, min)}
          className="mt-2 h-2.5 rounded-full border-2 border-ink bg-paper overflow-hidden"
        >
          <div className={`h-full ${done ? 'bg-blossoms-green' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="text-[11px] font-semibold text-ink/50 mt-1.5 uppercase">
        {done ? 'Minimum done ✓' : min > 0 ? `${min - Math.min(value, min)} more needed · ${sub}` : sub}
      </p>
    </div>
  )
}
