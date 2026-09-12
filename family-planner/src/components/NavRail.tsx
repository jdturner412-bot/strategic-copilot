import type { ComponentType, SVGProps } from 'react'
import {
  CalendarIcon, ChecklistIcon, FamilyIcon, MealIcon, SettingsIcon, SunIcon, TrophyIcon,
} from './Icons'
import { cn } from '@/lib/cn'

export type ViewId =
  | 'today' | 'calendar' | 'chores' | 'meals' | 'rewards' | 'family' | 'settings'

interface NavEntry {
  id: ViewId
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const PRIMARY: NavEntry[] = [
  { id: 'today', label: 'Today', icon: SunIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'chores', label: 'Chores', icon: ChecklistIcon },
  { id: 'meals', label: 'Meals', icon: MealIcon },
]

const REWARDS: NavEntry = { id: 'rewards', label: 'Points', icon: TrophyIcon }

const SECONDARY: NavEntry[] = [
  { id: 'family', label: 'Family', icon: FamilyIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

interface NavRailProps {
  current: ViewId
  onNavigate: (view: ViewId) => void
  rewardsEnabled: boolean
}

/**
 * A left-hand rail rather than a bottom bar: in landscape the vertical space is
 * the scarce one, and thumbs rest at the sides of a wall-mounted tablet.
 */
export function NavRail({ current, onNavigate, rewardsEnabled }: NavRailProps) {
  const top = rewardsEnabled ? [...PRIMARY, REWARDS] : PRIMARY

  return (
    <nav className="pb-safe pl-safe pt-safe flex w-28 shrink-0 flex-col items-center gap-2 border-r border-line bg-surface py-5">
      <div className="flex flex-1 flex-col items-center gap-2">
        {top.map((entry) => (
          <NavButton
            key={entry.id}
            entry={entry}
            active={current === entry.id}
            onClick={() => onNavigate(entry.id)}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        {SECONDARY.map((entry) => (
          <NavButton
            key={entry.id}
            entry={entry}
            active={current === entry.id}
            onClick={() => onNavigate(entry.id)}
          />
        ))}
      </div>
    </nav>
  )
}

function NavButton({
  entry, active, onClick,
}: {
  entry: NavEntry
  active: boolean
  onClick: () => void
}) {
  const Glyph = entry.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'pressable flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-3xl transition',
        active ? 'bg-accent-soft text-accent' : 'text-muted',
      )}
    >
      <Glyph className="h-8 w-8" strokeWidth={active ? 2.3 : 1.9} />
      <span className={cn('text-sm', active ? 'font-bold' : 'font-semibold')}>{entry.label}</span>
    </button>
  )
}
