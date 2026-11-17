import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { deleteRegistration, getParticipationRows, type ParticipationRow } from '@/lib/api/admin'
import { formatDateTime } from '@/lib/eventDisplay'
import { ClassSelect, DataTable, EventSelect, Muted, PageHeader, Panel, SearchBox, SortTh, useAdminEvents, useEventAccess, useSort } from './AdminUI'

const PAGE = 200

export default function AdminRegistrations() {
  const [eventId, setEventId] = useState('')
  const [className, setClassName] = useState('')
  const [search, setSearch] = useState('')
  const { data: events = [] } = useAdminEvents()
  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-participation'],
    queryFn: getParticipationRows,
  })

  const eventTitle = events.find((e) => e.id === eventId)?.title
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (!eventTitle || r.event_title === eventTitle) &&
        (!className || r.class_name === className) &&
        (!q || r.full_name.toLowerCase().includes(q) || r.register_number.startsWith(q) || (r.team_name ?? '').toLowerCase().includes(q))
    )
  }, [rows, eventTitle, className, search])

  const { sorted, sort, toggle } = useSort(filtered, {
    student: (r) => r.full_name,
    class: (r) => r.class_name,
    event: (r) => r.event_title,
    team: (r) => r.team_name,
    registered: (r) => r.registered_at,
    attendance: (r) => (r.attendance_status === 'present' ? 0 : r.attendance_status === 'absent' ? 1 : null),
  })

  const access = useEventAccess()
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: (r: ParticipationRow) => deleteRegistration(r.registration_id),
    onSuccess: (res) => {
      if (!res.success) return toast.error(res.message, { duration: 6000 })
      toast.success(res.message)
      // Rosters, attendance, defaulters, teams and points can all change.
      void queryClient.invalidateQueries()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function askDelete(r: ParticipationRow) {
    const team = r.team_name ? ` They will be removed from team "${r.team_name}"${r.is_leader ? ' (they are its leader; the next member becomes leader)' : ''}.` : ''
    const ok = await confirmDialog(
      `Are you sure? ${r.full_name} (${r.register_number}, ${r.class_name ?? 'no class'})'s registration for ${r.event_title} is going to be deleted, along with their attendance for it.${team} This cannot be undone.`,
      { title: 'Delete this registration?', confirmLabel: 'Yes, delete', cancelLabel: 'Keep it', danger: true }
    )
    if (ok) remove.mutate(r)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Registrations" description="Every active registration. Filter by event or class, or search by student or team." />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <EventSelect value={eventId} onChange={setEventId} includeAll />
        </div>
        <ClassSelect value={className} onChange={setClassName} />
        <SearchBox value={search} onChange={setSearch} placeholder="Name, register number or team" />
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <ErrorState description={(error as Error).message} retry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <Muted>No registrations match.</Muted>
      ) : (
        <Panel title={`${filtered.length.toLocaleString()} registrations`}>
          <DataTable>
            <thead>
              <tr>
                <SortTh label="Student" sortKey="student" sort={sort} onSort={toggle} />
                <SortTh label="Class" sortKey="class" sort={sort} onSort={toggle} />
                <SortTh label="Event" sortKey="event" sort={sort} onSort={toggle} />
                <SortTh label="Team" sortKey="team" sort={sort} onSort={toggle} />
                <SortTh label="Registered" sortKey="registered" sort={sort} onSort={toggle} />
                <SortTh label="Attendance" sortKey="attendance" sort={sort} onSort={toggle} />
                <th><span className="sr-only">Delete</span></th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, PAGE).map((r) => (
                <tr key={r.registration_id}>
                  <td>
                    <p className="font-semibold">{r.full_name}</p>
                    <p className="text-xs text-ink/50 tabular-nums">
                      {r.register_number}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </p>
                  </td>
                  <td className="text-xs">{r.class_name}</td>
                  <td className="text-xs">
                    {r.event_title}
                    <span className="block text-ink/50">{r.category}</span>
                  </td>
                  <td className="text-xs">
                    {r.team_name ?? '—'}
                    {r.is_leader && r.team_name && <span className="ml-1 font-bold text-primary">(leader)</span>}
                  </td>
                  <td className="text-xs whitespace-nowrap">{formatDateTime(r.registered_at)}</td>
                  <td>
                    {r.attendance_status === 'present' ? (
                      <Badge variant="green">Present</Badge>
                    ) : r.attendance_status === 'absent' ? (
                      <Badge variant="red">Absent</Badge>
                    ) : (
                      <span className="text-xs text-ink/40">—</span>
                    )}
                  </td>
                  <td>
                    {access.canManage(r.event_id) && (
                      <button
                        type="button"
                        onClick={() => void askDelete(r)}
                        disabled={remove.isPending}
                        aria-label={`Delete ${r.full_name}'s registration for ${r.event_title}`}
                        title="Delete registration"
                        className="p-1.5 rounded-lg text-ink/40 hover:text-comic-red-deep hover:bg-comic-red-deep/10 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {filtered.length > PAGE && (
            <p className="text-xs text-ink/60 mt-3">
              Showing the first {PAGE}. Narrow the filters, or download the full list from Exports.
            </p>
          )}
        </Panel>
      )}
    </div>
  )
}
