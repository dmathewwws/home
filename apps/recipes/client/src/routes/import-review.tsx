/**
 * "Check the breakdown" — review a pasted import before anything persists.
 * The draft arrives via navigation state only; maybe-ingredients are
 * tapped to keep or drop; over-limit cards carry the sear "Split in two"
 * flag; the save button is the first moment anything is written.
 */

import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BackButton, SaveBar, TopBar } from '../components/Chrome'
import { CardEditor, splitCard } from '../components/CardEditor'
import { IngChip } from '../components/IngChip'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { CARD_MAX_CHARS, MEALS, type ImportDraft, type Meal, type RecipeCard } from '../lib/types'
import { MEAL_LABELS } from '../lib/format'

type MaybeState = 'maybe' | 'kept' | 'dropped'

export function ImportReview() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getProfileJwt } = useLocalFirstAuth()
  const result = location.state as ImportDraft | null

  // Hooks before the redirect guard (result never changes for a mounted instance)
  const [title, setTitle] = useState(result?.title ?? '')
  const [meal, setMeal] = useState<Meal>(result?.meal ?? 'main')
  const [minutes, setMinutes] = useState(result?.minutes ?? 30)
  const [cards, setCards] = useState<RecipeCard[]>(result?.cards ?? [])
  const [maybeState, setMaybeState] = useState<Record<string, MaybeState>>(() =>
    Object.fromEntries((result?.ingredients ?? []).filter((i) => i.maybe).map((i) => [i.name, 'maybe' as MaybeState])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overCount = useMemo(() => cards.filter((c) => c.text.trim().length > CARD_MAX_CHARS).length, [cards])
  const keptIngredients = useMemo(
    () =>
      (result?.ingredients ?? []).filter((i) => {
        const state = maybeState[i.name]
        return !i.maybe || state === 'kept' || state === 'maybe'
      }),
    [result, maybeState],
  )

  if (!result) return <Navigate to="/add/paste" replace />

  const maybeCount = Object.values(maybeState).filter((s) => s === 'maybe').length
  const canSave = !!title.trim() && cards.some((c) => c.text.trim()) && overCount === 0 && !saving

  const cycleMaybe = (name: string) => {
    setMaybeState((prev) => ({
      ...prev,
      [name]: prev[name] === 'maybe' ? 'kept' : prev[name] === 'kept' ? 'dropped' : 'maybe',
    }))
  }

  const updateCard = (i: number, card: RecipeCard) => setCards(cards.map((c, j) => (j === i ? card : c)))
  const doSplit = (i: number) => {
    const [a, b] = splitCard(cards[i])
    setCards([...cards.slice(0, i), a, b, ...cards.slice(i + 1)])
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const filled = cards.filter((c) => c.text.trim())
      const recipe = await api.createRecipe(getProfileJwt, {
        title: title.trim(),
        meal,
        minutes,
        sourceType: result.source.type,
        sourceUrl: result.source.url,
        sourceAuthor: result.source.author,
        sourceDetail: result.source.detail,
        thumbUrl: result.source.thumbUrl,
        ingredients: keptIngredients
          .filter((i) => maybeState[i.name] !== 'dropped')
          .map((i) => ({ name: i.name, role: i.role, amount: i.amount ?? null })),
        cards: filled.map((c) => ({ text: c.text.trim(), ...(c.timer?.trim() ? { timer: c.timer.trim() } : {}) })),
        swaps: result.swaps,
        secondarySources: [],
      })
      navigate(`/recipe/${recipe.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  const filledCount = cards.filter((c) => c.text.trim()).length

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <TopBar
          left={<BackButton to="/add/paste" label="Cancel" />}
          right={
            <span className="eyebrow">
              {filledCount} card{filledCount === 1 ? '' : 's'}
            </span>
          }
        />
        <div className="page-col px-5 pb-8">
          <h1 className="h-display text-[clamp(34px,10vw,42px)]">Check the breakdown</h1>

          {(result.source.author || result.source.url || result.source.thumbUrl) && (
            <div className="flex gap-[13px] items-center bg-kraft-lift border border-rule p-3 mt-[18px]">
              {result.source.thumbUrl && (
                <img src={result.source.thumbUrl} alt="" aria-hidden className="w-[54px] h-[54px] flex-none object-cover border border-rule" />
              )}
              <div className="min-w-0">
                {result.source.author && (
                  <b className="font-display font-semibold text-[15px] block leading-[1.15] tracking-[-0.01em]">{result.source.author}</b>
                )}
                <em className="font-mono2 not-italic text-[10px] tracking-[0.1em] uppercase text-muted block mt-[5px] truncate">
                  {result.source.detail || result.source.url}
                </em>
              </div>
            </div>
          )}

          <div className="my-[26px]">
            <span className="tape mb-3.5">Call it</span>
            <input className="write outline-none !text-[22px] mt-1" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Recipe name" />
            <div className="flex gap-2 mt-3">
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
              <div className="flex items-center border border-rule px-2 gap-1.5">
                <button type="button" aria-label="Less time" onClick={() => setMinutes((v) => Math.max(5, v - 5))} className="font-mono2 px-1">
                  &minus;
                </button>
                <span className="font-mono2 text-[10.5px] uppercase whitespace-nowrap">{minutes} min</span>
                <button type="button" aria-label="More time" onClick={() => setMinutes((v) => Math.min(600, v + 5))} className="font-mono2 px-1">
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Ingredients found</span>
            <div className="flex flex-wrap gap-[5px] mt-2">
              {result.ingredients.map((ing) => {
                if (!ing.maybe) {
                  return <IngChip key={ing.name} name={ing.name} role={ing.role} amount={ing.amount ?? null} />
                }
                const state = maybeState[ing.name]
                if (state === 'dropped') {
                  return (
                    <button key={ing.name} type="button" className="ing ing-add line-through" onClick={() => cycleMaybe(ing.name)}>
                      {ing.name}
                    </button>
                  )
                }
                return (
                  <IngChip
                    key={ing.name}
                    name={ing.name}
                    role={ing.role}
                    amount={ing.amount ?? null}
                    maybe={state === 'maybe'}
                    onClick={() => cycleMaybe(ing.name)}
                  />
                )
              })}
            </div>
            {maybeCount > 0 && (
              <p className="mt-3 text-[14px] text-muted leading-normal">
                {maybeCount === 1 ? 'One was' : `${maybeCount} were`} only said in passing. Tap to keep or drop{' '}
                {maybeCount === 1 ? 'it' : 'them'}.
              </p>
            )}
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Cards</span>
            <div className="mt-2">
              {cards.map((card, i) => (
                <CardEditor
                  key={i}
                  index={i}
                  card={card}
                  onChange={(c) => updateCard(i, c)}
                  onSplit={() => doSplit(i)}
                  onRemove={cards.length > 1 ? () => setCards(cards.filter((_, j) => j !== i)) : undefined}
                />
              ))}
              <button type="button" className="addcard" onClick={() => setCards([...cards, { text: '' }])}>
                + One more card
              </button>
            </div>
          </div>

          {error && <p className="text-sear text-[14px] mb-4">{error}</p>}
        </div>
      </div>
      <SaveBar
        label={
          saving
            ? 'Saving…'
            : overCount > 0
              ? `${overCount} card${overCount === 1 ? ' is' : 's are'} over 140`
              : `Save ${filledCount} card${filledCount === 1 ? '' : 's'} to the box`
        }
        onClick={save}
        disabled={!canSave}
      />
    </section>
  )
}
