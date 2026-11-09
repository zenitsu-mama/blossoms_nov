import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import cover1Url from '@/assets/covers/cover-1.webp'
import cover2Url from '@/assets/covers/cover-2.webp'
import cover3Url from '@/assets/covers/cover-3.webp'
import cover4Url from '@/assets/covers/cover-4.webp'
import cover5Url from '@/assets/covers/cover-5.webp'
import cover6Url from '@/assets/covers/cover-6.webp'
import cover7Url from '@/assets/covers/cover-7.webp'
import cover8Url from '@/assets/covers/cover-8.webp'
import cover9Url from '@/assets/covers/cover-9.webp'
import cover10Url from '@/assets/covers/cover-10.webp'
import cover11Url from '@/assets/covers/cover-11.webp'
import { ComicCover, comicCoverImages } from '@/components/comic/ComicCover'
import backdropUrl from '@/assets/brand/opening-backdrop.webp'

const COVERS = [
  cover1Url,
  cover2Url,
  cover3Url,
  cover4Url,
  cover5Url,
  cover6Url,
  cover7Url,
  cover8Url,
  cover9Url,
  cover10Url,
  cover11Url,
]
const FIRST_TURN_MS = 250
const TURN_GAP_MS = 190
const TURN_MS = 360
const LEAVE_MS = 300
// The last flip ends around 2.51s, then the cover holds for 2s before the fade out (about 4.8s in all).
const COVER_HOLD_MS = 2000
// On slow phone data, start anyway after this and skip any cover that hasn't arrived, so no blank page flips by.
const PRELOAD_LIMIT_MS = 3500

/** Loads and decodes an image off the main thread, so the flip itself doesn't stutter. Resolves false on failure. */
function loadImage(src: string): Promise<boolean> {
  const image = new Image()
  image.decoding = 'async'
  image.src = src
  return image
    .decode()
    .then(() => true)
    .catch(() => false)
}

// Resets on every full page load, so in-app navigation back to home doesn't replay it.
let playedThisLoad = false

/** Plays once per page load, and never for people who ask for less motion. */
export function shouldPlayOpening(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return !playedThisLoad
}

export function ComicOpening({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // Covers that finished loading before the flips started; only these flip.
  const [pages, setPages] = useState<string[]>([])
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  // Hold the first flip until the covers can actually show.
  useEffect(() => {
    let cancelled = false
    const ready = new Set<string>()
    const start = () => {
      if (cancelled) return
      cancelled = true
      setPages(COVERS.filter((src) => ready.has(src)))
      setRunning(true)
    }
    const limit = window.setTimeout(start, PRELOAD_LIMIT_MS)
    const backdrop = loadImage(backdropUrl)
    const cover = Promise.all(comicCoverImages.map(loadImage))
    const flips = COVERS.map((src) => loadImage(src).then((ok) => ok && ready.add(src)))
    Promise.all([backdrop, cover, ...flips]).then(start)
    return () => {
      cancelled = true
      window.clearTimeout(limit)
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const lastTurnEnds = pages.length > 0 ? FIRST_TURN_MS + TURN_GAP_MS * (pages.length - 1) + TURN_MS : 0
    const timer = window.setTimeout(() => setLeaving(true), lastTurnEnds + COVER_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [running, pages.length])

  useEffect(() => {
    if (!leaving) return
    playedThisLoad = true
    const timer = window.setTimeout(() => onDoneRef.current(), LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [leaving])

  return (
    <div
      className={cn('comic-opening', running && 'comic-opening--running', leaving && 'comic-opening--leaving')}
      style={{ backgroundImage: `url(${backdropUrl})` }}
    >
      <div className="comic-opening-book" aria-hidden="true">
        <div className="comic-opening-page comic-opening-page--last">
          <ComicCover />
        </div>
        {pages.map((src, index) => (
          <div
            key={src}
            className="comic-opening-page comic-opening-page--turn"
            style={{
              zIndex: pages.length - index,
              animationDelay: `${FIRST_TURN_MS + TURN_GAP_MS * index}ms`,
            }}
          >
            <img src={src} alt="" />
          </div>
        ))}
      </div>
      <button type="button" className="comic-opening-skip" onClick={() => setLeaving(true)}>
        Skip
      </button>
    </div>
  )
}
