import { useEffect, useRef, useState } from 'react'
import type { FamilyMember, TodoItem } from '@/data/types'
import { repo } from '@/data'
import { Avatar } from './Avatar'
import { CheckIcon, RepeatIcon, StarIcon } from './Icons'
import { memberColor, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'

interface TodoRowProps {
  item: TodoItem
  member?: FamilyMember
  onEdit?: () => void
  showPoints?: boolean
  density?: 'full' | 'compact'
}

export function TodoRow({ item, member, onEdit, showPoints = true, density = 'full' }: TodoRowProps) {
  const color = member ? memberColor(member.color).hex : 'var(--app-accent)'

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border border-line bg-panel/60 pr-3 transition',
        density === 'full' ? 'py-2.5 pl-3' : 'py-1.5 pl-2',
        item.done && 'opacity-55',
      )}
    >
      <Checkbox
        checked={item.done}
        color={color}
        size={density === 'full' ? 'lg' : 'md'}
        onChange={(next) => void repo.setTodoDone(item.id, next)}
      />

      <button
        type="button"
        onClick={onEdit}
        disabled={!onEdit}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <span
          className={cn(
            'block truncate font-semibold',
            density === 'full' ? 'text-xl' : 'text-lg',
            item.done && 'line-through decoration-2',
          )}
        >
          {item.title}
        </span>
        {item.recurrenceRule && (
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted">
            <RepeatIcon className="h-4 w-4" />
            Repeats
          </span>
        )}
      </button>

      {showPoints && item.points > 0 && (
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-base font-bold"
          style={{ backgroundColor: tint(member?.color, 0.18), color }}
        >
          <StarIcon className="h-4 w-4" />
          {item.points}
        </span>
      )}

      {member && <Avatar member={member} size={density === 'full' ? 'md' : 'sm'} />}
    </div>
  )
}

interface CheckboxProps {
  checked: boolean
  color: string
  size?: 'md' | 'lg'
  onChange: (checked: boolean) => void
}

/**
 * The completion animation is the whole point of a chore chart: the box pops,
 * the tick draws itself, and a few sparks fly out. Kids will tap it twice just
 * to watch it, which is fine — un-checking revokes the points cleanly.
 *
 * The tick is optimistic and the write is held back by one animation frame's
 * worth of time, because the moment the record flips the row sorts itself into
 * the "Done" section and unmounts mid-animation.
 */
export function Checkbox({ checked, color, size = 'lg', onChange }: CheckboxProps) {
  const [optimistic, setOptimistic] = useState(checked)
  const [celebrating, setCelebrating] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<(() => void) | undefined>(undefined)

  // Follow the record whenever it changes underneath us (another device, an
  // edit elsewhere, or the recurring-chore rollover).
  useEffect(() => setOptimistic(checked), [checked])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      // Don't lose the write if the row unmounts while the animation is running.
      pending.current?.()
    },
    [],
  )

  const handle = () => {
    const next = !optimistic
    setOptimistic(next)
    window.clearTimeout(timer.current)

    if (!next) {
      pending.current = undefined
      onChange(false)
      return
    }

    setCelebrating(true)
    pending.current = () => onChange(true)
    timer.current = window.setTimeout(() => {
      setCelebrating(false)
      const write = pending.current
      pending.current = undefined
      write?.()
    }, ANIMATION_MS)
  }

  const box = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      onClick={handle}
      className={cn(
        'touch-target relative flex shrink-0 items-center justify-center',
        size === 'lg' ? 'h-14 w-14' : 'h-12 w-12',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-2xl border-[3px] transition-colors',
          box,
          celebrating && 'animate-check-pop',
        )}
        style={{
          borderColor: color,
          backgroundColor: optimistic ? color : 'transparent',
        }}
      >
        {optimistic && (
          <svg viewBox="0 0 24 24" className={size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'} aria-hidden="true">
            <path
              d="M4.5 12.5 9.5 17.5 19.5 6.5"
              fill="none"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-check-draw"
            />
          </svg>
        )}
        {!optimistic && <CheckIcon className="h-6 w-6 opacity-0" />}
      </span>

      {celebrating && (
        <span className="pointer-events-none absolute inset-0">
          {SPARKS.map((spark, index) => (
            <span
              key={index}
              className="absolute top-1/2 left-1/2 h-2 w-2 rounded-full"
              style={{
                backgroundColor: color,
                ['--dx' as string]: spark.dx,
                ['--dy' as string]: spark.dy,
                animation: 'confetti-burst 600ms ease-out forwards',
              }}
            />
          ))}
        </span>
      )}
    </button>
  )
}

/** Long enough for the pop, the tick and the sparks to finish. */
const ANIMATION_MS = 620

const SPARKS = [
  { dx: '-26px', dy: '-24px' },
  { dx: '24px', dy: '-26px' },
  { dx: '30px', dy: '10px' },
  { dx: '-30px', dy: '12px' },
  { dx: '4px', dy: '-34px' },
  { dx: '-6px', dy: '30px' },
]
