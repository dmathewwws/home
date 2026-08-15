/** Small formatting helpers used across screens. */

import type { RecipeListItem } from './types'

/** "Fri 8 Aug" */
export function shortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "6 Aug" */
export function dayMonth(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** 724 → "12:04" */
export function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Stable small hash for tally-mark jitter seeds. */
export function seedFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) & 0xffff
  }
  return h + 3
}

/** Query split into lowercase terms; empty query → no terms (matches everything). */
export function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Every term must hit the title or some ingredient name (AND across terms,
 * OR across fields), so "chicken rice" narrows rather than widens.
 */
export function recipeMatches(recipe: RecipeListItem, terms: string[]): boolean {
  if (terms.length === 0) return true
  const title = recipe.title.toLowerCase()
  const names = recipe.ingredients.map((i) => i.name.toLowerCase())
  return terms.every((term) => title.includes(term) || names.some((name) => name.includes(term)))
}

/** Meal value → display label. */
export const MEAL_LABELS: Record<string, string> = {
  main: 'Main',
  snack: 'Snack',
  sauce: 'Sauce',
  salad: 'Salad',
  dessert: 'Dessert',
}
