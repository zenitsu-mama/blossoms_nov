import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  MapPin,
  Clock,
  Search,
  Table as TableIcon,
  LayoutGrid,
  Filter,
  ChevronRight,
} from 'lucide-react'
import { MASTER_SCHEDULE } from '@/lib/data/masterSchedule'
import { EventSheet } from '@/components/events/EventSheet'
import { getEvents } from '@/lib/api/events'
import { primarySlot, slotDate } from '@/lib/eventDisplay'
import type { Event } from '@/types'

type MonthFilter = 'all' | 'nov' | 'dec'

const DIVISION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Arts: { bg: 'bg-[#ed1e79]/15', text: 'text-[#ed1e79]', border: 'border-[#ed1e79]' },
  Literary: { bg: 'bg-[#0088e8]/15', text: 'text-[#0088e8]', border: 'border-[#0088e8]' },
  Stage: { bg: 'bg-[#fdb813]/25', text: 'text-[#946200]', border: 'border-[#fdb813]' },
  Theatre: { bg: 'bg-[#861ec2]/15', text: 'text-[#861ec2]', border: 'border-[#861ec2]' },
  Inauguration: { bg: 'bg-[#00966b]/15', text: 'text-[#00966b]', border: 'border-[#00966b]' },
  'Off Day': { bg: 'bg-neutral-200/60', text: 'text-neutral-600', border: 'border-neutral-300' },
  Holiday: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
}

const normaliseTitle = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '')

/**
 * The button that opens the shared event popup for one schedule row. Rows are matched to events by title,
 * so two events on the same day each get only their own button.
 */
function EventButtons({ name, isoDate, events, onOpen }: { name: string; isoDate: string; events: Event[]; onOpen: (e: Event) => void }) {
  const wanted = normaliseTitle(name)
  const byTitle = events.filter((e) => normaliseTitle(e.title) === wanted)
  // Prefer the event on this row's date if two share a title; fall back to the title match alone.
  const onDay = byTitle.filter((e) => slotDate(primarySlot(e)) === isoDate)
  const today = onDay.length > 0 ? onDay : byTitle
  if (today.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {today.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onOpen(e)}
          className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink bg-blossoms-yellow px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow-[1.5px_1.5px_0px_var(--color-ink)] hover:bg-white active:translate-y-px"
        >
          {e.registration_enabled === false ? 'Details' : 'Details & register'}: {e.title}
        </button>
      ))}
    </div>
  )
}

