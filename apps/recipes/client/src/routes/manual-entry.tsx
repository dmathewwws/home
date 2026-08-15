/**
 * "Type it out" — manual recipe entry. Live 140-char counters on cards,
 * ingredient picker with search / add-as-new / frequent tray, swap editor.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, SaveBar, TopBar } from '../components/Chrome'
import { CardEditor } from '../components/CardEditor'
import { IngredientPicker, type PickedIngredient } from '../components/IngredientPicker'
import { SwapEditor } from '../components/SwapEditor'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { CARD_MAX_CHARS, MEALS, type Meal, type RecipeCard, type RecipeSwap } from '../lib/types'
import { MEAL_LABELS } from '../lib/format'

export function ManualEntry() {
  const navigate = useNavigate()
  const { getProfileJwt } = useLocalFirstAuth()

  const [title, setTitle] = useState('')
  const [meal, setMeal] = useState<Meal>('main')
  const [minutes, setMinutes] = useState(30)
  const [picked, setPicked] = useState<PickedIngredient[]>([])
  const [cards, setCards] = useState<RecipeCard[]>([{ text: '' }])
  const [swaps, setSwaps] = useState<RecipeSwap[]>([])
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
      const recipe = await api.createRecipe(getProfileJwt, {
        title: title.trim(),
        meal,
        minutes,
        sourceType: 'notes',
        ingredients: picked.map((p) =>
          p.ingredientId
            ? { ingredientId: p.ingredientId, amount: p.amount }
            : { name: p.name, role: p.role, amount: p.amount },
        ),
        cards: filledCards.map((c) => ({ text: c.text.trim(), ...(c.timer?.trim() ? { timer: c.timer.trim() } : {}) })),
        swaps,
      })
      navigate(`/recipe/${recipe.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <TopBar left={<BackButton to="/" label="Cancel" />} right={<span className="eyebrow">Typing it out</span>} />
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
            <span className="tape mb-3.5">If you're out</span>
            <div className="mt-2">
              <SwapEditor swaps={swaps} onChange={setSwaps} />
            </div>
          </div>

          {error && <p className="text-sear text-[14px] mb-4">{error}</p>}
        </div>
      </div>
      <SaveBar
        label={saving ? 'Saving…' : anyOver ? 'A card is over 140' : 'Save to the box'}
        onClick={save}
        disabled={!canSave}
      />
    </section>
  )
}
