import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { deleteEventSlot, getVenueNames, saveEventSlot } from '@/lib/api/admin'
import { slotDate } from '@/lib/eventDisplay'
import type { Event, EventScheduleSlot } from '@/types'
import { Panel, selectClass } from './AdminUI'

/** 'HH:MM' in IST for an ISO timestamp, as a time input wants it. */
function istTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
}

interface Draft {
  key: string
  slotId: string | null
  date: string
  start: string
  end: string
  venue: string
}

function toDraft(s: EventScheduleSlot): Draft {
  return {
    key: s.id,
    slotId: s.id,
    date: slotDate(s) ?? '',
    start: istTime(s.starts_at),
    end: istTime(s.ends_at),
    venue: s.venue?.name ?? '',
  }
}

/**
 * Date, start, end and venue for each session of an event. Each session saves on its own, straight to the
 * database, so every page (Events, Schedule, My events) shows the change. Students registered in a session are
 * told when its date, start time or venue changes.
 */
export function EventSessionsPanel({ event }: { event: Event }) {
  const queryClient = useQueryClient()
  const slots = event.schedule_slots ?? []
  const [added, setAdded] = useState<Draft[]>([])
  const [notify, setNotify] = useState(true)
  const { data: venues = [] } = useQuery({ queryKey: ['venue-names'], queryFn: getVenueNames })

  function refresh() {
    for (const key of ['admin-events', 'events', 'event', 'schedule', 'venue-names', 'my-registrations']) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
  }

  return (
    <Panel title="Date, time and venue">
      <p className="text-sm text-ink/70 -mt-2 mb-4">
        Changes show on the Events, Schedule and My events pages as soon as you save a session. Students see the start
        time only. Leave both times empty for timing TBA (e.g. online submissions).
      </p>
      <datalist id="venue-names">
        {venues.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <div className="space-y-3">
        {slots.map((s) => (
          <SessionRow
            key={`${s.id}-${s.starts_at}-${s.slot_date}-${s.venue_id}-${s.ends_at}`}
            eventId={event.id}
            initial={toDraft(s)}
            notify={notify}
            canRemove={slots.length + added.length > 1}
            onSaved={refresh}
          />
        ))}
        {added.map((d) => (
          <SessionRow
            key={d.key}
            eventId={event.id}
            initial={d}
            notify={notify}
            canRemove
            onSaved={() => {
              setAdded((list) => list.filter((x) => x.key !== d.key))
              refresh()
            }}
            onDiscard={() => setAdded((list) => list.filter((x) => x.key !== d.key))}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const last = slots[slots.length - 1]
            setAdded((list) => [
              ...list,
              { key: `new-${Date.now()}`, slotId: null, date: slotDate(last) ?? '', start: '', end: '', venue: last?.venue?.name ?? '' },
            ])
          }}
        >
          <Plus className="w-4 h-4" /> Add session
        </Button>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
          Tell registered students about changes
        </label>
      </div>
    </Panel>
  )
}

function SessionRow({
  eventId,
  initial,
  notify,
  canRemove,
  onSaved,
  onDiscard,
}: {
  eventId: string
  initial: Draft
  notify: boolean
  canRemove: boolean
  onSaved: () => void
  /** For a session not saved yet: drop it without asking the database. */
  onDiscard?: () => void
}) {
  const [d, setD] = useState(initial)
  const isNew = d.slotId === null
  const dirty =
    isNew || d.date !== initial.date || d.start !== initial.start || d.end !== initial.end || d.venue.trim() !== initial.venue
  const set = (k: keyof Draft, v: string) => setD((x) => ({ ...x, [k]: v }))

  const save = useMutation({
    mutationFn: () =>
      saveEventSlot(eventId, { slotId: d.slotId, date: d.date, start: d.start || null, end: d.end || null, venue: d.venue, notify }),
    onSuccess: (res) => {
      if (!res.success) return toast.error(res.message)
      toast.success(res.message)
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: () => deleteEventSlot(d.slotId!),
    onSuccess: (res) => {
      if (!res.success) return toast.error(res.message)
      toast.success(res.message)
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit() {
    if (!d.date) return toast.error('Pick a date.')
    if (!!d.start !== !!d.end) return toast.error('Give both a start and an end time, or leave both empty for timing TBA.')
    if (d.start && d.end && d.end <= d.start) return toast.error('End time must be after the start time.')
    save.mutate()
  }

  return (
    <div className={`rounded-xl border-2 p-3 ${isNew ? 'border-dashed border-primary bg-primary/5' : 'border-ink bg-paper'}`}>
      {isNew && <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">New session (not saved yet)</p>}
      <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr_1.6fr] gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold col-span-2 sm:col-span-1">
          Date
          <input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} className={selectClass} required />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Starts (IST)
          <input type="time" value={d.start} onChange={(e) => set('start', e.target.value)} className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Ends (IST)
          <input type="time" value={d.end} onChange={(e) => set('end', e.target.value)} className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold col-span-2 sm:col-span-1">
          Venue
          <input
            list="venue-names"
            value={d.venue}
            maxLength={80}
            placeholder="Pick or type a venue"
            onChange={(e) => set('venue', e.target.value)}
            className={selectClass}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {canRemove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={remove.isPending}
            onClick={() => {
              if (isNew) return onDiscard?.()
              if (window.confirm('Remove this session? This cannot be undone.')) remove.mutate()
            }}
          >
            <Trash2 className="w-4 h-4" /> {isNew ? 'Discard' : 'Remove'}
          </Button>
        )}
        <Button type="button" size="sm" disabled={!dirty} isLoading={save.isPending} onClick={submit}>
          Save session
        </Button>
      </div>
    </div>
  )
}
