import { useEffect, useState } from 'react'
import { Sheet, DeleteButton } from '@/components/Sheet'
import { Button, IconButton } from '@/components/Button'
import { PencilIcon, PlusIcon } from '@/components/Icons'
import { Field } from '@/features/calendar/EventEditor'
import { repo, useRecipes } from '@/data'
import type { Recipe } from '@/data/types'

/** The saved-recipes drawer: browse, add and edit. */
export function RecipeBox({ open, onClose }: { open: boolean; onClose: () => void }) {
  const recipes = useRecipes()
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null)

  return (
    <>
      <Sheet
        open={open}
        title="Recipe box"
        subtitle={`${recipes.length} saved ${recipes.length === 1 ? 'recipe' : 'recipes'}`}
        width="wide"
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Close</Button>
            <Button
              variant="primary"
              icon={<PlusIcon className="h-6 w-6" />}
              onClick={() => setEditing('new')}
            >
              New recipe
            </Button>
          </>
        }
      >
        {recipes.length === 0 ? (
          <p className="py-12 text-center text-xl text-muted">
            No recipes yet. Save the meals you cook often and they'll be one tap away.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="rounded-3xl border border-line bg-panel/60 p-5">
                <div className="flex items-start gap-3">
                  <h3 className="flex-1 text-2xl font-bold">{recipe.title}</h3>
                  <IconButton label={`Edit ${recipe.title}`} onClick={() => setEditing(recipe)}>
                    <PencilIcon className="h-6 w-6" />
                  </IconButton>
                </div>
                {recipe.ingredients.length > 0 && (
                  <ul className="mt-3 space-y-1 text-lg text-muted">
                    {recipe.ingredients.map((ingredient) => (
                      <li key={ingredient}>• {ingredient}</li>
                    ))}
                  </ul>
                )}
                {recipe.notes && <p className="mt-3 text-lg">{recipe.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Sheet>

      <RecipeEditor recipe={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function RecipeEditor({
  recipe, onClose,
}: {
  recipe: Recipe | 'new' | null
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!recipe) return
    const existing = recipe === 'new' ? undefined : recipe
    setTitle(existing?.title ?? '')
    setIngredients(existing?.ingredients.join('\n') ?? '')
    setNotes(existing?.notes ?? '')
  }, [recipe])

  if (!recipe) return null
  const existing = recipe === 'new' ? undefined : recipe

  const save = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const payload = {
      title: trimmed,
      // One ingredient per line — simpler to type on a touchscreen than chips.
      ingredients: ingredients
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined,
    }
    if (existing) await repo.recipes.update(existing.id, payload)
    else await repo.recipes.create(payload)
    onClose()
  }

  return (
    <Sheet
      open
      title={existing ? 'Edit recipe' : 'New recipe'}
      onClose={onClose}
      footer={
        <>
          {existing && (
            <DeleteButton
              onConfirm={async () => {
                // Meal slots pointing at this recipe would render blank, so
                // clear them as part of the delete.
                const slots = await repo.mealSlots.all()
                for (const slot of slots.filter((entry) => entry.recipeId === existing.id)) {
                  await repo.mealSlots.remove(slot.id)
                }
                await repo.recipes.remove(existing.id)
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
        <Field label="Recipe name">
          <input
            className="field text-2xl font-semibold"
            value={title}
            autoFocus
            placeholder="Sheet-pan chicken"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="Ingredients (one per line)">
          <textarea
            className="field min-h-40 resize-none"
            value={ingredients}
            placeholder={'4 chicken thighs\n2 lemons\nBaby potatoes'}
            onChange={(event) => setIngredients(event.target.value)}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className="field min-h-24 resize-none"
            value={notes}
            placeholder="220°C for 40 minutes."
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  )
}
