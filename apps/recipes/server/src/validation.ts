/**
 * Input validation for recipe and reflection writes. The 140-character card
 * rule is enforced here — authoritatively — as well as in the client editors
 * and the import parser prompt. Parse *results* may exceed 140 (that's what
 * the review screen's "Split in two" is for); saves may not.
 */

import {
  MEALS,
  SOURCE_TYPES,
  INGREDIENT_ROLES,
  VERDICTS,
  type RecipeCard,
  type RecipeSwap,
  type RecipeSource,
  type RecipeVariation,
} from './db/schema'
import type { RecipeInput, RecipeIngredientInput } from './db/models/recipes'
import type { ReflectionInput } from './db/models/reflections'
import type { DishInput } from './db/models/dishes'

export const CARD_MAX_CHARS = 140
const TITLE_MAX = 200
const TEXT_MAX = 2000
const MAX_CARDS = 24
const MAX_INGREDIENTS = 40
const MAX_SWAPS = 12
const MAX_SOURCES = 6
const MAX_VARIATIONS = 12
const VARIATION_NAME_MAX = 40

export class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalTrimmed(value: unknown, field: string, max = TITLE_MAX): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') fail(`${field} must be a string`)
  const trimmed = value.trim()
  if (trimmed.length > max) fail(`${field} is too long (max ${max} characters)`)
  return trimmed || null
}

export function validateRecipeInput(raw: unknown): RecipeInput {
  if (!isRecord(raw)) fail('recipe must be an object')

  if (typeof raw.title !== 'string' || !raw.title.trim()) fail('Recipe needs a title')
  if (raw.title.trim().length > TITLE_MAX) fail(`Title is too long (max ${TITLE_MAX} characters)`)

  if (typeof raw.meal !== 'string' || !(MEALS as readonly string[]).includes(raw.meal)) {
    fail(`meal must be one of: ${MEALS.join(', ')}`)
  }
  if (!Number.isInteger(raw.minutes) || (raw.minutes as number) < 1 || (raw.minutes as number) > 6000) {
    fail('minutes must be a positive integer')
  }
  if (typeof raw.sourceType !== 'string' || !(SOURCE_TYPES as readonly string[]).includes(raw.sourceType)) {
    fail(`sourceType must be one of: ${SOURCE_TYPES.join(', ')}`)
  }

  if (!Array.isArray(raw.cards) || raw.cards.length === 0) fail('Recipe needs at least one card')
  if (raw.cards.length > MAX_CARDS) fail(`Too many cards (max ${MAX_CARDS})`)
  const cards: RecipeCard[] = raw.cards.map((card, i) => {
    if (!isRecord(card) || typeof card.text !== 'string' || !card.text.trim()) {
      fail(`Card ${i + 1} needs text`)
    }
    const text = card.text.trim()
    if (text.length > CARD_MAX_CHARS) {
      fail(`Card ${i + 1} is ${text.length} characters — the limit is ${CARD_MAX_CHARS}. Split it in two.`)
    }
    const timer = optionalTrimmed(card.timer, `Card ${i + 1} timer`, 40)
    return timer ? { text, timer } : { text }
  })

  if (!Array.isArray(raw.ingredients)) fail('ingredients must be an array')
  if (raw.ingredients.length > MAX_INGREDIENTS) fail(`Too many ingredients (max ${MAX_INGREDIENTS})`)
  const ingredientInputs: RecipeIngredientInput[] = raw.ingredients.map((ing, i) => {
    if (!isRecord(ing)) fail(`Ingredient ${i + 1} must be an object`)
    const amount = optionalTrimmed(ing.amount, `Ingredient ${i + 1} amount`, 60)
    if (typeof ing.ingredientId === 'string' && ing.ingredientId) {
      return { ingredientId: ing.ingredientId, amount }
    }
    if (typeof ing.name !== 'string' || !ing.name.trim()) fail(`Ingredient ${i + 1} needs a name`)
    if (ing.name.trim().length > 80) fail(`Ingredient ${i + 1} name is too long`)
    if (typeof ing.role !== 'string' || !(INGREDIENT_ROLES as readonly string[]).includes(ing.role)) {
      fail(`Ingredient ${i + 1} role must be one of: ${INGREDIENT_ROLES.join(', ')}`)
    }
    return { name: ing.name.trim(), role: ing.role as RecipeIngredientInput['role'], amount }
  })

  const swapsRaw = raw.swaps ?? []
  if (!Array.isArray(swapsRaw)) fail('swaps must be an array')
  if (swapsRaw.length > MAX_SWAPS) fail(`Too many swaps (max ${MAX_SWAPS})`)
  const swaps: RecipeSwap[] = swapsRaw.map((swap, i) => {
    if (!isRecord(swap) || typeof swap.ingredient !== 'string' || !swap.ingredient.trim()) {
      fail(`Swap ${i + 1} needs the ingredient you're out of`)
    }
    if (typeof swap.replacement !== 'string' || !swap.replacement.trim()) {
      fail(`Swap ${i + 1} needs a replacement`)
    }
    return { ingredient: swap.ingredient.trim().slice(0, 80), replacement: swap.replacement.trim().slice(0, 200) }
  })

  const variationsRaw = raw.variations ?? []
  if (!Array.isArray(variationsRaw)) fail('variations must be an array')
  if (variationsRaw.length > MAX_VARIATIONS) fail(`Too many variations (max ${MAX_VARIATIONS})`)
  const variations: RecipeVariation[] = variationsRaw.map((variation, i) => {
    if (!isRecord(variation) || typeof variation.name !== 'string' || !variation.name.trim()) {
      fail(`Variation ${i + 1} needs a name`)
    }
    const detail = typeof variation.detail === 'string' ? variation.detail.trim() : ''
    return { name: variation.name.trim().slice(0, VARIATION_NAME_MAX), detail: detail.slice(0, 200) }
  })

  const notesRaw = raw.notes ?? ''
  if (typeof notesRaw !== 'string') fail('notes must be text')
  const notes = notesRaw.trim().slice(0, TEXT_MAX)

  const sourcesRaw = raw.sources ?? []
  if (!Array.isArray(sourcesRaw)) fail('sources must be an array')
  if (sourcesRaw.length > MAX_SOURCES) fail(`Too many sources (max ${MAX_SOURCES})`)
  const sources: RecipeSource[] = sourcesRaw.map((source, i) => {
    if (!isRecord(source) || typeof source.url !== 'string' || !source.url.trim()) {
      fail(`Source ${i + 1} needs a link`)
    }
    const url = source.url.trim().slice(0, 500)
    const label = optionalTrimmed(source.label, `Source ${i + 1} label`, 200)
    return label ? { url, label } : { url }
  })

  return {
    title: (raw.title as string).trim(),
    meal: raw.meal as RecipeInput['meal'],
    minutes: raw.minutes as number,
    sourceType: raw.sourceType as RecipeInput['sourceType'],
    sourceUrl: optionalTrimmed(raw.sourceUrl, 'sourceUrl', 500),
    sourceAuthor: optionalTrimmed(raw.sourceAuthor, 'sourceAuthor'),
    sourceDetail: optionalTrimmed(raw.sourceDetail, 'sourceDetail'),
    thumbUrl: optionalTrimmed(raw.thumbUrl, 'thumbUrl', 500),
    ingredients: ingredientInputs,
    cards,
    swaps,
    variations,
    notes,
    sources,
  }
}

