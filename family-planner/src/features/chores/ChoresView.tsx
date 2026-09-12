import { useEffect, useMemo, useState } from 'react'
import { Button, IconButton } from '@/components/Button'
import { PlusIcon, TrashIcon } from '@/components/Icons'
import { Avatar } from '@/components/Avatar'
import { TodoRow } from '@/components/TodoRow'
import { Sheet, DeleteButton } from '@/components/Sheet'
import { Field } from '@/features/calendar/EventEditor'
import { repo, useMemberMap, useMembers, useSettings, useTodoItems, useTodoLists } from '@/data'
import type { TodoItem } from '@/data/types'
import { memberColor, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'
import { TodoEditor, type TodoDraft } from './TodoEditor'

const LIST_ICONS = ['🧹', '🛒', '🚗', '🏡', '🎒', '🐾', '🧺', '🔧', '📚', '🎉']

export function ChoresView() {
  const lists = useTodoLists()
  const members = useMembers()
  const memberMap = useMemberMap()
  const settings = useSettings()

  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [draft, setDraft] = useState<TodoDraft | null>(null)
  const [listSheetOpen, setListSheetOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')

  // Fall back to the first list whenever the current one disappears.
  useEffect(() => {
    if (lists.length === 0) {
      setActiveListId(null)
      return
    }
    if (!activeListId || !lists.some((list) => list.id === activeListId)) {
      setActiveListId(lists[0].id)
    }
  }, [lists, activeListId])

  const items = useTodoItems(activeListId ?? undefined)
  const activeList = lists.find((list) => list.id === activeListId)

  const { open, done } = useMemo(() => {
    const visible = memberFilter
      ? items.filter((item) => item.assignedMemberId === memberFilter)
      : items
    return {
      open: visible.filter((item) => !item.done),
      done: visible.filter((item) => item.done),
    }
  }, [items, memberFilter])

  const addQuick = async () => {
    const title = quickTitle.trim()
    if (!title || !activeListId) return
    await repo.todoItems.create({
      listId: activeListId,
      title,
      assignedMemberId: memberFilter ?? undefined,
      done: false,
      points: 0,
      sortOrder: Date.now(),
    })
    setQuickTitle('')
  }

  return (
    <div className="flex h-full flex-col gap-4 px-8 pt-5 pb-6">
      <header className="flex items-center gap-4">
        <h1 className="text-4xl font-black tracking-tight">Lists</h1>
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
          {lists.map((list) => {
            const active = list.id === activeListId
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveListId(list.id)}
                className={cn(
                  'touch-target pressable flex shrink-0 items-center gap-2.5 rounded-2xl border px-5 py-2.5 text-xl font-bold',
                  active
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-line bg-panel text-muted',
                )}
              >
                <span className="text-2xl">{list.icon}</span>
                {list.name}
              </button>
            )
          })}
          <IconButton label="New list" onClick={() => setListSheetOpen(true)} className="shrink-0">
            <PlusIcon className="h-7 w-7" />
          </IconButton>
        </div>
      </header>

      {/* Filter by who a chore belongs to — the "what's mine?" question. */}
      {members.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMemberFilter(null)}
            className={cn(
              'touch-target pressable rounded-2xl border px-5 py-1.5 text-lg font-bold',
              memberFilter === null
                ? 'border-accent bg-accent-soft text-ink'
                : 'border-line bg-panel text-muted',
            )}
          >
            Everyone
          </button>
          {members.map((member) => {
            const active = memberFilter === member.id
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setMemberFilter(active ? null : member.id)}
                className="touch-target pressable flex items-center gap-2 rounded-2xl border px-4 py-1.5 text-lg font-bold"
                style={{
                  borderColor: active ? memberColor(member.color).hex : 'var(--app-line)',
                  backgroundColor: active ? tint(member.color, 0.18) : 'var(--app-panel)',
                  color: active ? 'var(--app-ink)' : 'var(--app-muted)',
                }}
              >
                <Avatar member={member} size="sm" />
                {member.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3">
          <h2 className="flex-1 text-2xl font-bold">
            {activeList ? `${activeList.icon} ${activeList.name}` : 'No lists yet'}
          </h2>
          <span className="text-lg font-bold text-muted">
            {open.length === 0 ? 'All done 🎉' : `${open.length} to do`}
          </span>
          {activeList && (
            <Button
              variant="primary"
              icon={<PlusIcon className="h-6 w-6" />}
              onClick={() => setDraft({ listId: activeList.id })}
            >
              Add
            </Button>
          )}
        </div>

        {activeList && (
          <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3">
            <input
              className="field"
              value={quickTitle}
              placeholder={`Quick add to ${activeList.name}…`}
              onChange={(event) => setQuickTitle(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void addQuick()}
            />
            <Button onClick={addQuick} disabled={!quickTitle.trim()}>
              Add
            </Button>
          </div>
        )}

        <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
          {open.length === 0 && done.length === 0 && (
            <p className="py-10 text-center text-xl text-muted">
              Nothing here yet. Add the first item above.
            </p>
          )}

          {open.map((item) => (
            <ChoreRow
              key={item.id}
              item={item}
              memberMap={memberMap}
              showPoints={settings.rewardsEnabled}
              onEdit={() => setDraft({ item, listId: item.listId })}
            />
          ))}

          {done.length > 0 && (
            <>
              <div className="flex items-center gap-3 pt-6 pb-1">
                <span className="text-lg font-bold text-muted">Done ({done.length})</span>
                <span className="h-px flex-1 bg-line" />
                <button
                  type="button"
                  onClick={() => void clearCompleted(done)}
                  className="touch-target inline-flex items-center gap-2 rounded-xl px-3 py-2 text-lg font-bold text-muted"
                >
                  <TrashIcon className="h-5 w-5" />
                  Clear
                </button>
              </div>
              {done.map((item) => (
                <ChoreRow
                  key={item.id}
                  item={item}
                  memberMap={memberMap}
                  showPoints={settings.rewardsEnabled}
                  onEdit={() => setDraft({ item, listId: item.listId })}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <TodoEditor draft={draft} onClose={() => setDraft(null)} />
      <ListSheet
        open={listSheetOpen}
        list={activeList}
        onClose={() => setListSheetOpen(false)}
        onDeleted={() => setActiveListId(null)}
      />
    </div>
  )
}

function ChoreRow({
  item, memberMap, showPoints, onEdit,
}: {
  item: TodoItem
  memberMap: Map<string, import('@/data/types').FamilyMember>
  showPoints: boolean
  onEdit: () => void
}) {
  return (
    <TodoRow
      item={item}
      member={item.assignedMemberId ? memberMap.get(item.assignedMemberId) : undefined}
      showPoints={showPoints}
      onEdit={onEdit}
    />
  )
}

/**
 * Clearing finished work deletes one-offs but only un-ticks recurring chores —
 * deleting "make your bed" because it was done on Tuesday would be wrong.
 */
async function clearCompleted(done: TodoItem[]): Promise<void> {
  for (const item of done) {
    if (item.recurrenceRule) await repo.setTodoDone(item.id, false)
    else await repo.todoItems.remove(item.id)
  }
}

function ListSheet({
  open, list, onClose, onDeleted,
}: {
  open: boolean
  list?: import('@/data/types').TodoList
  onClose: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(LIST_ICONS[0])

  useEffect(() => {
    if (open) {
      setName('')
      setIcon(LIST_ICONS[0])
    }
  }, [open])

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await repo.todoLists.create({ name: trimmed, icon, sortOrder: Date.now() })
    onClose()
  }

  return (
    <Sheet
      open={open}
      title="New list"
      onClose={onClose}
      footer={
        <>
          {list && (
            <DeleteButton
              label={`Delete "${list.name}"`}
              onConfirm={async () => {
                // Remove the list's items too, or they become unreachable rows.
                const items = await repo.todoItems.all()
                for (const item of items.filter((entry) => entry.listId === list.id)) {
                  await repo.todoItems.remove(item.id)
                }
                await repo.todoLists.remove(list.id)
                onDeleted()
                onClose()
              }}
            />
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={create} disabled={!name.trim()}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Field label="List name">
          <input
            className="field text-2xl font-semibold"
            value={name}
            autoFocus
            placeholder="Weekend jobs"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void create()}
          />
        </Field>
        <Field label="Icon">
          <div className="flex flex-wrap gap-3">
            {LIST_ICONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(option)}
                className={cn(
                  'touch-target pressable h-14 w-14 rounded-2xl border text-3xl',
                  icon === option ? 'border-accent bg-accent-soft' : 'border-line bg-panel',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Sheet>
  )
}
