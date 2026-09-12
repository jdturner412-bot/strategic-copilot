import type { FamilyMember } from '@/data/types'
import type { EventOccurrence } from '@/lib/events'
import { memberColor, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'
import { formatTime, formatTimeRange } from '@/lib/dates'
import { ClockIcon, PinIcon, RepeatIcon } from './Icons'
import { AvatarStack } from './Avatar'

/**
 * Events are coloured by their first assigned member; whole-household events
 * (nobody assigned) fall back to the app accent so they still read as "ours".
 */
export function occurrenceColor(occurrence: EventOccurrence, members: Map<string, FamilyMember>) {
  const owner = occurrence.event.memberIds.map((id) => members.get(id)).find(Boolean)
  return owner ? memberColor(owner.color).hex : 'var(--app-accent)'
}

function occurrenceTint(
  occurrence: EventOccurrence,
  members: Map<string, FamilyMember>,
  alpha: number,
) {
  const owner = occurrence.event.memberIds.map((id) => members.get(id)).find(Boolean)
  return owner ? tint(owner.color, alpha) : 'var(--app-accent-soft)'
}

interface EventPillProps {
  occurrence: EventOccurrence
  members: Map<string, FamilyMember>
  onClick?: () => void
  /** `full` shows location, notes and avatars; `compact` is for dense grids. */
  density?: 'full' | 'compact' | 'dot'
  now?: Date
  className?: string
}

export function EventPill({
  occurrence, members, onClick, density = 'full', now, className,
}: EventPillProps) {
  const { event, start, end } = occurrence
  const color = occurrenceColor(occurrence, members)
  const attendees = event.memberIds.map((id) => members.get(id)).filter(Boolean) as FamilyMember[]
  const live = Boolean(now) && !event.allDay && start <= now! && end > now!

  if (density === 'dot') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('flex w-full items-center gap-1.5 truncate rounded-lg px-1.5 py-0.5 text-left', className)}
        style={{ backgroundColor: occurrenceTint(occurrence, members, 0.16) }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-sm font-semibold">
          {!event.allDay && <span className="text-muted">{formatTime(start)} </span>}
          {event.title}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pressable w-full overflow-hidden rounded-2xl border-l-[6px] px-4 text-left',
        density === 'full' ? 'py-3' : 'py-2',
        live && 'ring-2',
        className,
      )}
      style={{
        borderLeftColor: color,
        backgroundColor: occurrenceTint(occurrence, members, 0.14),
        // `ringColor` only matters when `live`; harmless otherwise.
        ['--tw-ring-color' as string]: color,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'truncate font-bold',
            density === 'full' ? 'text-xl' : 'text-base',
          )}
        >
          {event.title}
        </span>
        {event.recurrenceRule && <RepeatIcon className="h-4 w-4 shrink-0 text-muted" />}
        {live && (
          <span
            className="ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black tracking-wider uppercase"
            style={{ backgroundColor: color, color: 'white' }}
          >
            Now
          </span>
        )}
      </div>

      <div
        className={cn(
          'mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted',
          density === 'full' ? 'text-base' : 'text-sm',
        )}
      >
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <ClockIcon className="h-4 w-4" />
          {event.allDay ? 'All day' : formatTimeRange(start, end)}
        </span>
        {event.location && (
          <span className="inline-flex items-center gap-1.5 truncate">
            <PinIcon className="h-4 w-4 shrink-0" />
            {event.location}
          </span>
        )}
      </div>

      {density === 'full' && attendees.length > 0 && (
        <div className="mt-2">
          <AvatarStack members={attendees} />
        </div>
      )}
    </button>
  )
}
