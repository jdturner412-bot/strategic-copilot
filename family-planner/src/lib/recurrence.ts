import { RRule, rrulestr } from 'rrule'
import { addDays, toDateKey } from './dates'
import type { DateKey } from '@/data/types'

/**
 * rrule treats every Date as UTC. A household planner is entirely wall-clock —
 * "dinner every Tuesday at 6pm" must stay at 6pm across a DST change — so we
 * convert local wall-clock times into "fake UTC" Dates before handing them to
 * rrule, then convert the results back. Everything in this module is local.
 */
function toFakeUtc(local: Date): Date {
  return new Date(
    Date.UTC(
      local.getFullYear(),
      local.getMonth(),
      local.getDate(),
      local.getHours(),
      local.getMinutes(),
      local.getSeconds(),
    ),
  )
}

function fromFakeUtc(fake: Date): Date {
  return new Date(
    fake.getUTCFullYear(),
    fake.getUTCMonth(),
    fake.getUTCDate(),
    fake.getUTCHours(),
    fake.getUTCMinutes(),
    fake.getUTCSeconds(),
  )
}

export interface RecurrencePreset {
  label: string
  /** `undefined` means "does not repeat". */
  rule?: string
}

/** The presets offered in the editors; anything else can be typed as raw RRULE. */
export const RECURRENCE_PRESETS: RecurrencePreset[] = [
  { label: 'Does not repeat', rule: undefined },
  { label: 'Every day', rule: 'FREQ=DAILY' },
  { label: 'Every weekday', rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { label: 'Every week', rule: 'FREQ=WEEKLY' },
  { label: 'Every 2 weeks', rule: 'FREQ=WEEKLY;INTERVAL=2' },
  { label: 'Every month', rule: 'FREQ=MONTHLY' },
  { label: 'Every year', rule: 'FREQ=YEARLY' },
]

/** Human-readable summary for a rule, falling back to the raw string. */
export function describeRecurrence(rule: string | undefined): string {
  if (!rule) return 'Does not repeat'
  const preset = RECURRENCE_PRESETS.find((p) => p.rule === rule)
  if (preset) return preset.label
  try {
    return rrulestr(`RRULE:${rule}`).toText()
  } catch {
    return rule
  }
}

/**
 * Expand a rule into the local start-times that fall inside `[from, to]`.
 * `dtstart` supplies the time of day and the anchor for weekly/monthly rules.
 */
export function expandOccurrences(
  rule: string,
  dtstart: Date,
  from: Date,
  to: Date,
): Date[] {
  let parsed: RRule
  try {
    const options = RRule.parseString(rule)
    options.dtstart = toFakeUtc(dtstart)
    parsed = new RRule(options)
  } catch {
    return []
  }
  // `between` is exclusive at the bounds, so widen by a day and filter after.
  return parsed
    .between(toFakeUtc(addDays(from, -1)), toFakeUtc(addDays(to, 1)))
    .map(fromFakeUtc)
    .filter((d) => d.getTime() >= from.getTime() && d.getTime() <= to.getTime())
}

/** The first occurrence at or after `after`, or `null` if the series has ended. */
export function nextOccurrence(rule: string, dtstart: Date, after: Date): Date | null {
  try {
    const options = RRule.parseString(rule)
    options.dtstart = toFakeUtc(dtstart)
    const next = new RRule(options).after(toFakeUtc(after), true)
    return next ? fromFakeUtc(next) : null
  } catch {
    return null
  }
}

/** True when `date` is one of the series' occurrences. */
export function occursOn(rule: string, dtstart: Date, date: Date): boolean {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  const end = new Date(day)
  end.setHours(23, 59, 59, 999)
  return expandOccurrences(rule, dtstart, day, end).length > 0
}

export function isExcluded(exceptionDates: DateKey[] | undefined, date: Date): boolean {
  return exceptionDates?.includes(toDateKey(date)) ?? false
}

/**
 * The first day a newly created repeating item is actually due. A chore set to
 * repeat on Sundays should not sit on Saturday's list just because that is
 * when it was added.
 */
export function firstDueDate(rule: string, from = new Date()): Date {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  return nextOccurrence(rule, start, start) ?? start
}
