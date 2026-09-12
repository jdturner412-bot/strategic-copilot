import type { EntityTable, Table, UpdateSpec } from 'dexie'
import { db } from './db'
import { newId, stamp, type Collection, type DataRepository } from './repository'
import type { BaseRecord, MealSlot, Settings, TodoItem } from './types'
import { fromDateKey, toDateKey, todayKey } from '@/lib/dates'
import { nextOccurrence } from '@/lib/recurrence'

/**
 * Generic CRUD over a Dexie table, with ids and timestamps handled centrally.
 *
 * Dexie's table types are invariant in the record type, so the table is
 * narrowed to a plain `Table` inside; the public signature stays fully typed.
 */
function collection<T extends BaseRecord>(table: EntityTable<T, 'id'>): Collection<T> {
  type Create = Omit<T, keyof BaseRecord>
  const rows = table as unknown as Table<T, string>
  return {
    async all() {
      return rows.toArray()
    },
    async get(id) {
      return rows.get(id)
    },
    async create(input: Create) {
      const now = stamp()
      const record = { ...input, id: newId(), createdAt: now, updatedAt: now } as unknown as T
      await rows.add(record)
      return record
    },
    async update(id, changes) {
      await rows.update(id, { ...changes, updatedAt: stamp() } as UpdateSpec<T>)
    },
    async remove(id) {
      await rows.delete(id)
    },
  }
}

export const DEFAULT_SETTINGS: Omit<Settings, keyof BaseRecord> = {
  householdName: 'Our Family',
  themeMode: 'auto',
  lightThemeStartHour: 7,
  darkThemeStartHour: 20,
  screensaverAfterMinutes: 5,
  screensaverIntervalSeconds: 10,
  rewardsEnabled: true,
  weekStartsOn: 0,
}

const TABLES = [
  db.members, db.events, db.todoLists, db.todoItems,
  db.mealSlots, db.recipes, db.photos, db.points, db.settings,
]

export class DexieRepository implements DataRepository {
  members = collection(db.members)
  events = collection(db.events)
  todoLists = collection(db.todoLists)
  todoItems = collection(db.todoItems)
  mealSlots = collection(db.mealSlots)
  recipes = collection(db.recipes)
  photos = collection(db.photos)
  points = collection(db.points)

  async getSettings(): Promise<Settings> {
    const existing = await db.settings.get('settings')
    if (existing) return existing
    const now = stamp()
    const created: Settings = { ...DEFAULT_SETTINGS, id: 'settings', createdAt: now, updatedAt: now }
    await db.settings.put(created)
    return created
  }

  async updateSettings(changes: Partial<Omit<Settings, keyof BaseRecord>>): Promise<void> {
    await this.getSettings()
    await db.settings.update('settings', { ...changes, updatedAt: stamp() })
  }

  /**
   * Completing a chore both flips the checkbox and writes a points entry, and
   * un-checking revokes it — one transaction so the leaderboard can never drift
   * out of step with the list.
   */
  async setTodoDone(itemId: string, done: boolean): Promise<void> {
    await db.transaction('rw', db.todoItems, db.points, async () => {
      const item = await db.todoItems.get(itemId)
      if (!item) return
      await db.todoItems.update(itemId, {
        done,
        completedAt: done ? stamp() : undefined,
        updatedAt: stamp(),
      })
      if (done) {
        if (item.assignedMemberId && item.points > 0) {
          const now = stamp()
          await db.points.add({
            id: newId(),
            memberId: item.assignedMemberId,
            points: item.points,
            reason: item.title,
            todoItemId: item.id,
            earnedAt: now,
            createdAt: now,
            updatedAt: now,
          })
        }
      } else {
        await db.points.where('todoItemId').equals(itemId).delete()
      }
    })
  }

