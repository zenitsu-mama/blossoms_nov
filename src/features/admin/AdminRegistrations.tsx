import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { getParticipationRows } from '@/lib/api/admin'
import { formatDateTime } from '@/lib/eventDisplay'
import { ClassSelect, DataTable, EventSelect, Muted, PageHeader, Panel, SearchBox, SortTh, useAdminEvents, useSort } from './AdminUI'

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
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, PAGE).map((r) => (
                <tr key={`${r.event_title}-${r.register_number}`}>
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
