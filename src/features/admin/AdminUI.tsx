// Shared building blocks for admin pages, in the Blossoms comic design system.
import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DisplayText } from '@/components/comic/ComicPrimitives'
import { getAllEventsForAdmin } from '@/lib/api/events'
import { getClassList, listAssignments } from '@/lib/api/admin'
import { useAuth } from '@/lib/auth/authStore'
import { cn } from '@/lib/utils'

/**
 * Who may change an event: super admins and content editors change every event; a coordinator only the events
 * assigned to them. Everyone else (coordinators with no events, analysts) can view and export but not change.
 * The database enforces the same rule; this only hides controls that would be refused.
 */
export function useEventAccess() {
  const { admin } = useAuth()
  const all = admin?.role === 'super_admin' || admin?.role === 'content_editor'
  const { data, isLoading } = useQuery({
    queryKey: ['my-event-assignments', admin?.id],
    queryFn: listAssignments,
    enabled: Boolean(admin) && !all,
  })
  const mine = new Set((data ?? []).filter((a) => a.admin_profile_id === admin?.id).map((a) => a.event_id))
  return {
    /** True while unknown, so editors never see a flash of "view only". */
    canManage: (eventId?: string | null) => all || (Boolean(eventId) && (isLoading || mine.has(eventId!))),
    canManageAny: all || isLoading || mine.size > 0,
  }
}

/** Banner for an event the admin can see but not change. */
export function ViewOnlyNote({ what = 'this event' }: { what?: string }) {
  return (
    <p className="rounded-xl border-2 border-ink bg-[#FFD43B] px-4 py-2 text-sm font-semibold text-ink">
      View only. You aren&apos;t assigned to {what}, so you can look and export but not make changes. A super admin can
      assign you in Admins &amp; contacts.
    </p>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <DisplayText as="h1" className="text-4xl">{title}</DisplayText>
        {description && <p className="text-sm text-ink/60 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function StatTile({ label, value, sub, tone = 'text-ink' }: { label: string; value: React.ReactNode; sub?: string; tone?: string }) {
  return (
    <div className="comic-card p-5 bg-white">
      <p className={cn('font-display text-4xl tabular-nums', tone)}>{value}</p>
      <p className="text-sm font-bold text-ink mt-1">{label}</p>
      {sub && <p className="text-xs text-ink/50 mt-0.5">{sub}</p>}
    </div>
  )
}

export function Panel({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('comic-card bg-white p-5', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          {title && <h2 className="font-display text-2xl text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

/** Horizontal scroll wrapper + consistent table styling. */
export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto -mx-5 px-5', className)}>
      <table className="w-full text-sm border-collapse [&_th]:text-left [&_th]:font-display [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-xs [&_th]:text-ink/60 [&_th]:py-2 [&_th]:px-2 [&_th]:border-b-2 [&_th]:border-ink [&_td]:py-2 [&_td]:px-2 [&_td]:border-b [&_td]:border-ink/10 [&_td]:align-top">
        {children}
      </table>
    </div>
  )
}

export const selectClass =
  'rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold text-ink focus:outline-none focus:border-primary min-h-[40px]'

export function useAdminEvents() {
  return useQuery({ queryKey: ['admin-events'], queryFn: getAllEventsForAdmin })
}

export function EventSelect({
  value,
  onChange,
  includeAll,
  registrableOnly = true,
  id = 'event-select',
  label = 'Event',
}: {
  value: string
  onChange: (id: string) => void
  includeAll?: boolean
  registrableOnly?: boolean
  id?: string
  label?: string
}) {
  const { data: events = [] } = useAdminEvents()
  const list = registrableOnly ? events.filter((e) => e.registration_enabled !== false) : events
  const groups = new Map<string, typeof list>()
  for (const e of list) {
    const key = e.category?.name ?? 'Other'
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm font-semibold text-ink">
      {label}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {includeAll ? <option value="">All events</option> : <option value="">Choose an event…</option>}
        {[...groups.entries()].map(([cat, evs]) => (
          <optgroup key={cat} label={cat}>
            {evs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

export function ClassSelect({ value, onChange, id = 'class-select' }: { value: string; onChange: (c: string) => void; id?: string }) {
  const { data: classes = [] } = useQuery({ queryKey: ['admin-classes'], queryFn: getClassList })
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm font-semibold text-ink">
      Class
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">All classes</option>
        {classes.map((c) => (
          <option key={c.class_name} value={c.class_name}>
            {c.class_name} ({c.students})
          </option>
        ))}
      </select>
    </label>
  )
}

export function SearchBox({ value, onChange, placeholder, id = 'admin-search' }: { value: string; onChange: (v: string) => void; placeholder: string; id?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm font-semibold text-ink flex-1 min-w-[200px]">
      Search
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-primary min-h-[40px]"
      />
    </label>
  )
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink/60 py-6 text-center">{children}</p>
}

export function percent(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : '—'
}

// ── Column sorting ────────────────────────────────────────────────────────────
export type SortDir = 'asc' | 'desc'
export interface SortState {
  key: string
  dir: SortDir
}
type SortValue = string | number | boolean | null | undefined

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function compareValues(a: SortValue, b: SortValue): number {
  // Empty values always sink to the bottom, whichever way the column is sorted.
  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/**
 * Click-to-sort for admin tables. Pass the rows and one accessor per sortable column;
 * each header click cycles ascending, descending, then back to the original order.
 */
export function useSort<T>(rows: T[], accessors: Record<string, (row: T) => SortValue>, initial: SortState | null = null) {
  const [sort, setSort] = React.useState<SortState | null>(initial)

  const sorted = React.useMemo(() => {
    const get = sort ? accessors[sort.key] : undefined
    if (!sort || !get) return rows
    const factor = sort.dir === 'asc' ? 1 : -1
    return rows
      .map((row, index) => ({ row, index }))
      .sort((x, y) => {
        const a = get(x.row)
        const b = get(y.row)
        const aEmpty = a === null || a === undefined || a === ''
        const bEmpty = b === null || b === undefined || b === ''
        const order = aEmpty || bEmpty ? compareValues(a, b) : compareValues(a, b) * factor
        return order || x.index - y.index
      })
      .map((entry) => entry.row)
    // accessors are defined inline by callers and only read by key, so they are not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort])

  const toggle = React.useCallback((key: string) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: 'asc' }
      if (current.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }, [])

  return { sorted, sort, toggle }
}

/** A column header that sorts its table when clicked. Leave `sortKey` off for a plain header. */
export function SortTh({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: React.ReactNode
  sortKey: string
  sort: SortState | null
  onSort: (key: string) => void
  className?: string
}) {
  const active = sort?.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={className} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wider font-display hover:text-ink focus-visible:outline-2 focus-visible:outline-primary rounded',
          active ? 'text-ink' : 'text-ink/60',
          className?.includes('text-right') && 'flex-row-reverse'
        )}
      >
        {label}
        <Icon className={cn('w-3 h-3 shrink-0', !active && 'opacity-40')} aria-hidden="true" />
      </button>
    </th>
  )
}
