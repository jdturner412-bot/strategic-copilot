import type {
  BaseRecord,
  CalendarEvent,
  FamilyMember,
  MealSlot,
  Photo,
  PointsEntry,
  Recipe,
  Settings,
  TodoItem,
  TodoList,
} from './types'

/**
 * The seam between the UI and storage.
 *
 * Everything the app writes goes through this interface, so adding a backend
 * later (Supabase, a self-hosted API, CRDT sync) means writing one more
 * implementation and swapping the instance exported from `data/index.ts` —
 * no view component changes. Reads used by the views go through the hooks in
 * `data/hooks.ts`, which is the only other module that knows about Dexie.
 *
 * All methods are async precisely so a network-backed implementation drops in
 * without turning synchronous call sites into a refactor.
 */
export interface Collection<T extends BaseRecord, TCreate = Omit<T, keyof BaseRecord>> {
  all(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  create(input: TCreate): Promise<T>
  update(id: string, changes: Partial<TCreate>): Promise<void>
  remove(id: string): Promise<void>
}

export interface DataRepository {
  members: Collection<FamilyMember>
  events: Collection<CalendarEvent>
  todoLists: Collection<TodoList>
  todoItems: Collection<TodoItem>
  mealSlots: Collection<MealSlot>
  recipes: Collection<Recipe>
  photos: Collection<Photo>
  points: Collection<PointsEntry>

  /** Settings is a singleton row rather than a collection. */
  getSettings(): Promise<Settings>
  updateSettings(changes: Partial<Omit<Settings, keyof BaseRecord>>): Promise<void>

  /** Domain operations that must stay atomic across tables. */
  setTodoDone(itemId: string, done: boolean): Promise<void>
  setMealSlot(
    date: string,
    mealType: MealSlot['mealType'],
    value: { recipeId?: string; freeText?: string } | null,
  ): Promise<void>
  /** Re-open recurring chores whose due date has passed. Runs on app start. */
  rolloverRecurringTodos(): Promise<number>
  /** Wipe every table. Used by Settings → Reset. */
  clearAll(): Promise<void>
  /** Whole-database export/import, so a household can move to a new iPad. */
  exportJson(): Promise<string>
  importJson(json: string): Promise<void>
}

export function newId(): string {
  // `randomUUID` needs a secure context; the fallback keeps dev-over-LAN working.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function stamp(): string {
  return new Date().toISOString()
}
