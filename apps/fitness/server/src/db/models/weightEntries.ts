/**
 * Weight entry model - one entry per user per day, in kilograms, with an
 * optional progress photo (a uuid; R2 keys are derived from it in r2.ts)
 */

import { and, asc, eq, sql } from 'drizzle-orm'
import type { Database } from '../client.js'
import { weightEntries } from '../schema.js'

export interface WeightEntry {
  date: string
  kg: number
  photoId: string | null
}

/**
 * Get all of a user's weight entries, oldest first
 */
export async function listEntries(db: Database, did: string): Promise<WeightEntry[]> {
  const rows = await db
    .select({ date: weightEntries.date, kg: weightEntries.kg, photoId: weightEntries.photoId })
    .from(weightEntries)
    .where(eq(weightEntries.did, did))
    .orderBy(asc(weightEntries.date))
    .limit(2000)

  return rows
}

/**
 * One entry by day, or null. The log route needs the stored photoId before
 * overwriting it so the superseded R2 objects can be cleaned up.
 */
export async function getEntry(db: Database, did: string, date: string): Promise<WeightEntry | null> {
  const [row] = await db
    .select({ date: weightEntries.date, kg: weightEntries.kg, photoId: weightEntries.photoId })
    .from(weightEntries)
    .where(and(eq(weightEntries.did, did), eq(weightEntries.date, date)))
    .limit(1)

  return row ?? null
}

/**
 * Upsert a user's weight entry for one day.
 *
 * `photoId` is tri-state: `undefined` leaves an existing day's photo alone,
 * a string sets it, and `null` clears it. Any new column added here must be
 * listed in the conflict `set` too, or a same-day re-log silently drops it.
 */
export async function upsertEntry(
  db: Database,
  did: string,
  date: string,
  kg: number,
  photoId?: string | null
): Promise<WeightEntry> {
  const [row] = await db
    .insert(weightEntries)
    .values({
      id: crypto.randomUUID(),
      did,
      date,
      kg,
      photoId: photoId ?? null,
    })
    .onConflictDoUpdate({
      target: [weightEntries.did, weightEntries.date],
      set: {
        kg: sql`excluded.kg`,
        ...(photoId === undefined ? {} : { photoId: sql`excluded.photo_id` }),
        updatedAt: new Date(),
      },
    })
    .returning()

  return { date: row.date, kg: row.kg, photoId: row.photoId }
}

/**
 * Delete a user's entry for one day. Returns the deleted row, or null when
 * there was nothing to delete.
 */
export async function deleteEntry(db: Database, did: string, date: string): Promise<WeightEntry | null> {
  const [row] = await db
    .delete(weightEntries)
    .where(and(eq(weightEntries.did, did), eq(weightEntries.date, date)))
    .returning()

  return row ? { date: row.date, kg: row.kg, photoId: row.photoId } : null
}
