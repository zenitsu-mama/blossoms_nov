import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { createScope, createTimeline, stagger } from 'animejs'
import { ClashScene } from '@/features/public/landing/ClashScene'
import { ComicFlipStory } from '@/features/public/landing/ComicFlipStory'
import { ScrollFx } from '@/features/public/landing/ScrollFx'
import { preloadLanding } from '@/features/public/landing/preloadLanding'
import { scrollTimeline, useScrollScene } from '@/features/public/landing/useScrollScene'
import blossomsLogoUrl from '@/assets/brand/blossoms-2026-27-lockup.webp'
import { ComicCover } from '@/components/comic/ComicCover'
import './landing.css'

// 720p H.264 MP4 (plays everywhere, hardware-decoded), fast-start so it begins before it has fully downloaded.
const TRAILER_VIDEO = '/media/blossoms-trailer-720p.mp4'
const TRAILER_POSTER = '/media/blossoms-trailer-poster.webp'
const TRAILER_URL = 'https://www.instagram.com/reel/DfSQot_yvaz/'

const WHY_PARTICIPATE = [
  'Develop leadership and organizational skills.',
  'Build team spirit and improve relationships among students.',
  'Explore new interests and rediscover hidden talents.',
  'Develop punctuality, discipline, collaboration and adaptability.',
  'Share ideas, practice diligently and work as a team.',
  "Experience healthy competition, respect and appreciation for others' skills.",
  'Develop emotional intelligence and resilience.',
  'Showcase diverse talents and unique strengths.',
  'Create unforgettable memories and lasting friendships.',
]

interface HomeLandingProps {
  /** True when the page should play its entrance (first load, motion allowed). */
  animateIn: boolean
  /** True once the loading screen has cleared. */
  ready: boolean
  onOpenSchedule: () => void
  onOpenAnnouncements: () => void
}

// As the hero scrolls away, the copy drifts up and the art sinks back, handing over to the clash scene.
function buildHeroExit(section: HTMLElement) {
  scrollTimeline(section, 'exit')
    .add('.landing-hero-copy', { y: [0, -140], opacity: [1, 0], duration: 1000 }, 0)
    .add('.landing-hero-float', { y: [0, 160], scale: [1, 0.8], rotate: [0, -6], opacity: [1, 0.2], duration: 1000 }, 0)
    .add('.landing-scroll-cue', { opacity: [1, 0], duration: 250 }, 0)
}

function LandingHero({ animateIn, ready, onOpenSchedule }: Omit<HomeLandingProps, 'onOpenAnnouncements'>) {
  const root = useRef<HTMLElement>(null)
  useScrollScene(root, buildHeroExit)

  useEffect(() => {
    if (!animateIn || !ready || !root.current) return
    const scope = createScope({ root }).add(() => {
      createTimeline({ defaults: { ease: 'outExpo' } })
        .add('.landing-hero-art', { opacity: [0, 1], scale: [0.55, 1], rotate: [-14, 2.5], ease: 'outElastic(1, .65)', duration: 1100 }, 0)
        .add('.landing-hero-logo', { opacity: [0, 1], scale: [1.35, 1], duration: 700 }, 120)
        .add('.landing-hero-copy > *', { opacity: [0, 1], y: [28, 0], delay: stagger(90), duration: 600 }, 420)
        .add('.landing-scroll-cue', { opacity: [0, 1], duration: 500 }, 1000)
    })
    return () => scope.revert()
  }, [animateIn, ready])

  return (
    <section ref={root} id="main-content" className="landing-hero">
      <div className="landing-hero-copy">
        <h1 className="landing-hero-logo">
          <img src={blossomsLogoUrl} alt="Blossoms: Be the best, 2026–27" />
        </h1>
        <p className="landing-caption font-comic-sub">Your campus. Your story.</p>
        <p className="landing-hero-lede">
          The annual cultural festival of CHRIST (Deemed to be University). Arts, literary, stage
          and theatre, with an event for every student.
        </p>
        <div className="landing-actions">
          <Link to="/events" className="landing-btn">
            Browse events
          </Link>
          <button type="button" className="landing-btn landing-btn--paper" onClick={onOpenSchedule}>
            Event schedule
          </button>
        </div>
      </div>

      <div className="landing-hero-float">
        <div className="landing-hero-art">
          <div role="img" aria-label="Blossoms comic cover: a student pulls open their shirt to reveal a hero suit with a yellow B">
            <ComicCover />
          </div>
        </div>
      </div>

      <p className="landing-scroll-cue font-comic-sub" aria-hidden="true">
        Scroll for the story
        <ChevronDown className="w-5 h-5" />
      </p>
    </section>
  )
}

