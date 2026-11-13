import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { EVENTS } from '@/lib/data/eventsData'
import { eventOrderIndex } from '@/lib/eventOrder'
import type { Event } from '@/types'
import panel1Url from '@/assets/panel-1.webp'
import panel2Url from '@/assets/panel-2.webp'
import panel3Url from '@/assets/panel-3.webp'
import panel4Url from '@/assets/panel-4.webp'
import mobilePanel1Url from '@/assets/mobile-panel-1.webp'
import mobilePanel2Url from '@/assets/mobile-panel-2.webp'
import mobilePanel3Url from '@/assets/mobile-panel-3.webp'
import mobilePanel4Url from '@/assets/mobile-panel-4.webp'
import { ComicPanel, type ComicPanelConfig } from './ComicPanel'
import {
  type BoundingRectBox,
  ExpandedCategoryFrame,
  type ExpansionPhase,
} from './ExpandedCategoryFrame'

const TRANSITION_DURATION_MS = 650


// Boxes fill the whole layout (the art was drawn bleeding 6% past each side), so the full panels show.
const DESKTOP_COMIC_PANELS: ComicPanelConfig[] = [
  {
    id: 'panel-1-arts',
    categoryKey: 'arts',
    expandedFrameName: 'Arts Expanded',
    ariaLabel: 'Arts events category panel',
    imageSrc: panel1Url,
    accentColor: '#E52B27',
    isExpansionEnabled: true,
    styleBox: {
      left: '0%',
      top: '0%',
      width: '32.411%',
      height: '100%',
    },
    outerClipPath: 'polygon(0% 0%, 68.044% 0%, 100% 100%, 0% 100%)',
    innerClipPath: 'polygon(0.965% 0.495%, 67.082% 0.495%, 98.87% 99.505%, 0.965% 99.505%)',
  },
  {
    id: 'panel-2-literature',
    categoryKey: 'literature',
    expandedFrameName: 'Literary Expanded',
    ariaLabel: 'Literary events category panel',
    imageSrc: panel2Url,
    accentColor: '#F28A24',
    isExpansionEnabled: true,
    styleBox: {
      left: '23.393%',
      top: '0%',
      width: '47.5%',
      height: '55.682%',
    },
    outerClipPath: 'polygon(0% 0%, 100% 0%, 80.639% 100%, 10.714% 89.286%)',
    innerClipPath: 'polygon(0.77% 0.895%, 99.175% 0.895%, 80.15% 99.03%, 11.277% 88.483%)',
  },
  {
    id: 'panel-3-stage',
    categoryKey: 'stage',
    expandedFrameName: 'Stage Expanded',
    ariaLabel: 'Stage events category panel',
    imageSrc: panel3Url,
    accentColor: '#087BC4',
    isExpansionEnabled: true,
    styleBox: {
      left: '63.125%',
      top: '0%',
      width: '36.875%',
      height: '62.5%',
    },
    outerClipPath: 'polygon(24.939% 0%, 100% 0%, 100% 100%, 0% 89.545%)',
    innerClipPath: 'polygon(25.595% 0.795%, 99.155% 0.795%, 99.155% 99.115%, 1.055% 88.843%)',
  },
  {
    id: 'panel-4-theatre',
    categoryKey: 'theatre',
    expandedFrameName: 'Theatre Expanded',
    ariaLabel: 'Theatre events category panel',
    imageSrc: panel4Url,
    accentColor: '#F5C51B',
    isExpansionEnabled: true,
    styleBox: {
      left: '28.75%',
      top: '51.842%',
      width: '71.25%',
      height: '48.158%',
    },
    outerClipPath: 'polygon(0% 0%, 100% 26.549%, 100% 100%, 6.892% 100%)',
    innerClipPath: 'polygon(0.52% 1.165%, 99.56% 27.465%, 99.56% 98.97%, 7.266% 98.97%)',
  },
]

const MOBILE_COMIC_PANELS: ComicPanelConfig[] = [
  {
    id: 'mobile-panel-1-arts',
    categoryKey: 'arts',
    expandedFrameName: 'Arts Expanded',
    ariaLabel: 'Arts events category panel',
    imageSrc: mobilePanel1Url,
    accentColor: '#E52B27',
    isExpansionEnabled: true,
    styleBox: {
      left: '0%',
      top: '0%',
      width: '55.9524%',
      height: '46.6156%',
    },
    outerClipPath: 'polygon(0% 0%, 100% 0%, 76.383% 100%, 0% 95.3425%)',
    innerClipPath: 'polygon(1.70% 1.10%, 98.09% 1.10%, 74.89% 98.77%, 1.70% 94.25%)',
  },
  {
    id: 'mobile-panel-2-literature',
    categoryKey: 'literature',
    expandedFrameName: 'Literary Expanded',
    ariaLabel: 'Literary events category panel',
    imageSrc: mobilePanel2Url,
    accentColor: '#F28A24',
    isExpansionEnabled: true,
    styleBox: {
      left: '44.4048%',
      top: '0%',
      width: '55.5952%',
      height: '49.553%',
    },
    outerClipPath: 'polygon(23.7687% 0%, 100% 0%, 100% 100%, 0% 94.3299%)',
    innerClipPath: 'polygon(25.27% 1.03%, 98.29% 1.03%, 98.29% 98.84%, 1.93% 93.30%)',
  },
  {
    id: 'mobile-panel-3-stage',
    categoryKey: 'stage',
    expandedFrameName: 'Stage Expanded',
    ariaLabel: 'Stage events category panel',
    imageSrc: mobilePanel3Url,
    accentColor: '#087BC4',
    isExpansionEnabled: true,
    styleBox: {
      left: '0%',
      top: '45.5939%',
      width: '100%',
      height: '30.7791%',
    },
    outerClipPath: 'polygon(0% 0%, 100% 16.5975%, 100% 100%, 0% 78.8382%)',
    innerClipPath: 'polygon(0.95% 1.87%, 99.05% 18.26%, 99.05% 98.13%, 0.95% 77.18%)',
  },
  {
    id: 'mobile-panel-4-theatre',
    categoryKey: 'theatre',
    expandedFrameName: 'Theatre Expanded',
    ariaLabel: 'Theatre events category panel',
    imageSrc: mobilePanel4Url,
    accentColor: '#F5C51B',
    isExpansionEnabled: true,
    styleBox: {
      left: '0%',
      top: '71.0089%',
      width: '100%',
      height: '28.9911%',
    },
    outerClipPath: 'polygon(0% 0%, 100% 22.6872%, 100% 100%, 0% 100%)',
    innerClipPath: 'polygon(0.95% 1.98%, 99.05% 24.45%, 99.05% 98.24%, 0.95% 98.24%)',
  },
]

