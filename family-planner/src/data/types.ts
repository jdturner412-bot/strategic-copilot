/**
 * Domain model for the family planner.
 *
 * Two rules keep this model sync-ready even though v1 is local-only:
 *  - Every record carries a client-generated string `id` (UUID), never an
 *    auto-increment key, so records created offline on two devices can merge.
 *  - Every record carries `createdAt` / `updatedAt` ISO timestamps so a future
 *    sync service has something to reconcile on.
 *
 * Dates are stored as ISO strings rather than `Date` objects: IndexedDB can
 * hold `Date`s, but strings survive JSON transport to a backend unchanged.
 * Wall-clock dates (a meal slot, an all-day event) use `YYYY-MM-DD` so they
 * never shift across a timezone change; instants use full ISO datetimes.
 */

/** `YYYY-MM-DD`, interpreted in the household's local timezone. */
export type DateKey = string

/** Full ISO-8601 datetime, e.g. `2026-09-12T18:30:00.000Z`. */
export type Timestamp = string

export interface BaseRecord {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface FamilyMember extends BaseRecord {
  name: string
  /** Key into `MEMBER_COLORS`; resolved to real colours at render time. */
  color: MemberColorName
  /** Object URL or data URL for the avatar photo. Optional. */
  avatarUrl?: string
  /** Children can earn chore points; adults are excluded from the leaderboard. */
  isChild: boolean
  /** Manual ordering for the nav/filter rail. */
  sortOrder: number
}

export type MemberColorName =
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'teal'
  | 'orange'
  | 'fuchsia'

export interface CalendarEvent extends BaseRecord {
  title: string
  /** ISO datetime for timed events; `YYYY-MM-DD` for all-day events. */
  start: string
  /**
   * End of the event. For timed events this is the end instant; for all-day
   * events it is the last day, inclusive, so a one-day event has `start === end`.
   */
  end: string
  allDay: boolean
  location?: string
  notes?: string
  memberIds: string[]
  /** RFC 5545 RRULE string without the `RRULE:` prefix, e.g. `FREQ=WEEKLY;BYDAY=MO`. */
  recurrenceRule?: string
  /** `YYYY-MM-DD` keys of occurrences deleted from a recurring series. */
  exceptionDates?: DateKey[]
}

export interface TodoList extends BaseRecord {
  name: string
  /** Emoji shown on the list tab. */
  icon: string
  sortOrder: number
}

export interface TodoItem extends BaseRecord {
  listId: string
  title: string
  assignedMemberId?: string
  done: boolean
  /** When the current completion happened — drives the "done today" filter. */
  completedAt?: Timestamp
  /** RRULE string; a recurring chore re-opens itself once its period rolls over. */
  recurrenceRule?: string
  /** Date the item is currently due/open for. Set for recurring chores. */
  dueDate?: DateKey
  /** Points awarded to the assignee on completion. */
  points: number
  sortOrder: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface MealSlot extends BaseRecord {
  date: DateKey
  mealType: MealType
  /** Either a link to the recipe box… */
  recipeId?: string
  /** …or a free-text meal name. Exactly one of the two is set. */
  freeText?: string
}

export interface Recipe extends BaseRecord {
  title: string
  ingredients: string[]
  notes?: string
}

/** A photo for the screensaver, stored as a Blob inside IndexedDB. */
export interface Photo extends BaseRecord {
  name: string
  blob: Blob
  sortOrder: number
}

/** Append-only ledger so the leaderboard can show history, not just a total. */
export interface PointsEntry extends BaseRecord {
  memberId: string
  points: number
  reason: string
  /** Set when the entry came from completing a chore, so un-checking can revoke it. */
  todoItemId?: string
  earnedAt: Timestamp
}

export type ThemeMode = 'auto' | 'light' | 'dark'

export interface Settings extends BaseRecord {
  /** Singleton row; always `'settings'`. */
  id: string
  householdName: string
  themeMode: ThemeMode
  /** Hour (0-23) at which auto mode switches to the light theme. */
  lightThemeStartHour: number
  /** Hour (0-23) at which auto mode switches back to the dark theme. */
  darkThemeStartHour: number
  /** Minutes of inactivity before the screensaver takes over. 0 disables it. */
  screensaverAfterMinutes: number
  /** Seconds each photo is shown. */
  screensaverIntervalSeconds: number
  /** Show the points leaderboard and award points on chore completion. */
  rewardsEnabled: boolean
  /** First day of the week: 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1
}
