import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton, TopBar } from '../components/Chrome'
import { IngChip } from '../components/IngChip'
import { TallyMarks } from '../components/TallyMarks'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { MEAL_LABELS, dayMonth, seedFromId } from '../lib/format'
import type { RecipeFull } from '../lib/types'

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, getProfileJwt, subscribeToEvents } = useLocalFirstAuth()
  const [recipe, setRecipe] = useState<RecipeFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = () =>
      api
        .getRecipe(getProfileJwt, id)
        .then((r) => !cancelled && setRecipe(r))
        .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load'))
    load()
    const unsubscribe = subscribeToEvents((type, data) => {
      const affected = (data ?? {}) as { id?: string; recipeId?: string }
      if (type.startsWith('reflection-') && affected.recipeId === id) load()
      if (type === 'recipe-updated' && affected.id === id) load()
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) {
    return (
      <section className="flex-1 flex flex-col">
        <TopBar left={<BackButton to="/" label="Recipe Box" />} />
        <p className="page-col px-5 text-sear text-[14px]">{error}</p>
      </section>
    )
  }
  if (!recipe) {
    return (
      <section className="flex-1 flex flex-col">
        <TopBar left={<BackButton to="/" label="Recipe Box" />} />
        <p className="page-col px-5 eyebrow">Opening the card&hellip;</p>
      </section>
    )
  }

  const canDelete = user && (user.isAdmin || user.did === recipe.createdBy)
  const swapNames = new Set(recipe.swaps.map((s) => s.ingredient.toLowerCase()))

  const handleDelete = async () => {
    try {
      await api.deleteRecipe(getProfileJwt, recipe.id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <section className="flex-1 overflow-y-auto">
      <TopBar
        left={<BackButton to="/" label="Recipe Box" />}
        right={
          <span className="eyebrow">
            {MEAL_LABELS[recipe.meal]} &middot; {recipe.minutes} min
          </span>
        }
      />
      <div className="page-col px-5 pb-16">
        <h1 className="h-display text-[clamp(34px,10vw,42px)]">{recipe.title}</h1>
        {recipe.sourceType === 'video' && recipe.sourceUrl ? (
          <a className="mono-link inline-block mt-3.5" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
            Youtube{recipe.sourceAuthor ? ` · ${recipe.sourceAuthor}` : ''}
            {recipe.sourceDetail ? ` · ${recipe.sourceDetail}` : ''} &rarr;
          </a>
        ) : (
          <div className="rec-meta mt-3.5">
            <span className={recipe.sourceType === 'book' ? 'src src-book' : 'src src-mine'} />
            {recipe.sourceType === 'book'
              ? `${recipe.sourceAuthor ?? 'Book'}${recipe.sourceDetail ? ` · ${recipe.sourceDetail}` : ''}`
              : `My notes${recipe.sourceDetail ? ` · ${recipe.sourceDetail}` : ''}`}
          </div>
        )}
        <div className="flex items-center gap-2.5 mt-4 mb-1">
          {recipe.timesCooked > 0 ? (
            <>
              <span className="reps">Cooked</span>
              <TallyMarks count={recipe.timesCooked} seed={seedFromId(recipe.id)} className="text-ink" />
              {recipe.lastCookedAt && (
                <span className="meal-tag ml-auto">Last cooked {dayMonth(recipe.lastCookedAt)}</span>
              )}
            </>
          ) : (
            <span className="reps">Never cooked</span>
          )}
        </div>

        <div className="my-[26px]">
          <div className="flex flex-wrap gap-[5px]">
            {recipe.ingredients.map((chip) => (
              <IngChip
                key={chip.id}
                name={chip.name}
                role={chip.role}
                amount={chip.amount}
                swap={swapNames.has(chip.name.toLowerCase())}
              />
            ))}
          </div>
        </div>

        <div className="my-[26px]">
          <ol className="list-none m-0 p-0">
            {recipe.cards.map((card, i) => (
              <li key={i} className="flex gap-3.5 py-4 border-b border-dashed border-rule last:border-b-0">
                <span className="font-mono2 text-[11px] text-yolk flex-none pt-[5px] tracking-[0.06em]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-[16.5px] leading-[1.42]">{card.text}</p>
                  {card.timer && (
                    <span className="inline-block mt-[9px] font-mono2 text-[10px] tracking-[0.12em] uppercase border border-ink px-2 py-[3px]">
                      {card.timer}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {recipe.swaps.length > 0 && (
          <div className="my-[26px] border-t border-rule pt-[13px]">
            <em className="eyebrow not-italic !text-[10px] block mb-2">If you're out</em>
            {recipe.swaps.map((swap, i) => (
              <div key={i} className="flex gap-[9px] items-baseline py-1 text-[14.5px]">
                <s className="font-mono2 text-[11px] text-muted no-underline">{swap.ingredient}</s>
                <span>{swap.replacement}</span>
              </div>
            ))}
          </div>
        )}

        {recipe.secondarySources.length > 0 && (
          <div className="my-[26px] border-t border-rule pt-[13px]">
            <em className="eyebrow not-italic !text-[10px] block mb-2">Also see</em>
            {recipe.secondarySources.map((source, i) => (
              <div key={i} className="py-1.5">
                <a className="mono-link" href={source.url} target="_blank" rel="noreferrer">
                  {source.label} &rarr;
                </a>
                {source.notes && (
                  <p className="pl-3.5 pt-1 text-[14.5px] leading-[1.42] whitespace-pre-line">
                    {source.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 border-t border-rule pt-4 flex items-center gap-5">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-[14px] text-sear">Take it out of the box for everyone?</span>
              <button type="button" className="chip !text-sear !border-sear" onClick={handleDelete}>
                Yes, remove
              </button>
              <button type="button" className="chip" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="eyebrow underline underline-offset-2"
                onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
              >
                Edit this recipe
              </button>
              {canDelete && (
                <button type="button" className="eyebrow underline underline-offset-2" onClick={() => setConfirmDelete(true)}>
                  Remove from the box
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
