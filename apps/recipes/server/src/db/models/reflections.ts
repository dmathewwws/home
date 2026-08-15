/**
 * Reflection model — the cooking journal. Each entry snapshots its recipe
 * title and rep number at write time so history never rewrites itself.
 */

import { desc, eq, sql } from 'drizzle-orm'
import type { Database } from '../client.js'
import { reflections, recipes, users, type Reflection, type Verdict } from '../schema.js'

export type { Reflection }

export interface ReflectionListItem {
  id: string
  recipeId: string | null
  recipeTitle: string
  verdict: Verdict
  note: string | null
  changeNextTime: string | null
  minutes: number | null
  rep: number
  photoId: string | null
  createdBy: string
  authorName: string | null
  cookedAt: Date
}

/**
 * All reflections, newest cook first.
 */
export async function listReflections(db: Database): Promise<ReflectionListItem[]> {
  const rows = await db
    .select({
      id: reflections.id,
      recipeId: reflections.recipeId,
      recipeTitle: reflections.recipeTitle,
      verdict: reflections.verdict,
      note: reflections.note,
      changeNextTime: reflections.changeNextTime,
      minutes: reflections.minutes,
      rep: reflections.rep,
      photoId: reflections.photoId,
      createdBy: reflections.createdBy,
      authorName: users.name,
      cookedAt: reflections.cookedAt,
    })
    .from(reflections)
    .leftJoin(users, eq(users.did, reflections.createdBy))
    .orderBy(desc(reflections.cookedAt))
    .limit(1000)
  return rows
}

export async function getReflectionById(db: Database, id: string): Promise<Reflection | undefined> {
  const [row] = await db.select().from(reflections).where(eq(reflections.id, id)).limit(1)
  return row
}

export interface ReflectionInput {
  recipeId: string
  verdict: Verdict
  note?: string | null
  changeNextTime?: string | null
  minutes?: number | null
  photoId?: string | null
}

/**
 * Create a reflection: snapshots the recipe title and computes rep as
 * prior-count + 1. Returns undefined if the recipe doesn't exist.
 */
export async function createReflection(
  db: Database,
  createdBy: string,
  input: ReflectionInput,
): Promise<Reflection | undefined> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, input.recipeId)).limit(1)
  if (!recipe) return undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reflections)
    .where(eq(reflections.recipeId, input.recipeId))

  const [row] = await db
    .insert(reflections)
    .values({
      id: crypto.randomUUID(),
      recipeId: input.recipeId,
      recipeTitle: recipe.title,
      verdict: input.verdict,
      note: input.note ?? null,
      changeNextTime: input.changeNextTime ?? null,
      minutes: input.minutes ?? null,
      rep: count + 1,
      photoId: input.photoId ?? null,
      createdBy,
      cookedAt: new Date(),
    })
    .returning()
  return row
}

export async function deleteReflection(db: Database, id: string): Promise<void> {
  await db.delete(reflections).where(eq(reflections.id, id))
}
