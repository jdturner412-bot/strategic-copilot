import { useMemo, useState } from 'react'
import type { ViewId } from '@/components/NavRail'
import { Avatar } from '@/components/Avatar'
import { EventPill } from '@/components/EventPill'
import { TodoRow } from '@/components/TodoRow'
import { Button } from '@/components/Button'
import { PlusIcon } from '@/components/Icons'
import { EventEditor, type EventDraft } from '@/features/calendar/EventEditor'
import {
  useEventsInRange, useMealSlots, useMemberMap, useMembers, useRecipes, useSettings, useTodoItems,
} from '@/data'
import type { FamilyMember, MealType } from '@/data/types'
import {
  endOfDay, formatTime, startOfDay, todayKey, MONTH_LABELS, WEEKDAY_LABELS_LONG,
} from '@/lib/dates'
import { occurrencesInRange, occurrencesOnDay, type EventOccurrence } from '@/lib/events'
import { useNow } from '@/lib/useNow'
import { memberColor } from '@/lib/colors'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

/**
 * The home screen: everything happening today, for everyone, without scrolling
 * or tapping. One column per family member plus a shared column, with chores
 * and meals down the right-hand side.
 */
export function TodayView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const now = useNow()
  const settings = useSettings()
  const members = useMembers()
  const memberMap = useMemberMap()
  const [draft, setDraft] = useState<EventDraft | null>(null)

  const today = startOfDay(now)
  const dayEnd = endOfDay(now)
  const events = useEventsInRange(today, dayEnd)
  const occurrences = useMemo(
    () => occurrencesOnDay(occurrencesInRange(events, today, dayEnd), today),
    // `today`/`dayEnd` are new Date objects each tick; their day is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, today.getTime()],
  )

  const key = todayKey()
  const todos = useTodoItems()
  const recipes = useRecipes()
  const meals = useMealSlots([key])

  // Today's panel shows what someone is expected to do today: anything dated
  // for today, plus undated work that has an owner. Undated, unassigned items
  // (the shopping list) are backlog and stay on the Chores screen.
  const dueToday = todos.filter(
    (item) => item.dueDate === key || (!item.dueDate && item.assignedMemberId && !item.done),
  )
  const openCount = dueToday.filter((item) => !item.done).length

  const shared = occurrences.filter((occurrence) => occurrence.event.memberIds.length === 0)

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-3 px-4 pt-7 pb-5 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold text-muted lg:text-2xl">
            {greeting(now)}, {settings.householdName}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {WEEKDAY_LABELS_LONG[now.getDay()]}, {MONTH_LABELS[now.getMonth()]} {now.getDate()}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black tabular-nums lg:text-5xl">{formatTime(now).split(' ')[0]}</p>
          <p className="text-xl font-bold text-muted">{formatTime(now).split(' ')[1]}</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={<PlusIcon className="h-7 w-7" />}
          onClick={() => setDraft({ defaultDate: now })}
        >
          Add event
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-4 pb-8 lg:grid-cols-[1fr_23rem] lg:overflow-hidden lg:px-8">
        {/* Schedule: one lane per family member, plus a lane for shared events.
            Lanes stack vertically so a household of six still fits on one
            screen — columns would force horizontal scrolling past member three. */}
        <section className="no-scrollbar flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
          {members.length === 0 ? (
            <div className="card flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
              <p className="text-2xl font-bold">No family members yet</p>
              <p className="text-lg text-muted">
                Add everyone in the house to colour-code the calendar and chores.
              </p>
              <Button variant="primary" onClick={() => onNavigate('family')}>
                Add family members
              </Button>
            </div>
          ) : (
            <>
              {shared.length > 0 && (
                <MemberLane
                  name="Everyone"
                  accent="var(--app-accent)"
                  avatar={
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                      style={{ backgroundColor: 'var(--app-accent-soft)' }}
                    >
                      🏠
                    </span>
                  }
                  occurrences={shared}
                  members={memberMap}
                  now={now}
                  onOpen={setDraft}
                />
              )}
              {members.map((member) => (
                <MemberLane
                  key={member.id}
                  name={member.name}
                  accent={memberColor(member.color).hex}
                  avatar={<Avatar member={member} size="md" />}
                  occurrences={occurrences.filter((occurrence) =>
                    occurrence.event.memberIds.includes(member.id),
                  )}
                  members={memberMap}
                  now={now}
                  onOpen={setDraft}
                />
              ))}
            </>
          )}
        </section>

        {/* Side panel: today's chores and today's meals. */}
        <aside className="flex flex-col gap-6 lg:min-h-0">
          <section className="card flex flex-col p-5 lg:min-h-0 lg:flex-1">
            <button
              type="button"
              onClick={() => onNavigate('chores')}
              className="mb-3 flex items-baseline justify-between text-left"
            >
              <h2 className="text-2xl font-bold">Today's chores</h2>
              <span className="text-lg font-bold text-muted">
                {openCount === 0 ? 'All done 🎉' : `${openCount} left`}
              </span>
            </button>
            <div className="no-scrollbar space-y-2 lg:flex-1 lg:overflow-y-auto">
              {dueToday.length === 0 ? (
                <p className="py-6 text-lg text-muted">Nothing on the list today.</p>
              ) : (
                dueToday
                  .slice()
                  .sort((a, b) => Number(a.done) - Number(b.done))
                  .map((item) => (
                    <TodoRow
                      key={item.id}
                      item={item}
                      member={item.assignedMemberId ? memberMap.get(item.assignedMemberId) : undefined}
                      showPoints={settings.rewardsEnabled}
                      density="compact"
                    />
                  ))
              )}
            </div>
          </section>

          <section className="card p-5">
            <button
              type="button"
              onClick={() => onNavigate('meals')}
              className="mb-3 block w-full text-left text-2xl font-bold"
            >
              Eating today
            </button>
            <div className="space-y-2">
              {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mealType) => {
                const slot = meals.find((meal) => meal.mealType === mealType)
                const label = slot?.recipeId
                  ? recipes.find((recipe) => recipe.id === slot.recipeId)?.title
                  : slot?.freeText
                return (
                  <div
                    key={mealType}
                    className="flex items-center gap-4 rounded-2xl bg-panel/60 px-4 py-3"
                  >
                    <span className="w-24 shrink-0 text-sm font-bold tracking-wide text-muted uppercase">
                      {MEAL_LABELS[mealType]}
                    </span>
                    <span className="truncate text-lg font-semibold">
                      {label ?? <span className="text-muted">Not planned</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>

      <EventEditor draft={draft} onClose={() => setDraft(null)} />
    </div>
  )
}

function MemberLane({
  name, accent, avatar, occurrences, members, now, onOpen,
}: {
  name: string
  accent: string
  avatar: React.ReactNode
  occurrences: EventOccurrence[]
  members: Map<string, FamilyMember>
  now: Date
  onOpen: (draft: EventDraft) => void
}) {
  return (
    <div
      className="card flex min-h-[7rem] shrink-0 items-stretch overflow-hidden"
      style={{ borderLeft: `6px solid ${accent}` }}
    >
      <div className="flex w-36 shrink-0 flex-col justify-center gap-1 px-3 py-3 lg:w-52 lg:px-4">
        <div className="flex items-center gap-3">
          {avatar}
          <span className="min-w-0 truncate text-xl font-bold">{name}</span>
        </div>
        <span className="text-sm font-semibold text-muted">
          {occurrences.length === 0
            ? 'Free'
            : `${occurrences.length} ${occurrences.length === 1 ? 'thing' : 'things'}`}
        </span>
      </div>

      <div className="no-scrollbar flex flex-1 items-center gap-3 overflow-x-auto py-3 pr-4">
        {occurrences.length === 0 ? (
          <p className="text-lg text-muted">Nothing scheduled today.</p>
        ) : (
          occurrences.map((occurrence) => (
            <EventPill
              key={occurrence.key}
              occurrence={occurrence}
              members={members}
              now={now}
              density="compact"
              className="w-64 shrink-0"
              onClick={() =>
                onOpen({ event: occurrence.event, occurrenceDate: occurrence.occurrenceDate })
              }
            />
          ))
        )}
      </div>
    </div>
  )
}

function greeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
