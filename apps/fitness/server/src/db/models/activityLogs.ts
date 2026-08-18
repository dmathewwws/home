/**
 * Activity log model - one row per user per day, activities stored as a JSON array
 */

import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'
import type { Database } from '../client.js'
import { activityLogs, type ActivityKey } from '../schema.js'

export interface ActivityLog {
  date: string
  activities: ActivityKey[]
}

function toLog(row: { date: string; activities: string }): ActivityLog {
  return { date: row.date, activities: JSON.parse(row.activities) as ActivityKey[] }
}

/**
 * Get a user's logs within an inclusive date-key range
 */
export async function getLogsInRange(
  db: Database,
  did: string,
  from: string,
  to: string
): Promise<ActivityLog[]> {
  const rows = await db
    .select()
    .from(activityLogs)
    .where(and(eq(activityLogs.did, did), gte(activityLogs.date, from), lte(activityLogs.date, to)))
    .orderBy(asc(activityLogs.date))

  return rows.map(toLog)
}

/**
 * Upsert a user's log for one day (replaces the activity set)
 */
export async function upsertLog(
  db: Database,
  did: string,
  date: string,
  activities: ActivityKey[]
): Promise<ActivityLog> {
  const [row] = await db
    .insert(activityLogs)
    .values({
      id: crypto.randomUUID(),
      did,
      date,
      activities: JSON.stringify(activities),
    })
    .onConflictDoUpdate({
      target: [activityLogs.did, activityLogs.date],
      set: {
        activities: sql`excluded.activities`,
        updatedAt: new Date(),
      },
    })
    .returning()

  return toLog(row)
}
