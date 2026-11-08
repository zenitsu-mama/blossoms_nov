import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Maximize2, X } from 'lucide-react'
import { DisplayText } from '@/components/comic/ComicPrimitives'
import mynavathiPhoto from '@/assets/team/mynavathi.png'
import prakashPhoto from '@/assets/team/prakash.png'
import sangeethaPhoto from '@/assets/team/sangeetha.png'
import simonGiriPhoto from '@/assets/team/simon-giri.png'
import tomyPhoto from '@/assets/team/tomy.png'
import karthigaiPhoto from '@/assets/team/karthigai.png'
import amalanathanPhoto from '@/assets/team/amalanathan.png'
import anushaPhoto from '@/assets/team/anusha.png'
import ananyaPhoto from '@/assets/team/ananya.png'
import deerajPhoto from '@/assets/team/deeraj.png'
import hariniPhoto from '@/assets/team/harini.png'
import palguniPhoto from '@/assets/team/palguni.png'
import shravanPhoto from '@/assets/team/shravan.png'
import bharathPhoto from '@/assets/team/bharath.png'
import janyashreePhoto from '@/assets/team/janyashree.png'
import praveenPhoto from '@/assets/team/praveen.png'
import './team.css'

/* ────────────────────────────────────────────────────────────────────────────
   EDIT THE TEAM HERE. Everything on the page is drawn from this array.
   Add `photo: importedImage` to a person to show a real portrait instead of the silhouette.
   ──────────────────────────────────────────────────────────────────────────── */
interface Person {
  name: string
  role: string
  photo?: string
}

interface TapeGroup {
  id: 'faculty' | 'course' | 'leadership'
  title: string
  subtitle: string
  color: string // label + card border colour (from the site palette)
  people: Person[]
}

const TAPES: TapeGroup[] = [
  {
    id: 'faculty',
    title: 'Faculty Coordinators',
    subtitle: 'The teachers who guide the festival.',
    color: '#FDB813',
    people: [
      { name: 'Dr. Mynavathi L', role: 'Faculty Coordinator', photo: mynavathiPhoto },
      { name: 'Dr. Prakash M', role: 'Faculty Coordinator', photo: prakashPhoto },
      { name: 'Dr. Sangeetha G Nagarkatte', role: 'Faculty Coordinator', photo: sangeethaPhoto },
      { name: 'Dr. Simon Giri', role: 'Faculty Coordinator', photo: simonGiriPhoto },
    ],
  },
  {
    id: 'course',
    title: 'Cores',
    subtitle: 'The core team running Blossoms.',
    color: '#ED1E79',
    people: [
      { name: 'Shravan S', role: 'Core Team', photo: shravanPhoto },
      { name: 'S Harini', role: 'Core Team', photo: hariniPhoto },
      { name: 'V Praveen', role: 'Core Team', photo: praveenPhoto },
      { name: 'Alamuru Bharath Simha Reddy', role: 'Core Team', photo: bharathPhoto },
      { name: 'Ananya Narasimha Murthy', role: 'Core Team', photo: ananyaPhoto },
      { name: 'Palguni Bhat', role: 'Core Team', photo: palguniPhoto },
      { name: 'Deeraj S', role: 'Core Team', photo: deerajPhoto },
      { name: 'Janyashree P Malur', role: 'Core Team', photo: janyashreePhoto },
    ],
  },
  {
    id: 'leadership',
    title: 'Department Leadership',
    subtitle: 'The heads behind the department.',
    color: '#0088E8',
    people: [
      { name: 'Dr. Tomy K Kallarakal', role: 'Dean\nSchool of Commerce, Finance and Accountancy', photo: tomyPhoto },
      { name: 'Dr. Karthigai Prakasam', role: 'Associate Dean\nSchool of Commerce, Finance and Accountancy', photo: karthigaiPhoto },
      { name: 'Dr. Amalanathan S', role: 'Head of Department\nDepartment of Commerce', photo: amalanathanPhoto },
      { name: 'Dr. Anusha Srinivasan Iyer', role: 'Associate Head of Department\nDepartment of Commerce', photo: anushaPhoto },
    ],
  },
]

/* ───────────── Hand-drawn doodles for the labels ───────────── */

const STAR = 'M20 4 L24 15 L36 15 L26 22 L30 34 L20 27 L10 34 L14 22 L4 15 L16 15 Z'

