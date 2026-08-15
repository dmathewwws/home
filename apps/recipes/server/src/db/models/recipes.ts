/**
 * Recipe model — recipes with joined ingredient chips, live times-cooked
 * tallies (count of reflections; no drift-prone counter column), and the
 * latest reflection surfaced as the detail screen's "Last time" note.
 */

import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type { Database } from '../client.js'
import {
  recipes,
  recipeIngredients,
  ingredients,
  reflections,
  type Recipe,
  type RecipeCard,
  type RecipeSwap,
  type Meal,
  type SourceType,
  type IngredientRole,
} from '../schema.js'
import { resolveOrCreateIngredients } from './ingredients.js'

export type { Recipe }

export interface RecipeChip {
  id: string
  name: string
  role: IngredientRole
  amount: string | null
}

export interface RecipeListItem {
  id: string
  title: string
  meal: Meal
  minutes: number
  sourceType: SourceType
  sourceUrl: string | null
  sourceAuthor: string | null
  sourceDetail: string | null
  thumbUrl: string | null
  createdBy: string
  createdAt: Date
  ingredients: RecipeChip[]
  timesCooked: number
  lastCookedAt: Date | null
}

export interface RecipeFull extends RecipeListItem {
  cards: RecipeCard[]
  swaps: RecipeSwap[]
  lastReflection: {
    cookedAt: Date
    rep: number
    changeNextTime: string | null
    note: string | null
  } | null
}

export interface RecipeIngredientInput {
  ingredientId?: string
  name?: string
  role?: IngredientRole
  amount?: string | null
}

export interface RecipeInput {
  title: string
  meal: Meal
  minutes: number
  sourceType: SourceType
  sourceUrl?: string | null
  sourceAuthor?: string | null
  sourceDetail?: string | null
  thumbUrl?: string | null
  ingredients: RecipeIngredientInput[]
  cards: RecipeCard[]
  swaps: RecipeSwap[]
}

async function chipsForRecipes(db: Database, recipeIds: string[]): Promise<Map<string, RecipeChip[]>> {
  const map = new Map<string, RecipeChip[]>()
  if (recipeIds.length === 0) return map
  const rows = await db
    .select({
      recipeId: recipeIngredients.recipeId,
      id: ingredients.id,
      name: ingredients.name,
      role: ingredients.role,
      amount: recipeIngredients.amount,
      position: recipeIngredients.position,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
    .where(inArray(recipeIngredients.recipeId, recipeIds))
    .orderBy(asc(recipeIngredients.position))
  for (const row of rows) {
    const chips = map.get(row.recipeId) ?? []
    chips.push({ id: row.id, name: row.name, role: row.role, amount: row.amount })
    map.set(row.recipeId, chips)
  }
  return map
}

async function cookStats(db: Database, recipeIds: string[]): Promise<Map<string, { timesCooked: number; lastCookedAt: Date | null }>> {
  const map = new Map<string, { timesCooked: number; lastCookedAt: Date | null }>()
  if (recipeIds.length === 0) return map
  const rows = await db
    .select({
      recipeId: reflections.recipeId,
      timesCooked: sql<number>`count(*)`,
      lastCookedAt: sql<number>`max(${reflections.cookedAt})`,
    })
    .from(reflections)
    .where(and(isNotNull(reflections.recipeId), inArray(reflections.recipeId, recipeIds)))
    .groupBy(reflections.recipeId)
  for (const row of rows) {
    if (!row.recipeId) continue
    map.set(row.recipeId, {
      timesCooked: row.timesCooked,
      lastCookedAt: row.lastCookedAt ? new Date(row.lastCookedAt * 1000) : null,
    })
  }
  return map
}

function toListItem(
  recipe: Recipe,
  chips: RecipeChip[],
  stats: { timesCooked: number; lastCookedAt: Date | null } | undefined,
): RecipeListItem {
  return {
    id: recipe.id,
    title: recipe.title,
    meal: recipe.meal,
    minutes: recipe.minutes,
    sourceType: recipe.sourceType,
    sourceUrl: recipe.sourceUrl,
    sourceAuthor: recipe.sourceAuthor,
    sourceDetail: recipe.sourceDetail,
    thumbUrl: recipe.thumbUrl,
    createdBy: recipe.createdBy,
    createdAt: recipe.createdAt,
    ingredients: chips,
    timesCooked: stats?.timesCooked ?? 0,
    lastCookedAt: stats?.lastCookedAt ?? null,
  }
}

/**
 * All recipes, newest first, with chips and tally counts.
 */
export async function listRecipes(db: Database): Promise<RecipeListItem[]> {
  const rows = await db.select().from(recipes).orderBy(desc(recipes.createdAt)).limit(1000)
  const ids = rows.map((r) => r.id)
  const [chips, stats] = await Promise.all([chipsForRecipes(db, ids), cookStats(db, ids)])
  return rows.map((r) => toListItem(r, chips.get(r.id) ?? [], stats.get(r.id)))
}

/**
 * One recipe with cards, swaps, and the latest reflection ("Last time" note).
 */
export async function getRecipeFull(db: Database, id: string): Promise<RecipeFull | undefined> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1)
  if (!recipe) return undefined
  const [chips, stats, [latest]] = await Promise.all([
    chipsForRecipes(db, [id]),
    cookStats(db, [id]),
    db
      .select()
      .from(reflections)
      .where(eq(reflections.recipeId, id))
      .orderBy(desc(reflections.cookedAt))
      .limit(1),
  ])
  return {
    ...toListItem(recipe, chips.get(id) ?? [], stats.get(id)),
    cards: JSON.parse(recipe.cards) as RecipeCard[],
    swaps: JSON.parse(recipe.swaps) as RecipeSwap[],
    lastReflection: latest
      ? {
          cookedAt: latest.cookedAt,
          rep: latest.rep,
          changeNextTime: latest.changeNextTime,
          note: latest.note,
        }
      : null,
  }
}