export default function SchedulePage() {
  const { data: events = [] } = useQuery({ queryKey: ['events', 'all'], queryFn: () => getEvents() })
  const [openEvent, setOpenEvent] = useState<Event | null>(null)
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all')
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline')
  const [search, setSearch] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Unique dates for horizontal date picker in mobile
  const uniqueDates = useMemo(() => {
    const list: Array<{ dateStr: string; dayNum: string; monthName: string; dayShort: string }> = []
    const seen = new Set<string>()
    for (const item of MASTER_SCHEDULE) {
      if (!seen.has(item.dateStr)) {
        seen.add(item.dateStr)
        const [d, m] = item.dateStr.split('-')
        list.push({
          dateStr: item.dateStr,
          dayNum: d,
          monthName: m === '11' ? 'Nov' : 'Dec',
          dayShort: item.day.slice(0, 3),
        })
      }
    }
    return list
  }, [])

  const filteredEntries = useMemo(() => {
    return MASTER_SCHEDULE.filter((entry) => {
      // 1. Month filter
      if (monthFilter === 'nov' && !entry.dateStr.includes('-11-')) return false
      if (monthFilter === 'dec' && !entry.dateStr.includes('-12-')) return false

      // 2. Division filter (Mobile & Desktop)
      if (divisionFilter !== 'all' && entry.division !== divisionFilter) return false

      // 4. Search query
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchesName = entry.eventName.toLowerCase().includes(query)
        const matchesVenue = entry.venue.toLowerCase().includes(query)
        const matchesDate = entry.dateStr.toLowerCase().includes(query)
        const matchesDay = entry.day.toLowerCase().includes(query)
        if (!matchesName && !matchesVenue && !matchesDate && !matchesDay) {
          return false
        }
      }

      return true
    })
  }, [monthFilter, divisionFilter, search])

  function handleScrollRight() {
    if (scrollerRef.current) {
      scrollerRef.current.scrollBy({ left: 160, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-ink pb-24">
      {/* ======================================================================= */}
      {/* ── MOBILE VIEWPORT: Authentic Comic Reference Design (md:hidden) ───── */}
      {/* ======================================================================= */}
      <div className="md:hidden px-4 pt-6 space-y-4">
        {/* Comic Header: SCHEDULE + Action Rays + Calendar Icon */}
        <div className="text-center pt-2 pb-2">
          <div className="inline-flex items-center justify-center gap-2">
            {/* Left 3 Comic Burst Rays */}
            <div className="flex flex-col gap-1 items-end mr-1 text-ink" aria-hidden="true">
              <div className="w-3.5 h-[2.5px] bg-ink rounded-full rotate-[25deg]" />
              <div className="w-4.5 h-[2.5px] bg-ink rounded-full" />
              <div className="w-3.5 h-[2.5px] bg-ink rounded-full -rotate-[25deg]" />
            </div>

            {/* SCHEDULE badge with yellow splash */}
            <div className="relative inline-block">
              <div
                className="absolute inset-0 bg-[#FFD43B] border-2 border-ink rounded-xl -rotate-1 shadow-[2.5px_2.5px_0px_#151515]"
                aria-hidden="true"
              />
              <h1 className="relative font-display italic font-black text-4xl text-ink tracking-wider px-3.5 py-1">
                SCHEDULE
              </h1>
            </div>

            {/* Right Calendar Icon with Comic Action Rays */}
            <div className="relative ml-1.5 flex flex-col items-center" aria-hidden="true">
              {/* Rays */}
              <div className="flex items-end justify-center gap-1 mb-0.5">
                <div className="w-2.5 h-[2px] bg-ink rounded-full -rotate-45" />
                <div className="w-3 h-[2px] bg-ink rounded-full -rotate-90" />
                <div className="w-2.5 h-[2px] bg-ink rounded-full rotate-45" />
              </div>
              {/* Calendar block */}
              <div className="w-9 h-9 bg-white border-2 border-ink rounded-lg shadow-[2px_2px_0px_#151515] overflow-hidden flex flex-col">
                <div className="bg-[#FFD43B] border-b-2 border-ink h-2.5 flex items-center justify-around px-1">
                  <div className="w-1 h-1 rounded-full bg-ink" />
                  <div className="w-1 h-1 rounded-full bg-ink" />
                </div>
                <div className="p-1 grid grid-cols-4 gap-0.5 flex-1 items-center">
                  <div className="w-1 h-1 bg-ink rounded-sm" />
                  <div className="w-1 h-1 bg-ink rounded-sm" />
                  <div className="w-1 h-1 bg-ink rounded-sm" />
                  <div className="w-1 h-1 bg-ink rounded-sm" />
                  <div className="w-1 h-1 bg-[#e51e25] rounded-sm" />
                  <div className="w-1 h-1 bg-ink rounded-sm" />
                  <div className="w-1 h-1 bg-ink rounded-sm" />
                  <div className="w-1 h-1 bg-ink rounded-sm" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm font-semibold text-ink mt-2">
            All events, at a glance.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/60" />
          <input
            type="text"
            placeholder="Search event, venue or teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-ink rounded-2xl text-xs font-bold text-ink placeholder:text-ink/40 focus:outline-none shadow-[1px_1px_0px_#151515]"
          />
        </div>

        {/* Filter Row: All Dates, All Arenas, Sliders */}
        <div className="flex items-center gap-2">
          {/* All Dates Dropdown */}
          <div className="relative flex-1">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value as MonthFilter)}
              className="w-full appearance-none bg-[#48206d] text-white border-2 border-ink rounded-full px-4 py-2 text-xs font-bold focus:outline-none shadow-[1.5px_1.5px_0px_#151515] cursor-pointer"
            >
              <option value="all" className="bg-white text-ink font-semibold">All Dates</option>
              <option value="nov" className="bg-white text-ink font-semibold">November 2026</option>
              <option value="dec" className="bg-white text-ink font-semibold">December 2026</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white text-[10px]">
              ▼
            </div>
          </div>

          {/* All Arenas Dropdown */}
          <div className="relative flex-1">
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full appearance-none bg-white text-ink border-2 border-ink rounded-full px-4 py-2 text-xs font-bold focus:outline-none shadow-[1.5px_1.5px_0px_#151515] cursor-pointer"
            >
              <option value="all">All Arenas</option>
              <option value="Literary">Literary</option>
              <option value="Arts">Fine Arts</option>
              <option value="Stage">Stage</option>
              <option value="Theatre">Theatre</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink text-[10px]">
              ▼
            </div>
          </div>

        </div>

        {/* Horizontal Date Picker Cards Row */}
        <div className="flex items-center gap-2 pt-1">
          <div
            ref={scrollerRef}
            className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {uniqueDates.map((item) => {
              const isSelected = selectedDate === item.dateStr
              return (
                <button
                  key={item.dateStr}
                  onClick={() => {
                    if (selectedDate === item.dateStr) {
                      setSelectedDate('')
                    } else {
                      setSelectedDate(item.dateStr)
                    }
                  }}
                  className={`flex-shrink-0 w-[58px] py-2 px-1 rounded-2xl border-2 border-ink text-center transition-all ${
                    isSelected
                      ? 'bg-[#48206d] text-white shadow-[2px_2px_0px_#151515] translate-y-[-1px]'
                      : 'bg-white text-ink shadow-[1px_1px_0px_#151515]'
                  }`}
                >
                  <p className="font-bold text-lg leading-tight">{item.dayNum}</p>
                  <p className="text-[10px] font-bold leading-tight mt-0.5">{item.monthName}</p>
                  <p className="text-[10px] font-bold leading-tight opacity-80">{item.dayShort}</p>
                </button>
              )
            })}
          </div>

          {/* Arrow button */}
          <button
            onClick={handleScrollRight}
            className="w-9 h-9 flex-shrink-0 bg-white border-2 border-ink rounded-full flex items-center justify-center shadow-[1px_1px_0px_#151515]"
            aria-label="Scroll dates forward"
          >
            <ChevronRight className="w-4 h-4 text-ink" />
          </button>
        </div>

        {/* Schedule Cards List */}
        <div className="space-y-3 pt-2">
          {filteredEntries
            .filter((e) => (selectedDate ? e.dateStr === selectedDate || !selectedDate : true))
            .map((entry) => {
              const [dayNum, monthNum] = entry.dateStr.split('-')
              const monthName = monthNum === '11' ? 'NOV' : 'DEC'
              const dayShort = entry.day.slice(0, 3).toUpperCase()
              const isOffDay = entry.isOffDay || entry.isHoliday

              return (
                <div
                  key={entry.id}
                  className="bg-white border-[1.5px] border-[#151515] rounded-[16px] overflow-hidden flex flex-row shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  {/* Left Date Block */}
                  <div className="w-[74px] bg-[#ECE6F2] py-3.5 px-2 flex flex-col items-center justify-center text-center shrink-0">
                    <span className="font-bold text-[24px] text-[#111] leading-none">{dayNum}</span>
                    <span className="text-[10.5px] font-black uppercase text-[#111] tracking-wider mt-1">{monthName}</span>
                    <span className="text-[10.5px] font-bold uppercase text-[#111]/75 tracking-wide">{dayShort}</span>
                  </div>

                  {/* Inset Vertical Divider Line */}
                  <div className="w-[1.5px] bg-[#151515] my-2.5 shrink-0" />

                  {/* Right Content Area */}
                  <div className="flex-1 py-3 px-3.5 flex flex-col justify-between min-w-0">
                    {isOffDay ? (
                      <div className="flex items-center justify-between gap-2 h-full py-2">
                        <h2 className="font-display text-lg text-ink uppercase tracking-[0.05em] [word-spacing:0.1em] leading-tight [text-shadow:1.5px_2px_0_rgba(121,63,152,0.35)]">
                          {entry.eventName}
                        </h2>
                        <span className="shrink-0 rounded-full px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider border-[1.5px] border-[#888888] bg-[#F2F2F2] text-[#666666]">
                          {entry.division}
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Top Row: Event Title + Division Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-display text-[16.5px] text-ink uppercase tracking-[0.05em] [word-spacing:0.1em] leading-tight [text-shadow:1.5px_2px_0_rgba(121,63,152,0.35)] line-clamp-1">
                            {entry.eventName}
                          </h2>

                          {/* Division Pill Badge */}
                          <span
                            className={`shrink-0 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider border-[1.5px] ${
                              entry.division === 'Inauguration'
                                ? 'border-[#00966b] bg-[#e8f8f2] text-[#00966b]'
                                : entry.division === 'Literary'
                                ? 'border-[#0088e8] bg-[#eaf5fd] text-[#0088e8]'
                                : entry.division === 'Arts'
                                ? 'border-[#ed1e79] bg-[#fdebf3] text-[#ed1e79]'
                                : entry.division === 'Stage'
                                ? 'border-[#e5a800] bg-[#fff8e6] text-[#996500]'
                                : entry.division === 'Theatre'
                                ? 'border-[#861ec2] bg-[#f7eefb] text-[#861ec2]'
                                : 'border-[#888888] bg-[#f2f2f2] text-[#666666]'
                            }`}
                          >
                            {entry.division}
                          </span>
                        </div>

                        {/* Middle Details: Time & Venue */}
                        <div className="space-y-1.5 mt-1.5 text-xs text-neutral-800">
                          {entry.timings && (
                            <div className="flex items-center gap-2 font-medium text-[12px] text-[#222]">
                              <Clock className="w-4 h-4 text-[#793f98] shrink-0" />
                              <span className="truncate">{entry.timings}</span>
                            </div>
                          )}
                          {entry.venue && (
                            <div className="flex items-center gap-2 font-medium text-[12px] text-[#222]">
                              <MapPin className="w-4 h-4 text-[#e51e25] shrink-0" />
                              <span className="truncate">{entry.venue}</span>
                            </div>
                          )}
                        </div>

                        <EventButtons name={entry.eventName} isoDate={entry.isoDate} events={events} onOpen={setOpenEvent} />
                      </>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* ── DESKTOP VIEWPORT: Existing Responsive Desktop Layout (hidden md:block) */}
      {/* ======================================================================= */}
      <div className="hidden md:block">
        {/* ── Compact Filter Header Bar ─────────────────────────── */}
        <section className="relative border-b-3 border-ink bg-gradient-to-r from-comic-yellow/30 via-primary/10 to-comic-red/10 py-6 px-4 overflow-hidden">
          {/* Halftone dot pattern overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #0f0f0f 1.5px, transparent 1.5px)',
              backgroundSize: '18px 18px',
            }}
          />

          <div className="relative z-10 mx-auto max-w-[1240px]">
            {/* Search & View Mode Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50" />
                <input
                  type="text"
                  placeholder="Search events, venues, dates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-white border-2 border-ink rounded-full shadow-comic-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white border-2 border-ink rounded-full p-1 shadow-comic-sm">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'timeline' ? 'bg-ink text-white' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Timeline</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'table' ? 'bg-ink text-white' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
              </div>
            </div>

            {/* Month Filters & Off-day toggle */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/60 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Month:
              </span>

              {(
                [
                  { id: 'all', label: 'All Dates' },
                  { id: 'nov', label: 'November 2026' },
                  { id: 'dec', label: 'December 2026' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMonthFilter(m.id)}
                  className={`cursor-pointer px-3 py-1 text-xs font-bold rounded-full border-2 border-ink transition-all ${
                    monthFilter === m.id
                      ? 'bg-primary text-white shadow-comic-sm'
                      : 'bg-white text-ink hover:bg-neutral-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}

            </div>
          </div>
        </section>

        {/* Main Schedule Content */}
        <main className="mx-auto max-w-[1240px] px-4 pt-10">
          {filteredEntries.length === 0 ? (
            <div className="bg-white border-3 border-ink rounded-[16px] p-12 text-center shadow-comic-md">
              <CalendarDays className="w-12 h-12 text-ink/30 mx-auto mb-3" />
              <h3 className="font-display text-2xl text-ink font-bold">No events matched your search</h3>
              <p className="text-xs text-ink/60 mt-1 max-w-md mx-auto">
                Try clearing your search terms or resetting the month filter to see the complete festival schedule.
              </p>
              <button
                onClick={() => {
                  setSearch('')
                  setMonthFilter('all')
                }}
                className="mt-4 px-4 py-1.5 bg-comic-yellow text-ink text-xs font-bold rounded-full border-2 border-ink shadow-comic-sm"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'timeline' ? (
            /* Timeline Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEntries.map((entry) => {
                const colors = DIVISION_COLORS[entry.division] || DIVISION_COLORS['Off Day']
                const isNonEvent = entry.isOffDay || entry.isHoliday

                return (
                  <div
                    key={entry.id}
                    className={`relative bg-white border-3 border-ink rounded-[16px] overflow-hidden shadow-comic-md flex flex-col justify-between transition-all duration-200 hover:translate-y-[-3px] hover:shadow-comic-lg ${
                      isNonEvent ? 'opacity-80 bg-neutral-50' : ''
                    }`}
                  >
                    <div className="p-4 pb-3 border-b-2 border-ink bg-[#faf8f5] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-ink text-white font-display text-xs px-2.5 py-1 rounded-md tracking-[0.08em]">
                          {entry.dateStr}
                        </div>
                        <span className="font-bold text-xs text-ink/80">{entry.day}</span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {entry.division}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display text-xl text-ink font-normal tracking-[0.05em] [word-spacing:0.1em] leading-tight [text-shadow:1.5px_2px_0_rgba(121,63,152,0.35)] mb-2">
                          {entry.eventName}
                        </h3>

                        {!isNonEvent && (
                          <div className="space-y-1.5 text-xs text-ink/75">
                            {entry.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-comic-red shrink-0" />
                                <span className="font-semibold">{entry.venue}</span>
                              </div>
                            )}
                            {entry.timings && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{entry.timings}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!isNonEvent && <EventButtons name={entry.eventName} isoDate={entry.isoDate} events={events} onOpen={setOpenEvent} />}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white border-3 border-ink rounded-[16px] overflow-hidden shadow-comic-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-ink text-white border-b-2 border-ink">
                      <th className="py-3 px-4 font-display uppercase tracking-wider">Date &amp; Day</th>
                      <th className="py-3 px-4 font-display uppercase tracking-wider">Competition / Session</th>
                      <th className="py-3 px-4 font-display uppercase tracking-wider">Division</th>
                      <th className="py-3 px-4 font-display uppercase tracking-wider">Venue</th>
                      <th className="py-3 px-4 font-display uppercase tracking-wider">Timings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-ink/10 transition-colors hover:bg-comic-yellow/15 ${
                          idx % 2 === 0 ? 'bg-[#faf8f5]' : 'bg-white'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-ink whitespace-nowrap">
                          {entry.dateStr} ({entry.day.slice(0, 3)})
                        </td>
                        <td className="py-3 px-4 font-display text-sm text-ink font-normal tracking-[0.05em] [word-spacing:0.1em]">
                          {entry.eventName}
                          {!(entry.isOffDay || entry.isHoliday) && <EventButtons name={entry.eventName} isoDate={entry.isoDate} events={events} onOpen={setOpenEvent} />}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold">{entry.division}</span>
                        </td>
                        <td className="py-3 px-4">{entry.venue}</td>
                        <td className="py-3 px-4">{entry.timings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
      {openEvent && <EventSheet event={openEvent} onClose={() => setOpenEvent(null)} />}
    </div>
  )
}
