import type { FamilyMember } from '@/data/types'
import { initials, memberColor, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'

const SIZES = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-lg',
  lg: 'h-16 w-16 text-2xl',
  xl: 'h-24 w-24 text-4xl',
}

interface AvatarProps {
  member: FamilyMember
  size?: keyof typeof SIZES
  className?: string
}

/** Photo when the family added one, colour-backed initials otherwise. */
export function Avatar({ member, size = 'md', className }: AvatarProps) {
  const color = memberColor(member.color)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold',
        SIZES[size],
        className,
      )}
      style={{
        backgroundColor: member.avatarUrl ? 'transparent' : tint(member.color, 0.25),
        color: color.hex,
        boxShadow: `inset 0 0 0 2px ${color.hex}`,
      }}
      title={member.name}
    >
      {member.avatarUrl ? (
        <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
      ) : (
        initials(member.name)
      )}
    </span>
  )
}

/** Overlapping avatars for an event with several attendees. */
export function AvatarStack({
  members, size = 'sm', max = 4,
}: {
  members: FamilyMember[]
  size?: keyof typeof SIZES
  max?: number
}) {
  if (members.length === 0) return null
  const shown = members.slice(0, max)
  const overflow = members.length - shown.length
  return (
    <span className="flex items-center -space-x-2">
      {shown.map((member) => (
        <Avatar key={member.id} member={member} size={size} className="ring-2 ring-surface" />
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-panel text-sm font-bold text-muted ring-2 ring-surface">
          +{overflow}
        </span>
      )}
    </span>
  )
}
