import type { CalendarEvent } from '@/data/types'
import {
  addDays, diffInDays, endOfDay, fromDateKey, isSameDay, startOfDay, toDateKey,
} from './dates'
import { expandOccurrences, isExcluded } from './recurrence'

/**
 * A single dated instance of an event. Recurring events produce many
 * occurrences from one stored row; one-off events produce exactly one.
 */
export interface EventOccurrence {
  event: CalendarEvent
  start: Date
  end: Date
  /** Stable per (event, date) so React keys survive re-renders. */
  key: string
  /** The occurrence's own date, used when editing/deleting a single instance. */
  occurrenceDate: string
}

/** Resolve a stored event's start/end into real Dates. */
export function materialize(event: CalendarEvent): { start: Date; end: Date } {
  if (event.allDay) {
    return { start: fromDateKey(event.start), end: endOfDay(fromDateKey(event.end)) }
  }
  return { start: new Date(event.start), end: new Date(event.end) }
}

/** How long the event lasts, so recurring occurrences keep the original span. */
function durationMs(event: CalendarEvent): number {
  const { start, end } = materialize(event)
  return Math.max(end.getTime() - start.getTime(), 0)
}

/** Expand a list of stored events into every occurrence overlapping `[from, to]`. */
export function occurrencesInRange(
  events: CalendarEvent[],
  from: Date,
  to: Date,
): EventOccurrence[] {
  const result: EventOccurrence[] = []

  for (const event of events) {
    const { start, end } = materialize(event)

    if (!event.recurrenceRule) {
      if (start <= to && end >= from) {
        result.push({
          event, start, end,
          key: `${event.id}:${toDateKey(start)}`,
          occurrenceDate: toDateKey(start),
        })
      }
      continue
    }

    const span = durationMs(event)
    // Widen the search window by the event's own length so a multi-day
    // occurrence that began before `from` still shows up inside the range.
    const searchFrom = new Date(from.getTime() - span)
    for (const occurrenceStart of expandOccurrences(event.recurrenceRule, start, searchFrom, to)) {
      if (isExcluded(event.exceptionDates, occurrenceStart)) continue
      const occurrenceEnd = new Date(occurrenceStart.getTime() + span)
      if (occurrenceEnd < from) continue
      result.push({
        event,
        start: occurrenceStart,
        end: occurrenceEnd,
        key: `${event.id}:${toDateKey(occurrenceStart)}`,
        occurrenceDate: toDateKey(occurrenceStart),
      })
    }
  }

  return result.sort(compareOccurrences)
}

/** All-day first, then by start time, then alphabetically — a stable reading order. */
export function compareOccurrences(a: EventOccurrence, b: EventOccurrence): number {
  if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1
  const byStart = a.start.getTime() - b.start.getTime()
  if (byStart !== 0) return byStart
  return a.event.title.localeCompare(b.event.title)
}

/** Occurrences touching a given day, for the day/Today columns. */
export function occurrencesOnDay(occurrences: EventOccurrence[], day: Date): EventOccurrence[] {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  return occurrences.filter((o) => o.start <= dayEnd && o.end >= dayStart)
}

/** Bucket occurrences by `YYYY-MM-DD`, repeating multi-day events on each day they cover. */
export function groupByDay(occurrences: EventOccurrence[]): Map<string, EventOccurrence[]> {
  const byDay = new Map<string, EventOccurrence[]>()
  for (const occurrence of occurrences) {
    const days = Math.max(diffInDays(occurrence.start, occurrence.end), 0)
    for (let i = 0; i <= days; i += 1) {
      const key = toDateKey(addDays(occurrence.start, i))
      const bucket = byDay.get(key)
      if (bucket) bucket.push(occurrence)
      else byDay.set(key, [occurrence])
    }
  }
  for (const bucket of byDay.values()) bucket.sort(compareOccurrences)
  return byDay
}

/** True when an occurrence is in progress at `now`. Drives the "Now" highlight. */
export function isHappeningNow(occurrence: EventOccurrence, now: Date): boolean {
  if (occurrence.event.allDay) return isSameDay(occurrence.start, now)
  return occurrence.start <= now && occurrence.end > now
}

export function filterByMembers(
  occurrences: EventOccurrence[],
  memberIds: string[],
): EventOccurrence[] {
  if (memberIds.length === 0) return occurrences
  return occurrences.filter(
    (o) =>
      // An event with nobody assigned is a whole-household event: always shown.
      o.event.memberIds.length === 0 ||
      o.event.memberIds.some((id) => memberIds.includes(id)),
  )
}
