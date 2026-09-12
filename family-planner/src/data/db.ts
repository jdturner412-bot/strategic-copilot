import Dexie, { type EntityTable } from 'dexie'
import type {
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
 * The IndexedDB schema. Indexes exist only where a view actually queries by
 * them — every extra index costs write throughput on a device that is writing
 * on every checkbox tap.
 */
export class PlannerDatabase extends Dexie {
  members!: EntityTable<FamilyMember, 'id'>
  events!: EntityTable<CalendarEvent, 'id'>
  todoLists!: EntityTable<TodoList, 'id'>
  todoItems!: EntityTable<TodoItem, 'id'>
  mealSlots!: EntityTable<MealSlot, 'id'>
  recipes!: EntityTable<Recipe, 'id'>
  photos!: EntityTable<Photo, 'id'>
  points!: EntityTable<PointsEntry, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('family-planner')
    this.version(1).stores({
      members: 'id, sortOrder, name',
      // `start` drives every range query the calendar makes. Recurring events
      // are fetched separately (they have no bounded start) via `recurrenceRule`.
      events: 'id, start, recurrenceRule',
      todoLists: 'id, sortOrder',
      todoItems: 'id, listId, assignedMemberId, done, dueDate',
      // A date+type pair uniquely identifies a slot in the weekly grid.
      mealSlots: 'id, date, [date+mealType]',
      recipes: 'id, title',
      photos: 'id, sortOrder',
      points: 'id, memberId, earnedAt, todoItemId',
      settings: 'id',
    })
  }
}

export const db = new PlannerDatabase()
