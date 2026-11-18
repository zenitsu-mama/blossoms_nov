import { useEffect, useRef, useState } from 'react'
import './powers.css'

export type PowerKey = 'arts' | 'literature' | 'stage' | 'theatre'

interface PowerTab {
  key: PowerKey
  label: string
}

const WORD: Record<PowerKey, string> = {
  arts: 'ZAP!',
  literature: 'STRETCH!',
  stage: 'SMASH!',
  theatre: 'BLAZE!',
}
const INK = '#1a1209'
const SPLATS = ['#ff4f8b', '#ffd23f', '#3aa7ff', '#37d67a', '#a855f7']
const LINE = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

/** Flames that rise behind the theatre masks. */
function Flames() {
  return (
    <g>
      {[30, 45, 60, 75, 90].map((c, i) => {
        const h = [70, 92, 104, 94, 74][i]
        return (
          <g key={c} className="pw-flame" style={{ animationDelay: `${i * 120}ms` }}>
            <path
              d={`M${c - 17} 96 C${c - 22} 72 ${c - 5} 66 ${c} ${94 - h} C${c + 5} 66 ${c + 22} 72 ${c + 17} 96 Z`}
              fill="#ffd23f"
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path d={`M${c - 9} 94 C${c - 12} 78 ${c - 2} 74 ${c} ${94 - h * 0.62} C${c + 2} 74 ${c + 12} 78 ${c + 9} 94 Z`} fill="#ff7a1a" />
          </g>
        )
      })}
    </g>
  )
}

/** ART: a paint palette with a brush sticking up out of the badge. */
function ArtIcon() {
  return (
    <>
      <path
        d="M16 112 C12 82 48 66 78 72 C108 78 114 104 100 118 C90 128 80 118 72 126 C64 134 68 148 48 148 C28 148 18 132 16 112 Z"
        fill="#f4d29c"
        {...LINE}
      />
      <path d="M26 104 C30 90 44 82 58 80" stroke="#fff4dc" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="86" cy="104" r="7" fill="#f2efe6" {...LINE} />
      <circle cx="34" cy="104" r="8" fill="#e23b3b" {...LINE} />
      <circle cx="50" cy="90" r="7.5" fill="#ffd23f" {...LINE} />
      <circle cx="70" cy="88" r="7.5" fill="#3a72e8" {...LINE} />
      <circle cx="38" cy="128" r="7.5" fill="#37d67a" {...LINE} />
      <g transform="rotate(-14 70 96)">
        <g className="pw-part">
          <rect x="64" y="40" width="13" height="84" rx="6.5" fill="#e23b3b" {...LINE} />
          <path d="M68 50 v62" stroke="#ff9a9a" strokeWidth="3" strokeLinecap="round" />
          <rect x="62" y="24" width="17" height="18" rx="3" fill="#c9ccd6" {...LINE} />
          <path d="M62 30 h17 M62 36 h17" stroke={INK} strokeWidth="2" />
          <path d="M62 24 C61 12 66 2 70.5 -6 C75 2 80 12 79 24 Z" fill="#7a4a24" {...LINE} />
          <path d="M66 4 C67 -1 69 -4 70.5 -6 C72 -4 74 -1 75 4 C72 6 69 6 66 4 Z" fill="#3a72e8" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      </g>
    </>
  )
}

