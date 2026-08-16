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
  type RecipeSecondarySource,
} from './db/schema'
import type { RecipeInput, RecipeIngredientInput } from './db/models/recipes'
import type { ReflectionInput } from './db/models/reflections'

export const CARD_MAX_CHARS = 140
const TITLE_MAX = 200
const TEXT_MAX = 2000
const MAX_CARDS = 24
const MAX_INGREDIENTS = 40
const MAX_SWAPS = 12
const MAX_SECONDARY_SOURCES = 6
const MAX_SOURCE_NOTES = 8

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

  const secondaryRaw = raw.secondarySources ?? []
  if (!Array.isArray(secondaryRaw)) fail('secondarySources must be an array')
  if (secondaryRaw.length > MAX_SECONDARY_SOURCES) fail(`Too many secondary sources (max ${MAX_SECONDARY_SOURCES})`)
  const secondarySources: RecipeSecondarySource[] = secondaryRaw.map((source, i) => {
    if (!isRecord(source) || typeof source.url !== 'string' || !source.url.trim()) {
      fail(`Secondary source ${i + 1} needs a link`)
    }
    if (typeof source.label !== 'string' || !source.label.trim()) {
      fail(`Secondary source ${i + 1} needs a label (who it's from)`)
    }
    const notesRaw = source.notes ?? []
    if (!Array.isArray(notesRaw)) fail(`Secondary source ${i + 1} notes must be an array`)
    if (notesRaw.length > MAX_SOURCE_NOTES) fail(`Secondary source ${i + 1} has too many notes (max ${MAX_SOURCE_NOTES})`)
    const notes = notesRaw.map((note, j) => {
      if (typeof note !== 'string' || !note.trim()) fail(`Secondary source ${i + 1} note ${j + 1} needs text`)
      return note.trim().slice(0, 200)
    })
    return { url: source.url.trim().slice(0, 500), label: source.label.trim().slice(0, 200), notes }
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
    secondarySources,
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
    minutes,
    photoId: optionalTrimmed(raw.photoId, 'photoId', 60),
  }
}
