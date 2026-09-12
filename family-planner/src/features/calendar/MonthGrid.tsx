import type { FamilyMember } from '@/data/types'
import type { EventOccurrence } from '@/lib/events'
import { groupByDay } from '@/lib/events'
import { EventPill } from '@/components/EventPill'
import {
  addDays, endOfMonth, isToday, startOfMonth, startOfWeek, toDateKey, WEEKDAY_LABELS,
} from '@/lib/dates'
import { cn } from '@/lib/cn'

/** Event rows that fit in a month cell at this type size. */
const MAX_VISIBLE = 3

interface MonthGridProps {
  month: Date
  occurrences: EventOccurrence[]
  members: Map<string, FamilyMember>
  weekStartsOn: 0 | 1
  onSelect: (occurrence: EventOccurrence) => void
  onCreate: (date: Date) => void
  onOpenDay: (date: Date) => void
}

export function MonthGrid({
  month, occurrences, members, weekStartsOn, onSelect, onCreate, onOpenDay,
}: MonthGridProps) {
  const gridStart = startOfWeek(startOfMonth(month), weekStartsOn)
  // Always render six rows so the grid does not resize as months change.
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  const byDay = groupByDay(occurrences)
  const monthEnd = endOfMonth(month)

  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-7 border-b border-line">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="py-2 text-center text-sm font-bold tracking-wide text-muted uppercase"
          >
            {WEEKDAY_LABELS[(index + weekStartsOn) % 7]}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const dayEvents = byDay.get(toDateKey(day)) ?? []
          const outsideMonth = day < startOfMonth(month) || day > monthEnd
          // Only what actually fits is rendered; the rest collapses into a
          // "+n more" that opens the day view, so nothing is silently clipped.
          const shown =
            dayEvents.length > MAX_VISIBLE
              ? dayEvents.slice(0, MAX_VISIBLE - 1)
              : dayEvents
          const overflow = dayEvents.length - shown.length

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'relative flex min-h-0 flex-col overflow-hidden border-t border-l border-line p-1',
                outsideMonth && 'opacity-40',
              )}
            >
              {/* The cell background is the "add an event here" target. */}
              <button
                type="button"
                onClick={() => onCreate(day)}
                aria-label={`Add event on ${toDateKey(day)}`}
                className="absolute inset-0"
              />

              <div className="relative flex shrink-0 justify-start">
                <button
                  type="button"
                  onClick={() => onOpenDay(day)}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold',
                    isToday(day) && 'bg-accent text-white',
                  )}
                >
                  {day.getDate()}
                </button>
              </div>

              <div className="relative mt-0.5 min-h-0 flex-1 space-y-px overflow-hidden">
                {shown.map((occurrence) => (
                  <EventPill
                    key={occurrence.key}
                    occurrence={occurrence}
                    members={members}
                    density="dot"
                    onClick={() => onSelect(occurrence)}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenDay(day)}
                    className="px-1.5 text-[0.78rem] font-bold text-muted"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
