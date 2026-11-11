import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Event, EventCategory, EventScheduleSlot } from '@/types'
import { CATEGORIES, EVENTS } from '@/lib/data/eventsData'

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
    if (!error && data) return normalise([data as Event])[0]
    if (error) console.warn('Event: using offline copy', error.message)
  }
  return MOCK_EVENTS.find((e) => e.slug === slugOrId || e.id === slugOrId) ?? null
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