/** LITERARY: an open book with a quill rising out of it (the quill stretches on press). */
function LiteraryIcon() {
  const feather = 'M64 116 C56 84 52 40 66 0 C82 34 80 84 68 116 Z'
  return (
    <>
      <rect x="8" y="88" width="22" height="24" rx="5" fill="#2a3a8a" {...LINE} />
      <rect x="13" y="80" width="12" height="9" rx="2" fill="#2a3a8a" {...LINE} />
      <path d="M13 96 v10" stroke="#7d8fe0" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 118 L8 150 Q34 140 60 150 Q86 140 112 150 L112 118" fill="#f08a24" {...LINE} />
      <path d="M12 114 Q36 104 60 114 L60 144 Q36 134 12 144 Z" fill="#fffaf0" {...LINE} />
      <path d="M60 114 Q84 104 108 114 L108 144 Q84 134 60 144 Z" fill="#fffaf0" {...LINE} />
      <path d="M20 120 Q36 114 52 120 M20 128 Q36 122 52 128 M68 120 Q84 114 100 120 M68 128 Q84 122 100 128" stroke={INK} strokeWidth="2" fill="none" opacity="0.4" />
      <g transform="rotate(16 64 116)">
        <path className="pw-echo" d={feather} transform="translate(0 -26)" fill="rgb(255 220 170 / 0.55)" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" />
        <g className="pw-part">
          <path d={feather} fill="#f08a24" {...LINE} />
          <path d="M66 110 C63 80 62 40 66 8" stroke={INK} strokeWidth="2.2" fill="none" />
          <path d="M64 40 l-7 -6 M64 56 l-8 -6 M64 72 l-8 -6 M67 34 l7 -7 M67 50 l8 -7 M67 66 l8 -7" stroke="#ffc06a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M63 114 L66 132 L69 114 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </g>
      </g>
    </>
  )
}

/** STAGE: a vintage microphone with music notes. It shakes and cracks on press. */
function StageIcon() {
  return (
    <>
      <ellipse cx="60" cy="148" rx="34" ry="9" fill="#2d6fe0" {...LINE} />
      <rect x="55" y="90" width="10" height="56" rx="3" fill="#2d6fe0" {...LINE} />
      <path d="M58 96 v40" stroke="#7aa3ff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M36 52 Q36 92 60 92 Q84 92 84 52" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M36 52 Q36 92 60 92 Q84 92 84 52" fill="none" stroke="#9aa0ad" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="38" y="0" width="44" height="76" rx="22" fill="#d7dae2" {...LINE} />
      <path d="M46 14 h28 M42 24 h36 M42 34 h36 M42 62 h36" stroke={INK} strokeWidth="2" opacity="0.45" />
      <path d="M46 10 Q44 30 46 50" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="36" y="40" width="48" height="13" rx="4" fill="#2d6fe0" {...LINE} />
      <path className="pw-crack" d="M62 4 L54 22 L66 34 L56 56 L64 72" stroke={INK} strokeWidth="3.5" fill="none" strokeLinejoin="round" />
      <g fill={INK}>
        <ellipse cx="14" cy="58" rx="7" ry="5.5" transform="rotate(-20 14 58)" />
        <path d="M19 57 V28 l14 -5 v6 l-10 3 V57 Z" />
        <ellipse cx="102" cy="40" rx="6.5" ry="5" transform="rotate(-20 102 40)" />
        <path d="M107 39 V14 h4 v25 Z" />
      </g>
    </>
  )
}

/** THEATRE: comedy and tragedy masks with flames behind them. */
function TheatreIcon() {
  const mask = 'M0 0 C16 -7 38 -7 54 0 C56 32 45 58 27 64 C9 58 -2 32 0 0 Z'
  return (
    <>
      <Flames />
      <g transform="translate(58 62) rotate(14)">
        <path d={mask} fill="#e0561f" {...LINE} />
        <path d="M8 6 C10 30 16 46 26 56" stroke="#ff9a6a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M11 22 q6 7 12 0 M31 22 q6 7 12 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M14 48 Q27 32 40 48 Q27 42 14 48 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g transform="translate(10 52) rotate(-12)">
        <path d={mask} fill="#ffd23f" {...LINE} />
        <path d="M8 6 C10 30 16 46 26 56" stroke="#fff4b0" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M11 24 q6 -8 12 0 M31 24 q6 -8 12 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M12 36 Q27 54 42 36 Q27 44 12 36 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      </g>
    </>
  )
}

const ICONS: Record<PowerKey, () => React.JSX.Element> = {
  arts: ArtIcon,
  literature: LiteraryIcon,
  stage: StageIcon,
  theatre: TheatreIcon,
}

function Badge({ kind, go }: { kind: PowerKey; go: boolean }) {
  const Icon = ICONS[kind]
  return (
    <svg className={`pw-icon pw-icon--${kind} ${go ? 'pw-icon--go' : ''}`} viewBox="0 0 120 160" overflow="visible" aria-hidden="true">
      <Icon />
    </svg>
  )
}

