import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import {
  deleteFestTeam,
  getClassList,
  getFestSettings,
  listClassTeams,
  listFestTeams,
  saveFestTeam,
  setClassTeam,
  updateFestSettings,
  type FestTeam,
} from '@/lib/api/admin'
import { useAuth } from '@/lib/auth/authStore'
import { DataTable, Muted, PageHeader, Panel, SortTh, selectClass, useSort } from './AdminUI'
import { ScoreboardPanel } from './AdminScoreboardPanel'

const MAX_TEAMS = 4

/** Participation rules, the four fest teams and which team each class plays for. */
export default function AdminPointsTeams() {
  const { admin } = useAuth()
  // The menu hides this page from other admins; this also stops anyone who opens the link directly.
  if (admin && admin.role !== 'super_admin') {
    return (
      <div className="space-y-6">
        <PageHeader title="Points & teams" description="Only super admins can open this page." />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Points & teams"
        description="Set how many events each student must attend, run the four teams and put every class in one. Points from participation and wins are added once the points board is set."
      />
      <RulesPanel />
      <ScoreboardPanel />
      <TeamsPanel />
      <ClassTeamsPanel />
    </div>
  )
}

function RulesPanel() {
  const { admin } = useAuth()
  const queryClient = useQueryClient()
  const { data: settings, isLoading, isError, error, refetch } = useQuery({ queryKey: ['fest-settings'], queryFn: getFestSettings })
  const [minChosen, setMinChosen] = useState('2')
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    if (!settings) return
    setMinChosen(String(settings.min_chosen_events))
    setIsPublic(settings.leaderboard_public)
  }, [settings])

  const save = useMutation({
    mutationFn: () => updateFestSettings({ min_chosen_events: Number(minChosen), leaderboard_public: isPublic }, admin?.id),
    onSuccess: () => {
      toast.success('Rules saved')
      ;['fest-settings', 'admin-stats', 'admin-classes', 'admin-defaulters', 'team-leaderboard'].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError) return <ErrorState description={(error as Error).message} retry={() => refetch()} />

  return (
    <Panel title="Participation rules">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const n = Number(minChosen)
          if (!Number.isInteger(n) || n < 0 || n > 50) return toast.error('Enter a whole number between 0 and 50.')
          save.mutate()
        }}
      >
        <div className="max-w-xs">
          <Input label="Chosen events each student must attend" type="number" min={0} max={50} value={minChosen} onChange={(e) => setMinChosen(e.target.value)} />
        </div>
        <p className="text-sm text-ink/60">
          On top of this, students must attend every event marked <strong>Mandatory</strong> (set on each event's page). A student
          completes the requirement once both are met. The defaulter list only counts chosen events.
        </p>
        <label className="flex items-start gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[var(--color-primary)]" />
          <span>
            Show the scoreboard to everyone
            <span className="block text-xs font-normal text-ink/60">
              Adds Scoreboard to the menu. The public sees only each team's position (1st–4th), never points or class positions.
            </span>
          </span>
        </label>
        <Button type="submit" isLoading={save.isPending}>
          Save rules
        </Button>
      </form>
    </Panel>
  )
}

function TeamsPanel() {
  const queryClient = useQueryClient()
  const { data: teams = [], isLoading } = useQuery({ queryKey: ['fest-teams'], queryFn: listFestTeams })
  const [name, setName] = useState('')
  const [color, setColor] = useState('#793F98')

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['fest-teams'] })
    queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
    queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] })
  }
  const add = useMutation({
    mutationFn: () => saveFestTeam({ name: name.trim(), color, display_order: teams.length }),
    onSuccess: () => {
      setName('')
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const update = useMutation({
    mutationFn: (team: FestTeam) => saveFestTeam({ name: team.name.trim(), color: team.color, display_order: team.display_order }, team.id),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({ mutationFn: deleteFestTeam, onSuccess: refresh, onError: (e: Error) => toast.error(e.message) })

  return (
    <Panel title="The four teams">
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="space-y-2 mb-4">
          {teams.length === 0 && <Muted>No teams yet. Add the four teams below.</Muted>}
          {teams.map((team) => (
            <TeamRow key={team.id} team={team} onSave={(t) => update.mutate(t)} onDelete={async () => (await confirmDialog(`Delete ${team.name}? Its classes become unassigned.`, { danger: true, confirmLabel: 'Delete' })) && remove.mutate(team.id)} />
          ))}
        </ul>
      )}
      {teams.length < MAX_TEAMS && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return toast.error('Give the team a name.')
            add.mutate()
          }}
        >
          <div className="min-w-[220px]">
            <Input label="Team name" placeholder="Team Obsidian" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Colour
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded-lg border-2 border-ink bg-paper" />
          </label>
          <Button type="submit" variant="secondary" isLoading={add.isPending}>
            <Plus className="w-4 h-4" /> Add team
          </Button>
        </form>
      )}
    </Panel>
  )
}

