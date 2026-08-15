/**
 * Ingredient catalog model — powers the picker's search, "add as new"
 * dedupe, and the "You use these a lot" frequent tray.
 */

import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../client.js'
import { ingredients, recipeIngredients, type Ingredient, type IngredientRole } from '../schema.js'

export type { Ingredient }

/**
 * Case-insensitive substring search over the catalog.
 */
export async function searchIngredients(db: Database, q: string, limit = 12): Promise<Ingredient[]> {
  const needle = `%${q.toLowerCase()}%`
  return await db
    .select()
    .from(ingredients)
    .where(sql`lower(${ingredients.name}) LIKE ${needle}`)
    .orderBy(asc(ingredients.name))
    .limit(limit)
}

/**
 * Most-used ingredients across all recipes, padded with unused catalog
 * staples when the box is young.
 */
export async function frequentIngredients(db: Database, limit = 8): Promise<Ingredient[]> {
  const used = await db
    .select({
      id: ingredients.id,
      name: ingredients.name,
      role: ingredients.role,
      createdAt: ingredients.createdAt,
      uses: sql<number>`count(${recipeIngredients.recipeId})`.as('uses'),
    })
    .from(ingredients)
    .innerJoin(recipeIngredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .groupBy(ingredients.id)
    .orderBy(desc(sql`uses`), asc(ingredients.name))
    .limit(limit)

  const rows: Ingredient[] = used.map(({ uses: _uses, ...ing }) => ing)
  if (rows.length < limit) {
    const seen = new Set(rows.map((r) => r.id))
    const pad = await db
      .select()
      .from(ingredients)
      .orderBy(asc(ingredients.createdAt), asc(ingredients.name))
      .limit(limit * 2)
    for (const ing of pad) {
      if (rows.length >= limit) break
      if (!seen.has(ing.id)) rows.push(ing)
    }
  }
  return rows
}

/**
 * Resolve names to catalog rows case-insensitively, inserting any that are
 * missing. Returns a lower(name) → Ingredient map covering every input.
 */
export async function resolveOrCreateIngredients(
  db: Database,
  wanted: Array<{ name: string; role: IngredientRole }>,
): Promise<Map<string, Ingredient>> {
  const byName = new Map<string, Ingredient>()
  if (wanted.length === 0) return byName

  const names = [...new Set(wanted.map((w) => w.name.toLowerCase()))]
  const existing = await db
    .select()
    .from(ingredients)
    .where(inArray(sql`lower(${ingredients.name})`, names))
  for (const ing of existing) byName.set(ing.name.toLowerCase(), ing)

  for (const { name, role } of wanted) {
    const key = name.toLowerCase()
    if (byName.has(key)) continue
    try {
      const [created] = await db
        .insert(ingredients)
        .values({ id: crypto.randomUUID(), name: name.trim(), role })
        .returning()
      byName.set(key, created)
    } catch {
      // Unique(lower(name)) race with a concurrent insert: use the winner's row
      const [winner] = await db
        .select()
        .from(ingredients)
        .where(sql`lower(${ingredients.name}) = ${key}`)
        .limit(1)
      if (winner) byName.set(key, winner)
    }
  }
  return byName
}

/**
 * Fetch catalog rows by id.
 */
export async function getIngredientsByIds(db: Database, ids: string[]): Promise<Ingredient[]> {
  if (ids.length === 0) return []
  return await db
    .select()
    .from(ingredients)
    .where(inArray(ingredients.id, ids))
}
