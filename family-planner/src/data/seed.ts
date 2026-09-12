import { db } from './db'
import { newId, stamp } from './repository'
import type { CalendarEvent, FamilyMember, MealSlot, Recipe, TodoItem, TodoList } from './types'
import { addDays, toDateKey } from '@/lib/dates'
import { firstDueDate } from '@/lib/recurrence'

/**
 * First-run content. A wall display that boots to an empty screen looks broken,
 * so a new install gets a plausible household it can edit or wipe from Settings.
 */
export async function seedIfEmpty(): Promise<void> {
  const memberCount = await db.members.count()
  if (memberCount > 0) return
  await seed()
}

function at(dayOffset: number, hour: number, minute = 0): string {
  const date = addDays(new Date(), dayOffset)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export async function seed(): Promise<void> {
  const now = stamp()
  const base = { createdAt: now, updatedAt: now }

  const members: FamilyMember[] = [
    { id: newId(), name: 'Alex', color: 'sky', isChild: false, sortOrder: 0, ...base },
    { id: newId(), name: 'Sam', color: 'emerald', isChild: false, sortOrder: 1, ...base },
    { id: newId(), name: 'Riley', color: 'amber', isChild: true, sortOrder: 2, ...base },
    { id: newId(), name: 'Jules', color: 'fuchsia', isChild: true, sortOrder: 3, ...base },
  ]
  const [alex, sam, riley, jules] = members

  const events: CalendarEvent[] = [
    {
      id: newId(), title: 'School drop-off', start: at(0, 8, 15), end: at(0, 8, 45),
      allDay: false, memberIds: [riley.id, jules.id], recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      location: 'Lincoln Elementary', ...base,
    },
    {
      id: newId(), title: 'Soccer practice', start: at(0, 16, 30), end: at(0, 18, 0),
      allDay: false, memberIds: [riley.id], location: 'Field 3',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU,TH', ...base,
    },
    {
      id: newId(), title: 'Family dinner', start: at(0, 18, 30), end: at(0, 19, 30),
      allDay: false, memberIds: [], notes: 'Phones in the basket.', ...base,
    },
    {
      id: newId(), title: 'Piano lesson', start: at(1, 15, 30), end: at(1, 16, 15),
      allDay: false, memberIds: [jules.id], location: 'Ms. Okafor’s studio', ...base,
    },
    {
      id: newId(), title: 'Dentist', start: at(2, 10, 0), end: at(2, 11, 0),
      allDay: false, memberIds: [sam.id], location: 'Bayside Dental', ...base,
    },
    {
      id: newId(), title: 'Grandma visits',
      start: toDateKey(addDays(new Date(), 4)), end: toDateKey(addDays(new Date(), 6)),
      allDay: true, memberIds: [], ...base,
    },
    {
      id: newId(), title: 'Work offsite', start: at(3, 9, 0), end: at(3, 17, 0),
      allDay: false, memberIds: [alex.id], ...base,
    },
  ]

  const lists: TodoList[] = [
    { id: newId(), name: 'Chores', icon: '🧹', sortOrder: 0, ...base },
    { id: newId(), name: 'Shopping', icon: '🛒', sortOrder: 1, ...base },
    { id: newId(), name: 'Errands', icon: '🚗', sortOrder: 2, ...base },
  ]
  const [chores, shopping, errands] = lists
  const due = (rule: string) => toDateKey(firstDueDate(rule))

  const items: TodoItem[] = [
    {
      id: newId(), listId: chores.id, title: 'Make your bed', assignedMemberId: riley.id,
      done: false, recurrenceRule: 'FREQ=DAILY', dueDate: due('FREQ=DAILY'), points: 5, sortOrder: 0, ...base,
    },
    {
      id: newId(), listId: chores.id, title: 'Feed the dog', assignedMemberId: jules.id,
      done: false, recurrenceRule: 'FREQ=DAILY', dueDate: due('FREQ=DAILY'), points: 5, sortOrder: 1, ...base,
    },
    {
      id: newId(), listId: chores.id, title: 'Take out recycling', assignedMemberId: riley.id,
      done: false, recurrenceRule: 'FREQ=WEEKLY;BYDAY=SU', dueDate: due('FREQ=WEEKLY;BYDAY=SU'), points: 10,
      sortOrder: 2, ...base,
    },
    {
      id: newId(), listId: chores.id, title: 'Vacuum the living room', assignedMemberId: jules.id,
      done: false, recurrenceRule: 'FREQ=WEEKLY;BYDAY=SA', dueDate: due('FREQ=WEEKLY;BYDAY=SA'), points: 15,
      sortOrder: 3, ...base,
    },
    {
      id: newId(), listId: chores.id, title: 'Load the dishwasher', assignedMemberId: sam.id,
      done: false, points: 0, sortOrder: 4, ...base,
    },
    {
      id: newId(), listId: shopping.id, title: 'Milk', done: false, points: 0, sortOrder: 0, ...base,
    },
    {
      id: newId(), listId: shopping.id, title: 'Coffee beans', done: false, points: 0,
      sortOrder: 1, ...base,
    },
    {
      id: newId(), listId: shopping.id, title: 'Bananas', done: true, completedAt: now,
      points: 0, sortOrder: 2, ...base,
    },
    {
      id: newId(), listId: errands.id, title: 'Return library books', assignedMemberId: alex.id,
      done: false, points: 0, sortOrder: 0, ...base,
    },
    {
      id: newId(), listId: errands.id, title: 'Pick up dry cleaning', assignedMemberId: sam.id,
      done: false, points: 0, sortOrder: 1, ...base,
    },
  ]

  const recipes: Recipe[] = [
    {
      id: newId(), title: 'Sheet-pan chicken',
      ingredients: ['4 chicken thighs', '2 lemons', 'Baby potatoes', 'Olive oil', 'Rosemary'],
      notes: '220°C for 40 minutes. Everything on one tray.', ...base,
    },
    {
      id: newId(), title: 'Taco night',
      ingredients: ['Ground beef', 'Tortillas', 'Cheddar', 'Lettuce', 'Salsa', 'Sour cream'],
      notes: 'Riley builds their own. No onions for Jules.', ...base,
    },
    {
      id: newId(), title: 'Pasta bake',
      ingredients: ['Penne', 'Passata', 'Mozzarella', 'Basil', 'Garlic'],
      notes: 'Doubles well — freeze half.', ...base,
    },
  ]

  const [sheetPan, tacos, pasta] = recipes
  const meals: MealSlot[] = [
    { id: newId(), date: toDateKey(new Date()), mealType: 'breakfast', freeText: 'Oatmeal & berries', ...base },
    { id: newId(), date: toDateKey(new Date()), mealType: 'dinner', recipeId: sheetPan.id, ...base },
    { id: newId(), date: toDateKey(addDays(new Date(), 1)), mealType: 'dinner', recipeId: tacos.id, ...base },
    { id: newId(), date: toDateKey(addDays(new Date(), 2)), mealType: 'dinner', recipeId: pasta.id, ...base },
    { id: newId(), date: toDateKey(addDays(new Date(), 1)), mealType: 'lunch', freeText: 'Leftovers', ...base },
  ]

  await db.transaction(
    'rw',
    [db.members, db.events, db.todoLists, db.todoItems, db.recipes, db.mealSlots],
    async () => {
      await db.members.bulkAdd(members)
      await db.events.bulkAdd(events)
      await db.todoLists.bulkAdd(lists)
      await db.todoItems.bulkAdd(items)
      await db.recipes.bulkAdd(recipes)
      await db.mealSlots.bulkAdd(meals)
    },
  )
}
