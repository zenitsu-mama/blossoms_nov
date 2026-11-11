import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Users } from 'lucide-react'
import type { Event } from '@/types'
import { slotLabel } from '@/lib/eventDisplay'
import type { ComicPanelConfig } from './ComicPanel'

export type ExpansionPhase = 'idle' | 'expanding' | 'expanded' | 'contracting'

export interface BoundingRectBox {
  left: number
  top: number
  width: number
  height: number
}

interface ExpandedCategoryFrameProps {
  panel: ComicPanelConfig
  phase: ExpansionPhase
  originRect: BoundingRectBox
  events: Event[]
  onBack: () => void
  onSelectEvent?: (eventId: string) => void
}

const FULLSCREEN_CLIP_PATH = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'

const CATEGORY_TITLES: Record<string, string> = {
  arts: 'ARTS',
  literature: 'LITERARY',
  stage: 'STAGE',
  theatre: 'THEATRE',
}

function formatTeamBadge(event: Event): string {
  if (event.event_format === 'individual') return 'Solo'
  if (event.event_format === 'team') {
    if (event.min_team_size && event.max_team_size) {
      return event.min_team_size === event.max_team_size
        ? `Team of ${event.min_team_size}`
        : `Team (${event.min_team_size}–${event.max_team_size})`
    }
    return 'Team'
  }
  if (event.min_team_size && event.max_team_size) {
    return `Solo / Team (${event.min_team_size}–${event.max_team_size})`
  }
  return 'Solo / Team'
}

export const ExpandedCategoryFrame: React.FC<ExpandedCategoryFrameProps> = ({
  panel,
  phase,
  originRect,
  events,
  onBack,
  onSelectEvent,
}) => {
  if (phase === 'idle') return null

  const isContracting = phase === 'contracting'
  const showContent = phase === 'expanding' || phase === 'expanded'
  const categoryHeading = CATEGORY_TITLES[panel.categoryKey] || panel.categoryKey.toUpperCase()
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1648
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 928

  return (
    <motion.section
      data-frame-name={panel.expandedFrameName}
      aria-label={panel.expandedFrameName}
      className="expanded-category-frame"
      style={{ backgroundColor: panel.accentColor }}
      initial={{
        left: originRect.left,
        top: originRect.top,
        width: originRect.width,
        height: originRect.height,
        clipPath: panel.outerClipPath,
      }}
      animate={
        isContracting
          ? {
              left: originRect.left,
              top: originRect.top,
              width: originRect.width,
              height: originRect.height,
              clipPath: panel.outerClipPath,
            }
          : {
              left: 0,
              top: 0,
              width: viewportW,
              height: viewportH,
              clipPath: FULLSCREEN_CLIP_PATH,
            }
      }
      transition={{
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Original panel illustration fades out smoothly during expansion so the expanded state is a plain background */}
      <motion.img
        src={panel.imageSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="expanded-category-origin-layer"
        initial={{ opacity: 1 }}
        animate={{ opacity: isContracting ? 1 : 0 }}
        transition={{
          duration: isContracting ? 0.45 : 0.36,
          delay: isContracting ? 0.18 : 0,
          ease: 'easeInOut',
        }}
      />

      <div className="expanded-category-ink-border" aria-hidden="true" />

      <motion.div
        className="expanded-destination-ui"
        initial={{ opacity: 0, y: 14 }}
        animate={{
          opacity: showContent ? 1 : 0,
          y: showContent ? 0 : 10,
        }}
        transition={{
          duration: isContracting ? 0.18 : 0.34,
          delay: isContracting ? 0 : 0.28,
          ease: 'easeOut',
        }}
        style={{
          pointerEvents: showContent ? 'auto' : 'none',
        }}
      >
        {/* Top Header Bar: Back Button + Category Heading */}
        <div className="expanded-destination-header">
          <button
            type="button"
            onClick={onBack}
            className="expanded-back-button"
            aria-label="Back to Events Showcase"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0f0f0f"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          <div className="expanded-category-title-group">
            <h1 className="expanded-category-heading">{categoryHeading}</h1>
            <span className="expanded-category-count-pill">
              {events.length} {events.length === 1 ? 'EVENT' : 'EVENTS'}
            </span>
          </div>
        </div>

        {/* Category Events Grid */}
        <div
          className="expanded-category-content-stage"
          data-stage-slot="event-list-content-area"
        >
          <div className="expanded-events-grid">
            {events.map((ev, index) => {
              const firstSlot = ev.schedule_slots?.[0]
              const slotText = firstSlot ? slotLabel(firstSlot) : 'Schedule TBD'
              const venueText = firstSlot?.venue?.name || 'Venue TBD'

              return (
                <motion.article
                  key={ev.id}
                  onClick={() => onSelectEvent?.(ev.id)}
                  className="expanded-event-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{
                    opacity: showContent ? 1 : 0,
                    y: showContent ? 0 : 12,
                  }}
                  transition={{
                    duration: 0.32,
                    delay: isContracting ? 0 : 0.32 + index * 0.035,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="expanded-event-card-top">
                    <div className="expanded-event-badges">
                      <span className="expanded-event-index">
                        #{index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                      <span className="expanded-event-format">
                        <Users className="w-3.5 h-3.5" />
                        {formatTeamBadge(ev)}
                      </span>
                    </div>

                    <h2 className="expanded-event-title">{ev.title}</h2>
                  </div>

                  <div className="expanded-event-card-footer">
                    <div className="expanded-event-meta">
                      <div className="expanded-event-meta-row">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-[#E52B27]" />
                        <span className="truncate">{slotText}</span>
                      </div>
                      <div className="expanded-event-meta-row">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-[#087BC4]" />
                        <span className="truncate">{venueText}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent?.(ev.id)
                      }}
                      className="expanded-event-action-btn"
                    >
                      {ev.is_mandatory ? 'Mandatory · Details →' : 'Details & Register →'}
                    </button>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </motion.div>
    </motion.section>
  )
}
