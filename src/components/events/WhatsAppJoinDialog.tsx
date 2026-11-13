import { MessageCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'

/** Shown right after a successful sign-up when the event has a WhatsApp group: asks the student to join it now. */
export function WhatsAppJoinDialog({ eventTitle, url, onClose }: { eventTitle: string; url: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-join-title"
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-paper border-2 border-ink rounded-2xl max-w-sm w-full p-6 shadow-[6px_6px_0px_var(--color-ink)] relative text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg border border-ink bg-white hover:bg-gutter" aria-label="Close">
          <X className="w-4 h-4 text-ink" />
        </button>
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-[#25D366]">
          <MessageCircle className="w-6 h-6 text-white" aria-hidden="true" />
        </span>
        <h2 id="whatsapp-join-title" className="font-display text-2xl text-ink">You're in!</h2>
        <p className="text-sm text-ink/80 mt-1">
          Join the <strong>{eventTitle}</strong> WhatsApp group. Event heads share timings, venue changes and updates there.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink bg-[#25D366] font-display uppercase tracking-wider text-white shadow-[3px_3px_0px_var(--color-ink)] hover:brightness-95"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" /> Join WhatsApp group
        </a>
        <p className="text-xs text-ink/60 mt-3">
          Not now? The link stays in{' '}
          <Link to="/app/my-events" onClick={onClose} className="underline font-semibold text-ink">
            My events
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
