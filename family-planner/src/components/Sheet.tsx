import { useEffect, useState, type ReactNode } from 'react'
import { CloseIcon, TrashIcon } from './Icons'
import { IconButton } from './Button'
import { cn } from '@/lib/cn'

interface SheetProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** `wide` suits grids and pickers; `normal` suits single-column forms. */
  width?: 'normal' | 'wide'
}

/**
 * The app's one modal. Centred rather than bottom-anchored: on a wall-mounted
 * landscape iPad the bottom edge is the furthest thing from the reader's eye.
 */
export function Sheet({
  open, title, subtitle, onClose, children, footer, width = 'normal',
}: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onPointerDown={(event) => {
        // Only a press that both starts and ends on the backdrop dismisses.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'animate-sheet-in card flex max-h-[92vh] w-full flex-col overflow-hidden',
          width === 'wide' ? 'max-w-5xl' : 'max-w-2xl',
        )}
      >
        <header className="flex items-start gap-4 border-b border-line px-7 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-3xl font-bold">{title}</h2>
            {subtitle && <p className="mt-1 text-lg text-muted">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon className="h-7 w-7" />
          </IconButton>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto px-7 py-6">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-3 border-t border-line bg-panel/60 px-7 py-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

/**
 * Destructive actions need two taps on a touchscreen that lives at
 * toddler height; the second tap has a different label so it is never a
 * double-tap away.
 */
export function DeleteButton({ onConfirm, label = 'Delete' }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={cn(
        'touch-target pressable mr-auto inline-flex items-center gap-2.5 rounded-2xl px-5 py-3 text-lg font-semibold transition',
        armed
          ? 'bg-rose-500 text-white'
          : 'border border-rose-500/30 bg-rose-500/10 text-rose-500',
      )}
    >
      <TrashIcon className="h-6 w-6" />
      {armed ? 'Tap again to delete' : label}
    </button>
  )
}
