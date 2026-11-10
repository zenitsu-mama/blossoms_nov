import React from 'react'

export type CategoryKey = 'arts' | 'literature' | 'stage' | 'theatre'

export interface ComicPanelConfig {
  id: string
  categoryKey: CategoryKey
  expandedFrameName: string
  ariaLabel: string
  imageSrc: string
  accentColor: string
  isExpansionEnabled?: boolean
  styleBox: {
    left: string
    top: string
    width: string
    height: string
  }
  outerClipPath: string
  innerClipPath: string
}

const PANEL_WORDING: Record<CategoryKey, { title: string; tagline: string; captionHex: string }> = {
  arts: { title: 'ARTS', tagline: 'PAINT. DESIGN. EXPRESS.', captionHex: '#f9d423' },
  literature: { title: 'LITERARY', tagline: 'SPEAK. WRITE. THINK.', captionHex: '#f9d423' },
  stage: { title: 'STAGE', tagline: 'PERFORM. INSPIRE.', captionHex: '#fdfaf0' },
  theatre: { title: 'THEATRE', tagline: 'ACT. IMAGINE. BRING STORIES ALIVE.', captionHex: '#f9d423' },
}

/** Where the wording and arrow sit in each slanted panel, as percentages of its box. */
const PANEL_OVERLAYS: Record<string, { left: string; top: string; right: string; bottom: string }> = {
  'panel-1-arts': { left: '20%', top: '4%', right: '16%', bottom: '20%' },
  'panel-2-literature': { left: '16%', top: '6%', right: '20%', bottom: '22%' },
  'panel-3-stage': { left: '32%', top: '6%', right: '20%', bottom: '20%' },
  'panel-4-theatre': { left: '8%', top: '14%', right: '14%', bottom: '12%' },
  'mobile-panel-1-arts': { left: '6%', top: '3%', right: '28%', bottom: '8%' },
  'mobile-panel-2-literature': { left: '30%', top: '3%', right: '6%', bottom: '9%' },
  'mobile-panel-3-stage': { left: '4%', top: '6%', right: '5%', bottom: '10%' },
  'mobile-panel-4-theatre': { left: '4%', top: '8%', right: '5%', bottom: '8%' },
}

interface ComicPanelProps {
  panel: ComicPanelConfig
  onSelect?: (panel: ComicPanelConfig, element: HTMLButtonElement) => void
  panelRef?: (element: HTMLButtonElement | null) => void
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ panel, onSelect, panelRef }) => {
  const { title, tagline, captionHex } = PANEL_WORDING[panel.categoryKey]
  const overlay = PANEL_OVERLAYS[panel.id]

  return (
    <button
      ref={panelRef}
      type="button"
      aria-label={panel.ariaLabel}
      onClick={(e) => onSelect?.(panel, e.currentTarget)}
      className="comic-panel-button"
      style={{
        left: panel.styleBox.left,
        top: panel.styleBox.top,
        width: panel.styleBox.width,
        height: panel.styleBox.height,
        clipPath: panel.outerClipPath,
        WebkitClipPath: panel.outerClipPath,
      }}
    >
      <img
        src={panel.imageSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="comic-panel-border-layer"
      />

      <div
        className="comic-panel-inner-clip"
        style={{
          backgroundColor: panel.accentColor,
          clipPath: panel.innerClipPath,
          WebkitClipPath: panel.innerClipPath,
        }}
      >
        <img
          src={panel.imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="comic-panel-artwork"
        />
      </div>

      <span aria-hidden="true" className="comic-panel-wording" style={{ left: overlay.left, top: overlay.top }}>
        <span className="comic-panel-title font-comic-display comic-title-white">{title}</span>
        <span className="comic-panel-tagline font-comic-sub" style={{ backgroundColor: captionHex }}>
          {tagline}
        </span>
      </span>

      <span aria-hidden="true" className="comic-panel-arrow" style={{ right: overlay.right, bottom: overlay.bottom }}>
        <svg viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8H13M13 8L8.8 3.8M13 8L8.8 12.2"
            stroke="#0f0f0f"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
