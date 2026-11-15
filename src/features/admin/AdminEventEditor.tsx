import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { saveEventHeads, updateEvent, type EventPatch, type HeadInput } from '@/lib/api/admin'
import { slotLabel } from '@/lib/eventDisplay'
import type { EventStatus } from '@/types'
import { PageHeader, Panel, selectClass, useAdminEvents, useEventAccess, ViewOnlyNote } from './AdminUI'
import { EventSessionsPanel } from './EventSessionsPanel'

/** datetime-local value in IST for an ISO timestamp */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000)
  return d.toISOString().slice(0, 16)
}
function fromLocalInput(v: string): string | null {
  return v ? new Date(`${v}:00+05:30`).toISOString() : null
}

export default function AdminEventEditor() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { data: events = [], isLoading } = useAdminEvents()
  const event = events.find((e) => e.id === id)
  const [form, setForm] = useState<EventPatch>({})
  const canEdit = useEventAccess().canManage(id)
  const savedHeads = (event?.contacts ?? []).filter((c) => c.role === 'student_head').map((c) => ({ id: c.id, name: c.name }))
  const faculty = (event?.contacts ?? []).filter((c) => c.role === 'faculty_coordinator')
  const [heads, setHeads] = useState<HeadInput[]>([])

  useEffect(() => {
    if (!event) return
    setHeads((event.contacts ?? []).filter((c) => c.role === 'student_head').map((c) => ({ id: c.id, name: c.name })))
    setForm({
      title: event.title,
      description: event.description,
      rules_markdown: event.rules_markdown,
      status: event.status,
      registration_enabled: event.registration_enabled ?? true,
      registration_closed: event.registration_closed ?? false,
      registration_closes_at: event.registration_closes_at,
      whatsapp_group_url: event.whatsapp_group_url ?? null,
      min_team_size: event.min_team_size,
      max_team_size: event.max_team_size,
      capacity: event.capacity,
      waitlist_enabled: event.waitlist_enabled ?? false,
      cancellation_allowed: event.cancellation_allowed,
      is_mandatory: event.is_mandatory ?? false,
    })
  }, [event])

  const save = useMutation({
    mutationFn: async () => {
      await updateEvent(id!, form)
      const headsChanged = JSON.stringify(heads.map((h) => [h.id, h.name.trim()]).filter(([, n]) => n)) !== JSON.stringify(savedHeads.map((h) => [h.id, h.name]))
      if (headsChanged) await saveEventHeads(id!, savedHeads, heads)
    },
    onSuccess: () => {
      toast.success('Event saved')
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!event) {
    return (
      <div className="space-y-4">
        <p className="font-display text-2xl">Event not found</p>
        <Button asChild variant="outline">
          <Link to="/admin/events">Back to events</Link>
        </Button>
      </div>
    )
  }

  const set = <K extends keyof EventPatch>(k: K, v: EventPatch[K]) => setForm((f) => ({ ...f, [k]: v }))
  const isTeam = event.event_format !== 'individual'

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/admin/events" className="inline-flex items-center gap-2 text-sm font-display uppercase tracking-wider hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Events
      </Link>
      <PageHeader
        title={event.title}
        description={[event.category?.name, slotLabel(event.schedule_slots?.[0]), event.schedule_slots?.[0]?.venue?.name].filter(Boolean).join(' · ')}
      />
      {!canEdit && <ViewOnlyNote />}
      {/* A disabled fieldset locks every field and button inside it. */}
      <fieldset disabled={!canEdit} className="min-w-0 space-y-6 border-0 p-0 m-0">
      <EventSessionsPanel event={event} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (form.capacity != null && form.capacity < 1) return toast.error('Capacity must be at least 1, or empty for no limit.')
          if (isTeam && form.min_team_size && form.max_team_size && form.max_team_size < form.min_team_size) {
            return toast.error('Maximum team size must be at least the minimum.')
          }
          save.mutate()
        }}
        className="space-y-6"
      >
        <Panel title="Registration">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={!!form.registration_enabled} onChange={(e) => set('registration_enabled', e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
              Takes registrations
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={!!form.registration_closed} onChange={(e) => set('registration_closed', e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
              Registration closed (manual switch)
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Closes automatically at (IST)
              <input
                type="datetime-local"
                value={toLocalInput(form.registration_closes_at)}
                onChange={(e) => set('registration_closes_at', fromLocalInput(e.target.value))}
                className={selectClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Status
              <select value={form.status} onChange={(e) => set('status', e.target.value as EventStatus)} className={selectClass}>
                {['published', 'draft', 'completed', 'cancelled', 'archived'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={!!form.cancellation_allowed} onChange={(e) => set('cancellation_allowed', e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
              Students can cancel before registration closes
            </label>
            <label className="flex items-start gap-2 text-sm font-semibold sm:col-span-2">
              <input type="checkbox" checked={!!form.is_mandatory} onChange={(e) => set('is_mandatory', e.target.checked)} className="w-4 h-4 mt-0.5 accent-[var(--color-primary)]" />
              <span>
                Mandatory for every student
                <span className="block text-xs font-normal text-ink/60">No registration. Once held, every student counts as present unless marked absent. Not counted in the defaulter list.</span>
              </span>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Input
              label={isTeam ? 'Capacity (teams)' : 'Capacity (students)'}
              type="number"
              min={1}
              placeholder="No limit"
              value={form.capacity ?? ''}
              onChange={(e) => set('capacity', e.target.value ? Number(e.target.value) : null)}
              hint="Leave empty for no limit."
            />
            <label className="flex items-center gap-2 text-sm font-semibold sm:mt-7">
              <input type="checkbox" checked={!!form.waitlist_enabled} onChange={(e) => set('waitlist_enabled', e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
              Waitlist when full
            </label>
          </div>
          {isTeam && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Min team size" type="number" min={2} value={form.min_team_size ?? ''} onChange={(e) => set('min_team_size', e.target.value ? Number(e.target.value) : null)} />
              <Input label="Max team size" type="number" min={2} value={form.max_team_size ?? ''} onChange={(e) => set('max_team_size', e.target.value ? Number(e.target.value) : null)} />
            </div>
          )}
          <div className="mt-4">
            <Input
              label="WhatsApp group link"
              type="url"
              placeholder="https://chat.whatsapp.com/…"
              value={form.whatsapp_group_url ?? ''}
              onChange={(e) => set('whatsapp_group_url', e.target.value || null)}
              hint="Shown only to students registered for this event."
            />
          </div>
        </Panel>

        <Panel title="Details">
          <div className="space-y-4">
            <Input label="Title" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} required />
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Description
              <textarea rows={3} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-normal focus:outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Rules (one per line)
              <textarea rows={10} value={form.rules_markdown ?? ''} onChange={(e) => set('rules_markdown', e.target.value)} className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-normal focus:outline-none focus:border-primary" />
            </label>
          </div>
        </Panel>

        <Panel title="Event heads">
          <p className="text-xs text-ink/60 mb-3">Shown on the event page. Saved with the event.</p>
          <div className="space-y-2">
            {heads.map((h, i) => (
              <div key={h.id ?? `new-${i}`} className="flex gap-2">
                <input
                  aria-label={`Event head ${i + 1} name`}
                  value={h.name}
                  onChange={(e) => setHeads((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="Name"
                  className="flex-1 rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <Button type="button" variant="outline" size="sm" aria-label={`Remove ${h.name || 'event head'}`} onClick={() => setHeads((list) => list.filter((_, j) => j !== i))}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {heads.length === 0 && <p className="text-sm text-ink/60">No event heads.</p>}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setHeads((list) => [...list, { name: '' }])}>
            <Plus className="w-4 h-4" /> Add event head
          </Button>
          {faculty.length > 0 && (
            <p className="text-sm mt-4">
              <strong>Faculty:</strong> {faculty.map((c) => c.name).join(', ')}
            </p>
          )}
        </Panel>

        {canEdit && (
          <Button type="submit" size="lg" isLoading={save.isPending}>
            Save event
          </Button>
        )}
      </form>
      </fieldset>
    </div>
  )
}