function Doodles({ id, side }: { id: TapeGroup['id']; side: 'l' | 'r' }) {
  let art: ReactNode
  if (id === 'faculty') {
    art =
      side === 'l' ? (
        <>
          <path className="fill-a" d="M12 74 L70 20 L84 34 L26 88 L8 92 Z" />
          <path d="M70 20 L78 12 L92 26 L84 34" className="fill-r" />
          <path d="M12 74 L26 88" />
          <path d="M98 14 L102 24 L112 24 L104 30 L107 40 L98 34 L89 40 L92 30 L84 24 L94 24 Z" transform="translate(-14 -4) scale(.9)" className="fill-w" />
        </>
      ) : (
        <>
          <path className="fill-w" d={STAR} transform="translate(8 6) scale(1.5)" />
          <path className="fill-a" d={STAR} transform="translate(72 52) scale(.9)" />
          <path d="M60 14 q8 -8 16 0 M60 22 q8 -8 16 0" />
        </>
      )
  } else if (id === 'course') {
    art =
      side === 'l' ? (
        <>
          {[10, 26, 42, 58, 74].map((x, i) => (
            <rect key={x} className={i % 2 ? 'fill-w' : 'fill-a'} x={x} y={80 - [30, 56, 40, 64, 28][i]} width="12" height={[30, 56, 40, 64, 28][i]} />
          ))}
          <path d="M6 84 H96" />
        </>
      ) : (
        <>
          <path className="fill-a" d="M50 6 Q56 38 90 46 Q56 54 50 86 Q44 54 10 46 Q44 38 50 6 Z" />
          <path d="M96 14 v14 M89 21 h14" />
          <path d="M14 80 q10 -10 20 0 t20 0" />
        </>
      )
  } else {
    art =
      side === 'l' ? (
        <>
          <path className="fill-a" d="M58 4 L22 52 H48 L38 88 L82 36 H56 Z" />
          <path d="M92 20 l8 -10 M96 36 h12" />
        </>
      ) : (
        <>
          <path className="fill-a" d="M12 70 L20 28 L42 52 L60 20 L78 52 L100 28 L108 70 Z" />
          <path d="M12 78 H108" />
          <circle className="fill-r" cx="20" cy="22" r="5" />
          <circle className="fill-r" cx="60" cy="14" r="5" />
          <circle className="fill-r" cx="100" cy="22" r="5" />
        </>
      )
  }
  return (
    <svg className={`tape-doodle tape-doodle--${side}`} viewBox="0 0 120 96" aria-hidden="true" focusable="false">
      {art}
    </svg>
  )
}

/* ───────────── A cassette. `open` swaps in the cassette body and flips the lid up ───────────── */

function TapeVisual({ group, open }: { group: TapeGroup; open: boolean }) {
  return (
    <span className={`tape-frame ${open ? 'tape-frame--tall' : ''}`} style={{ display: 'block' }}>
      {open && (
        <span className="tape-body" aria-hidden="true">
          <span className="tape-window">
            <svg className="tape-reels" viewBox="0 0 200 40" preserveAspectRatio="xMidYMid meet">
              <path d="M40 34 L160 34" stroke="#5a4636" strokeWidth="2.5" fill="none" />
              {[40, 160].map((cx) => (
                <g key={cx} className="reel">
                  <circle cx={cx} cy="20" r="15" fill="#efe6d0" stroke="#2a221c" strokeWidth="1.2" />
                  <circle cx={cx} cy="20" r="5" fill="#2a221c" />
                  {[0, 60, 120, 180, 240, 300].map((a) => (
                    <line key={a} x1={cx} y1="20" x2={cx} y2="9" stroke="#2a221c" strokeWidth="1.4" transform={`rotate(${a} ${cx} 20)`} />
                  ))}
                </g>
              ))}
            </svg>
          </span>
          <span className="tape-hinge" />
        </span>
      )}
      <span className="tape-lid">
        <span className="tape-shell">
          <span className="tape-label">
            <Doodles id={group.id} side="l" />
            <span className="tape-side" aria-hidden="true">Blossoms 26–27</span>
            <span className="tape-name">{group.title}</span>
            <Doodles id={group.id} side="r" />
            <span className="tape-count" aria-hidden="true">{group.people.length} tracks</span>
          </span>
        </span>
      </span>
    </span>
  )
}

/* ───────────── Trading card ───────────── */