function TeamRow({ team, onSave, onDelete }: { team: FestTeam; onSave: (t: FestTeam) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(team)
  useEffect(() => setDraft(team), [team])
  const dirty = draft.name !== team.name || draft.color !== team.color
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink/20 p-2">
      <input
        type="color"
        value={draft.color}
        onChange={(e) => setDraft({ ...draft, color: e.target.value })}
        aria-label={`Colour for ${team.name}`}
        className="h-9 w-12 rounded-lg border-2 border-ink bg-paper"
      />
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        aria-label="Team name"
        className="flex-1 min-w-[160px] rounded-xl border-2 border-ink bg-paper px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-primary"
      />
      {dirty && (
        <Button size="sm" onClick={() => draft.name.trim() && onSave(draft)}>
          Save
        </Button>
      )}
      <button type="button" onClick={onDelete} aria-label={`Delete ${team.name}`} className="p-1.5 text-ink/50 hover:text-comic-red-deep">
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  )
}

function ClassTeamsPanel() {
  const queryClient = useQueryClient()
  const classes = useQuery({ queryKey: ['admin-classes'], queryFn: getClassList })
  const teams = useQuery({ queryKey: ['fest-teams'], queryFn: listFestTeams })
  const assignments = useQuery({ queryKey: ['class-teams'], queryFn: listClassTeams })

  const teamOf = useMemo(() => new Map((assignments.data ?? []).map((a) => [a.class_name, a.fest_team_id])), [assignments.data])
  const teamName = useMemo(() => new Map((teams.data ?? []).map((t) => [t.id, t.name])), [teams.data])
  const rows = classes.data ?? []
  const { sorted, sort, toggle } = useSort(rows, {
    class: (c) => c.class_name,
    students: (c) => c.students,
    team: (c) => teamName.get(teamOf.get(c.class_name) ?? '') ?? null,
  })

  const assign = useMutation({
    mutationFn: ({ className, teamId }: { className: string; teamId: string | null }) => setClassTeam(className, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-teams'] })
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
      queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (classes.isLoading || teams.isLoading || assignments.isLoading) return <Skeleton className="h-80 w-full" />
  if (classes.isError) return <ErrorState description={(classes.error as Error).message} retry={() => classes.refetch()} />

  const unassigned = rows.filter((c) => !teamOf.has(c.class_name)).length
  const teamList = teams.data ?? []

  return (
    <Panel title={`Classes · ${unassigned} unassigned`}>
      {teamList.length === 0 ? (
        <Muted>Add the teams first.</Muted>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2 mb-4">
            {teamList.map((t) => (
              <li key={t.id} className="flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-sm font-semibold">
                <span className="h-3 w-3 rounded-full border border-ink" style={{ background: t.color }} aria-hidden="true" />
                {t.name}
                <span className="text-ink/50 tabular-nums">{rows.filter((c) => teamOf.get(c.class_name) === t.id).length}</span>
              </li>
            ))}
          </ul>
          <DataTable>
            <thead>
              <tr>
                <SortTh label="Class" sortKey="class" sort={sort} onSort={toggle} />
                <SortTh label="Students" sortKey="students" sort={sort} onSort={toggle} className="text-right" />
                <SortTh label="Team" sortKey="team" sort={sort} onSort={toggle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.class_name}>
                  <td className="font-semibold">{c.class_name}</td>
                  <td className="text-right tabular-nums">{c.students}</td>
                  <td>
                    <select
                      value={teamOf.get(c.class_name) ?? ''}
                      disabled={assign.isPending}
                      onChange={(e) => assign.mutate({ className: c.class_name, teamId: e.target.value || null })}
                      aria-label={`Team for ${c.class_name}`}
                      className={selectClass}
                    >
                      <option value="">Unassigned</option>
                      {teamList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
    </Panel>
  )
}
