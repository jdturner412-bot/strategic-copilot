import { useEffect, useRef } from 'react'
import type { FamilyMember } from '@/data/types'
import type { EventOccurrence } from '@/lib/events'
import { occurrencesOnDay } from '@/lib/events'
import { occurrenceColor } from '@/components/EventPill'
import { formatTime, isToday, startOfDay, WEEKDAY_LABELS } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { ClockIcon, PinIcon } from '@/components/Icons'
import { HOUR_HEIGHT, HOUR_LABELS, layoutDay } from './timeGrid'
import { tint } from '@/lib/colors'

interface TimeGridProps {
  days: Date[]
  occurrences: EventOccurrence[]
  members: Map<string, FamilyMember>
  now: Date
  onSelect: (occurrence: EventOccurrence) => void
  onCreate: (date: Date, hour: number) => void
}

/** The shared engine behind both the week and day views. */
export function TimeGrid({ days, occurrences, members, now, onSelect, onCreate }: TimeGridProps) {
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Open on the morning rather than at midnight — nobody wants to scroll
    // past eight empty hours to find the school run.
    const target = Math.max(now.getHours() - 2, 6)
    // Nudge up a little so the first hour label is not clipped by the top edge.
    scroller.current?.scrollTo({ top: target * HOUR_HEIGHT - 14 })
  }, [now])

  const allDayByDay = days.map((day) =>
    occurrencesOnDay(occurrences, day).filter((occurrence) => occurrence.event.allDay),
  )
  const hasAllDay = allDayByDay.some((list) => list.length > 0)

  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Day headers stay pinned while the hours scroll underneath. */}
      <div className="flex shrink-0 border-b border-line">
        <div className="w-20 shrink-0" />
        {days.map((day) => (
          <div key={day.toISOString()} className="flex-1 border-l border-line px-2 py-2 text-center">
            <div className="text-sm font-bold tracking-wide text-muted uppercase">
              {WEEKDAY_LABELS[day.getDay()]}
            </div>
            <div
              className={cn(
                'mx-auto mt-0.5 flex h-11 w-11 items-center justify-center rounded-full text-2xl font-black',
                isToday(day) && 'bg-accent text-white',
              )}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {hasAllDay && (
        <div className="flex shrink-0 border-b border-line bg-panel/40">
          <div className="flex w-20 shrink-0 items-center justify-end pr-3 text-sm font-bold text-muted">
            All day
          </div>
          {days.map((day, index) => (
            <div key={day.toISOString()} className="min-w-0 flex-1 space-y-1 border-l border-line p-1.5">
              {allDayByDay[index].map((occurrence) => (
                <button
                  key={occurrence.key}
                  type="button"
                  onClick={() => onSelect(occurrence)}
                  className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-base font-bold"
                  style={{
                    backgroundColor: tintFor(occurrence, members),
                    borderLeft: `4px solid ${occurrenceColor(occurrence, members)}`,
                  }}
                >
                  {occurrence.event.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={scroller} className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: HOUR_HEIGHT * 24 }}>
          {/* Hour gutter */}
          <div className="relative w-20 shrink-0">
            {HOUR_LABELS.map((label, hour) => (
              <div
                key={label}
                className="absolute right-3 -translate-y-1/2 text-sm font-bold text-muted"
                style={{ top: hour * HOUR_HEIGHT }}
              >
                {hour === 0 ? '' : label}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const positioned = layoutDay(occurrencesOnDay(occurrences, day), day)
            return (
              <div key={day.toISOString()} className="relative min-w-0 flex-1 border-l border-line">
                {/* Hour lines double as tap targets for creating an event. */}
                {HOUR_LABELS.map((_, hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onCreate(day, hour)}
                    aria-label={`Add event at ${HOUR_LABELS[hour]}`}
                    className="absolute right-0 left-0 border-t border-line/60"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  />
                ))}

                {positioned.map(({ occurrence, top, height, left, width }) => {
                  const color = occurrenceColor(occurrence, members)
                  const live = occurrence.start <= now && occurrence.end > now
                  return (
                    <button
                      key={occurrence.key}
                      type="button"
                      onClick={() => onSelect(occurrence)}
                      className={cn(
                        // `flex-col items-stretch` overrides the browser's habit of
                        // centring button content, which pushes the title into the
                        // middle of a tall all-afternoon block.
                        'pressable absolute flex flex-col items-stretch overflow-hidden rounded-xl border-l-[5px] px-2 py-1 text-left',
                        live && 'ring-2',
                      )}
                      style={{
                        top,
                        height: height - 3,
                        left: `calc(${left * 100}% + 3px)`,
                        width: `calc(${width * 100}% - 6px)`,
                        borderLeftColor: color,
                        backgroundColor: tintFor(occurrence, members),
                        ['--tw-ring-color' as string]: color,
                      }}
                    >
                      <div className="truncate text-base font-bold">{occurrence.event.title}</div>
                      {height > 46 && (
                        <div className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
                          <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                          {formatTime(occurrence.start)}
                        </div>
                      )}
                      {height > 74 && occurrence.event.location && (
                        <div className="flex items-center gap-1 truncate text-sm text-muted">
                          <PinIcon className="h-3.5 w-3.5 shrink-0" />
                          {occurrence.event.location}
                        </div>
                      )}
                    </button>
                  )
                })}

                {isToday(day) && <NowLine now={now} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NowLine({ now }: { now: Date }) {
  const minutes = (now.getTime() - startOfDay(now).getTime()) / 60_000
  return (
    <div
      className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
      style={{ top: (minutes / 60) * HOUR_HEIGHT }}
    >
      <span className="-ml-1.5 h-3 w-3 rounded-full bg-rose-500" />
      <span className="h-0.5 flex-1 bg-rose-500" />
    </div>
  )
}

function tintFor(occurrence: EventOccurrence, members: Map<string, FamilyMember>) {
  const owner = occurrence.event.memberIds.map((id) => members.get(id)).find(Boolean)
  return owner ? tint(owner.color, 0.18) : 'var(--app-accent-soft)'
}