interface DesktopEventsShowcaseProps {
  activeCategory?: string
  onSelectCategory?: (category: string) => void
  onSelectEvent?: (eventId: string) => void
  eventsByCategory?: Record<string, Event[]>
  hideHeader?: boolean
}

export default function DesktopEventsShowcase({
  activeCategory = 'all',
  onSelectCategory,
  onSelectEvent,
  eventsByCategory,
  hideHeader = false,
}: DesktopEventsShowcaseProps) {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )
  const panelElementRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [activeExpandedPanel, setActiveExpandedPanel] = useState<ComicPanelConfig | null>(null)
  const [expansionPhase, setExpansionPhase] = useState<ExpansionPhase>('idle')
  const [originRect, setOriginRect] = useState<BoundingRectBox>({
    left: 0,
    top: 0,
    width: 363,
    height: 704,
  })
  const transitionTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
    }
  }, [])

  const handlePanelSelect = useCallback(
    (panel: ComicPanelConfig, element: HTMLButtonElement) => {
      if (!panel.isExpansionEnabled || expansionPhase !== 'idle') return

      const rect = element.getBoundingClientRect()
      setOriginRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      })
      setActiveExpandedPanel(panel)
      setExpansionPhase('expanding')
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = window.setTimeout(() => {
        setExpansionPhase('expanded')
      }, TRANSITION_DURATION_MS)
    },
    [expansionPhase]
  )

  const handleBackToShowcase = () => {
    if (!activeExpandedPanel || (expansionPhase !== 'expanded' && expansionPhase !== 'expanding')) return

    const sourceEl = panelElementRefs.current[activeExpandedPanel.id]
    if (sourceEl) {
      const rect = sourceEl.getBoundingClientRect()
      setOriginRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      })
    }

    setExpansionPhase('contracting')
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = window.setTimeout(() => {
      setExpansionPhase('idle')
      setActiveExpandedPanel(null)
      if (activeCategory !== 'all') {
        onSelectCategory?.('all')
      }
    }, TRANSITION_DURATION_MS)
  }

  const activePanels = isMobileViewport ? MOBILE_COMIC_PANELS : DESKTOP_COMIC_PANELS

  // If navigated with ?category=arts|literature|stage|theatre, auto-expand that panel once mounted
  useEffect(() => {
    if (
      activeCategory &&
      activeCategory !== 'all' &&
      expansionPhase === 'idle' &&
      !activeExpandedPanel
    ) {
      const targetPanel = activePanels.find((p) => p.categoryKey === activeCategory)
      if (targetPanel) {
        const el = panelElementRefs.current[targetPanel.id]
        if (el) {
          handlePanelSelect(targetPanel, el)
        }
      }
    }
  }, [activeCategory, activeExpandedPanel, activePanels, expansionPhase, handlePanelSelect])

  const activeCategoryEvents = useMemo(() => {
    if (!activeExpandedPanel) return []
    const key = activeExpandedPanel.categoryKey
    // Live events from the page whenever it passes them (even an empty list), so edits made in the admin show.
    // The built-in copy is only for a page that passes nothing.
    if (eventsByCategory) {
      return eventsByCategory[key] ?? []
    }
    return EVENTS.filter((ev) => ev.category?.slug === key).sort((a, b) => {
      const orderA = eventOrderIndex(a)
      const orderB = eventOrderIndex(b)
      return orderA - orderB
    })
  }, [activeExpandedPanel, eventsByCategory])

  return (
    <div
      className="events-showcase-page"
      data-frame-name="Events Showcase"
    >
      {!hideHeader && <PublicHeader />}

      {isMobileViewport ? (
        <div
          className="comic-layout-mobile"
          role="region"
          aria-label="Event categories comic showcase"
        >
          {activePanels.map((panel) => (
            <ComicPanel
              key={panel.id}
              panel={panel}
              panelRef={(el) => {
                panelElementRefs.current[panel.id] = el
              }}
              onSelect={handlePanelSelect}
            />
          ))}
        </div>
      ) : (
        <div
          className="comic-layout"
          role="region"
          aria-label="Event categories comic showcase"
        >
          {activePanels.map((panel) => (
            <ComicPanel
              key={panel.id}
              panel={panel}
              panelRef={(el) => {
                panelElementRefs.current[panel.id] = el
              }}
              onSelect={handlePanelSelect}
            />
          ))}
        </div>
      )}

      {activeExpandedPanel && (
        <ExpandedCategoryFrame
          panel={activeExpandedPanel}
          phase={expansionPhase}
          originRect={originRect}
          events={activeCategoryEvents}
          onBack={handleBackToShowcase}
          onSelectEvent={onSelectEvent}
        />
      )}
    </div>
  )
}
