import blossomsLogoUrl from '@/assets/brand/blossoms-2026-27-lockup.webp'
import heroCoverUrl from '@/assets/brand/hero-b.webp'

export const comicCoverImages = [heroCoverUrl, blossomsLogoUrl]

/** The Blossoms comic book cover. Sizes itself to whatever box it is dropped into. */
export function ComicCover() {
  return (
    <div className="comic-cover">
      <img className="comic-cover-hero" src={heroCoverUrl} alt="" />
      <div className="comic-cover-shade" />
      <div className="comic-cover-issue">
        <span>Issue</span>
        <strong>#1</strong>
      </div>
      <img className="comic-cover-logo" src={blossomsLogoUrl} alt="" />
      <div className="comic-cover-burst">
        <span>The fest</span>
        <strong>Be a hero!</strong>
      </div>
      <div className="comic-cover-footer">Christ University · 2026-27</div>
    </div>
  )
}