export function validateReflectionInput(raw: unknown): ReflectionInput {
  if (!isRecord(raw)) fail('reflection must be an object')
  if (typeof raw.recipeId !== 'string' || !raw.recipeId) fail('Pick a recipe first')
  if (typeof raw.verdict !== 'string' || !(VERDICTS as readonly string[]).includes(raw.verdict)) {
    fail(`verdict must be one of: ${VERDICTS.join(', ')}`)
  }
  let minutes: number | null = null
  if (raw.minutes != null) {
    if (!Number.isInteger(raw.minutes) || (raw.minutes as number) < 1 || (raw.minutes as number) > 6000) {
      fail('minutes must be a positive integer')
    }
    minutes = raw.minutes as number
  }
  return {
    recipeId: raw.recipeId,
    verdict: raw.verdict as ReflectionInput['verdict'],
    note: optionalTrimmed(raw.note, 'note', TEXT_MAX),
    changeNextTime: optionalTrimmed(raw.changeNextTime, 'changeNextTime', 500),
    variation: optionalTrimmed(raw.variation, 'variation', VARIATION_NAME_MAX),
    minutes,
    photoId: optionalTrimmed(raw.photoId, 'photoId', 60),
  }
}

export function validateDishInput(raw: unknown): DishInput {
  if (!isRecord(raw)) fail('dish must be an object')
  if (typeof raw.name !== 'string' || !raw.name.trim()) fail('The dish needs a name')
  if (raw.name.trim().length > 120) fail('Dish name is too long (max 120 characters)')
  return {
    name: raw.name.trim(),
    place: optionalTrimmed(raw.place, 'place', 120),
    note: optionalTrimmed(raw.note, 'note', TEXT_MAX),
    photoId: optionalTrimmed(raw.photoId, 'photoId', 60),
  }
}
