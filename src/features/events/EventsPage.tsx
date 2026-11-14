import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DesktopEventsShowcase from '@/components/comic/DesktopEventsShowcase'
import { EventSheet } from '@/components/events/EventSheet'
import { getEvents } from '@/lib/api/events'
import { eventOrderIndex } from '@/lib/eventOrder'
import type { Event } from '@/types'

/**
 * Events directory. Picking an event opens the shared event popup (details, rules, register);
 * the open event lives in the URL (?event=slug) so it can be linked to and survives sign-in.
 */
export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || 'all'
  const openSlug = searchParams.get('event')

  const { data: events = [] } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: () => getEvents(),
  })

  const eventsByCategory = useMemo(() => {
    const grouped: Record<string, Event[]> = { arts: [], literature: [], stage: [], theatre: [], 'special-events': [] }
    for (const ev of events) {
      const slug = ev.category?.slug || 'special-events'
      ;(grouped[slug] ??= []).push(ev)
    }
    for (const list of Object.values(grouped)) list.sort((a, b) => eventOrderIndex(a) - eventOrderIndex(b))
    return grouped
  }, [events])

  const selectedEvent = openSlug ? events.find((e) => e.slug === openSlug || e.id === openSlug) ?? null : null

  function openEvent(id: string) {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    const next = new URLSearchParams(searchParams)
    next.set('event', ev.slug)
    setSearchParams(next)
  }

  function closeEvent() {
    const next = new URLSearchParams(searchParams)
    next.delete('event')
    setSearchParams(next, { replace: true })
  }

  function selectCategory(slug: string) {
    const next = new URLSearchParams(searchParams)
    if (slug === 'all') next.delete('category')
    else next.set('category', slug)
    next.delete('event')
    setSearchParams(next)
  }

  return (
    <>
      {selectedEvent && <EventSheet event={selectedEvent} onClose={closeEvent} />}
      <DesktopEventsShowcase
        hideHeader
        activeCategory={activeCategory}
        onSelectCategory={selectCategory}
        eventsByCategory={eventsByCategory}
        onSelectEvent={openEvent}
      />
    </>
  )
}
