import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Event, EventCategory, EventScheduleSlot } from '@/types'
import { CATEGORIES, EVENTS } from '@/lib/data/eventsData'
import { MASTER_SCHEDULE, type MasterScheduleEntry } from '@/lib/data/masterSchedule'

// Offline copy of the same events (same ids) for when the database is unreachable.
export const MOCK_CATEGORIES: EventCategory[] = CATEGORIES
export const MOCK_EVENTS: Event[] = EVENTS

const EVENT_SELECT =
  '*, category:event_categories(*), schedule_slots:event_schedule_slots(*, venue:venues(*)), contacts:event_contacts(*)'

/** Earliest known date/time of an event, for sorting. */
export function eventSortKey(e: Event): string {
  const slot = e.schedule_slots?.[0]
  return slot?.starts_at ?? (slot?.slot_date ? `${slot.slot_date}T00:00:00+05:30` : '9999')
}

function normalise(events: Event[]): Event[] {
  return events
    .map((e) => ({
      ...e,
      // Sessions in time order, so the 12:45 PM session comes before the 3:45 PM one.
      schedule_slots: [...(e.schedule_slots ?? [])].sort((a, b) =>
        (a.starts_at ?? a.slot_date ?? '').localeCompare(b.starts_at ?? b.slot_date ?? '')
      ),
      contacts: [...(e.contacts ?? [])].sort((a, b) =>
        a.role === b.role ? a.display_order - b.display_order : a.role === 'faculty_coordinator' ? -1 : 1
      ),
    }))
    .sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b)))
}

export async function getCategories(): Promise<EventCategory[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('event_categories').select('*').order('display_order')
    if (!error && data && data.length > 0) return data as EventCategory[]
    if (error) console.warn('Categories: using offline copy', error.message)
  }
  return MOCK_CATEGORIES
}

export async function getEvents(filters?: { categorySlug?: string; search?: string }): Promise<Event[]> {
  let events: Event[] = MOCK_EVENTS
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .in('status', ['published', 'completed', 'cancelled'])
    if (!error && data && data.length > 0) events = data as Event[]
    else if (error) console.warn('Events: using offline copy', error.message)
  }

  let result = normalise(events)
  if (filters?.categorySlug && filters.categorySlug !== 'all') {
    result = result.filter((e) => e.category?.slug === filters.categorySlug)
  }
  if (filters?.search) {
    const term = filters.search.toLowerCase()
    result = result.filter(
      (e) => e.title.toLowerCase().includes(term) || (e.description ?? '').toLowerCase().includes(term)
    )
  }
  return result
}

