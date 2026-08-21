/**
 * "Type it out" — manual recipe entry. Live 140-char counters on cards,
 * ingredient picker with search / add-as-new / frequent tray, swap editor.
 * RecipeForm also powers the edit flow (edit-recipe.tsx) via `initial`/`recipeId`.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, SaveBar, TopBar } from '../components/Chrome'
import { CardEditor } from '../components/CardEditor'
import { IngredientPicker, type PickedIngredient } from '../components/IngredientPicker'
import { SourcesEditor } from '../components/SourcesEditor'
import { SwapEditor } from '../components/SwapEditor'
import { VariationEditor } from '../components/VariationEditor'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import {
  CARD_MAX_CHARS,
  MEALS,
  type Meal,
  type RecipeCard,
  type RecipeFull,
  type RecipeSource,
  type RecipeSwap,
  type RecipeVariation,
} from '../lib/types'
import { MEAL_LABELS } from '../lib/format'

export function ManualEntry() {
  return <RecipeForm />
}

interface RecipeFormProps {
  /** Prefill; absent = blank add form */
  initial?: RecipeFull
  /** Present = edit mode (saves via update instead of create) */
  recipeId?: string
}

export function RecipeForm({ initial, recipeId }: RecipeFormProps) {
  const navigate = useNavigate()
  const { getProfileJwt } = useLocalFirstAuth()
  const editing = !!recipeId

  const [title, setTitle] = useState(initial?.title ?? '')
  const [meal, setMeal] = useState<Meal>(initial?.meal ?? 'main')
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30)
  const [picked, setPicked] = useState<PickedIngredient[]>(
    initial?.ingredients.map((chip) => ({
      ingredientId: chip.id,
      name: chip.name,
      role: chip.role,
      amount: chip.amount,
    })) ?? [],
  )
  const [cards, setCards] = useState<RecipeCard[]>(initial?.cards.length ? initial.cards : [{ text: '' }])
  const [swaps, setSwaps] = useState<RecipeSwap[]>(initial?.swaps ?? [])
  const [variations, setVariations] = useState<RecipeVariation[]>(initial?.variations ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [sources, setSources] = useState<RecipeSource[]>(initial?.sources ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filledCards = useMemo(() => cards.filter((c) => c.text.trim()), [cards])
  const anyOver = filledCards.some((c) => c.text.trim().length > CARD_MAX_CHARS)
  const canSave = !!title.trim() && filledCards.length > 0 && !anyOver && !saving

  const updateCard = (i: number, card: RecipeCard) => setCards(cards.map((c, j) => (j === i ? card : c)))

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const draft = {
        title: title.trim(),
        meal,
        minutes,
        // The update endpoint fully replaces the row, so edits must echo the
        // recipe's source block back or an imported recipe loses its link.
        sourceType: initial?.sourceType ?? 'notes',
        sourceUrl: initial?.sourceUrl ?? null,
        sourceAuthor: initial?.sourceAuthor ?? null,
        sourceDetail: initial?.sourceDetail ?? null,
        thumbUrl: initial?.thumbUrl ?? null,
        ingredients: picked.map((p) =>
          p.ingredientId
            ? { ingredientId: p.ingredientId, amount: p.amount }
            : { name: p.name, role: p.role, amount: p.amount },
        ),
        cards: filledCards.map((c) => ({ text: c.text.trim(), ...(c.timer?.trim() ? { timer: c.timer.trim() } : {}) })),
        swaps,
        variations,
        notes: notes.trim(),
        sources,
      }
      if (recipeId) {
        await api.updateRecipe(getProfileJwt, recipeId, draft)
        navigate(`/recipe/${recipeId}`, { replace: true })
      } else {
        const recipe = await api.createRecipe(getProfileJwt, draft)
        navigate(`/recipe/${recipe.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <TopBar
          left={<BackButton to={editing ? `/recipe/${recipeId}` : '/'} label="Cancel" />}
          right={<span className="eyebrow">{editing ? 'Editing' : 'Typing it out'}</span>}
        />
        <div className="page-col px-5 pb-8">
          <input
            className="write outline-none"
            placeholder="What's it called?"
            aria-label="Recipe name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex gap-2 mt-4">
            <div className="flex-1 flex border border-rule">
              {MEALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={meal === m}
                  onClick={() => setMeal(m)}
                  className="flex-1 py-[9px] font-mono2 text-[10.5px] tracking-[0.08em] uppercase text-muted aria-pressed:bg-ink aria-pressed:text-kraft"
                >
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3.5 border border-rule px-[13px] py-[11px] mt-2">
            <span className="font-mono2 text-[10.5px] tracking-[0.13em] uppercase text-muted flex-1">Time at the stove</span>
            <button
              type="button"
              aria-label="Less time"
              onClick={() => setMinutes((v) => Math.max(5, v - 5))}
              className="w-[30px] h-[30px] border border-ink font-mono2 text-[15px] grid place-items-center"
            >
              &minus;
            </button>
            <span className="font-mono2 text-[14px] min-w-[52px] text-center">{minutes} min</span>
            <button
              type="button"
              aria-label="More time"
              onClick={() => setMinutes((v) => Math.min(600, v + 5))}
              className="w-[30px] h-[30px] border border-ink font-mono2 text-[15px] grid place-items-center"
            >
              +
            </button>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Ingredients &middot; {picked.length}</span>
            <div className="mt-2">
              <IngredientPicker picked={picked} onChange={setPicked} />
            </div>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Cards &middot; keep each under {CARD_MAX_CHARS}</span>
            <div className="mt-2">
              {cards.map((card, i) => (
                <CardEditor
                  key={i}
                  index={i}
                  card={card}
                  onChange={(c) => updateCard(i, c)}
                  onRemove={cards.length > 1 ? () => setCards(cards.filter((_, j) => j !== i)) : undefined}
                />
              ))}
              <button type="button" className="addcard" onClick={() => setCards([...cards, { text: '' }])}>
                + One more card
              </button>
            </div>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Variations</span>
            <div className="mt-2">
              <VariationEditor variations={variations} onChange={setVariations} />
            </div>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">If you're out</span>
            <div className="mt-2">
              <SwapEditor swaps={swaps} onChange={setSwaps} />
            </div>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Notes</span>
            <div className="mt-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={Math.max(4, notes.split('\n').length)}
                placeholder="Anything worth remembering about this recipe"
                aria-label="Recipe notes"
                className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 text-[14px] leading-[1.42] placeholder:text-rule outline-none resize-none"
              />
            </div>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Sources</span>
            <div className="mt-2">
              <SourcesEditor sources={sources} onChange={setSources} />
            </div>
          </div>

          {error && <p className="text-sear text-[14px] mb-4">{error}</p>}
        </div>
      </div>
      <SaveBar
        label={saving ? 'Saving…' : anyOver ? 'A card is over 140' : editing ? 'Save changes' : 'Save to the box'}
        onClick={save}
        disabled={!canSave}
      />
    </section>
  )
}