  /** Upsert-or-clear for a cell in the weekly meal grid. */
  async setMealSlot(
    date: string,
    mealType: MealSlot['mealType'],
    value: { recipeId?: string; freeText?: string } | null,
  ): Promise<void> {
    await db.transaction('rw', db.mealSlots, async () => {
      const existing = await db.mealSlots.where({ date, mealType }).first()
      if (!value || (!value.recipeId && !value.freeText?.trim())) {
        if (existing) await db.mealSlots.delete(existing.id)
        return
      }
      const payload = {
        recipeId: value.recipeId,
        freeText: value.recipeId ? undefined : value.freeText?.trim(),
        updatedAt: stamp(),
      }
      if (existing) {
        await db.mealSlots.update(existing.id, payload)
      } else {
        const now = stamp()
        await db.mealSlots.add({
          id: newId(), date, mealType, ...payload, createdAt: now, updatedAt: now,
        })
      }
    })
  }

  /**
   * A recurring chore is a single row that moves forward rather than a series of
   * rows: once its due date is in the past it re-opens on its next occurrence.
   * Points already earned stay in the ledger, so history survives the reset.
   */
  async rolloverRecurringTodos(): Promise<number> {
    const today = todayKey()
    const candidates = await db.todoItems
      .filter((item: TodoItem) => Boolean(item.recurrenceRule) && Boolean(item.dueDate))
      .toArray()

    let rolled = 0
    for (const item of candidates) {
      if (!item.dueDate || item.dueDate >= today) continue
      const next = nextOccurrence(
        item.recurrenceRule!,
        fromDateKey(item.dueDate),
        fromDateKey(today),
      )
      if (!next) continue
      await db.todoItems.update(item.id, {
        done: false,
        completedAt: undefined,
        dueDate: toDateKey(next),
        updatedAt: stamp(),
      })
      rolled += 1
    }
    return rolled
  }

  async clearAll(): Promise<void> {
    await Promise.all(TABLES.map((table) => table.clear()))
  }

  /**
   * Photos are Blobs, which JSON cannot carry, so they are base64-encoded on the
   * way out and rebuilt on the way in.
   */
  async exportJson(): Promise<string> {
    const [members, events, todoLists, todoItems, mealSlots, recipes, points, settings, photos] =
      await Promise.all([
        db.members.toArray(), db.events.toArray(), db.todoLists.toArray(),
        db.todoItems.toArray(), db.mealSlots.toArray(), db.recipes.toArray(),
        db.points.toArray(), db.settings.toArray(), db.photos.toArray(),
      ])
    const encodedPhotos = await Promise.all(
      photos.map(async ({ blob, ...rest }) => ({
        ...rest,
        mimeType: blob.type,
        data: await blobToBase64(blob),
      })),
    )
    return JSON.stringify(
      {
        version: 1,
        exportedAt: stamp(),
        members, events, todoLists, todoItems, mealSlots, recipes, points, settings,
        photos: encodedPhotos,
      },
      null,
      2,
    )
  }

  async importJson(json: string): Promise<void> {
    const data = JSON.parse(json) as Record<string, unknown>
    await this.clearAll()
    const put = async <T extends BaseRecord>(table: EntityTable<T, 'id'>, key: string) => {
      const rows = data[key]
      if (Array.isArray(rows)) await (table as unknown as Table<T, string>).bulkPut(rows as T[])
    }
    await put(db.members, 'members')
    await put(db.events, 'events')
    await put(db.todoLists, 'todoLists')
    await put(db.todoItems, 'todoItems')
    await put(db.mealSlots, 'mealSlots')
    await put(db.recipes, 'recipes')
    await put(db.points, 'points')
    await put(db.settings, 'settings')

    const photos = data.photos
    if (Array.isArray(photos)) {
      await db.photos.bulkPut(
        photos.map((photo: { data: string; mimeType?: string } & BaseRecord) => ({
          ...photo,
          blob: base64ToBlob(photo.data, photo.mimeType ?? 'image/jpeg'),
        })) as never,
      )
    }
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}
