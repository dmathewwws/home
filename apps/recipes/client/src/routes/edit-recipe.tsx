/** Edit a recipe — fetches by id (refresh-safe) and reuses the manual-entry form prefilled. */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackButton, TopBar } from '../components/Chrome'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import type { RecipeFull } from '../lib/types'
import { RecipeForm } from './manual-entry'

export function EditRecipe() {
  const { id } = useParams<{ id: string }>()
  const { getProfileJwt } = useLocalFirstAuth()
  const [recipe, setRecipe] = useState<RecipeFull | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    api
      .getRecipe(getProfileJwt, id)
      .then((r) => !cancelled && setRecipe(r))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load'))
    return () => {
      cancelled = true
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

  return <RecipeForm initial={recipe} recipeId={recipe.id} />
}
