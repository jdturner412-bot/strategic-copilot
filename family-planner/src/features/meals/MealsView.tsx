import { useMemo, useState } from 'react'
import { Button, IconButton } from '@/components/Button'
import { BookIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/components/Icons'
import { Sheet } from '@/components/Sheet'
import { Field } from '@/features/calendar/EventEditor'
import { repo, useMealSlots, useRecipes, useSettings } from '@/data'
import type { MealType, Recipe } from '@/data/types'
import {
  addDays, formatLongDate, formatShortDate, fromDateKey, isToday, startOfWeek, toDateKey,
  WEEKDAY_LABELS,
} from '@/lib/dates'
import { cn } from '@/lib/cn'
import { RecipeBox } from './RecipeBox'

const MEAL_TYPES: Array<{ id: MealType; label: string; icon: string }> = [
  { id: 'breakfast', label: 'Breakfast', icon: '🥣' },
  { id: 'lunch', label: 'Lunch', icon: '🥪' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
]

interface SlotTarget {
  date: string
  mealType: MealType
}

export function MealsView() {
  const settings = useSettings()
  const recipes = useRecipes()
  const [weekOffset, setWeekOffset] = useState(0)
  const [target, setTarget] = useState<SlotTarget | null>(null)
  const [recipeBoxOpen, setRecipeBoxOpen] = useState(false)

  const days = useMemo(() => {
    const start = addDays(startOfWeek(new Date(), settings.weekStartsOn), weekOffset * 7)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [weekOffset, settings.weekStartsOn])

  const dateKeys = days.map(toDateKey)
  const slots = useMealSlots(dateKeys)
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))

  const labelFor = (date: string, mealType: MealType): string | undefined => {
    const slot = slots.find((entry) => entry.date === date && entry.mealType === mealType)
    if (!slot) return undefined
    return slot.recipeId ? recipesById.get(slot.recipeId)?.title : slot.freeText
  }

  return (
    <div className="flex h-full flex-col gap-4 px-8 pt-5 pb-6">
      <header className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <IconButton label="Previous week" onClick={() => setWeekOffset((week) => week - 1)}>
            <ChevronLeftIcon className="h-7 w-7" />
          </IconButton>
          <IconButton label="Next week" onClick={() => setWeekOffset((week) => week + 1)}>
            <ChevronRightIcon className="h-7 w-7" />
          </IconButton>
          <Button onClick={() => setWeekOffset(0)}>This week</Button>
        </div>
        <h1 className="flex-1 truncate text-3xl font-black tracking-tight">
          {formatShortDate(days[0])} – {formatShortDate(days[6])}
        </h1>
        <Button
          icon={<BookIcon className="h-6 w-6" />}
          onClick={() => setRecipeBoxOpen(true)}
        >
          Recipes
        </Button>
      </header>

      <div className="card grid min-h-0 flex-1 grid-cols-[8.5rem_repeat(7,minmax(0,1fr))] grid-rows-[auto_repeat(3,minmax(0,1fr))] overflow-hidden">
        <div className="border-b border-line" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'border-b border-l border-line px-2 py-2 text-center',
              isToday(day) && 'bg-accent-soft',
            )}
          >
            <div className="text-sm font-bold tracking-wide text-muted uppercase">
              {WEEKDAY_LABELS[day.getDay()]}
            </div>
            <div className="text-2xl font-black">{day.getDate()}</div>
          </div>
        ))}

        {MEAL_TYPES.map((meal) => (
          <MealRow
            key={meal.id}
            meal={meal}
            days={days}
            labelFor={labelFor}
            onPick={(date) => setTarget({ date, mealType: meal.id })}
          />
        ))}
      </div>

      <SlotEditor
        target={target}
        recipes={recipes}
        currentLabel={target ? labelFor(target.date, target.mealType) : undefined}
        onClose={() => setTarget(null)}
      />
      <RecipeBox open={recipeBoxOpen} onClose={() => setRecipeBoxOpen(false)} />
    </div>
  )
}

function MealRow({
  meal, days, labelFor, onPick,
}: {
  meal: { id: MealType; label: string; icon: string }
  days: Date[]
  labelFor: (date: string, mealType: MealType) => string | undefined
  onPick: (date: string) => void
}) {
  return (
    <>
      <div className="flex flex-col justify-center gap-1 border-t border-line px-3">
        <span className="text-3xl">{meal.icon}</span>
        <span className="text-sm font-bold tracking-wide text-muted uppercase">{meal.label}</span>
      </div>
      {days.map((day) => {
        const key = toDateKey(day)
        const label = labelFor(key, meal.id)
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPick(key)}
            className={cn(
              'pressable flex flex-col items-stretch justify-center border-t border-l border-line p-2 text-left',
              isToday(day) && 'bg-accent-soft/40',
            )}
          >
            {label ? (
              <span className="line-clamp-3 rounded-xl bg-panel px-3 py-2 text-lg leading-tight font-bold">
                {label}
              </span>
            ) : (
              <span className="flex items-center justify-center text-muted/60">
                <PlusIcon className="h-7 w-7" />
              </span>
            )}
          </button>
        )
      })}
    </>
  )
}

function SlotEditor({
  target, recipes, currentLabel, onClose,
}: {
  target: SlotTarget | null
  recipes: Recipe[]
  currentLabel?: string
  onClose: () => void
}) {
  const [text, setText] = useState('')

  // Seed the field with whatever is already planned, keyed on the slot so
  // moving between cells does not carry the previous meal across.
  const slotKey = target ? `${target.date}:${target.mealType}` : ''
  const [seededFor, setSeededFor] = useState('')
  if (target && seededFor !== slotKey) {
    setSeededFor(slotKey)
    setText(currentLabel ?? '')
  }

  if (!target) return null

  const mealLabel = MEAL_TYPES.find((meal) => meal.id === target.mealType)?.label ?? ''

  const commit = async (value: { recipeId?: string; freeText?: string } | null) => {
    await repo.setMealSlot(target.date, target.mealType, value)
    onClose()
  }

  return (
    <Sheet
      open
      title={mealLabel}
      subtitle={formatLongDate(fromDateKey(target.date))}
      width="wide"
      onClose={onClose}
      footer={
        <>
          <Button variant="danger" className="mr-auto" onClick={() => void commit(null)}>
            Clear this meal
          </Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => void commit({ freeText: text })}
            disabled={!text.trim()}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Field label="What's on the menu?">
          <input
            className="field text-2xl font-semibold"
            value={text}
            autoFocus
            placeholder="Leftovers"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void commit({ freeText: text })}
          />
        </Field>

        {recipes.length > 0 && (
          <Field label="Or pick a saved recipe">
            <div className="grid grid-cols-3 gap-3">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => void commit({ recipeId: recipe.id })}
                  className="touch-target pressable rounded-2xl border border-line bg-panel px-4 py-4 text-left text-xl font-bold"
                >
                  {recipe.title}
                  {recipe.ingredients.length > 0 && (
                    <span className="mt-1 block truncate text-base font-semibold text-muted">
                      {recipe.ingredients.join(', ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>
    </Sheet>
  )
}
