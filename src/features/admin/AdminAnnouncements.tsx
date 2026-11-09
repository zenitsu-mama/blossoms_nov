import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Pin, Trash2, Pencil, Send } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  deleteAnnouncement,
  deleteNotification,
  listAllAnnouncements,
  listSentNotifications,
  saveAnnouncement,
  sendNotification,
  updateNotification,
  type AnnouncementInput,
  type SentNotification,
} from '@/lib/api/admin'
import { useAuth } from '@/lib/auth/authStore'
import { formatDateTime } from '@/lib/eventDisplay'
import type { Announcement, AnnouncementSeverity } from '@/types'
import { RecapsPanel } from './AdminRecaps'
import { EventSelect, Muted, PageHeader, Panel, selectClass, useAdminEvents } from './AdminUI'

const EMPTY: AnnouncementInput = { title: '', body: '', severity: 'normal', is_pinned: false, is_published: true }

const textareaClass = 'rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-normal focus:outline-none focus:border-primary'

export default function AdminAnnouncements() {
  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Notice-board posts and weekly comic-strip recaps are public. Notifications go to signed-in students: everyone, or just those registered for one event." />
      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <AnnouncementsPanel />
        <NotificationsPanel />
      </div>
      <RecapsPanel />
    </div>
  )
}

function AnnouncementsPanel() {
  const { admin } = useAuth()
  const queryClient = useQueryClient()
  const { data: items = [], isLoading } = useQuery({ queryKey: ['admin-announcements'], queryFn: listAllAnnouncements })
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState<AnnouncementInput>(EMPTY)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
    queryClient.invalidateQueries({ queryKey: ['announcements'] })
  }
  const save = useMutation({
    mutationFn: () => saveAnnouncement(form, editing?.id, admin?.id),
    onSuccess: () => {
      toast.success(editing ? 'Announcement updated' : 'Announcement posted')
      setEditing(null)
      setForm(EMPTY)
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({ mutationFn: deleteAnnouncement, onSuccess: refresh, onError: (e: Error) => toast.error(e.message) })

  return (
    <Panel title="Notice board">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!form.title.trim() || !form.body.trim()) return toast.error('Add a title and message.')
          save.mutate()
        }}
        className="space-y-3 mb-6"
      >
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Message
          <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={textareaClass} />
        </label>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Priority
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as AnnouncementSeverity })} className={selectClass}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} className="w-4 h-4 accent-[var(--color-primary)]" /> Pinned
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4 accent-[var(--color-primary)]" /> Published
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" isLoading={save.isPending}>
            {editing ? 'Save changes' : 'Post'}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(EMPTY) }}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <Muted>No announcements yet.</Muted>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border-2 border-ink/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold flex items-center gap-1.5">
                    {a.is_pinned && <Pin className="w-3.5 h-3.5 text-primary" aria-label="Pinned" />}
                    {a.title}
                  </p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant={a.severity === 'urgent' ? 'red' : a.severity === 'important' ? 'yellow' : 'outline'}>{a.severity}</Badge>
                    {!a.is_published && <Badge variant="closed">Draft</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(a)
                      setForm({ title: a.title, body: a.body, severity: a.severity, is_pinned: a.is_pinned, is_published: a.is_published })
                    }}
                    aria-label={`Edit ${a.title}`}
                    className="p-1.5 text-ink/50 hover:text-ink"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => (await confirmDialog(`Delete "${a.title}"?`, { danger: true, confirmLabel: 'Delete' })) && remove.mutate(a.id)}
                    aria-label={`Delete ${a.title}`}
                    className="p-1.5 text-ink/50 hover:text-comic-red-deep"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-ink/70 mt-2 whitespace-pre-line">{a.body}</p>
              <p className="text-[11px] text-ink/40 mt-1">{formatDateTime(a.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function NotificationsPanel() {
  const { admin } = useAuth()
  const queryClient = useQueryClient()
  const { data: events = [] } = useAdminEvents()
  const { data: sent = [], isLoading } = useQuery({ queryKey: ['admin-notifications'], queryFn: () => listSentNotifications() })
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [eventId, setEventId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: () => sendNotification({ title, body, link: link || null, audience: eventId ? 'event' : 'all', event_id: eventId || null }, admin!.id),
    onSuccess: () => {
      toast.success('Notification sent')
      setTitle('')
      setBody('')
      setLink('')
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Panel title="Send a notification">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim() || !body.trim()) return toast.error('Add a title and message.')
          if (link && !link.startsWith('/')) return toast.error('Link must be a site path such as /events/quiz')
          const who = eventId ? `everyone registered for ${events.find((x) => x.id === eventId)?.title}` : 'every student'
          void confirmDialog(`Send to ${who}?`, { title: 'Send notification', confirmLabel: 'Send' }).then((ok) => ok && send.mutate())
        }}
        className="space-y-3 mb-6"
      >
        <EventSelect value={eventId} onChange={setEventId} includeAll label="Send to" id="notify-event" />
        <p className="text-xs text-ink/50 -mt-2">"All events" sends to every signed-in student.</p>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Message
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={textareaClass} />
        </label>
        <Input label="Link (optional)" placeholder="/events/quiz" value={link} onChange={(e) => setLink(e.target.value)} />
        <Button type="submit" isLoading={send.isPending}>
          <Send className="w-4 h-4" /> Send
        </Button>
      </form>

      <h3 className="font-display text-lg mb-2">Recently sent</h3>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : sent.length === 0 ? (
        <Muted>Nothing sent yet.</Muted>
      ) : (
        <ul className="space-y-2">
          {sent.map((n) => {
            const audience = n.audience === 'all' ? 'All students' : `Registered for ${events.find((e) => e.id === n.event_id)?.title ?? 'an event'}`
            return editingId === n.id ? (
              <li key={n.id} className="rounded-xl border-2 border-primary p-3">
                <SentNotificationEditor
                  notification={n}
                  audience={audience}
                  onDone={() => setEditingId(null)}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })}
                />
              </li>
            ) : (
              <li key={n.id} className="rounded-xl border-2 border-ink/20 p-3 flex justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-xs text-ink/70 whitespace-pre-line">{n.body}</p>
                  {n.link && <p className="text-[11px] text-primary mt-0.5">{n.link}</p>}
                  <p className="text-[11px] text-ink/40 mt-1">
                    {audience} · {formatDateTime(n.created_at)}
                  </p>
                </div>
                <div className="flex gap-1 self-start">
                  <button onClick={() => setEditingId(n.id)} aria-label={`Edit ${n.title}`} className="p-1.5 text-ink/50 hover:text-ink">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={async () => (await confirmDialog('Delete this notification for everyone?', { danger: true, confirmLabel: 'Delete' })) && remove.mutate(n.id)} aria-label="Delete notification" className="p-1.5 text-ink/50 hover:text-comic-red-deep">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/** Inline editor for a sent notification: wording and link only, the audience stays as sent. */
function SentNotificationEditor({
  notification,
  audience,
  onDone,
  onSaved,
}: {
  notification: SentNotification
  audience: string
  onDone: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(notification.title)
  const [body, setBody] = useState(notification.body)
  const [link, setLink] = useState(notification.link ?? '')
  const save = useMutation({
    mutationFn: () => updateNotification(notification.id, { title, body, link: link.trim() || null }),
    onSuccess: () => {
      toast.success('Notification updated')
      onSaved()
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !body.trim()) return toast.error('Add a title and message.')
        if (link.trim() && !link.trim().startsWith('/')) return toast.error('Link must be a site path such as /events/quiz')
        save.mutate()
      }}
      className="space-y-2"
    >
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Message
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={textareaClass} />
      </label>
      <Input label="Link (optional)" placeholder="/events/quiz" value={link} onChange={(e) => setLink(e.target.value)} />
      <p className="text-[11px] text-ink/50">Sent to: {audience}. Students who already opened it will see the new wording.</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={save.isPending}>
          Save changes
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
