import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getEventEntrants, getWinnersForEvent, setWinners, type Entrant } from '@/lib/api/admin'
import { EventSelect, Muted, PageHeader, Panel, selectClass, useEventAccess, ViewOnlyNote } from './AdminUI'

const PLACES = [1, 2, 3]
const keyOf = (e: { team_id?: string | null; student_id?: string | null }) => (e.team_id ? `t:${e.team_id}` : e.student_id ? `s:${e.student_id}` : '')

export default function AdminWinners() {
  const [eventId, setEventId] = useState('')
  const [picks, setPicks] = useState<Record<number, string>>({})
  const [notify, setNotify] = useState(true)
  const queryClient = useQueryClient()
  const canEdit = useEventAccess().canManage(eventId)

  const entrants = useQuery({ queryKey: ['admin-entrants', eventId], queryFn: () => getEventEntrants(eventId), enabled: Boolean(eventId) })
  const current = useQuery({ queryKey: ['admin-winners', eventId], queryFn: () => getWinnersForEvent(eventId), enabled: Boolean(eventId) })

  useEffect(() => {
    if (!current.data) return
    const next: Record<number, string> = {}
    for (const w of current.data) next[w.position] = keyOf(w)
    setPicks(next)
  }, [current.data])

  const save = useMutation({
    mutationFn: () => {
      const winners = PLACES.filter((p) => picks[p]).map((p) => {
        const [kind, id] = picks[p].split(':')
        return kind === 't' ? { position: p, team_id: id } : { position: p, student_id: id }
      })
      return setWinners(eventId, winners, notify)
    },
    onSuccess: (res) => {
      toast.success(res.count ? `${res.count} winners published` : 'Winners cleared')
      queryClient.invalidateQueries({ queryKey: ['admin-winners', eventId] })
      queryClient.invalidateQueries({ queryKey: ['public-winners'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const chosen = Object.values(picks).filter(Boolean)
  const duplicate = new Set(chosen).size !== chosen.length

  return (
    <div className="space-y-6">
      <PageHeader title="Winners" description="Declare first, second and third place. Results appear on the public Results page and registered students are notified." />
      <div className="max-w-md">
        <EventSelect value={eventId} onChange={(id) => { setEventId(id); setPicks({}) }} />
      </div>

      {!eventId ? (
        <Muted>Choose an event.</Muted>
      ) : entrants.isLoading || current.isLoading ? (
        <Skeleton className="h-60 w-full max-w-2xl" />
      ) : !entrants.data?.length ? (
        <Muted>Nobody registered for this event, so there is nobody to declare.</Muted>
      ) : (
        <Panel className="max-w-2xl">
          {!canEdit && <div className="mb-4"><ViewOnlyNote /></div>}
          <fieldset disabled={!canEdit} className="min-w-0 border-0 p-0 m-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (duplicate) return toast.error('The same entry is picked for two places.')
              save.mutate()
            }}
            className="space-y-4"
          >
            {PLACES.map((p) => (
              <label key={p} className="flex flex-col gap-1 text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  <Trophy className={p === 1 ? 'w-4 h-4 text-blossoms-yellow' : 'w-4 h-4 text-ink/40'} aria-hidden="true" />
                  {p === 1 ? 'First' : p === 2 ? 'Second' : 'Third'} place
                </span>
                <select value={picks[p] ?? ''} onChange={(e) => setPicks({ ...picks, [p]: e.target.value })} className={selectClass}>
                  <option value="">— None —</option>
                  {entrants.data.map((en: Entrant) => (
                    <option key={keyOf(en)} value={keyOf(en)}>
                      {en.kind === 'team' ? `Team ${en.label}` : en.label}
                      {en.detail ? ` — ${en.detail}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
              Notify everyone registered for this event
            </label>
            {canEdit && (
              <Button type="submit" isLoading={save.isPending}>
                Publish results
              </Button>
            )}
          </form>
          </fieldset>
        </Panel>
      )}
    </div>
  )
}
