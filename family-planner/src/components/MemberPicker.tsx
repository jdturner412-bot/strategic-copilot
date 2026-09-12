import type { FamilyMember } from '@/data/types'
import { Avatar } from './Avatar'
import { memberColor, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'

interface MemberPickerProps {
  members: FamilyMember[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  /** Single mode is for "who does this chore"; multi is for event attendees. */
  mode?: 'single' | 'multi'
  /** Label for the "nobody / everyone" option, or `false` to hide it. */
  emptyLabel?: string | false
}

/** Big tappable member chips — no dropdowns, which are miserable on a wall. */
export function MemberPicker({
  members, selectedIds, onChange, mode = 'multi', emptyLabel = 'Everyone',
}: MemberPickerProps) {
  const toggle = (id: string) => {
    if (mode === 'single') {
      onChange(selectedIds.includes(id) ? [] : [id])
      return
    }
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((existing) => existing !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {emptyLabel !== false && (
        <button
          type="button"
          onClick={() => onChange([])}
          className={cn(
            'touch-target pressable rounded-2xl border px-5 py-3 text-lg font-semibold',
            selectedIds.length === 0
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-line bg-panel text-muted',
          )}
        >
          {emptyLabel}
        </button>
      )}
      {members.map((member) => {
        const selected = selectedIds.includes(member.id)
        const color = memberColor(member.color)
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => toggle(member.id)}
            className="touch-target pressable flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-lg font-semibold"
            style={{
              borderColor: selected ? color.hex : 'var(--app-line)',
              backgroundColor: selected ? tint(member.color, 0.18) : 'var(--app-panel)',
              color: selected ? 'var(--app-ink)' : 'var(--app-muted)',
            }}
          >
            <Avatar member={member} size="sm" />
            {member.name}
          </button>
        )
      })}
    </div>
  )
}
