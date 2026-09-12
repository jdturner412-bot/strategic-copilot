import { useMemo, useState } from 'react'
import { Button, IconButton } from '@/components/Button'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/components/Icons'
import { Avatar } from '@/components/Avatar'
import { useEventsInRange, useMemberMap, useMembers, useSettings } from '@/data'
import {
  addDays, addMonths, endOfDay, endOfWeek, formatLongDate, MONTH_LABELS,
  startOfDay, startOfMonth, startOfWeek,
} from '@/lib/dates'
import { filterByMembers, occurrencesInRange } from '@/lib/events'
import { useNow } from '@/lib/useNow'
import { memberColor, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'
import { EventEditor, type EventDraft } from './EventEditor'
import { MonthGrid } from './MonthGrid'
import { TimeGrid } from './TimeGrid'

type CalendarMode = 'month' | 'week' | 'day'

const MODES: Array<{ id: CalendarMode; label: string }> = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function CalendarView() {
  const now = useNow()
  const settings = useSettings()
  const members = useMembers()
  const memberMap = useMemberMap()

  const [mode, setMode] = useState<CalendarMode>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [filter, setFilter] = useState<string[]>([])
  const [draft, setDraft] = useState<EventDraft | null>(null)

  const { from, to, days } = useMemo(
    () => rangeFor(mode, anchor, settings.weekStartsOn),
    [mode, anchor, settings.weekStartsOn],
  )

  const events = useEventsInRange(from, to)
  const occurrences = useMemo(
    () => filterByMembers(occurrencesInRange(events, from, to), filter),
    [events, from, to, filter],
  )

  const step = (direction: 1 | -1) => {
    setAnchor((current) => {
      if (mode === 'month') return addMonths(current, direction)
      return addDays(current, direction * (mode === 'week' ? 7 : 1))
    })
  }

  const openDay = (date: Date) => {
    setAnchor(date)
    setMode('day')
  }

  return (
    <div className="flex h-full flex-col gap-3 px-8 pt-5 pb-6">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <IconButton label="Previous" onClick={() => step(-1)}>
            <ChevronLeftIcon className="h-7 w-7" />
          </IconButton>
          <IconButton label="Next" onClick={() => step(1)}>
            <ChevronRightIcon className="h-7 w-7" />
          </IconButton>
          <Button onClick={() => setAnchor(new Date())}>Today</Button>
        </div>

        <h1 className="min-w-0 flex-1 truncate text-3xl font-black tracking-tight">
          {titleFor(mode, anchor, days)}
        </h1>

        <div className="flex rounded-2xl border border-line bg-panel p-1">
          {MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setMode(entry.id)}
              className={cn(
                'touch-target rounded-xl px-6 py-2.5 text-lg font-bold transition',
                mode === entry.id ? 'bg-accent text-white' : 'text-muted',
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          icon={<PlusIcon className="h-6 w-6" />}
          onClick={() => setDraft({ defaultDate: anchor })}
        >
          Add
        </Button>
      </header>

      {/* Member filter: an empty selection means "show everyone". */}
      {members.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <FilterChip active={filter.length === 0} onClick={() => setFilter([])}>
            Everyone
          </FilterChip>
          {members.map((member) => {
            const active = filter.includes(member.id)
            return (
              <button
                key={member.id}
                type="button"
                onClick={() =>
                  setFilter((current) =>
                    current.includes(member.id)
                      ? current.filter((id) => id !== member.id)
                      : [...current, member.id],
                  )
                }
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

      {mode === 'month' ? (
        <MonthGrid
          month={anchor}
          occurrences={occurrences}
          members={memberMap}
          weekStartsOn={settings.weekStartsOn}
          onSelect={(occurrence) =>
            setDraft({ event: occurrence.event, occurrenceDate: occurrence.occurrenceDate })
          }
          onCreate={(date) => setDraft({ defaultDate: date, defaultHour: 9 })}
          onOpenDay={openDay}
        />
      ) : (
        <TimeGrid
          days={days}
          occurrences={occurrences}
          members={memberMap}
          now={now}
          onSelect={(occurrence) =>
            setDraft({ event: occurrence.event, occurrenceDate: occurrence.occurrenceDate })
          }
          onCreate={(date, hour) => setDraft({ defaultDate: date, defaultHour: hour })}
        />
      )}

      <EventEditor draft={draft} onClose={() => setDraft(null)} />
    </div>
  )
}

function FilterChip({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'touch-target pressable rounded-2xl border px-5 py-1.5 text-lg font-bold',
        active ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-panel text-muted',
      )}
    >
      {children}
    </button>
  )
}

function rangeFor(mode: CalendarMode, anchor: Date, weekStartsOn: 0 | 1) {
  if (mode === 'day') {
    return { from: startOfDay(anchor), to: endOfDay(anchor), days: [startOfDay(anchor)] }
  }
  if (mode === 'week') {
    const from = startOfWeek(anchor, weekStartsOn)
    return {
      from,
      to: endOfWeek(anchor, weekStartsOn),
      days: Array.from({ length: 7 }, (_, index) => addDays(from, index)),
    }
  }
  // The month grid always paints six weeks, so the query range must cover them.
  const gridStart = startOfWeek(startOfMonth(anchor), weekStartsOn)
  return {
    from: gridStart,
    to: endOfDay(addDays(gridStart, 41)),
    days: [],
  }
}

function titleFor(mode: CalendarMode, anchor: Date, days: Date[]): string {
  if (mode === 'day') return formatLongDate(anchor)
  if (mode === 'month') return `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`
  const [first] = days
  const last = days[days.length - 1]
  if (!first || !last) return ''
  const sameMonth = first.getMonth() === last.getMonth()
  return sameMonth
    ? `${MONTH_LABELS[first.getMonth()]} ${first.getDate()} – ${last.getDate()}`
    : `${MONTH_LABELS[first.getMonth()].slice(0, 3)} ${first.getDate()} – ${MONTH_LABELS[last.getMonth()].slice(0, 3)} ${last.getDate()}`
}
