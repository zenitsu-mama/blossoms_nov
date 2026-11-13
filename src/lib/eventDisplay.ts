import type { Event, EventScheduleSlot } from '@/types'

const TZ = 'Asia/Kolkata'

/** "Sat, 14 Nov" from a 'YYYY-MM-DD' date, read as an IST calendar date. */
export function formatDay(date: string | null | undefined): string {
  if (!date) return 'Date TBA'
  const d = new Date(`${date}T12:00:00+05:30`)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TZ,
  })
}

export const POSTPONED_LABEL = 'Postponed · new date soon'

/** A session moved to a later date not yet fixed (status 'rescheduled'); its old date is kept but never shown. */
export function isPostponed(slot: Pick<EventScheduleSlot, 'status'> | undefined): boolean {
  return slot?.status === 'rescheduled'
}

/** The calendar date of a slot ('YYYY-MM-DD'), whether or not it has fixed times. */
export function slotDate(slot: EventScheduleSlot | undefined): string | null {
  if (!slot) return null
  if (slot.slot_date) return slot.slot_date
  if (slot.starts_at) return new Date(slot.starts_at).toLocaleDateString('en-CA', { timeZone: TZ })
  return null
}

/**
 * "Sat, 14 Nov · 11:00 am", "Sun, 29 Nov · Online", or "Thu, 12 Nov · Timing TBA".
 * Participants only see when an event starts; end times stay admin-only (they still drive clash checks).
 */
export function slotLabel(slot: EventScheduleSlot | undefined): string {
  if (!slot) return 'Schedule to be announced'
  if (isPostponed(slot)) return POSTPONED_LABEL
  const day = formatDay(slotDate(slot))
  if (slot.starts_at) return `${day} · ${formatTime(slot.starts_at)}`
  return `${day} · ${slot.slot_title || 'Timing TBA'}`
}

export function primarySlot(e: Event | undefined): EventScheduleSlot | undefined {
  return e?.schedule_slots?.[0]
}

/** Events held more than once (e.g. 12:45 PM and 3:45 PM): students pick one session. */
export function hasSessions(e: Event | undefined): boolean {
  return (e?.schedule_slots?.length ?? 0) > 1
}

/** "12:45 PM session". */
export function sessionLabel(slot: EventScheduleSlot | undefined): string {
  if (!slot) return 'Session not chosen'
  return slot.starts_at ? `${formatTime(slot.starts_at).toUpperCase()} session` : slot.slot_title || 'Session'
}

/** The slot a registration is in: its chosen session, or the event's only slot. */
export function chosenSlot(e: Event | undefined, slotId: string | null | undefined): EventScheduleSlot | undefined {
  if (!e?.schedule_slots?.length) return undefined
  if (slotId) return e.schedule_slots.find((s) => s.id === slotId) ?? (hasSessions(e) ? undefined : e.schedule_slots[0])
  return hasSessions(e) ? undefined : e.schedule_slots[0]
}

export function teamSizeLabel(e: Event): string {
  if (e.event_format === 'individual') return 'Individual'
  const min = e.min_team_size ?? 2
  const max = e.max_team_size ?? min
  const size = min === max ? `${min}` : `${min}–${max}`
  return e.event_format === 'either' ? `Solo or team of ${size}` : `Team of ${size}`
}
