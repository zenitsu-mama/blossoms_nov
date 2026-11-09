import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/eventDisplay'
import type { EventScheduleSlot } from '@/types'

/** Choose one session of an event that runs more than once (e.g. 12:45 PM or 3:45 PM). */
export function SessionPicker({
  slots,
  value,
  onChange,
  label = 'Pick your session',
  disabled,
}: {
  slots: EventScheduleSlot[]
  value: string | null
  onChange: (slotId: string) => void
  label?: string
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-xs font-bold text-ink mb-1.5">{label}</legend>
      <div role="radiogroup" className="grid grid-cols-2 gap-2">
        {slots.map((slot) => {
          const selected = value === slot.id
          return (
            <button
              key={slot.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(slot.id)}
              className={cn(
                'rounded-xl border-2 border-ink px-3 py-2 text-left transition-colors disabled:opacity-50',
                selected ? 'bg-ink text-paper shadow-[2px_2px_0px_var(--color-primary)]' : 'bg-white text-ink hover:bg-blossoms-yellow/60'
              )}
            >
              <span className="flex items-center gap-1.5 font-display text-base tracking-wide uppercase">
                <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                {slot.starts_at ? formatTime(slot.starts_at).toUpperCase() : slot.slot_title}
              </span>
              <span className={cn('block text-[11px] font-semibold', selected ? 'text-paper/75' : 'text-ink/60')}>
                {slot.slot_title ?? 'Session'}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