function PersonCard({ person, color, onEnlarge }: { person: Person; color: string; onEnlarge?: () => void }) {
  return (
    <div className="tcard" style={{ '--c': color } as CSSProperties}>
      <div className="tcard__inner">
        <div className="tcard__face">
          <div className="tcard__head">
            <span className="tcard__badge" aria-hidden="true">B</span>
            <span>Blossoms Heroes</span>
          </div>
          <div className="tcard__portrait">
            {person.photo ? (
              <img src={person.photo} alt="" />
            ) : (
              <>
                <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
                  <circle cx="50" cy="40" r="17" />
                  <path d="M12 100 Q14 66 50 62 Q86 66 88 100 Z" />
                </svg>
                <span className="tcard__ph" aria-hidden="true">photo soon</span>
              </>
            )}
          </div>
          <p className="tcard__plate">{person.name}</p>
          <p className="tcard__role">{person.role}</p>
          <span className="tcard__shine" />
        </div>
      </div>
      {onEnlarge && (
        <button type="button" className="tcard__enlarge" aria-label={`Enlarge ${person.name}'s card`} onClick={onEnlarge}>
          <Maximize2 aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/* ───────────── Enlarged overlay ───────────── */

function CardOverlay({ person, color, onClose }: { person: Person; color: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>('button'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      className="team-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${person.name}, enlarged card`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button ref={closeRef} type="button" className="team-modal__close" aria-label="Close enlarged card" onClick={onClose}>
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
      <motion.div className="team-modal__card" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
        <PersonCard person={person} color={color} />
      </motion.div>
      <p className="team-modal__hint">Esc to close</p>
    </motion.div>
  )
}

/* ───────────── Page ───────────── */

export default function MeetTheTeamPage() {
  const reduce = useReducedMotion()
  const [openId, setOpenId] = useState<TapeGroup['id'] | null>(null)
  const [lidUp, setLidUp] = useState(false)
  const [enlarged, setEnlarged] = useState<{ person: Person; color: string } | null>(null)
  const enlargeOpener = useRef<HTMLElement | null>(null)
  const tapeButtons = useRef<Partial<Record<TapeGroup['id'], HTMLButtonElement | null>>>({})
  const backRef = useRef<HTMLButtonElement>(null)
  const lastOpened = useRef<TapeGroup['id'] | null>(null)

  const group = TAPES.find((t) => t.id === openId) ?? null

  // Let the lid start closed, then flip it up on the next frame so the transition runs.
  useEffect(() => {
    if (!openId) {
      setLidUp(false)
      return
    }
    lastOpened.current = openId
    window.scrollTo({ top: 0 })
    const t = window.setTimeout(() => setLidUp(true), 60)
    backRef.current?.focus({ preventScroll: true })
    return () => window.clearTimeout(t)
  }, [openId])

  // Put focus back on the tape that was open.
  useEffect(() => {
    if (!openId && lastOpened.current) tapeButtons.current[lastOpened.current]?.focus({ preventScroll: true })
  }, [openId])

  function closeEnlarged() {
    setEnlarged(null)
    enlargeOpener.current?.focus({ preventScroll: true })
  }

  const cardDelay = reduce ? 0 : 0.85

  return (
    <div className="team-stage mx-auto max-w-[1240px] px-4 py-8 space-y-6">
      {/* Slight wobble so lettering and doodles look hand-drawn rather than vector-clean */}
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <filter id="team-wobble" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
        </filter>
      </svg>
      <DisplayText as="h1" className="text-4xl mb-2">Meet the Team</DisplayText>
      <p className="text-ink/60">The organisers, coordinators and volunteers bringing the Blossoms universe to life.</p>

      {!group ? (
        <section aria-label="Team tapes">
          <p className="text-center text-sm text-ink/60 mb-4 font-bubble font-bold">Pick a tape to see who is on it.</p>
          <ul className="tape-stack">
            {TAPES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="tape"
                  style={{ '--tape': t.color } as CSSProperties}
                  ref={(el) => {
                    tapeButtons.current[t.id] = el
                  }}
                  onClick={() => setOpenId(t.id)}
                >
                  <TapeVisual group={t} open={false} />
                  <span className="sr-only">. {t.people.length} people. Open this tape.</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section aria-label={`${group.title} tape`} className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button ref={backRef} type="button" className="team-back" onClick={() => setOpenId(null)}>
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to tapes
            </button>
            <div>
              <DisplayText as="h2" className="text-2xl">{group.title}</DisplayText>
              <p className="text-sm text-ink/60">{group.subtitle}</p>
            </div>
          </div>

          <div className="team-open-tape">
            <div className={`tape tape--static ${lidUp ? 'tape--open' : ''}`} style={{ '--tape': group.color } as CSSProperties}>
              <TapeVisual group={group} open />
            </div>
          </div>

          <ul className="team-cards">
            {group.people.map((person, i) => {
              const row = Math.floor(i / 4)
              const fan = ((i % 4) - 1.5) * 2.4
              return (
                <motion.li
                  key={`${group.id}-${i}`}
                  initial={reduce ? false : { opacity: 0, y: -220 - row * 300, scale: 0.55, rotate: 0 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: fan }}
                  transition={{
                    delay: cardDelay + i * 0.1,
                    type: 'spring',
                    stiffness: 150,
                    damping: 17,
                    opacity: { duration: 0.2, delay: cardDelay + i * 0.1 },
                  }}
                >
                  <PersonCard
                    person={person}
                    color={group.color}
                    onEnlarge={() => {
                      enlargeOpener.current = document.activeElement as HTMLElement
                      setEnlarged({ person, color: group.color })
                    }}
                  />
                </motion.li>
              )
            })}
          </ul>
        </section>
      )}

      <AnimatePresence>
        {enlarged && <CardOverlay key="overlay" person={enlarged.person} color={enlarged.color} onClose={closeEnlarged} />}
      </AnimatePresence>
    </div>
  )
}
