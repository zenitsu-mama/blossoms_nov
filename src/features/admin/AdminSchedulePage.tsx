import { useState, useMemo } from 'react'
import { DisplayText } from '@/components/comic/ComicPrimitives'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Download, FileText, Pencil } from 'lucide-react'
import { getSchedule } from '@/lib/api/events'
import { SortTh, useSort } from './AdminUI'

export default function AdminSchedulePage() {
  const [search, setSearch] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState<'all' | 'nov' | 'dec'>('all')
  // Live timetable: edit an event's sessions in its editor and this list follows.
  const { data: schedule = [], isLoading } = useQuery({ queryKey: ['schedule'], queryFn: getSchedule })

  const filteredEntries = useMemo(() => {
    return schedule.filter((entry) => {
      if (divisionFilter !== 'all' && entry.division !== divisionFilter) return false
      if (monthFilter === 'nov' && !entry.dateStr.includes('-11-')) return false
      if (monthFilter === 'dec' && !entry.dateStr.includes('-12-')) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          entry.eventName.toLowerCase().includes(q) ||
          entry.venue.toLowerCase().includes(q) ||
          entry.timings.toLowerCase().includes(q) ||
          entry.dateStr.includes(q) ||
          entry.day.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [schedule, search, divisionFilter, monthFilter])

  const { sorted, sort, toggle } = useSort(filteredEntries, {
    date: (e) => e.isoDate,
    event: (e) => e.eventName,
    division: (e) => e.division,
    venue: (e) => e.venue,
    timings: (e) => e.timings,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <DisplayText as="h1" className="text-4xl">Master Timetable Manager</DisplayText>
          <p className="text-sm text-ink/60 mt-1">
            Live from each event's sessions. To change a date, time or venue, open the event with <strong>Edit</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <a href="/FINAL SCHEDULE.pdf" target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4 text-red-600" /> View Official PDF
            </a>
          </Button>
          <Button asChild variant="primary" className="gap-2">
            <a href="/FINAL SCHEDULE.pdf" download="Blossoms_2026_Final_Schedule.pdf">
              <Download className="w-4 h-4" /> Download PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border-2 border-ink shadow-[2px_2px_0px_#151515]">
          <p className="text-xs uppercase font-bold text-ink/50 tracking-wider">Scheduled Slots</p>
          <p className="font-display text-3xl text-ink mt-0.5">{schedule.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border-2 border-ink shadow-[2px_2px_0px_#151515]">
          <p className="text-xs uppercase font-bold text-[#793f98] tracking-wider">November Sessions</p>
          <p className="font-display text-3xl text-[#793f98] mt-0.5">
            {schedule.filter((s) => s.dateStr.includes('-11-')).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border-2 border-ink shadow-[2px_2px_0px_#151515]">
          <p className="text-xs uppercase font-bold text-[#3478F6] tracking-wider">December Sessions</p>
          <p className="font-display text-3xl text-[#3478F6] mt-0.5">
            {schedule.filter((s) => s.dateStr.includes('-12-')).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border-2 border-ink shadow-[2px_2px_0px_#151515]">
          <p className="text-xs uppercase font-bold text-[#00966b] tracking-wider">Filter Matches</p>
          <p className="font-display text-3xl text-[#00966b] mt-0.5">{filteredEntries.length}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 bg-white rounded-2xl border-2 border-ink shadow-[3px_3px_0px_#151515] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Search by event, venue, timing, or date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FFF8E8] border border-ink rounded-xl text-sm font-semibold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-[#793f98]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value as any)}
            className="px-3 py-2 bg-[#FFF8E8] border border-ink rounded-xl text-xs font-bold text-ink uppercase tracking-wider focus:outline-none"
          >
            <option value="all">All Months</option>
            <option value="nov">November 2026</option>
            <option value="dec">December 2026</option>
          </select>

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3 py-2 bg-[#FFF8E8] border border-ink rounded-xl text-xs font-bold text-ink uppercase tracking-wider focus:outline-none"
          >
            <option value="all">All Divisions</option>
            <option value="Arts">Fine Arts</option>
            <option value="Literary">Literary</option>
            <option value="Stage">Stage</option>
            <option value="Theatre">Theatre</option>
            <option value="Inauguration">Inauguration</option>
          </select>
        </div>
      </div>

      {/* Timetable Table */}
      <div className="comic-card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead className="border-b-2 border-ink bg-[#FFF8E8]">
              <tr>
                <SortTh label="Date &amp; Day" sortKey="date" sort={sort} onSort={toggle} className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-ink" />
                <SortTh label="Competition Event" sortKey="event" sort={sort} onSort={toggle} className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-ink" />
                <SortTh label="Division" sortKey="division" sort={sort} onSort={toggle} className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-ink" />
                <SortTh label="Venue Allocation" sortKey="venue" sort={sort} onSort={toggle} className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-ink" />
                <SortTh label="Timings" sortKey="timings" sort={sort} onSort={toggle} className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-ink" />
                <th className="px-4 py-3"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-ink/60">Loading timetable…</td>
                </tr>
              )}
              {sorted.map((entry) => (
                <tr key={entry.id} className="border-b border-ink/10 hover:bg-[#FFF8E8]/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-mono font-bold text-ink">{entry.dateStr}</p>
                    <p className="text-xs text-ink/50 font-semibold">{entry.day}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-display text-base text-ink">{entry.eventName}</p>
                    {entry.status === 'draft' && <p className="text-[11px] font-semibold text-ink/50 uppercase">Draft · hidden on Events page</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant="outline">{entry.division}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#e51e25]" />
                      {entry.venue}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/70">
                    {entry.timings}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {entry.eventId && (
                      <Link to={`/admin/events/${entry.eventId}`} className="inline-flex items-center gap-1 text-xs font-display uppercase tracking-wider text-primary hover:underline">
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
