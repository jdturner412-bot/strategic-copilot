import { useEffect, useState } from 'react'
import { Sheet, DeleteButton } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { MemberPicker } from '@/components/MemberPicker'
import { Field } from '@/features/calendar/EventEditor'
import { repo, useMembers, useSettings } from '@/data'
import type { TodoItem } from '@/data/types'
import { toDateKey } from '@/lib/dates'
import { firstDueDate, RECURRENCE_PRESETS } from '@/lib/recurrence'
import { cn } from '@/lib/cn'

export interface TodoDraft {
  item?: TodoItem
  listId: string
}

const POINT_OPTIONS = [0, 5, 10, 15, 25, 50]

export function TodoEditor({ draft, onClose }: { draft: TodoDraft | null; onClose: () => void }) {
  const members = useMembers()
  const settings = useSettings()
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState<string[]>([])
  const [recurrence, setRecurrence] = useState('')
  const [points, setPoints] = useState(0)

  useEffect(() => {
    if (!draft) return
    setTitle(draft.item?.title ?? '')
    setAssignee(draft.item?.assignedMemberId ? [draft.item.assignedMemberId] : [])
    setRecurrence(draft.item?.recurrenceRule ?? '')
    setPoints(draft.item?.points ?? 0)
  }, [draft])

  if (!draft) return null

  const save = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const payload = {
      listId: draft.listId,
      title: trimmed,
      assignedMemberId: assignee[0],
      recurrenceRule: recurrence || undefined,
      // A repeating chore needs a due date to roll forward from; a one-off does not.
      dueDate: recurrence
        ? (draft.item?.dueDate ?? toDateKey(firstDueDate(recurrence)))
        : undefined,
      points,
    }
    if (draft.item) {
      await repo.todoItems.update(draft.item.id, payload)
    } else {
      await repo.todoItems.create({ ...payload, done: false, sortOrder: Date.now() })
    }
    onClose()
  }

  return (
    <Sheet
      open
      title={draft.item ? 'Edit item' : 'New item'}
      onClose={onClose}
      footer={
        <>
          {draft.item && (
            <DeleteButton
              onConfirm={async () => {
                await repo.todoItems.remove(draft.item!.id)
                onClose()
              }}
            />
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Field label="What needs doing?">
          <input
            className="field text-2xl font-semibold"
            value={title}
            autoFocus
            placeholder="Take out the recycling"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void save()}
          />
        </Field>

        <Field label="Who's doing it?">
          <MemberPicker
            members={members}
            selectedIds={assignee}
            onChange={setAssignee}
            mode="single"
            emptyLabel="Anyone"
          />
        </Field>

        <Field label="Repeats">
          <div className="flex flex-wrap gap-3">
            {RECURRENCE_PRESETS.map((preset) => {
              const value = preset.rule ?? ''
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setRecurrence(value)}
                  className={cn(
                    'touch-target pressable rounded-2xl border px-5 py-3 text-lg font-semibold',
                    recurrence === value
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-line bg-panel text-muted',
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </Field>

        {settings.rewardsEnabled && (
          <Field label="Points when finished">
            <div className="flex flex-wrap gap-3">
              {POINT_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPoints(value)}
                  className={cn(
                    'touch-target pressable min-w-[5rem] rounded-2xl border px-5 py-3 text-lg font-bold',
                    points === value
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-line bg-panel text-muted',
                  )}
                >
                  {value === 0 ? 'None' : value}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>
    </Sheet>
  )
}
