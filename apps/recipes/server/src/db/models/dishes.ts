/**
 * Dish model — the eating-out journal. Each entry is a standalone log
 * (dish name, optional place/photo/note); logging the same dish twice
 * makes two entries.
 */

import { desc, eq } from 'drizzle-orm'
import type { Database } from '../client.js'
import { dishes, users, type Dish } from '../schema.js'

export type { Dish }

export interface DishListItem {
  id: string
  name: string
  place: string | null
  note: string | null
  photoId: string | null
  createdBy: string
  authorName: string | null
  createdAt: Date
}

/**
 * All dishes, newest first.
 */
export async function listDishes(db: Database): Promise<DishListItem[]> {
  const rows = await db
    .select({
      id: dishes.id,
      name: dishes.name,
      place: dishes.place,
      note: dishes.note,
      photoId: dishes.photoId,
      createdBy: dishes.createdBy,
      authorName: users.name,
      createdAt: dishes.createdAt,
    })
    .from(dishes)
    .leftJoin(users, eq(users.did, dishes.createdBy))
    .orderBy(desc(dishes.createdAt))
    .limit(1000)
  return rows
}

export async function getDishById(db: Database, id: string): Promise<Dish | undefined> {
  const [row] = await db.select().from(dishes).where(eq(dishes.id, id)).limit(1)
  return row
}

export interface DishInput {
  name: string
  place?: string | null
  note?: string | null
  photoId?: string | null
}

export async function createDish(db: Database, createdBy: string, input: DishInput): Promise<Dish> {
  const [row] = await db
    .insert(dishes)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      place: input.place ?? null,
      note: input.note ?? null,
      photoId: input.photoId ?? null,
      createdBy,
    })
    .returning()
  return row
}

export async function deleteDish(db: Database, id: string): Promise<void> {
  await db.delete(dishes).where(eq(dishes.id, id))
}
