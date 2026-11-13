import { useEffect, useState } from 'react'
import { X, AlertCircle, Search, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { DisplayText } from '@/components/comic/ComicPrimitives'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { registerTeamEvent, searchStudents, type StudentSearchResult } from '@/lib/api/registration'
import { useAuth } from '@/lib/auth/authStore'
import { sessionLabel } from '@/lib/eventDisplay'
import type { Event } from '@/types'

export function TeamRegistrationModal({
  event,
  slotId,
  onClose,
  onSuccess,
}: {
  event: Event
  /** Session already picked in the register box, for events held more than once. */
  slotId?: string | null
  onClose: () => void
  /** Called with the event's WhatsApp group link (if any) once the team is registered. */
  onSuccess: (whatsappUrl?: string | null) => void
}) {
  const session = slotId ? event.schedule_slots?.find((s) => s.id === slotId) : undefined
  const auth = useAuth()
  const me = auth.student!
  const min = event.min_team_size ?? 2
  const max = event.max_team_size ?? min
  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState<StudentSearchResult[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StudentSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = members.length + 1
  const full = total >= max

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const found = await searchStudents(q)
        if (!cancelled) setResults(found)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Search failed')
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  function addMember(s: StudentSearchResult) {
    if (s.register_number === me.registerNumber) return setError('You are already in the team as its leader.')
    if (members.some((m) => m.register_number === s.register_number)) return
    if (full) return setError(`${event.title} allows at most ${max} members.`)
    setMembers([...members, s])
    setQuery('')
    setResults([])
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (teamName.trim().length < 2) return setError('Give your team a name.')
    if (total < min) return setError(`${event.title} needs at least ${min} members including you. Add ${min - total} more.`)
    setSubmitting(true)
    const res = await registerTeamEvent({
      eventId: event.id,
      teamName: teamName.trim(),
      memberRegisterNumbers: members.map((m) => m.register_number),
      slotId,
    })
    setSubmitting(false)
    if (res.success) {
      toast.success(res.message)
      onSuccess(res.whatsapp_group_url)
    } else {
      setError(res.message)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-modal-title"
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-paper border-2 border-ink rounded-2xl max-w-lg w-full p-6 shadow-[6px_6px_0px_var(--color-ink)] my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg border border-ink bg-white hover:bg-gutter"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-ink" />
        </button>

        <p className="text-xs font-bold text-primary uppercase tracking-wider">Team registration · {event.title}</p>
        <DisplayText as="h2" id="team-modal-title" className="text-2xl sm:text-3xl text-ink mt-0.5">
          Build your team
        </DisplayText>
        <p className="text-sm text-ink/70 mt-1 mb-4">
          {min === max ? `Exactly ${min}` : `${min} to ${max}`} members, including you. Everyone you add is registered and
          notified.
        </p>
        {session && (
          <p className="-mt-2 mb-4 inline-flex items-center rounded-full border-2 border-ink bg-blossoms-yellow px-3 py-0.5 text-xs font-bold text-ink">
            Whole team: {sessionLabel(session)}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Team name" required maxLength={60} placeholder="e.g. The Ledger Lions" value={teamName} onChange={(e) => setTeamName(e.target.value)} />

          <div>
            <p className="text-sm font-semibold text-ink mb-1.5">
              Members ({total}/{max})
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-center justify-between rounded-xl border-2 border-ink bg-white px-3 py-2">
                <span>
                  <span className="font-semibold">{me.name}</span>
                  <span className="block text-xs text-ink/60 tabular-nums">
                    {me.registerNumber} · {me.className}
                  </span>
                </span>
                <Badge variant="yellow">Leader</Badge>
              </li>
              {members.map((m) => (
                <li key={m.register_number} className="flex items-center justify-between rounded-xl border border-ink bg-white px-3 py-2">
                  <span>
                    <span className="font-semibold">{m.full_name}</span>
                    <span className="block text-xs text-ink/60 tabular-nums">
                      {m.register_number} · {m.class_name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMembers(members.filter((x) => x.register_number !== m.register_number))}
                    className="p-1.5 rounded text-ink/50 hover:text-comic-red-deep"
                    aria-label={`Remove ${m.full_name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {!full && (
            <div className="relative">
              <label htmlFor="member-search" className="text-sm font-semibold text-ink">
                Add a member
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" aria-hidden="true" />
                <input
                  id="member-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Register number or name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink bg-white pl-9 pr-4 py-2.5 text-base text-ink placeholder:text-ink/40 focus:outline-none focus:border-primary"
                />
              </div>
              {query.trim().length >= 3 && (
                <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border-2 border-ink bg-white divide-y divide-ink/10" aria-live="polite">
                  {searching && results.length === 0 && <li className="px-3 py-2 text-sm text-ink/60">Searching…</li>}
                  {!searching && results.length === 0 && <li className="px-3 py-2 text-sm text-ink/60">No students match.</li>}
                  {results.map((s) => (
                    <li key={s.register_number}>
                      <button
                        type="button"
                        onClick={() => addMember(s)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gutter"
                      >
                        <span>
                          <span className="font-semibold text-sm">{s.full_name}</span>
                          <span className="block text-xs text-ink/60 tabular-nums">
                            {s.register_number} · {s.class_name}
                          </span>
                        </span>
                        <UserPlus className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border-2 border-comic-red-deep bg-white p-3 text-sm font-semibold text-comic-red-deep">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <div className="pt-2 flex gap-2">
            <Button type="submit" className="flex-1 font-display uppercase tracking-wider" isLoading={submitting} disabled={total < min}>
              Register team
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