/** All events including drafts, for admins (RLS lets admins read every row). */
export async function getAllEventsForAdmin(): Promise<Event[]> {
  const { data, error } = await supabase.from('events').select(EVENT_SELECT)
  if (error) throw new Error(error.message)
  return normalise(data as Event[])
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getEventBySlug(slugOrId: string): Promise<Event | null> {
  if (isSupabaseConfigured) {
    const column = UUID_RE.test(slugOrId) ? 'id' : 'slug'
    const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq(column, slugOrId).maybeSingle()
    // Not found (or a draft the public can't see) means no event, not the built-in copy with old details.
    if (!error) return data ? normalise([data as Event])[0] : null
    console.warn('Event: using offline copy', error.message)
  }
  return MOCK_EVENTS.find((e) => e.slug === slugOrId || e.id === slugOrId) ?? null
}

// ── Timetable ─────────────────────────────────────────────────────────────────
/** One schedule row: an event on one day, with all its start times that day. */
export interface ScheduleEntry extends MasterScheduleEntry {
  eventId?: string
  slug?: string
  status?: string
}

interface ScheduleRow {
  event_id: string
  title: string
  slug: string
  status: string
  category_name: string | null
  category_slug: string | null
  slot_id: string
  slot_date: string | null
  starts_at: string | null
  slot_title: string | null
  venue_name: string | null
  venue_building: string | null
}

const DIVISIONS: Record<string, MasterScheduleEntry['division']> = {
  Literary: 'Literary',
  Arts: 'Arts',
  Stage: 'Stage',
  Theatre: 'Theatre',
}

/** "Seminar Hall, Block 2"; campus-wide places ("Garden Street") need no building. */
function venueLabel(name: string | null, building: string | null): string {
  if (!name) return ''
  if (!building || building === 'Central Campus' || name.includes(building)) return name
  return `${name}, ${building}`
}

function istStart(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    .toUpperCase()
}

/** Turns session rows into one entry per event per day, in date then time order. */
export function buildSchedule(rows: ScheduleRow[]): ScheduleEntry[] {
  const byKey = new Map<string, { row: ScheduleRow; starts: string[]; venues: string[]; first: string }>()
  for (const r of rows) {
    if (!r.slot_date) continue
    const key = `${r.event_id}|${r.slot_date}`
    const g = byKey.get(key) ?? { row: r, starts: [], venues: [], first: r.starts_at ?? `${r.slot_date}T23:59:00+05:30` }
    if (r.starts_at) {
      const t = istStart(r.starts_at)
      if (!g.starts.includes(t)) g.starts.push(t)
      if (r.starts_at < g.first) g.first = r.starts_at
    }
    const v = venueLabel(r.venue_name, r.venue_building)
    if (v && !g.venues.includes(v)) g.venues.push(v)
    byKey.set(key, g)
  }
  return [...byKey.values()]
    .sort((a, b) => a.row.slot_date!.localeCompare(b.row.slot_date!) || a.first.localeCompare(b.first) || a.row.title.localeCompare(b.row.title))
    .map(({ row, starts, venues }) => {
      const iso = row.slot_date!
      const [y, m, d] = iso.split('-')
      const cat = row.category_name ?? ''
      const division = DIVISIONS[cat] ?? (/inaugurat/i.test(row.title) ? 'Inauguration' : 'Special')
      return {
        id: `${row.event_id}-${iso}`,
        eventId: row.event_id,
        slug: row.slug,
        status: row.status,
        dateStr: `${d}-${m}-${y}`,
        isoDate: iso,
        day: new Date(`${iso}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' }),
        eventName: row.title,
        venue: venues.join(' / ') || 'TBD',
        timings: starts.join(' & ') || row.slot_title || 'TBD',
        division,
      }
    })
}

/** The live timetable (drafts included, cancelled events left out); the built-in copy only if the database is unreachable. */
export async function getSchedule(): Promise<ScheduleEntry[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('public_schedule')
    if (!error && data) return buildSchedule(data as ScheduleRow[])
    if (error) console.warn('Schedule: using offline copy', error.message)
  }
  return MASTER_SCHEDULE
}

export async function getAllScheduleSlots(): Promise<EventScheduleSlot[]> {
  const events = await getEvents()
  return events.flatMap((e) => (e.schedule_slots ?? []).map((s) => ({ ...s, event_id: e.id })))
}

/** Whether students can sign up right now, and why not. */
export function registrationState(e: Event, now = new Date()): { open: boolean; label: string } {
  // Every student attends mandatory events, so there is nothing to sign up for (the database refuses it too).
  if (e.is_mandatory) return { open: false, label: 'Mandatory for all' }
  if (e.registration_enabled === false) return { open: false, label: 'No registration' }
  if (e.status !== 'published') return { open: false, label: e.status === 'completed' ? 'Completed' : 'Closed' }
  if (e.registration_closed) return { open: false, label: 'Registration closed' }
  if (e.registration_opens_at && now < new Date(e.registration_opens_at)) return { open: false, label: 'Opens soon' }
  if (e.registration_closes_at && now > new Date(e.registration_closes_at)) return { open: false, label: 'Registration closed' }
  return { open: true, label: 'Open' }
}
