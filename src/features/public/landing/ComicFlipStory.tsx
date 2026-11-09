import { useRef } from 'react'
import { scrollTimeline, useScrollScene } from '@/features/public/landing/useScrollScene'
import artsUrl from '@/assets/brand/panel-arts.webp'
import literatureUrl from '@/assets/brand/panel-literature.webp'
import stageUrl from '@/assets/brand/panel-stage.webp'
import theatreUrl from '@/assets/brand/panel-theatre.webp'
import heroUrl from '@/assets/brand/hero-b.webp'

export const ABOUT_TITLE_ID = 'landing-about-title'

// Placeholder pages until the final four story illustrations arrive. Swap the src values to replace them.
const STORY_PAGES = [
  { src: artsUrl, alt: 'A comic panel of paint brushes and a palette' },
  { src: literatureUrl, alt: 'A comic panel of a quill and a stack of books' },
  { src: stageUrl, alt: 'A comic panel of stage lights and a microphone' },
  { src: theatreUrl, alt: 'A comic panel of the comedy and tragedy masks' },
]

const ARRIVE_END = 120
// Turns overlap: each page starts before the previous one lands, so the book never sits still mid-story.
const TURN_GAP = 130
const TURN_LENGTH = 210
const LAST_TURN_END = ARRIVE_END + TURN_GAP * (STORY_PAGES.length - 1) + TURN_LENGTH
const REVEAL_AT = LAST_TURN_END - 60

function buildFlipStory(section: HTMLElement) {
  const wide = window.innerWidth >= 768
  const closedScale = wide ? 0.62 : 0.95
  const finalScale = wide ? 0.88 : 0.66
  const bookWidth = section.querySelector<HTMLElement>('.flip-book')!.offsetWidth
  // Open spread sits centred; the final page then slides to the left to make room for the About panel.
  const openX = wide ? bookWidth * 0.5 : 0
  const finalX = wide ? -Math.min(window.innerWidth * 0.24, bookWidth * 0.9) : 0
  const finalY = wide ? 0 : -window.innerHeight * 0.14
  const timeline = scrollTimeline(section)

  // The closed book rises in as the section pins, instead of already waiting there.
  timeline
    .add('.flip-book', { x: [0, 0], y: [window.innerHeight * 0.18, 0], scale: [0.42, closedScale], rotate: [-6, 0], ease: 'outQuad', duration: ARRIVE_END }, 0)
    .add('.flip-intro', { opacity: [0, 1, 0], y: [16, 0, -20], duration: ARRIVE_END + 60 }, 0)

  // On wide screens the book slides right as it opens, so the spread stays centred.
  if (wide) timeline.add('.flip-book', { x: [0, openX], duration: TURN_LENGTH }, ARRIVE_END)

  STORY_PAGES.forEach((_, index) => {
    const start = ARRIVE_END + TURN_GAP * index
    const page = `.flip-page[data-page="${index}"]`
    timeline
      .add(page, { rotateY: [0, -180], duration: TURN_LENGTH }, start)
      // Once past the spine, a turned page has to sit above the ones turned before it.
      .add(page, { zIndex: [STORY_PAGES.length - index + 1, 10 + index], duration: 1 }, start + TURN_LENGTH / 2)
  })

  timeline
    .add('.flip-page', { opacity: [1, 0], duration: 140 }, REVEAL_AT)
    .add('.flip-book', { x: [openX, finalX], y: [0, finalY], scale: [closedScale, finalScale], duration: 240 }, REVEAL_AT)
    .add('.flip-final', { opacity: [0, 1], scale: [0.6, 1], rotate: [-8, -3], ease: 'outBack', duration: 110 }, REVEAL_AT + 170)
    // About Blossoms slides in from the right beside the final page.
    .add('.flip-about', { opacity: [0, 1], x: [wide ? 160 : 0, 0], y: [wide ? 0 : 60, 0], duration: 200 }, REVEAL_AT + 120)
    .add('.flip-about-lede', { opacity: [0, 1], duration: 120 }, REVEAL_AT + 220)
}

/** A pinned comic book whose pages turn as you scroll, ending on the full hero page. */
export function ComicFlipStory() {
  const root = useRef<HTMLElement>(null)
  useScrollScene(root, buildFlipStory)

  return (
    <section ref={root} className="flip-story" aria-label="The Blossoms story">
      <div className="flip-stage">
        <p className="flip-intro font-comic-sub">Scroll to turn the page</p>

        <div className="flip-book">
          <div className="flip-cover">
            <img src={heroUrl} alt="A student pulls open their shirt to reveal a hero suit with a yellow B" />
          </div>
          {STORY_PAGES.map(({ src, alt }, index) => (
            <div
              key={src}
              className="flip-page"
              data-page={index}
              style={{ zIndex: STORY_PAGES.length - index + 1 }}
            >
              <div className="flip-face flip-face--front">
                <img src={src} alt={alt} />
              </div>
              <div className="flip-face flip-face--back" aria-hidden="true" />
            </div>
          ))}
        </div>

        <p className="flip-final font-comic-display">Be the best.</p>

        <div className="flip-about">
          <h2 id={ABOUT_TITLE_ID} className="flip-about-title font-comic-display comic-title-white">
            About Blossoms
          </h2>
          <p className="flip-about-lede">
            Blossoms is the annual cultural festival of CHRIST (Deemed to be University). It celebrates student
            creativity, artistic expression and the culture of the CHRIST community.
          </p>
        </div>
      </div>
    </section>
  )
}
