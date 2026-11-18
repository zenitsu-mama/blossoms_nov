import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { RotateCcw, Sparkles } from 'lucide-react'
import { DisplayText, ComicPanel, ComicCaptionBox } from '@/components/comic/ComicPrimitives'
import { Skeleton } from '@/components/ui/Skeleton'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { PowerTabs } from './PowerTabs'
import './winners.css'

interface PublicWinner {
  event_id: string
  event_title: string
  event_slug: string
  category: string
  position: number
  description: string | null
  winner_name: string
  class_name: string | null
  members: string[] | null
}

async function getPublicWinners(): Promise<PublicWinner[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.rpc('get_public_winners')
  if (error) throw new Error(error.message)
  return (data ?? []) as PublicWinner[]
}

const PLACE = ['', '1st', '2nd', '3rd']

const TABS = [
  { key: 'arts', label: 'Art', match: /^art/ },
  { key: 'literature', label: 'Literary', match: /^litera/ },
  { key: 'stage', label: 'Stage', match: /^stage/ },
  { key: 'theatre', label: 'Theatre', match: /^theat/ },
] as const

type TabKey = (typeof TABS)[number]['key']

/** The tab a category name belongs to ("Art", "Literary", …). Other categories are not shown. */
function categoryKey(category: string): TabKey | null {
  const c = category.trim().toLowerCase()
  return TABS.find((t) => t.match.test(c))?.key ?? null
}

function categoryClass(category: string) {
  const key = categoryKey(category)
  return key ? `result-panel--${key}` : ''
}

/** True once the element has scrolled into view; replay() runs the reveal again. */
function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const replay = () => {
    setShown(false)
    window.setTimeout(() => setShown(true), 80)
  }
  return { ref, shown, replay }
}

function Person({ w }: { w: PublicWinner }) {
  return (
    <div className="result-person">
      <strong>{w.winner_name}</strong>
      {w.members ? <small>{w.members.join(', ')}</small> : w.class_name && <small>{w.class_name}</small>}
    </div>
  )
}

/**
 * One event as a panel on the comic page. It reads like a page: the panel lands, third and second
 * place appear in caption boxes, then first place bursts in with the winner speaking.
 */
function ResultPanel({ list }: { list: PublicWinner[] }) {
  const { ref, shown, replay } = useReveal()
  const first = list[0]
  const at = (place: number) => list.filter((w) => w.position === place)
  const winners = at(1)
  return (
    <div className="result-cell">
      <article
        ref={ref}
        className={`result-panel ${categoryClass(first.category)} ${shown ? 'result-panel--in' : ''}`}
      >
        <div className="result-caption">
          <h2 className="result-title">{first.event_title}</h2>
          <span className="result-category">{first.category}</span>
        </div>
        <button type="button" className="result-replay" onClick={replay} aria-label={`Replay the reveal for ${first.event_title}`}>
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </button>

        {winners.length > 0 && (
          <div className="result-first">
            <div className="result-burst-wrap">
              <span className="result-burst">
                <span aria-hidden="true">1ST</span>
                <span className="sr-only">1st place</span>
              </span>
            </div>
            <div className="result-bubble">
              {winners.map((w) => (
                <Person key={w.winner_name} w={w} />
              ))}
            </div>
          </div>
        )}

        <div className="result-runners">
          {[3, 2].map((place) =>
            at(place).length === 0 ? null : (
              <div key={place} className={`result-runner result-runner--${place}`}>
                <span className="result-runner-tag">
                  <span aria-hidden="true">{PLACE[place].toUpperCase()}</span>
                  <span className="sr-only">{PLACE[place]} place</span>
                </span>
                {at(place).map((w) => (
                  <Person key={w.winner_name} w={w} />
                ))}
              </div>
            )
          )}
        </div>
      </article>
    </div>
  )
}

export default function WinnersPage() {
  const { data: winners = [], isLoading } = useQuery({ queryKey: ['public-winners'], queryFn: getPublicWinners })
  const [searchParams, setSearchParams] = useSearchParams()

  const byEvent = new Map<string, PublicWinner[]>()
  for (const w of winners) byEvent.set(w.event_id, [...(byEvent.get(w.event_id) ?? []), w])

  const byTab = new Map<TabKey, PublicWinner[][]>()
  for (const list of byEvent.values()) {
    const key = categoryKey(list[0].category)
    if (key) byTab.set(key, [...(byTab.get(key) ?? []), list])
  }

  const tabs: { key: TabKey; label: string }[] = TABS.map(({ key, label }) => ({ key, label }))

  const requested = searchParams.get('category') as TabKey | null
  const active: TabKey =
    requested && tabs.some((t) => t.key === requested) ? requested : tabs.find((t) => byTab.has(t.key))?.key ?? 'arts'

  function selectTab(key: TabKey) {
    const next = new URLSearchParams(searchParams)
    next.set('category', key)
    setSearchParams(next, { replace: true })
  }

  const activeLists = byTab.get(active) ?? []
  const activeLabel = tabs.find((t) => t.key === active)?.label ?? ''

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <DisplayText as="h1" className="text-4xl sm:text-5xl text-ink">Results</DisplayText>
          <p className="text-ink/70 text-sm mt-1">Winners of the Blossoms 2026-27 Department of Commerce prelims.</p>
        </div>
        <ComicCaptionBox>BLOSSOMS 2026–27</ComicCaptionBox>
      </div>

      <PowerTabs
        tabs={tabs}
        active={active}
        counts={Object.fromEntries(tabs.map((t) => [t.key, byTab.get(t.key)?.length ?? 0]))}
        onSelect={selectTab}
      />

      <div id="results-tabpanel" role="tabpanel" aria-labelledby={`results-tab-${active}`}>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : activeLists.length === 0 ? (
          <ComicPanel key={active} className="result-pop p-6 text-center bg-paper">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" aria-hidden="true" />
            <p className="font-display text-2xl text-ink">No {activeLabel} results yet</p>
            <p className="text-sm text-ink/60 mt-1 max-w-xl mx-auto">
              Results are posted here as each event finishes. The first events run from 14 November.
            </p>
          </ComicPanel>
        ) : (
          <div key={active} className="result-strip result-pop">
            {activeLists.map((list) => (
              <ResultPanel key={list[0].event_id} list={list} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