function TrailerAndAbout({ onOpenSchedule, onOpenAnnouncements }: Pick<HomeLandingProps, 'onOpenSchedule' | 'onOpenAnnouncements'>) {
  return (
    <section className="landing-about" aria-label="Trailer and festival details">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none halftone-dots-light" />

      <div className="landing-about-grid">
        <figure className="landing-trailer">
          <figcaption className="landing-trailer-tab font-comic-display">Official trailer</figcaption>
          {/* preload="none": only the poster loads with the page; the 9 MB 720p file streams once play is pressed. */}
          <video controls playsInline preload="none" poster={TRAILER_POSTER} aria-label="Blossoms 2026–27 official trailer">
            <source src={TRAILER_VIDEO} type="video/mp4" />
          </video>
          <a href={TRAILER_URL} target="_blank" rel="noreferrer" className="landing-trailer-link font-comic-sub">
            Watch on Instagram
          </a>
        </figure>

        <div className="landing-about-copy">
          <div className="landing-about-panels">
            <article className="landing-panel">
              <h3 className="font-comic-display">What is Blossoms?</h3>
              <p>
                A multi-day festival with events across Arts, Literary, Stage, Theatre and Special categories. From
                solo performances to team competitions, every student gets a chance to take part and show their
                talent.
              </p>
            </article>
            <article className="landing-panel landing-panel--tilt">
              <h3 className="font-comic-display">Who can take part?</h3>
              <p>
                Every current student of CHRIST University. Events are open across departments, so
                yours never limits what you register for. Some events set their own team sizes.
              </p>
            </article>
            <article className="landing-panel landing-panel--wide">
              <h3 className="font-comic-display">Why should you participate in Blossoms?</h3>
              <ul className="landing-why-list">
                {WHY_PARTICIPATE.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="landing-why-summary">
                In short: Blossoms offers every student a chance to shine, contribute and take pride in representing
                their department.
              </p>
            </article>
          </div>

          <p className="landing-organiser font-comic-sub">Organised by the Department of Commerce</p>

          <div className="landing-actions">
            <Link to="/events" className="landing-btn">
              Browse events
            </Link>
            <button type="button" className="landing-btn landing-btn--paper" onClick={onOpenSchedule}>
              Event schedule
            </button>
            <button type="button" className="landing-btn landing-btn--paper" onClick={onOpenAnnouncements}>
              Announcements
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/** The home page: hero, the scroll-driven comic story, then the trailer and festival details. */
export default function HomeLanding({ animateIn, ready, onOpenSchedule, onOpenAnnouncements }: HomeLandingProps) {
  // Start loading every scene's art while the opening plays, so nothing pops in mid-animation.
  useEffect(() => {
    preloadLanding()
  }, [])

  return (
    <main className="landing">
      <ScrollFx />
      <LandingHero animateIn={animateIn} ready={ready} onOpenSchedule={onOpenSchedule} />
      <ClashScene />
      <ComicFlipStory />
      <TrailerAndAbout onOpenSchedule={onOpenSchedule} onOpenAnnouncements={onOpenAnnouncements} />
    </main>
  )
}
