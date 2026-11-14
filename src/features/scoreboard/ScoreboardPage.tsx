import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getFestSettings, getTeamPositions, type TeamPosition } from '@/lib/api/admin'
import { useAuth } from '@/lib/auth/authStore'
import { isSupabaseConfigured } from '@/lib/supabase/client'

const ART = '/media/scoreboard'

/** Where each bar sits on the 1920×1080 artwork, in percent of the whole picture (measured from it). */
const BARS = [
  { left: 29.6875, top: 25.8333, width: 42.34375, height: 10.7407 },
  { left: 29.7917, top: 40.6481, width: 42.29167, height: 9.25926 },
  { left: 29.6875, top: 54.7222, width: 41.92708, height: 9.16667 },
  { left: 29.7917, top: 69.0741, width: 41.875, height: 9.25926 },
]

/**
 * The part of the picture to show. Wide screens get all of it; phones get the middle (title, board and the tops of
 * the buildings) so the bars are about 1.5× bigger.
 */
const FULL = { x: 0, y: 0, w: 100, h: 100 }
const PHONE = { x: 17, y: 0, w: 66, h: 86 }

function useIsPhone() {
  const query = '(max-width: 639px)'
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${s}`
}

/**
 * The Blossoms scoreboard: the four teams in order, positions only. Points are never sent to the public
 * (the database hands out positions alone), and nothing shows until an admin switches the board on.
 */
export default function ScoreboardPage() {
  const { admin } = useAuth()
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['team-positions'],
    queryFn: () => (isSupabaseConfigured ? getTeamPositions() : Promise.resolve([] as TeamPosition[])),
  })
  // Only super admins see the board while it is switched off; every other admin sees "coming soon" like students.
  const isSuper = admin?.role === 'super_admin'
  const { data: settings } = useQuery({ queryKey: ['fest-settings'], queryFn: getFestSettings, enabled: isSuper })

  const ranked = teams.some((t) => t.position != null)
  const hiddenForAdmin = isSuper && settings?.leaderboard_public === false

  const view = useIsPhone() ? PHONE : FULL
  // Sizes below are written for the whole picture; k scales them up when only part of it is shown.
  const k = 100 / view.w
  const frame: CSSProperties = {
    aspectRatio: `${(1920 * view.w) / (1080 * view.h)}`,
    backgroundImage: `url(${ART}/scoreboard-bg.webp)`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${(100 / view.w) * 100}% ${(100 / view.h) * 100}%`,
    backgroundPosition: `${view.w === 100 ? 0 : (view.x / (100 - view.w)) * 100}% ${view.h === 100 ? 0 : (view.y / (100 - view.h)) * 100}%`,
    ['--k' as string]: k,
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 space-y-5">
      <h1 className="sr-only">Blossoms Scoreboard</h1>

      {hiddenForAdmin && (
        <p className="rounded-xl border-2 border-ink bg-[#FFD43B] px-4 py-2 text-sm font-semibold text-ink">
          Only super admins can see this. Everyone else sees “coming soon” until you switch the scoreboard on in{' '}
          <Link to="/admin/points" className="underline">Points &amp; teams</Link>.
        </p>
      )}

      <div
        className="relative w-full overflow-hidden rounded-2xl border-[3px] border-ink shadow-[5px_5px_0_0_#151515] [container-type:inline-size]"
        style={frame}
        role="img"
        aria-label={
          teams.length
            ? `Blossoms scoreboard: ${teams.map((t) => `${t.position ? ordinal(t.position) : 'to be announced'}, ${t.name}`).join('; ')}`
            : 'Blossoms scoreboard, coming soon'
        }
      >
        {BARS.map((bar, i) => {
          const team = teams[i]
          const box: CSSProperties = {
            left: `${((bar.left - view.x) / view.w) * 100}%`,
            top: `${((bar.top - view.y) / view.h) * 100}%`,
            width: `${(bar.width / view.w) * 100}%`,
            height: `${(bar.height / view.h) * 100}%`,
          }
          const mask = `url(${ART}/scoreboard-bar-${i + 1}.png) center / 100% 100% no-repeat`
          return (
            <div key={i} className="absolute" style={box}>
              <div className="absolute inset-0" style={{ background: team?.color ?? '#3a3a3a', WebkitMask: mask, mask }} />
              {team && (
                <div className="absolute inset-0 flex items-center gap-[calc(var(--k)*1.4cqw)] pl-[calc(var(--k)*1.6cqw)] pr-[calc(var(--k)*2cqw)]">
                  <span className="shrink-0 rounded-[calc(var(--k)*0.6cqw)] border-[calc(var(--k)*0.22cqw)] border-ink bg-white px-[calc(var(--k)*0.8cqw)] pt-[calc(var(--k)*0.25cqw)] pb-[calc(var(--k)*0.1cqw)] font-display text-[calc(var(--k)*2.3cqw)] leading-none tracking-[0.04em] text-ink">
                    {team.position ? ordinal(team.position) : '—'}
                  </span>
                  <span className="scoreboard-name min-w-0 overflow-hidden whitespace-nowrap font-display text-[calc(var(--k)*3.1cqw)] leading-[1.15] tracking-[0.06em] uppercase">
                    {team.name}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {!isLoading && teams.length === 0 && (
          <div className="absolute inset-x-0 top-[44%] flex justify-center">
            <span className="rounded-[1cqw] border-[0.3cqw] border-ink bg-white px-[calc(var(--k)*2cqw)] py-[calc(var(--k)*0.8cqw)] font-display text-[calc(var(--k)*3cqw)] uppercase tracking-[0.05em] text-ink shadow-[0.4cqw_0.4cqw_0_0_#151515]">
              Coming soon
            </span>
          </div>
        )}
      </div>

      {!isLoading && teams.length === 0 && (
        <p className="text-center font-display text-lg uppercase tracking-[0.04em] text-ink">
          Coming soon: the team positions will show here once the scoreboard opens.
        </p>
      )}

      {teams.length > 0 && !ranked && (
        <p className="text-center text-sm font-semibold text-ink/70">Positions will appear once the first results are in.</p>
      )}

      {/* Comic lettering: white with a thick black outline and a drop shadow, readable on every team colour. */}
      <style>{`
        .scoreboard-name {
          color: #fff;
          -webkit-text-stroke: calc(var(--k) * 0.32cqw) #151515;
          paint-order: stroke fill;
          text-shadow: calc(var(--k) * 0.18cqw) calc(var(--k) * 0.22cqw) 0 #151515;
          padding-right: 0.15em;
        }
      `}</style>
    </div>
  )
}