/** Short-lived effects that fire when a medallion is pressed. They remount on every press. */
function Effects({ kind }: { kind: PowerKey }) {
  return (
    <div className="pw-fx" aria-hidden="true">
      <span className="pw-word">{WORD[kind]}</span>

      {kind === 'arts' && (
        <>
          <i className="pw-orb" />
          {SPLATS.concat(SPLATS).map((c, i) => (
            <i key={i} className="pw-splat" style={{ ['--a' as string]: `${i * 36}deg`, ['--c' as string]: c, animationDelay: `${i * 18}ms` }} />
          ))}
        </>
      )}

      {kind === 'literature' && [0, 1, 2].map((i) => <i key={i} className="pw-whoosh" style={{ ['--i' as string]: i }} />)}

      {kind === 'stage' && (
        <>
          <i className="pw-shock" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <i key={i} className="pw-debris" style={{ ['--a' as string]: `${i * 45 + 20}deg`, ['--d' as string]: `${46 + (i % 3) * 14}px` }} />
          ))}
        </>
      )}

      {kind === 'theatre' && (
        <>
          <i className="pw-heat" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <i key={i} className="pw-ember" style={{ ['--x' as string]: `${(i - 3) * 13}px`, animationDelay: `${i * 90}ms` }} />
          ))}
        </>
      )}
    </div>
  )
}

interface PowerTabsProps {
  tabs: PowerTab[]
  active: PowerKey
  counts: Partial<Record<PowerKey, number>>
  onSelect: (key: PowerKey) => void
}

/**
 * Four category medallions (the events page's brush, quill, microphone and masks) that double as the tabs.
 * Pressing one fires its power. Power up all four and the squad assembles.
 */
export function PowerTabs({ tabs, active, counts, onSelect }: PowerTabsProps) {
  const [fx, setFx] = useState<{ key: PowerKey; id: number } | null>(null)
  const [assemble, setAssemble] = useState(0)
  const visited = useRef(new Set<PowerKey>())
  const idRef = useRef(0)

  useEffect(() => {
    if (!assemble) return
    const t = window.setTimeout(() => setAssemble(0), 3200)
    return () => window.clearTimeout(t)
  }, [assemble])

  function press(key: PowerKey) {
    onSelect(key)
    setFx({ key, id: ++idRef.current })
    visited.current.add(key)
    const core = ['arts', 'literature', 'stage', 'theatre'] as const
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced && core.every((k) => visited.current.has(k))) {
      visited.current.clear()
      window.setTimeout(() => setAssemble(++idRef.current), 650)
    }
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = tabs[(index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    press(next.key)
    document.getElementById(`results-tab-${next.key}`)?.focus()
  }

  return (
    <>
      <div className="pw-stage">
        <p className="pw-hint">Tap a badge to power up</p>
        <div role="tablist" aria-label="Result categories" className={`pw-row ${assemble ? 'pw-row--assemble' : ''}`}>
          {tabs.map((t, i) => {
            const go = fx?.key === t.key ? fx.id : 0
            return (
              <button
                key={t.key}
                id={`results-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={active === t.key}
                aria-controls="results-tabpanel"
                tabIndex={active === t.key ? 0 : -1}
                className={`pw-btn pw-btn--${t.key}`}
                onClick={() => press(t.key)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className="pw-circle">
                  <span className="pw-stack">
                    <Badge key={go} kind={t.key} go={go > 0} />
                  </span>
                  {go > 0 && <Effects key={go} kind={t.key} />}
                  <span className="pw-count">{counts[t.key] ?? 0}</span>
                </span>
                <span className="pw-label">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {assemble > 0 && (
        <div key={assemble} className="pw-assemble" aria-hidden="true">
          <div className="pw-assemble-rays" />
          <p className="pw-assemble-text">
            <span>Blossoms</span>
            <strong>Assemble!</strong>
          </p>
        </div>
      )}
    </>
  )
}
