import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import {
  addClassPoints,
  deleteClassPoints,
  getAdminScoreboard,
  getEventScores,
  getScoringRules,
  listClassPoints,
  listEventScoringTypes,
  setEventScoringType,
  updateScoringRules,
  type ScoreKind,
  type ScoringRules,
  type ScoringType,
} from '@/lib/api/admin'
import { useAuth } from '@/lib/auth/authStore'
import { formatDateTime } from '@/lib/eventDisplay'
import type { Event } from '@/types'
import { DataTable, Muted, Panel, SortTh, selectClass, useAdminEvents, useSort } from './AdminUI'

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${s}`
}

/** "+10", "−2", "1.25" */
function signed(n: number): string {
  const v = Math.round(n * 100) / 100
  return v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0'
}

const KIND_LABEL: Record<ScoreKind, string> = {
  first: '1st prize',
  second: '2nd prize',
  third: '3rd prize',
  participation: 'Participation',
  walkover: 'Walkover',
  not_registered: 'Class not registered',
  extra: 'Extra points',
}

const TYPE_LABEL: Record<ScoringType, string> = { individual: 'Individual', group: 'Group', class_wise: 'Class-wise' }

/** The scoring type an event follows when none is set by hand. */
function formatType(e: Event): string {
  if (e.is_mandatory) return 'Class-wise, as a mandatory event'
  if (e.event_format === 'individual') return 'Individual'
  if (e.event_format === 'team') return 'Group'
  return 'Individual for solo entries, Group for teams'
}

/**
 * The scoring sheet, built into the site. Places come from the Results page, participation from attendance,
 * walkovers from absent marks; only extra points are typed in here. Points, class positions and
 * team positions stay with super admins; the public scoreboard shows team positions (1st–4th) only.
 */
export function ScoreboardPanel() {
  const board = useQuery({ queryKey: ['admin-scoreboard'], queryFn: getAdminScoreboard })
  const rules = useQuery({ queryKey: ['scoring-rules'], queryFn: getScoringRules })

  if (board.isLoading || rules.isLoading) return <Skeleton className="h-96 w-full" />
  if (board.isError) return <ErrorState description={(board.error as Error).message} retry={() => board.refetch()} />
  if (rules.isError || !rules.data) return <ErrorState description={(rules.error as Error)?.message ?? 'Could not load the scoring rules.'} retry={() => rules.refetch()} />

  const rows = board.data ?? []
  const anyPoints = rows.some((r) => Number(r.class_points) !== 0)

  return (
    <>
      <TeamPositions rows={rows} anyPoints={anyPoints} />
      <PointsGuide rules={rules.data} />
      <ManualEntry classNames={rows.map((r) => r.scoring_class)} />
      <EventCheck rules={rules.data} />
      <ClassPositions rows={rows} anyPoints={anyPoints} />
      <History />
    </>
  )
}

// ── 1. Team positions ─────────────────────────────────────────────────────────
function TeamPositions({ rows, anyPoints }: { rows: Awaited<ReturnType<typeof getAdminScoreboard>>; anyPoints: boolean }) {
  const teams = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; color: string; points: number; position: number; classes: number }>()
    for (const r of rows) {
      const t = seen.get(r.team_id) ?? { id: r.team_id, name: r.team_name, color: r.team_color, points: Number(r.team_points), position: r.team_position, classes: 0 }
      t.classes += 1
      seen.set(r.team_id, t)
    }
    return [...seen.values()].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  }, [rows])

  return (
    <Panel title="Scoreboard · team positions">
      <p className="text-sm text-ink/70 -mt-2 mb-4">
        Only super admins see points. The public <Link to="/scoreboard" className="underline font-semibold">scoreboard</Link> shows each
        team's position (1st–4th) and nothing else, and only once “Show the scoreboard to everyone” is ticked above.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {teams.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-xl border-2 border-ink px-3 py-2 shadow-[2px_2px_0_0_#151515]">
            <span className="h-8 w-2 rounded-full border border-ink" style={{ background: t.color }} aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-display uppercase">{t.name}</span>
              <span className="block text-xs text-ink/60 tabular-nums">
                {t.points.toLocaleString()} pts · {t.classes} classes
              </span>
            </span>
            <span className="font-display text-2xl">{anyPoints ? ordinal(t.position) : '—'}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

// ── 2. The guide ──────────────────────────────────────────────────────────────
function PointsGuide({ rules }: { rules: ScoringRules }) {
  const [editing, setEditing] = useState(false)
  const r = rules
  const groupFirst = r.pts_first * r.mult_group

  return (
    <Panel title="Points guide">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display uppercase tracking-wider text-sm mb-2">Points per person</h3>
          <DataTable>
            <thead>
              <tr>
                <th>Result</th>
                <th className="text-right">Points</th>
                <th>Comes from</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1st prize</td><td className="text-right tabular-nums">{signed(r.pts_first)}</td><td rowSpan={3} className="align-middle">Results page (winners)</td></tr>
              <tr><td>2nd prize</td><td className="text-right tabular-nums">{signed(r.pts_second)}</td></tr>
              <tr><td>3rd prize</td><td className="text-right tabular-nums">{signed(r.pts_third)}</td></tr>
              <tr><td>Participation</td><td className="text-right tabular-nums">{signed(r.pts_participation)}</td><td>Attendance page (marked present)</td></tr>
              <tr>
                <td>Walkover</td>
                <td className="text-right tabular-nums">{signed(r.pts_walkover)}</td>
                <td>Automatic: the class had students registered, attendance was taken, and none of them were present. Once per class per event.</td>
              </tr>
              <tr><td>Extra points</td><td className="text-right tabular-nums">any</td><td>Added below, by hand</td></tr>
            </tbody>
          </DataTable>

          <h3 className="font-display uppercase tracking-wider text-sm mt-5 mb-2">Event type multiplier</h3>
          <DataTable>
            <tbody>
              <tr><td>Individual</td><td className="text-right tabular-nums">× {r.mult_individual}</td></tr>
              <tr><td>Group</td><td className="text-right tabular-nums">× {r.mult_group}, split equally among the team</td></tr>
              <tr>
                <td>Class-wise (promotional)</td>
                <td className="text-right tabular-nums">{r.class_wise_active ? `× ${r.mult_class_wise}, split equally` : 'On hold: scores 0'}</td>
              </tr>
            </tbody>
          </DataTable>
        </div>

        <div className="space-y-3 text-sm">
          <h3 className="font-display uppercase tracking-wider text-sm">How to score an event</h3>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              <strong>Mark attendance</strong> on the <Link to="/admin/attendance" className="underline">Attendance</Link> page. Everyone present
              earns participation for their class. For mandatory events, every student counts as present unless marked absent.
            </li>
            <li>
              <strong>Declare 1st, 2nd and 3rd</strong> on the <Link to="/admin/winners" className="underline">Results</Link> page. Winners get
              prize points instead of participation.
            </li>
            <li>
              <strong>Walkovers are automatic</strong> from the absent marks. Add any <strong>extra points</strong> in the box below.
            </li>
            <li>
              <strong>Check the event</strong> in “Check an event” below: it lists exactly what each class got.
            </li>
          </ol>
          <h3 className="font-display uppercase tracking-wider text-sm pt-2">Worked example (group event)</h3>
          <p>
            A team of 4 wins 1st: {r.pts_first} × {r.mult_group} = <strong>{groupFirst}</strong> points for the team, split 4 ways ={' '}
            <strong>{Math.round((groupFirst / 4) * 100) / 100}</strong> each. A member from 5 BCOM B gives 6 BCOM B{' '}
            {Math.round((groupFirst / 4) * 100) / 100}; a member from 3 BCOM A gives 4 BCOM A the same. Classes from different teams
            can be in one group.
          </p>
          <p className="text-ink/70">
            Penalties are {r.penalties_use_multiplier ? 'multiplied by the event type' : 'not multiplied or split'}. Teams' points are the
            total of their classes; the two joint 8th-semester classes count as one class each.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Close' : 'Change point values'}
          </Button>
        </div>
      </div>
      {editing && <RulesForm rules={rules} onDone={() => setEditing(false)} />}
    </Panel>
  )
}

function RulesForm({ rules, onDone }: { rules: ScoringRules; onDone: () => void }) {
  const { admin } = useAuth()
  const [f, setF] = useState(() => Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, typeof v === 'boolean' ? v : String(v)])) as Record<string, string | boolean>)
  const num = (k: keyof ScoringRules) => (
    <Input
      key={k}
      label={RULE_LABEL[k]}
      type="number"
      step="any"
      value={f[k] as string}
      onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
    />
  )
  const save = useMutation({
    mutationFn: () => {
      const out = {} as Record<string, number | boolean>
      for (const [k, v] of Object.entries(f)) {
        if (typeof v === 'boolean') out[k] = v
        else {
          const n = Number(v)
          if (v === '' || !Number.isFinite(n)) throw new Error(`${RULE_LABEL[k as keyof ScoringRules]}: enter a number.`)
          out[k] = n
        }
      }
      return updateScoringRules(out as unknown as ScoringRules, admin?.id)
    },
    onSuccess: () => {
      toast.success('Point values saved. Every score is updated.')
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <form
      className="mt-6 rounded-xl border-2 border-dashed border-ink p-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <p className="text-sm font-semibold">Changing a value recalculates every score straight away.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {(['pts_first', 'pts_second', 'pts_third', 'pts_participation', 'pts_walkover'] as const).map(num)}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{(['mult_individual', 'mult_group', 'mult_class_wise'] as const).map(num)}</div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={!!f.class_wise_active} onChange={(e) => setF((x) => ({ ...x, class_wise_active: e.target.checked }))} className="w-4 h-4 accent-[var(--color-primary)]" />
        Class-wise (promotional) events score points (off = on hold, they score 0)
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={!!f.penalties_use_multiplier} onChange={(e) => setF((x) => ({ ...x, penalties_use_multiplier: e.target.checked }))} className="w-4 h-4 accent-[var(--color-primary)]" />
        Multiply walkovers by the event type (e.g. ×0.5 for group events)
      </label>
      <Button type="submit" isLoading={save.isPending}>
        Save point values
      </Button>
    </form>
  )
}

const RULE_LABEL: Record<keyof ScoringRules, string> = {
  pts_first: '1st prize',
  pts_second: '2nd prize',
  pts_third: '3rd prize',
  pts_participation: 'Participation',
  pts_walkover: 'Walkover',
  pts_not_registered: 'Class not registered',
  mult_individual: 'Individual ×',
  mult_group: 'Group ×',
  mult_class_wise: 'Class-wise ×',
  penalties_use_multiplier: 'Multiply penalties',
  class_wise_active: 'Class-wise active',
}

// ── 3. Extra points ───────────────────────────────────────────────────────────
function ManualEntry({ classNames }: { classNames: string[] }) {
  const { admin } = useAuth()
  const { data: events = [] } = useAdminEvents()
  const [eventId, setEventId] = useState('')
  const [cls, setCls] = useState('')
  const [points, setPoints] = useState('')
  const [note, setNote] = useState('')
  const sortedClasses = useMemo(() => [...classNames].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })), [classNames])
  const eventList = useMemo(() => events.filter((e) => e.status === 'published' || e.status === 'completed').sort((a, b) => a.title.localeCompare(b.title)), [events])
  const event = eventList.find((e) => e.id === eventId)

  const value = Number(points)
  const ready = Boolean(cls) && points !== '' && Number.isFinite(value) && value !== 0
  const preview = ready ? `${cls} gets ${signed(value)} points${event ? ` for ${event.title}` : ''}.` : null

  const add = useMutation({
    mutationFn: () => addClassPoints({ scoring_class: cls, kind: 'extra', points: value, event_id: eventId || null, note: note.trim() || null }, admin?.id),
    onSuccess: () => {
      toast.success(preview ?? 'Saved')
      setPoints('')
      setNote('')
      setCls('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Panel title="Add extra points">
      <p className="text-sm text-ink/70 -mt-2 mb-4">
        For anything the rules don't cover (a bonus or a deduction). Prizes, participation and walkovers are counted automatically,
        so don't add those here.
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ready) return toast.error('Pick a class and enter the points (not 0).')
          add.mutate()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            1. Class
            <select value={cls} onChange={(e) => setCls(e.target.value)} className={selectClass}>
              <option value="">Pick the class</option>
              {sortedClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Input label="2. Points (minus sign to take away)" type="number" step="any" placeholder="e.g. 5 or -3" value={points} onChange={(e) => setPoints(e.target.value)} />
          <label className="flex flex-col gap-1 text-sm font-semibold">
            3. Event (optional)
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={selectClass}>
              <option value="">No event</option>
              {eventList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </label>
          <Input label="4. Reason" maxLength={200} placeholder="e.g. Best discipline award" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={add.isPending} disabled={!ready}>
            Add points
          </Button>
          <span className="text-sm font-semibold">{preview ?? 'Fill in the class and points to see what will be added.'}</span>
        </div>
      </form>
    </Panel>
  )
}

// ── 4. Check one event ────────────────────────────────────────────────────────
function EventCheck({ rules }: { rules: ScoringRules }) {
  const { data: events = [] } = useAdminEvents()
  const types = useQuery({ queryKey: ['event-scoring-types'], queryFn: listEventScoringTypes })
  const [eventId, setEventId] = useState('')
  const eventList = useMemo(() => events.filter((e) => e.status === 'published' || e.status === 'completed').sort((a, b) => a.title.localeCompare(b.title)), [events])
  const event = eventList.find((e) => e.id === eventId)
  const scores = useQuery({ queryKey: ['event-scores', eventId], queryFn: () => getEventScores(eventId), enabled: Boolean(eventId) })
  const setType = useMutation({
    mutationFn: (t: ScoringType | null) => setEventScoringType(eventId, t),
    onSuccess: () => toast.success('Event type saved. Its points are updated.'),
    onError: (e: Error) => toast.error(e.message),
  })

  const chosen = types.data?.[eventId] ?? null
  const byClass = useMemo(() => {
    const m = new Map<string, { team: string | null; color: string | null; parts: { kind: ScoreKind; entries: number; points: number }[]; total: number }>()
    for (const r of scores.data ?? []) {
      const c = m.get(r.scoring_class) ?? { team: r.team_name, color: r.team_color, parts: [], total: 0 }
      c.parts.push({ kind: r.kind, entries: Number(r.entries), points: Number(r.points) })
      c.total += Number(r.points)
      m.set(r.scoring_class, c)
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [scores.data])
  const hasPrizes = (scores.data ?? []).some((r) => r.kind === 'first' || r.kind === 'second' || r.kind === 'third')
  const hasPart = (scores.data ?? []).some((r) => r.kind === 'participation')

  return (
    <Panel title="Check an event">
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Event
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={selectClass}>
            <option value="">Pick an event</option>
            {eventList.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </label>
        {event && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Scored as
            <select
              value={chosen ?? ''}
              disabled={setType.isPending}
              onChange={(e) => setType.mutate((e.target.value || null) as ScoringType | null)}
              className={selectClass}
            >
              <option value="">From its format ({formatType(event)})</option>
              {(Object.keys(TYPE_LABEL) as ScoringType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                  {t === 'class_wise' && !rules.class_wise_active ? ' (on hold: 0 points)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {!event ? (
        <Muted>Pick an event to see exactly what each class got from it.</Muted>
      ) : scores.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          {(!hasPrizes || !hasPart) && (
            <ul className="mb-3 space-y-1 text-sm">
              {!hasPart && (
                <li>
                  • No participation yet:{' '}
                  {event.is_mandatory ? (
                    rules.class_wise_active ? 'mandatory events count once the event is held.' : 'mandatory events are Class-wise, which is on hold (0 points).'
                  ) : (
                    <>mark attendance on the <Link to="/admin/attendance" className="underline">Attendance</Link> page.</>
                  )}
                </li>
              )}
              {!hasPrizes && (
                <li>
                  • No winners yet: declare 1st/2nd/3rd on the <Link to="/admin/winners" className="underline">Results</Link> page.
                </li>
              )}
            </ul>
          )}
          {byClass.length === 0 ? (
            <Muted>No points from this event yet.</Muted>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Team</th>
                  <th>From</th>
                  <th className="text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {byClass.map(([cls, c]) => (
                  <tr key={cls}>
                    <td className="font-semibold">{cls}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full border border-ink" style={{ background: c.color ?? '#ccc' }} aria-hidden="true" />
                        {c.team ?? '—'}
                      </span>
                    </td>
                    <td className="text-ink/80">
                      {c.parts.map((p) => `${KIND_LABEL[p.kind]}${p.entries > 1 ? ` ×${p.entries}` : ''} (${signed(p.points)})`).join(' · ')}
                    </td>
                    <td className="text-right tabular-nums font-semibold">{signed(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </>
      )}
    </Panel>
  )
}

// ── 5. Class positions ────────────────────────────────────────────────────────
function ClassPositions({ rows, anyPoints }: { rows: Awaited<ReturnType<typeof getAdminScoreboard>>; anyPoints: boolean }) {
  const { sorted, sort, toggle } = useSort(rows, {
    position: (r) => r.class_position,
    class: (r) => r.scoring_class,
    team: (r) => r.team_name,
    points: (r) => Number(r.class_points),
  })
  return (
    <Panel title="Class positions">
      <DataTable>
        <thead>
          <tr>
            <SortTh label="Pos." sortKey="position" sort={sort} onSort={toggle} />
            <SortTh label="Class" sortKey="class" sort={sort} onSort={toggle} />
            <SortTh label="Team" sortKey="team" sort={sort} onSort={toggle} />
            <th className="text-right">1st</th>
            <th className="text-right">2nd</th>
            <th className="text-right">3rd</th>
            <th className="text-right">Took part</th>
            <th className="text-right">Walkover</th>
            <th className="text-right">Extra</th>
            <SortTh label="Points" sortKey="points" sort={sort} onSort={toggle} className="text-right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.scoring_class}>
              <td className="font-display tabular-nums">{anyPoints ? ordinal(r.class_position) : '—'}</td>
              <td className="font-semibold whitespace-nowrap">{r.scoring_class}</td>
              <td>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span className="h-3 w-3 rounded-full border border-ink" style={{ background: r.team_color }} aria-hidden="true" />
                  {r.team_name}
                </span>
              </td>
              {[r.n_first, r.n_second, r.n_third, r.n_participation, r.n_walkover].map((n, i) => (
                <td key={i} className="text-right tabular-nums">{Number(n) || '·'}</td>
              ))}
              <td className="text-right tabular-nums">{Number(r.extra_points) ? signed(Number(r.extra_points)) : '·'}</td>
              <td className="text-right tabular-nums font-semibold">{Number(r.class_points).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </Panel>
  )
}

// ── 6. History of manual entries ──────────────────────────────────────────────
function History() {
  const entries = useQuery({ queryKey: ['class-points'], queryFn: listClassPoints })
  const remove = useMutation({
    mutationFn: deleteClassPoints,
    onSuccess: () => toast.success('Entry removed'),
    onError: (e: Error) => toast.error(e.message),
  })
  const list = (entries.data ?? []).filter((p) => p.kind === 'extra')


  return (
    <Panel title="Extra points added">
      {entries.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : list.length === 0 ? (
        <Muted>Nothing added yet.</Muted>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>When</th>
              <th>Class</th>
              <th>What</th>
              <th>Event / reason</th>
              <th className="text-right">Points</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap text-ink/70">{formatDateTime(p.created_at)}</td>
                <td className="font-semibold whitespace-nowrap">{p.scoring_class}</td>
                <td>{KIND_LABEL[p.kind]}</td>
                <td>{[p.event?.title, p.note].filter(Boolean).join(' · ') || '—'}</td>
                <td className="text-right tabular-nums">{signed(Number(p.points))}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="p-1 hover:text-comic-red-deep"
                    aria-label={`Remove ${KIND_LABEL[p.kind]} for ${p.scoring_class}`}
                    onClick={async () => {
                      if (await confirmDialog(`Remove this ${KIND_LABEL[p.kind].toLowerCase()} for ${p.scoring_class}?`, { danger: true, confirmLabel: 'Remove' })) {
                        remove.mutate(p.id)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Panel>
  )
}
