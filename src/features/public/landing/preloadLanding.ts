import heroUrl from '@/assets/brand/hero-b.webp'
import burstUrl from '@/assets/brand/bg-purple-burst.svg'
import lockupUrl from '@/assets/brand/blossoms-2026-27-lockup.webp'
import artsUrl from '@/assets/brand/panel-arts.webp'
import literatureUrl from '@/assets/brand/panel-literature.webp'
import stageUrl from '@/assets/brand/panel-stage.webp'
import theatreUrl from '@/assets/brand/panel-theatre.webp'

const LANDING_IMAGES = [heroUrl, burstUrl, lockupUrl, artsUrl, literatureUrl, stageUrl, theatreUrl]

let pending: Promise<void> | null = null

/** Loads every landing image and the display face once; later calls share the same promise. */
export function preloadLanding(): Promise<void> {
  pending ??= Promise.all([
    ...LANDING_IMAGES.map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = new Image()
          image.onload = () => resolve()
          image.onerror = () => resolve()
          image.src = src
        })
    ),
    document.fonts?.ready,
  ]).then(() => undefined)
  return pending
}
