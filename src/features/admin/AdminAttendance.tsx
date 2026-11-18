import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, X, RotateCcw, UserPlus, Plus, Trash2, Download } from 'lucide-react'
import { downloadCsv, toCsv } from '@/lib/csv'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { deleteRegistration, getEventRoster, lookupStudents, markAttendance, spotRegister, type RosterRow, type SpotEntry, type StudentPreview } from '@/lib/api/admin'
import { formatTime } from '@/lib/eventDisplay'
import { useAuth } from '@/lib/auth/authStore'
import { cn } from '@/lib/utils'
import type { Event } from '@/types'
import { DataTable, EventSelect, Muted, PageHeader, Panel, SearchBox, SortTh, selectClass, useAdminEvents, useEventAccess, useSort, ViewOnlyNote } from './AdminUI'

export default function AdminAttendance() {
  const [params, setParams] = useSearchParams()
  const eventId = params.get('event') ?? ''
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()
  const { data: adminEvents = [] } = useAdminEvents()
  const selectedEvent = adminEvents.find((e) => e.id === eventId)
  const canEdit = useEventAccess().canManage(eventId)
  // Deleting a student's registration is for super admins only (the database enforces this too).
  const canDelete = useAuth().admin?.role === 'super_admin'

  const { data: roster = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-roster', eventId],
    queryFn: () => getEventRoster(eventId),
    enabled: Boolean(eventId),
  })

  const mark = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: 'present' | 'absent' | 'clear' }) => markAttendance(eventId, ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roster', eventId] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Events held twice (12:45 PM and 3:45 PM): filter the list to one session while taking attendance.
  const [session, setSession] = useState('all')
  const sessions = useMemo(
    () => [...new Set(roster.map((r) => r.session_starts_at).filter((s): s is string => Boolean(s)))].sort(),
    [roster]
  )
  const showSessions = sessions.length > 1 || (sessions.length === 1 && roster.some((r) => !r.session_starts_at))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return roster.filter(
      (r) =>
        (session === 'all' || (session === 'none' ? !r.session_starts_at : r.session_starts_at === session)) &&
        (!q || r.full_name.toLowerCase().includes(q) || r.register_number.startsWith(q) || (r.team_name ?? '').toLowerCase().includes(q))
    )
  }, [roster, search, session])

  const { sorted, sort, toggle } = useSort(filtered, {
    student: (r) => r.full_name,
    class: (r) => r.class_name,
    team: (r) => r.team_name,
    phone: (r) => r.phone,
    session: (r) => r.session_starts_at,
    attendance: (r) => (r.attendance_status === 'present' ? 0 : r.attendance_status === 'absent' ? 1 : 2),
  })

  const present = roster.filter((r) => r.attendance_status === 'present').length
  const absent = roster.filter((r) => r.attendance_status === 'absent').length
  const unmarked = roster.length - present - absent
  const mandatory = roster[0]?.registration_status === 'mandatory'

  const remove = useMutation({
    mutationFn: (r: RosterRow) => deleteRegistration(r.registration_id),
    onSuccess: (res) => {
      if (!res.success) return toast.error(res.message, { duration: 6000 })
      toast.success(res.message)
      // Rosters, registrations, defaulters, teams and points can all change.
      void queryClient.invalidateQueries()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function askDelete(r: RosterRow) {
    const team = r.team_name ? ` They will be removed from team "${r.team_name}"${r.is_leader ? ' (they are its leader; the next member becomes leader)' : ''}.` : ''
    const ok = await confirmDialog(
      `Are you sure? ${r.full_name} (${r.register_number}, ${r.class_name ?? 'no class'})'s registration for ${selectedEvent?.title ?? 'this event'} is going to be deleted, along with their attendance for it.${team} This cannot be undone.`,
      { title: 'Delete this registration?', confirmLabel: 'Yes, delete', cancelLabel: 'Keep it', danger: true }
    )
    if (ok) remove.mutate(r)
  }

  // Everyone registered in the chosen session, by team then name.
  const sessionRows = roster
    .filter((r) => session === 'all' || (session === 'none' ? !r.session_starts_at : r.session_starts_at === session))
    .sort((a, b) => (a.team_name ?? '').localeCompare(b.team_name ?? '') || a.full_name.localeCompare(b.full_name))
  // Sign-in sheet: everyone present (for mandatory events, everyone not marked absent).
  const presentRows = sessionRows.filter((r) => (mandatory ? r.attendance_status !== 'absent' : r.attendance_status === 'present'))

  const attendanceLabel = (r: RosterRow) =>
    r.attendance_status === 'present' ? 'Present' : r.attendance_status === 'absent' ? 'Absent' : mandatory ? 'Present (not marked)' : 'Not marked'

  function exportList(rows: RosterRow[], kind: 'present' | 'attendance') {
    const csv = toCsv<RosterRow>(rows, [
      { header: 'No.', value: (r) => rows.indexOf(r) + 1 },
      { header: 'Name', value: (r) => r.full_name },
      { header: 'Register no.', value: (r) => r.register_number },
      { header: 'Class', value: (r) => r.class_name },
      ...(roster.some((r) => r.team_name) ? [{ header: 'Team', value: (r: RosterRow) => r.team_name }] : []),
      { header: 'Phone', value: (r) => r.phone },
      ...(showSessions ? [{ header: 'Session', value: (r: RosterRow) => (r.session_starts_at ? formatTime(r.session_starts_at).toUpperCase() : '') }] : []),
      ...(kind === 'attendance' ? [{ header: 'Attendance', value: attendanceLabel }] : [{ header: 'Sign', value: () => '' }]),
    ])
    const name = (selectedEvent?.slug ?? 'event') + (session !== 'all' && session !== 'none' ? `-${formatTime(session).replace(/\W+/g, '')}` : '')
    downloadCsv(`${kind}-${name}.csv`, csv)
  }

  function markRest(status: 'present' | 'absent') {
    const ids = roster.filter((r) => !r.attendance_status).map((r) => r.student_id)
    if (!ids.length) return
    void confirmDialog(`Mark ${ids.length} unmarked students as ${status}?`, { title: 'Mark the rest', confirmLabel: `Mark ${status}` }).then((ok) => ok && mark.mutate({ ids, status }))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark who turned up. Students marked absent, or never marked, show in the defaulter lists." />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px]">
          <EventSelect
            value={eventId}
            onChange={(id) => {
              setParams(id ? { event: id } : {})
              setSearch('')
              setSession('all')
            }}
          />
        </div>
        {eventId && <SearchBox value={search} onChange={setSearch} placeholder="Name, register number or team" />}
        {showSessions && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Session">
            {[['all', 'All sessions'], ...sessions.map((s) => [s, `${formatTime(s).toUpperCase()} session`]), ...(roster.some((r) => !r.session_starts_at) ? [['none', 'No session']] : [])].map(
              ([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSession(value)}
                  aria-pressed={session === value}
                  className={cn(
                    'px-3 py-1.5 rounded-full border-2 border-ink text-sm font-semibold',
                    session === value ? 'bg-ink text-paper' : 'bg-paper hover:bg-gutter'
                  )}
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {eventId && !canEdit && <ViewOnlyNote />}

      {eventId && canEdit && selectedEvent && !selectedEvent.is_mandatory && (
        <SpotRegisterPanel
          key={eventId}
          event={selectedEvent}
          onDone={() => {
            // On-spot sign-ups change rosters, registrations, defaulters and points: refresh everything loaded.
            void queryClient.invalidateQueries()
          }}
        />
      )}

      {!eventId ? (
        <Muted>Choose an event to take attendance.</Muted>
      ) : isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : isError ? (
        <ErrorState description={(error as Error).message} retry={() => refetch()} />
      ) : roster.length === 0 ? (
        <Muted>Nobody has registered for this event yet.</Muted>
      ) : (
        <Panel
          title={mandatory ? `Mandatory event · all ${roster.length} students` : `${roster.length} registered`}
          actions={
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-blossoms-green tabular-nums">{present} present</span>
              <span className="font-semibold text-comic-red-deep tabular-nums">{absent} absent</span>
              <span className="font-semibold text-ink/60 tabular-nums">
                {unmarked} {mandatory ? 'unmarked (counted present)' : 'unmarked'}
              </span>
              <Button size="sm" variant="outline" onClick={() => exportList(presentRows, 'present')} disabled={!presentRows.length} title="Present students with a Sign column, as a CSV">
                <Download className="w-4 h-4" /> Present list ({presentRows.length})
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportList(sessionRows, 'attendance')} disabled={!sessionRows.length} title="Everyone registered, with whether they were present, absent or not marked, as a CSV">
                <Download className="w-4 h-4" /> Full attendance ({sessionRows.length})
              </Button>
              {unmarked > 0 && !mandatory && canEdit && (
                <>
                  <Button size="sm" variant="outline" onClick={() => markRest('present')} disabled={mark.isPending}>
                    Rest present
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => markRest('absent')} disabled={mark.isPending}>
                    Rest absent
                  </Button>
                </>
              )}
            </div>
          }
        >
          {mandatory && (
            <p className="text-sm text-ink/60 -mt-2 mb-3">
              Everyone counts as present once the event is held. Only mark the students who were absent.
            </p>
          )}
          <DataTable>
            <thead>
              <tr>
                <SortTh label="Student" sortKey="student" sort={sort} onSort={toggle} />
                <SortTh label="Class" sortKey="class" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
                <SortTh label="Team" sortKey="team" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
                <SortTh label="Phone" sortKey="phone" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
                {showSessions && <SortTh label="Session" sortKey="session" sort={sort} onSort={toggle} className="hidden sm:table-cell" />}
                <SortTh label="Attendance" sortKey="attendance" sort={sort} onSort={toggle} />
                {canDelete && !mandatory && (
                  <th className="w-10 text-right">
                    <span className="sr-only">Delete</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <AttendanceRow
                  key={r.student_id}
                  row={r}
                  showSession={showSessions}
                  busy={mark.isPending || !canEdit}
                  onMark={(status) => mark.mutate({ ids: [r.student_id], status })}
                  showDeleteColumn={canDelete && !mandatory}
                  onDelete={canDelete && !mandatory ? () => void askDelete(r) : undefined}
                  deleting={remove.isPending}
                />
              ))}
            </tbody>
          </DataTable>
        </Panel>
      )}
    </div>
  )
}

function AttendanceRow({
  row,
  showSession,
  busy,
  onMark,
  onDelete,
  deleting,
  showDeleteColumn,
}: {
  row: RosterRow
  showSession: boolean
  busy: boolean
  onMark: (s: 'present' | 'absent' | 'clear') => void
  /** Super admins only, and never for mandatory events. */
  showDeleteColumn?: boolean
  onDelete?: () => void
  deleting?: boolean
}) {
  const btn = 'inline-flex items-center gap-1 rounded-lg border-2 px-2.5 py-1 text-xs font-bold disabled:opacity-50'
  const session = row.session_starts_at ? formatTime(row.session_starts_at).toUpperCase() : 'Not chosen'
  return (
    <tr className={cn(row.attendance_status === 'present' && 'bg-blossoms-green/10', row.attendance_status === 'absent' && 'bg-comic-red-deep/5')}>
      <td>
        <p className="font-semibold">{row.full_name}</p>
        <p className="text-xs text-ink/50 tabular-nums">{row.register_number}</p>
        {/* Phones: class, team and phone sit under the name so Present / Absent stay on screen. */}
        <p className="sm:hidden text-xs text-ink/60 mt-0.5">
          {[showSession && session, row.class_name, row.team_name && `${row.team_name}${row.is_leader ? ' (leader)' : ''}`, row.phone].filter(Boolean).join(' · ')}
        </p>
      </td>
      <td className="hidden sm:table-cell text-xs">{row.class_name}</td>
      <td className="hidden sm:table-cell text-xs">
        {row.team_name ?? '—'}
        {row.is_leader && <span className="ml-1 font-bold text-primary">(leader)</span>}
      </td>
      <td className="hidden sm:table-cell text-xs tabular-nums">{row.phone ?? '—'}</td>
      {showSession && <td className="hidden sm:table-cell text-xs font-semibold whitespace-nowrap">{session}</td>}
      <td>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onMark('present')}
            aria-pressed={row.attendance_status === 'present'}
            className={cn(btn, row.attendance_status === 'present' ? 'bg-blossoms-green text-white border-ink' : 'border-ink/30 hover:border-ink')}
          >
            <Check className="w-3.5 h-3.5" /> Present
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onMark('absent')}
            aria-pressed={row.attendance_status === 'absent'}
            className={cn(btn, row.attendance_status === 'absent' ? 'bg-comic-red-deep text-white border-ink' : 'border-ink/30 hover:border-ink')}
          >
            <X className="w-3.5 h-3.5" /> Absent
          </button>
          {row.attendance_status && (
            <button type="button" disabled={busy} onClick={() => onMark('clear')} aria-label={`Clear attendance for ${row.full_name}`} className="p-1 text-ink/40 hover:text-ink">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
      {showDeleteColumn && (
        <td className="w-10 text-right">
          {onDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              aria-label={`Delete ${row.full_name}'s registration`}
              title="Delete registration"
              className="p-1.5 rounded-lg text-ink/40 hover:text-comic-red-deep hover:bg-comic-red-deep/10 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </td>
      )}
    </tr>
  )
}

const EMPTY_ROW: SpotEntry = { register_number: '', phone: '' }

/** Line under an on-spot row: who the register number belongs to and whether a phone is still needed. */
function StudentHint({ number, student, looking, phoneTyped }: { number: string; student?: StudentPreview; looking: boolean; phoneTyped: boolean }) {
  if (!/^\d{7,}$/.test(number)) return null
  if (!student) {
    return <p className="text-xs mt-1 text-ink/60" role="status">{looking ? 'Looking up…' : <span className="font-semibold text-comic-red-deep">No student with this register number</span>}</p>
  }
  const inactive = student.student_status !== 'active'
  return (
    <p className="text-xs mt-1" role="status">
      <span className="font-semibold">{student.full_name}</span>
      {student.class_name && <span className="text-ink/60"> · {student.class_name}</span>}
      {inactive && <span className="font-semibold text-comic-red-deep"> · Not an active student</span>}
      {' · '}
      {student.phone ? (
        <span className="text-blossoms-green font-semibold">Phone on file: {student.phone}</span>
      ) : phoneTyped ? (
        <span className="text-ink/60">Phone will be saved to their profile</span>
      ) : (
        <span className="font-semibold text-comic-red-deep">No phone on file: enter one</span>
      )}
    </p>
  )
}

/**
 * On-spot registration for students who turn up without registering online. Registers them (as one team when a
 * team name is given) and marks them present. Deadline, seat limit, clashes and team size don't apply, but every
 * student needs a phone number on file: enter one for anyone who hasn't added theirs.
 */
function SpotRegisterPanel({ event, onDone }: { event: Event; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<SpotEntry[]>([{ ...EMPTY_ROW }])
  const [teamName, setTeamName] = useState('')
  const slots = event.schedule_slots ?? []
  const [slotId, setSlotId] = useState(slots.length === 1 ? slots[0].id : '')
  const teamEvent = event.event_format !== 'individual'

  const save = useMutation({
    mutationFn: () =>
      spotRegister(
        event.id,
        rows
          .filter((r) => r.register_number.trim())
          .map((r) => ({ register_number: r.register_number.trim(), ...(r.phone?.trim() ? { phone: r.phone.trim() } : {}) })),
        teamEvent ? teamName.trim() || null : null,
        slotId || null
      ),
    onSuccess: (res) => {
      if (!res.success) return toast.error(res.message, { duration: 6000 })
      toast.success(res.message)
      setRows([{ ...EMPTY_ROW }])
      setTeamName('')
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const setRow = (i: number, patch: Partial<SpotEntry>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  // Look students up as their register numbers are typed: name, class, and whether a phone is on file.
  const typed = [...new Set(rows.map((r) => r.register_number.trim()).filter((n) => /^\d{7,}$/.test(n)))].sort()
  const { data: found = [], isFetching: looking } = useQuery({
    queryKey: ['spot-lookup', typed],
    queryFn: () => lookupStudents(typed),
    enabled: typed.length > 0,
    staleTime: 30_000,
  })
  const byNumber = new Map(found.map((s) => [s.register_number, s]))

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4" /> On-spot registration
      </Button>
    )
  }

  return (
    <Panel title="On-spot registration">
      <p className="text-sm text-ink/60 -mt-2 mb-4">
        For students who turned up without registering. They are registered and marked present. The deadline, seat limit, time
        clashes and team size don't apply. Add a phone number for anyone who hasn't added one to their profile.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!rows.some((r) => r.register_number.trim())) return toast.error('Add at least one register number.')
          if (slots.length > 1 && !slotId) return toast.error('Pick the session.')
          save.mutate()
        }}
        className="space-y-3"
      >
        {teamEvent && (
          <Input
            label={event.event_format === 'team' ? 'Team name' : 'Team name (leave empty for solo entries)'}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={60}
          />
        )}
        {slots.length > 1 && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Session
            <select value={slotId} onChange={(e) => setSlotId(e.target.value)} className={selectClass}>
              <option value="">Choose the session…</option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.starts_at ? `${formatTime(s.starts_at).toUpperCase()} session` : s.slot_title ?? 'Session'}
                </option>
              ))}
            </select>
          </label>
        )}

        {rows.map((r, i) => (
          <div key={i}>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40">
              <Input
                label={i === 0 && teamName.trim() ? 'Register no. (leader)' : 'Register no.'}
                value={r.register_number}
                inputMode="numeric"
                onChange={(e) => setRow(i, { register_number: e.target.value })}
              />
            </div>
            <div className="w-48">
              <Input label="Phone (if not on file)" value={r.phone ?? ''} inputMode="tel" onChange={(e) => setRow(i, { phone: e.target.value })} />
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                aria-label="Remove this student"
                className="mb-2 p-1.5 text-ink/50 hover:text-comic-red-deep"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <StudentHint number={r.register_number.trim()} student={byNumber.get(r.register_number.trim())} looking={looking} phoneTyped={Boolean(r.phone?.trim())} />
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW }])}>
            <Plus className="w-4 h-4" /> Add another student
          </Button>
          <Button type="submit" size="sm" isLoading={save.isPending}>
            <UserPlus className="w-4 h-4" /> Register and mark present
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </form>
    </Panel>
  )
}