export async function getRecipeById(db: Database, id: string): Promise<Recipe | undefined> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1)
  return recipe
}

/**
 * Resolve ingredient inputs ({ingredientId} or {name, role}) to catalog rows,
 * creating missing ones, and return join-row values in input order.
 */
async function resolveJoinRows(
  db: Database,
  recipeId: string,
  inputs: RecipeIngredientInput[],
): Promise<Array<{ recipeId: string; ingredientId: string; amount: string | null; position: number }>> {
  const byName = await resolveOrCreateIngredients(
    db,
    inputs
      .filter((i): i is { name: string; role: IngredientRole; amount?: string | null } => !i.ingredientId && !!i.name && !!i.role)
      .map((i) => ({ name: i.name, role: i.role })),
  )
  const rows: Array<{ recipeId: string; ingredientId: string; amount: string | null; position: number }> = []
  const seen = new Set<string>()
  for (const input of inputs) {
    const ingredientId = input.ingredientId ?? byName.get(input.name!.toLowerCase())?.id
    if (!ingredientId || seen.has(ingredientId)) continue
    seen.add(ingredientId)
    rows.push({ recipeId, ingredientId, amount: input.amount ?? null, position: rows.length })
  }
  return rows
}

/**
 * Create a recipe with its ingredient join rows in one batch (D1 has no
 * interactive transactions).
 */
export async function createRecipe(db: Database, createdBy: string, input: RecipeInput): Promise<RecipeFull> {
  const id = crypto.randomUUID()
  const joinRows = await resolveJoinRows(db, id, input.ingredients)
  const insertRecipe = db.insert(recipes).values({
    id,
    title: input.title.trim(),
    meal: input.meal,
    minutes: input.minutes,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl ?? null,
    sourceAuthor: input.sourceAuthor ?? null,
    sourceDetail: input.sourceDetail ?? null,
    thumbUrl: input.thumbUrl ?? null,
    cards: JSON.stringify(input.cards),
    swaps: JSON.stringify(input.swaps),
    createdBy,
  })
  if (joinRows.length > 0) {
    await db.batch([insertRecipe, db.insert(recipeIngredients).values(joinRows)])
  } else {
    await insertRecipe
  }
  return (await getRecipeFull(db, id))!
}

/**
 * Replace a recipe's fields and join rows in one batch.
 */
export async function updateRecipe(db: Database, id: string, input: RecipeInput): Promise<RecipeFull | undefined> {
  const existing = await getRecipeById(db, id)
  if (!existing) return undefined
  const joinRows = await resolveJoinRows(db, id, input.ingredients)
  const statements = [
    db
      .update(recipes)
      .set({
        title: input.title.trim(),
        meal: input.meal,
        minutes: input.minutes,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl ?? null,
        sourceAuthor: input.sourceAuthor ?? null,
        sourceDetail: input.sourceDetail ?? null,
        thumbUrl: input.thumbUrl ?? null,
        cards: JSON.stringify(input.cards),
        swaps: JSON.stringify(input.swaps),
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(recipes.id, id)),
    db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id)),
  ] as const
  if (joinRows.length > 0) {
    await db.batch([...statements, db.insert(recipeIngredients).values(joinRows)])
  } else {
    await db.batch([...statements])
  }
  return await getRecipeFull(db, id)
}

/**
 * Delete a recipe. Join rows cascade; reflections keep their title snapshot
 * (recipe_id goes NULL).
 */
export async function deleteRecipe(db: Database, id: string): Promise<void> {
  await db.delete(recipes).where(eq(recipes.id, id))
}
