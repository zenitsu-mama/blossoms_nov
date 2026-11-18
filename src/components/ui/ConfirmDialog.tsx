import { useEffect, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './Button'

/**
 * In-page replacement for window.confirm.
 *
 *   if (await confirmDialog('Delete this notice?', { danger: true })) remove()
 *
 * <ConfirmHost /> is mounted once in App.tsx.
 */
interface ConfirmOptions {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}
interface Pending extends ConfirmOptions {
  message: string
  resolve: (ok: boolean) => void
}

let pending: Pending | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  pending?.resolve(false) // only one open at a time
  return new Promise((resolve) => {
    pending = { message, ...options, resolve }
    emit()
  })
}

function close(ok: boolean) {
  const p = pending
  pending = null
  emit()
  p?.resolve(ok)
}

/** A dangerous confirm ignores taps this soon after the dialog opens: they were aimed at the page behind it. */
const ARM_DELAY_MS = 600

export function ConfirmHost() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => pending,
  )
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    setArmed(false)
    if (!current) return
    const t = setTimeout(() => setArmed(true), current.danger ? ARM_DELAY_MS : 0)
    return () => clearTimeout(t)
  }, [current])

  return (
    <Dialog.Root open={!!current} onOpenChange={(open) => !open && close(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-ink/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-ink bg-white p-6 shadow-[4px_4px_0px_var(--color-ink)] focus:outline-none"
        >
          <Dialog.Title className="font-display text-2xl text-ink">{current?.title ?? 'Are you sure?'}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-ink/80">{current?.message}</Dialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {/* Dangerous actions start on the safe button, so Enter or a stray tap never confirms them. */}
            <Button variant="outline" onClick={() => close(false)} autoFocus={!!current?.danger}>
              {current?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={current?.danger ? 'danger' : 'primary'}
              onClick={() => armed && close(true)}
              aria-disabled={!armed}
              className={cn(!armed && 'opacity-60')}
              autoFocus={!current?.danger}
            >
              {current?.confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
