import type { DateKey } from '@/data/types'

export const MS_PER_DAY = 86_400_000

/** Local-timezone `YYYY-MM-DD` for a Date. Never use `toISOString()` here — it shifts to UTC. */
export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Midnight, local time, for a `YYYY-MM-DD` key. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): DateKey {
  return toDateKey(new Date())
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const targetDay = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  // Clamp so 31 Jan + 1 month lands on the last day of February, not 3 March.
  d.setDate(Math.min(targetDay, daysInMonth(d.getFullYear(), d.getMonth())))
  return d
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  const d = startOfDay(date)
  const diff = (d.getDay() - weekStartsOn + 7) % 7
  return addDays(d, -diff)
}

export function endOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  return endOfDay(addDays(startOfWeek(date, weekStartsOn), 6))
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/** Whole days from `a` to `b`, ignoring the time of day. */
export function diffInDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY)
}

/** `6:30 PM`, or `6 PM` on the hour, to keep the glanceable views short. */
export function formatTime(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const suffix = hours < 12 ? 'AM' : 'PM'
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  return minutes === 0 ? `${h12} ${suffix}` : `${h12}:${`${minutes}`.padStart(2, '0')} ${suffix}`
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** `<input type="datetime-local">` wants local time with no timezone suffix. */
export function toLocalInputValue(date: Date): string {
  return `${toDateKey(date)}T${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
}

export function fromLocalInputValue(value: string): Date {
  const [datePart, timePart = '00:00'] = value.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_LABELS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]
export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatLongDate(date: Date): string {
  return `${WEEKDAY_LABELS[date.getDay()]}, ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`
}

export function formatShortDate(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()].slice(0, 3)} ${date.getDate()}`
}

/** "Today" / "Tomorrow" / "Sat, September 19" — used by the Today and chore views. */
export function formatRelativeDay(date: Date): string {
  const delta = diffInDays(new Date(), date)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'
  return formatLongDate(date)
}
