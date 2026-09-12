import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Button'
import { PhotoIcon, PlusIcon, TrashIcon } from '@/components/Icons'
import { Avatar } from '@/components/Avatar'
import { Sheet, DeleteButton } from '@/components/Sheet'
import { Field, Toggle } from '@/features/calendar/EventEditor'
import { repo, useMembers, usePoints, useTodoItems, useAllEvents } from '@/data'
import type { FamilyMember, MemberColorName } from '@/data/types'
import {
  MEMBER_COLOR_LIST, memberColor, nextAvailableColor, readableInk, tint,
} from '@/lib/colors'
import { fileToAvatarDataUrl } from '@/lib/image'
import { cn } from '@/lib/cn'

export function FamilyView() {
  const members = useMembers()
  const points = usePoints()
  const todos = useTodoItems()
  const events = useAllEvents()
  const [editing, setEditing] = useState<FamilyMember | 'new' | null>(null)

  return (
    <div className="flex h-full flex-col gap-5 px-8 pt-5 pb-6">
      <header className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-4xl font-black tracking-tight">Family</h1>
          <p className="mt-1 text-lg text-muted">
            Everyone here gets a colour, used across the calendar and the chore lists.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={<PlusIcon className="h-7 w-7" />}
          onClick={() => setEditing('new')}
        >
          Add member
        </Button>
      </header>

      <div className="no-scrollbar grid min-h-0 flex-1 grid-cols-4 content-start gap-5 overflow-y-auto">
        {members.map((member) => {
          const color = memberColor(member.color)
          const earned = points
            .filter((entry) => entry.memberId === member.id)
            .reduce((total, entry) => total + entry.points, 0)
          const openChores = todos.filter(
            (item) => item.assignedMemberId === member.id && !item.done,
          ).length
          const eventCount = events.filter((event) => event.memberIds.includes(member.id)).length

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => setEditing(member)}
              className="card pressable flex flex-col items-center gap-3 p-6"
              style={{ borderColor: color.hex, backgroundColor: tint(member.color, 0.08) }}
            >
              <Avatar member={member} size="xl" />
              <span className="text-2xl font-black">{member.name}</span>
              <span
                className="rounded-full px-3 py-1 text-sm font-bold tracking-wide uppercase"
                style={{ backgroundColor: tint(member.color, 0.2), color: readableInk(member.color) }}
              >
                {member.isChild ? 'Child' : 'Grown-up'}
              </span>
              <dl className="mt-1 grid w-full grid-cols-3 gap-1 text-center">
                <Stat label="Events" value={eventCount} />
                <Stat label="To do" value={openChores} />
                <Stat label="Points" value={earned} />
              </dl>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setEditing('new')}
          className="pressable flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line text-muted"
        >
          <PlusIcon className="h-12 w-12" />
          <span className="text-xl font-bold">Add someone</span>
        </button>
      </div>

      <MemberEditor
        member={editing}
        takenColors={members.map((member) => member.color)}
        memberCount={members.length}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="text-2xl font-black tabular-nums">{value}</dd>
      <dt className="text-xs font-bold tracking-wide text-muted uppercase">{label}</dt>
    </div>
  )
}

function MemberEditor({
  member, takenColors, memberCount, onClose,
}: {
  member: FamilyMember | 'new' | null
  takenColors: string[]
  memberCount: number
  onClose: () => void
}) {
  const existing = member === 'new' ? undefined : member
  const [name, setName] = useState('')
  const [color, setColor] = useState<MemberColorName>('sky')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)
  const [isChild, setIsChild] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!member) return
    setName(existing?.name ?? '')
    setColor(existing?.color ?? nextAvailableColor(takenColors))
    setAvatarUrl(existing?.avatarUrl)
    setIsChild(existing?.isChild ?? false)
    // `takenColors` changes identity on every render of the parent; the member
    // being opened is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member])

  if (!member) return null

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const payload = { name: trimmed, color, avatarUrl, isChild }
    if (existing) await repo.members.update(existing.id, payload)
    else await repo.members.create({ ...payload, sortOrder: memberCount })
    onClose()
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setAvatarUrl(await fileToAvatarDataUrl(file))
  }

  const preview: FamilyMember = {
    id: existing?.id ?? 'preview',
    name: name || 'New member',
    color,
    avatarUrl,
    isChild,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  }

  return (
    <Sheet
      open
      title={existing ? `Edit ${existing.name}` : 'Add family member'}
      onClose={onClose}
      footer={
        <>
          {existing && (
            <DeleteButton
              onConfirm={async () => {
                await detachMember(existing.id)
                await repo.members.remove(existing.id)
                onClose()
              }}
            />
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar member={preview} size="xl" />
          <div className="flex flex-col gap-3">
            <Button
              icon={<PhotoIcon className="h-6 w-6" />}
              onClick={() => fileInput.current?.click()}
            >
              {avatarUrl ? 'Change photo' : 'Add photo'}
            </Button>
            {avatarUrl && (
              <Button
                variant="ghost"
                icon={<TrashIcon className="h-5 w-5" />}
                onClick={() => setAvatarUrl(undefined)}
              >
                Remove photo
              </Button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void pickPhoto(event.target.files?.[0])}
            />
          </div>
        </div>

        <Field label="Name">
          <input
            className="field text-2xl font-semibold"
            value={name}
            autoFocus
            placeholder="Riley"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void save()}
          />
        </Field>

        <Field label="Colour">
          <div className="flex flex-wrap gap-3">
            {MEMBER_COLOR_LIST.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => setColor(option.name)}
                aria-label={option.label}
                className={cn(
                  'touch-target pressable h-14 w-14 rounded-2xl border-[3px]',
                  color === option.name ? 'scale-110' : 'border-transparent',
                )}
                style={{
                  backgroundColor: option.hex,
                  borderColor: color === option.name ? 'var(--app-ink)' : 'transparent',
                }}
              />
            ))}
          </div>
        </Field>

        <Toggle
          checked={isChild}
          onChange={setIsChild}
          label="This is a child (appears on the points leaderboard)"
        />
      </div>
    </Sheet>
  )
}

/**
 * Removing someone must not leave their id behind on events and chores, or
 * those records would render with a missing colour and never be re-assignable.
 */
async function detachMember(memberId: string): Promise<void> {
  const events = await repo.events.all()
  for (const event of events.filter((entry) => entry.memberIds.includes(memberId))) {
    await repo.events.update(event.id, {
      memberIds: event.memberIds.filter((id) => id !== memberId),
    })
  }

  const items = await repo.todoItems.all()
  for (const item of items.filter((entry) => entry.assignedMemberId === memberId)) {
    await repo.todoItems.update(item.id, { assignedMemberId: undefined })
  }

  const entries = await repo.points.all()
  for (const entry of entries.filter((point) => point.memberId === memberId)) {
    await repo.points.remove(entry.id)
  }
}
