import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getEventEntrants, getWinnersForEvent, setWinners, type Entrant } from '@/lib/api/admin'
import { EventSelect, Muted, PageHeader, Panel, selectClass, useEventAccess, ViewOnlyNote } from './AdminUI'

/** Events have a first and second place only (migration 029). */
const PLACES = [1, 2]
const PLACE_NAME = ['', 'First', 'Second']
const keyOf = (e: { team_id?: string | null; student_id?: string | null }) => (e.team_id ? `t:${e.team_id}` : e.student_id ? `s:${e.student_id}` : '')

/** Picks per place. A place can hold more than one entry when the judges declare a tie. */
type Picks = Record<number, string[]>

export default function AdminWinners() {
  const [eventId, setEventId] = useState('')
  const [picks, setPicks] = useState<Picks>({})
  const [notify, setNotify] = useState(true)
  const queryClient = useQueryClient()
  const canEdit = useEventAccess().canManage(eventId)

  const entrants = useQuery({ queryKey: ['admin-entrants', eventId], queryFn: () => getEventEntrants(eventId), enabled: Boolean(eventId) })
  const current = useQuery({ queryKey: ['admin-winners', eventId], queryFn: () => getWinnersForEvent(eventId), enabled: Boolean(eventId) })

  useEffect(() => {
    if (!current.data) return
    const next: Picks = {}
    for (const w of current.data) next[w.position] = [...(next[w.position] ?? []), keyOf(w)]
    setPicks(next)
  }, [current.data])

  const slotsFor = (p: number) => (picks[p]?.length ? picks[p] : [''])
  const setSlot = (p: number, i: number, value: string) =>
    setPicks((all) => ({ ...all, [p]: slotsFor(p).map((v, j) => (j === i ? value : v)) }))
  const addSlot = (p: number) => setPicks((all) => ({ ...all, [p]: [...slotsFor(p), ''] }))
  const removeSlot = (p: number, i: number) => setPicks((all) => ({ ...all, [p]: slotsFor(p).filter((_, j) => j !== i) }))

  const save = useMutation({
    mutationFn: () => {
      const winners = PLACES.flatMap((p) =>
        (picks[p] ?? []).filter(Boolean).map((key) => {
          const [kind, id] = key.split(':')
          return kind === 't' ? { position: p, team_id: id } : { position: p, student_id: id }
        })
      )
      return setWinners(eventId, winners, notify)
    },
    onSuccess: (res) => {
      if (res.success === false) return toast.error(res.message ?? 'Could not publish the results.')
      toast.success(res.count ? `${res.count} winners published` : 'Winners cleared')
      queryClient.invalidateQueries({ queryKey: ['admin-winners', eventId] })
      queryClient.invalidateQueries({ queryKey: ['public-winners'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const chosen = PLACES.flatMap((p) => picks[p] ?? []).filter(Boolean)
  const duplicate = new Set(chosen).size !== chosen.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Winners"
        description="Declare first and second place. For a tie, add more than one winner to a place. Results appear on the public Results page and registered students are notified."
      />
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
              if (duplicate) return toast.error('The same entry is picked more than once.')
              save.mutate()
            }}
            className="space-y-5"
          >
            {PLACES.map((p) => {
              const slots = slotsFor(p)
              return (
                <fieldset key={p} className="flex flex-col gap-1.5 text-sm font-semibold border-0 p-0 m-0 min-w-0">
                  <legend className="flex items-center gap-1.5 mb-1">
                    <Trophy className={p === 1 ? 'w-4 h-4 text-blossoms-yellow' : 'w-4 h-4 text-ink/40'} aria-hidden="true" />
                    {PLACE_NAME[p]} place
                    {slots.filter(Boolean).length > 1 && <span className="font-normal text-ink/60">· tie, {slots.filter(Boolean).length} winners</span>}
                  </legend>
                  {slots.map((value, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={value}
                        onChange={(e) => setSlot(p, i, e.target.value)}
                        className={`${selectClass} flex-1 min-w-0`}
                        aria-label={`${PLACE_NAME[p]} place${slots.length > 1 ? `, winner ${i + 1}` : ''}`}
                      >
                        <option value="">— None —</option>
                        {entrants.data.map((en: Entrant) => (
                          <option key={keyOf(en)} value={keyOf(en)}>
                            {en.kind === 'team' ? `Team ${en.label}` : en.label}
                            {en.detail ? ` — ${en.detail}` : ''}
                          </option>
                        ))}
                      </select>
                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlot(p, i)}
                          aria-label={`Remove this ${PLACE_NAME[p].toLowerCase()} place winner`}
                          className="p-1.5 text-ink/50 hover:text-comic-red-deep"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => addSlot(p)}
                      className="self-start inline-flex items-center gap-1 text-xs font-bold text-ink/70 hover:text-ink hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add another {PLACE_NAME[p].toLowerCase()} place winner (tie)
                    </button>
                  )}
                </fieldset>
              )
            })}
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
