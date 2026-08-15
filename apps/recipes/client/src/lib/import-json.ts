/**
 * Parse/validate the JSON pasted from an external import tool into an
 * ImportDraft. The contract lives in docs/recipe-import-spec.md; limits
 * mirror server/src/validation.ts (which stays authoritative at save time).
 * One deliberate exception: card text MAY exceed 140 characters here — the
 * review screen's "Split in two" flow fixes it before the save gate.
 */

import {
  INGREDIENT_ROLES,
  MEALS,
  type ImportDraft,
  type ImportIngredient,
  type ImportSource,
  type IngredientRole,
  type Meal,
  type RecipeCard,
  type RecipeSwap,
  type SourceType,
} from './types'

const SOURCE_TYPES = ['video', 'book', 'notes'] as const
const MAX_INPUT_BYTES = 100_000
const TITLE_MAX = 200
const URL_MAX = 500
const MAX_CARDS = 24
const MAX_INGREDIENTS = 40
const MAX_SWAPS = 12

export class ImportJsonError extends Error {}

function fail(message: string): never {
  throw new ImportJsonError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown, field: string, max: number): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') fail(`${field} must be a string`)
  const trimmed = value.trim()
  if (trimmed.length > max) fail(`${field} is too long (max ${max} characters)`)
  return trimmed || null
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    fail(`${field} must be one of: ${allowed.join(', ')}`)
  }
  return value as T
}

/** Strip a Markdown code fence (```json … ```) — LLM output often arrives wrapped. */
function stripFences(raw: string): string {
  const trimmed = raw.trim()
  const fenced = /^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?```$/.exec(trimmed)
  return fenced ? fenced[1].trim() : trimmed
}

export function parseImportJson(raw: string): ImportDraft {
  const text = stripFences(raw)
  if (!text) fail('Paste the JSON first')
  if (text.length > MAX_INPUT_BYTES) fail('That paste is too big — expected a single recipe document')

  let doc: unknown
  try {
    doc = JSON.parse(text)
  } catch {
    fail("That's not valid JSON — paste the whole document, curly braces and all")
  }
  if (!isRecord(doc)) fail('The JSON must be a single object, not a list or a bare value')

  if (typeof doc.title !== 'string' || !doc.title.trim()) fail('title is required')
  const title = doc.title.trim()
  if (title.length > TITLE_MAX) fail(`title is too long (max ${TITLE_MAX} characters)`)

  const meal: Meal = doc.meal == null ? 'main' : oneOf(doc.meal, MEALS, 'meal')

  let minutes = 30
  if (doc.minutes != null) {
    if (!Number.isInteger(doc.minutes) || (doc.minutes as number) < 1 || (doc.minutes as number) > 6000) {
      fail('minutes must be a whole number between 1 and 6000')
    }
    minutes = doc.minutes as number
  }

  let source: ImportSource = { type: 'notes', url: null, author: null, detail: null, thumbUrl: null }
  if (doc.source != null) {
    if (!isRecord(doc.source)) fail('source must be an object')
    const type: SourceType = doc.source.type == null ? 'video' : oneOf(doc.source.type, SOURCE_TYPES, 'source.type')
    source = {
      type,
      url: optionalString(doc.source.url, 'source.url', URL_MAX),
      author: optionalString(doc.source.author, 'source.author', TITLE_MAX),
      detail: optionalString(doc.source.detail, 'source.detail', TITLE_MAX),
      thumbUrl: optionalString(doc.source.thumbUrl, 'source.thumbUrl', URL_MAX),
    }
  }

  const ingredientsRaw = doc.ingredients ?? []
  if (!Array.isArray(ingredientsRaw)) fail('ingredients must be an array')
  if (ingredientsRaw.length > MAX_INGREDIENTS) fail(`Too many ingredients (max ${MAX_INGREDIENTS})`)
  const seenNames = new Set<string>()
  const ingredients: ImportIngredient[] = ingredientsRaw.map((ing, i) => {
    if (!isRecord(ing)) fail(`ingredients[${i}] must be an object`)
    if (typeof ing.name !== 'string' || !ing.name.trim()) fail(`ingredients[${i}].name is required`)
    const name = ing.name.trim()
    if (name.length > 80) fail(`ingredients[${i}].name is too long (max 80 characters)`)
    // The review screen keys its keep/drop state by name — duplicates would collide
    if (seenNames.has(name.toLowerCase())) fail(`ingredients[${i}] "${name}" appears more than once`)
    seenNames.add(name.toLowerCase())
    const role: IngredientRole = oneOf(ing.role, INGREDIENT_ROLES, `ingredients[${i}].role`)
    if (ing.maybe != null && typeof ing.maybe !== 'boolean') fail(`ingredients[${i}].maybe must be true or false`)
    return {
      name,
      role,
      amount: optionalString(ing.amount, `ingredients[${i}].amount`, 60),
      maybe: ing.maybe === true,
    }
  })

  if (!Array.isArray(doc.cards) || doc.cards.length === 0) fail('cards is required — at least one step card')
  if (doc.cards.length > MAX_CARDS) fail(`Too many cards (max ${MAX_CARDS})`)
  const cards: RecipeCard[] = doc.cards.map((card, i) => {
    if (!isRecord(card) || typeof card.text !== 'string' || !card.text.trim()) {
      fail(`cards[${i}].text is required`)
    }
    const timer = optionalString(card.timer, `cards[${i}].timer`, 40)
    return timer ? { text: card.text.trim(), timer } : { text: card.text.trim() }
  })

  const swapsRaw = doc.swaps ?? []
  if (!Array.isArray(swapsRaw)) fail('swaps must be an array')
  if (swapsRaw.length > MAX_SWAPS) fail(`Too many swaps (max ${MAX_SWAPS})`)
  const swaps: RecipeSwap[] = swapsRaw.map((swap, i) => {
    if (!isRecord(swap) || typeof swap.ingredient !== 'string' || !swap.ingredient.trim()) {
      fail(`swaps[${i}].ingredient is required`)
    }
    if (typeof swap.replacement !== 'string' || !swap.replacement.trim()) {
      fail(`swaps[${i}].replacement is required`)
    }
    const ingredient = swap.ingredient.trim()
    const replacement = swap.replacement.trim()
    if (ingredient.length > 80) fail(`swaps[${i}].ingredient is too long (max 80 characters)`)
    if (replacement.length > 200) fail(`swaps[${i}].replacement is too long (max 200 characters)`)
    return { ingredient, replacement }
  })

  return { title, meal, minutes, source, ingredients, cards, swaps }
}

/** Compact format reminder for the "Copy the format" button. */
export const IMPORT_FORMAT_SNIPPET = `{
  "title": "Crispy chilli tofu",
  "meal": "main | snack | sauce | salad | dessert",
  "minutes": 25,
  "source": {
    "type": "video | book | notes",
    "url": "https://www.youtube.com/watch?v=…",
    "author": "Channel Name",
    "detail": "12:34",
    "thumbUrl": "https://i.ytimg.com/vi/…/hqdefault.jpg"
  },
  "ingredients": [
    { "name": "Firm tofu", "role": "protein | aromatic | produce | pantry", "amount": "400g", "maybe": false }
  ],
  "cards": [
    { "text": "One step, imperative voice, 140 characters or fewer.", "timer": "10 min" }
  ],
  "swaps": [
    { "ingredient": "Honey", "replacement": "Maple syrup" }
  ]
}`
