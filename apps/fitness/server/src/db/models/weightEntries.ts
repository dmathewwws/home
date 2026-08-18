/**
 * Weight entry model - one entry per user per day, in kilograms
 */

import { asc, eq, sql } from 'drizzle-orm'
import type { Database } from '../client.js'
import { weightEntries } from '../schema.js'

export interface WeightEntry {
  date: string
  kg: number
}

/**
 * Get all of a user's weight entries, oldest first
 */
export async function listEntries(db: Database, did: string): Promise<WeightEntry[]> {
  const rows = await db
    .select({ date: weightEntries.date, kg: weightEntries.kg })
    .from(weightEntries)
    .where(eq(weightEntries.did, did))
    .orderBy(asc(weightEntries.date))
    .limit(2000)

  return rows
}

/**
 * Upsert a user's weight entry for one day
 */
export async function upsertEntry(
  db: Database,
  did: string,
  date: string,
  kg: number
): Promise<WeightEntry> {
  const [row] = await db
    .insert(weightEntries)
    .values({
      id: crypto.randomUUID(),
      did,
      date,
      kg,
    })
    .onConflictDoUpdate({
      target: [weightEntries.did, weightEntries.date],
      set: {
        kg: sql`excluded.kg`,
        updatedAt: new Date(),
      },
    })
    .returning()

  return { date: row.date, kg: row.kg }
}
