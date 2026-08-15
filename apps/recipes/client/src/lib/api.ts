/**
 * Typed API helpers. Every call — reads included — carries a profileJwt in
 * the body (the box is members-only), and every helper fetches a
 * FRESH JWT via getJwt() at call time: tokens expire in ~2 minutes, so a JWT
 * must never be threaded through a multi-step flow.
 */

import type {
  Ingredient,
  ParseVideoResult,
  RecipeDraft,
  RecipeFull,
  RecipeListItem,
  ReflectionDraft,
  ReflectionListItem,
} from './types'

export type GetJwt = () => Promise<string | undefined>

export class ApiError extends Error {
  status: number
  kind?: string
  constructor(message: string, status: number, kind?: string) {
    super(message)
    this.status = status
    this.kind = kind
  }
}

/** Thrown when there's no signed-in user to mint a JWT from. */
export class AuthNeededError extends Error {
  constructor() {
    super('Sign in first')
  }
}

const api = (path: string) => `${import.meta.env.BASE_URL}api/${path}`

async function post<T>(getJwt: GetJwt, path: string, body: Record<string, unknown> = {}): Promise<T> {
  const profileJwt = await getJwt()
  if (!profileJwt) throw new AuthNeededError()
  const res = await fetch(api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, profileJwt }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new ApiError(
      typeof data.error === 'string' ? data.error : `Request failed (${res.status})`,
      res.status,
      typeof data.kind === 'string' ? data.kind : undefined,
    )
  }
  return data as T
}

export const listRecipes = (getJwt: GetJwt) =>
  post<{ recipes: RecipeListItem[] }>(getJwt, 'recipes/list').then((r) => r.recipes)

export const getRecipe = (getJwt: GetJwt, id: string) =>
  post<{ recipe: RecipeFull }>(getJwt, `recipes/${id}/get`).then((r) => r.recipe)

export const createRecipe = (getJwt: GetJwt, recipe: RecipeDraft) =>
  post<{ recipe: RecipeFull }>(getJwt, 'recipes', { recipe }).then((r) => r.recipe)

export const updateRecipe = (getJwt: GetJwt, id: string, recipe: RecipeDraft) =>
  post<{ recipe: RecipeFull }>(getJwt, `recipes/${id}/update`, { recipe }).then((r) => r.recipe)

export const deleteRecipe = (getJwt: GetJwt, id: string) =>
  post<{ success: boolean }>(getJwt, `recipes/${id}/delete`)

export const searchIngredients = (getJwt: GetJwt, q: string) =>
  post<{ ingredients: Ingredient[] }>(getJwt, 'ingredients/search', { q }).then((r) => r.ingredients)

export const frequentIngredients = (getJwt: GetJwt) =>
  post<{ ingredients: Ingredient[] }>(getJwt, 'ingredients/frequent').then((r) => r.ingredients)

export const parseVideo = (getJwt: GetJwt, url: string) =>
  post<ParseVideoResult>(getJwt, 'parse-video', { url })

export const listReflections = (getJwt: GetJwt) =>
  post<{ reflections: ReflectionListItem[] }>(getJwt, 'reflections/list').then((r) => r.reflections)

export const createReflection = (getJwt: GetJwt, reflection: ReflectionDraft) =>
  post<{ reflection: ReflectionListItem }>(getJwt, 'reflections', { reflection }).then((r) => r.reflection)

export const deleteReflection = (getJwt: GetJwt, id: string) =>
  post<{ success: boolean }>(getJwt, `reflections/${id}/delete`)

export const requestUpload = (getJwt: GetJwt) =>
  post<{ photoId: string; fullUrl: string; thumbUrl: string }>(getJwt, 'request-upload')

/** Photo URL from its id — keys live in D1, URLs are derived here. */
export const imgUrl = (photoId: string, size: 'full' | 'thumb') =>
  api(`img/photos/${photoId}/${size}.jpg`)
