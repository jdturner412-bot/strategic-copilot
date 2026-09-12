import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { DEFAULT_SETTINGS } from './dexieRepository'
import type {
  CalendarEvent, FamilyMember, MealSlot, Photo, PointsEntry, Recipe, Settings, TodoItem, TodoList,
} from './types'

/**
 * Reactive reads.
 *
 * Together with `dexieRepository.ts` this is the only place that imports Dexie:
 * a future sync backend reimplements these hooks (e.g. over a Supabase
 * realtime channel) and every view keeps working unchanged.
 */

const EMPTY: never[] = []

export function useMembers(): FamilyMember[] {
  return (
    useLiveQuery(
      () => db.members.orderBy('sortOrder').toArray(),
      [],
    ) ?? EMPTY
  )
}

export function useMemberMap(): Map<string, FamilyMember> {
  const members = useMembers()
  return new Map(members.map((member) => [member.id, member]))
}

/**
 * Every event that could land in `[from, to]`: bounded events overlapping the
 * range, plus all recurring series (which the caller expands). The series set
 * is tiny in a household, so fetching it whole beats an index dance.
 */
export function useEventsInRange(from: Date, to: Date): CalendarEvent[] {
  const fromIso = from.toISOString()
  const toIso = to.toISOString()
  return (
    useLiveQuery(async () => {
      const all = await db.events.toArray()
      return all.filter((event) => {
        if (event.recurrenceRule) return true
        // All-day events store `YYYY-MM-DD`, which sorts correctly against the
        // date portion of an ISO datetime.
        const start = event.allDay ? `${event.start}T00:00:00.000Z` : event.start
        const end = event.allDay ? `${event.end}T23:59:59.999Z` : event.end
        return start <= toIso && end >= fromIso
      })
    }, [fromIso, toIso]) ?? EMPTY
  )
}

export function useAllEvents(): CalendarEvent[] {
  return useLiveQuery(() => db.events.toArray(), []) ?? EMPTY
}

export function useTodoLists(): TodoList[] {
  return useLiveQuery(() => db.todoLists.orderBy('sortOrder').toArray(), []) ?? EMPTY
}

export function useTodoItems(listId?: string): TodoItem[] {
  return (
    useLiveQuery(async () => {
      const items = listId
        ? await db.todoItems.where('listId').equals(listId).toArray()
        : await db.todoItems.toArray()
      return items.sort((a, b) => a.sortOrder - b.sortOrder)
    }, [listId]) ?? EMPTY
  )
}

export function useMealSlots(dateKeys: string[]): MealSlot[] {
  const key = dateKeys.join(',')
  return (
    useLiveQuery(
      () => db.mealSlots.where('date').anyOf(dateKeys).toArray(),
      // `dateKeys` is a fresh array each render; the joined string is the real dep.
      [key],
    ) ?? EMPTY
  )
}

export function useRecipes(): Recipe[] {
  return useLiveQuery(() => db.recipes.orderBy('title').toArray(), []) ?? EMPTY
}

export function usePhotos(): Photo[] {
  return useLiveQuery(() => db.photos.orderBy('sortOrder').toArray(), []) ?? EMPTY
}

export function usePoints(): PointsEntry[] {
  return useLiveQuery(() => db.points.toArray(), []) ?? EMPTY
}

/** Never `undefined`: the defaults render while the singleton row is being read. */
export function useSettings(): Settings {
  const stored = useLiveQuery(() => db.settings.get('settings'), [])
  return (
    stored ?? {
      ...DEFAULT_SETTINGS,
      id: 'settings',
      createdAt: '',
      updatedAt: '',
    }
  )
}
