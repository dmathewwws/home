/**
 * Session model - one row per logged practice/making session. The journal and
 * the heatmap both read from here. Scoped by the owner's did.
 */

import { and, between, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '../client.js'
import { sessions, type Session } from '../schema.js'

export type { Session }

export interface HeatDatum {
  date: string
  hobbyId: string
  count: number
}

export async function createSession(
  db: Database,
  input: {
    did: string
    hobbyId: string
    pieceId: string | null
    pieceName: string | null
    date: string
    photoId: string | null
  },
): Promise<Session> {
  const [session] = await db
    .insert(sessions)
    .values({ id: crypto.randomUUID(), ...input })
    .returning()
  return session
}

export async function getSession(db: Database, id: string): Promise<Session | undefined> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1)
  return session
}

export async function deleteSession(db: Database, id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id))
}

/**
 * Newest-first journal. Capped rather than paginated — personal scale; a
 * createdAt cursor can be added later without changing the response shape.
 */
export async function getJournal(db: Database, did: string, limit = 500): Promise<Session[]> {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.did, did))
    .orderBy(desc(sessions.createdAt))
    .limit(limit)
}

/** Per-day per-hobby counts for the heatmap window (dates inclusive). */
export async function getHeatmap(
  db: Database,
  did: string,
  fromDate: string,
  toDate: string,
): Promise<HeatDatum[]> {
  return await db
    .select({
      date: sessions.date,
      hobbyId: sessions.hobbyId,
      count: sql<number>`count(*)`,
    })
    .from(sessions)
    .where(and(eq(sessions.did, did), between(sessions.date, fromDate, toDate)))
    .groupBy(sessions.date, sessions.hobbyId)
}

/** Recent sessions for one hobby — context for the muse. */
export async function getRecentSessionsForHobby(
  db: Database,
  did: string,
  hobbyId: string,
  limit = 20,
): Promise<Session[]> {
  return await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.did, did), eq(sessions.hobbyId, hobbyId)))
    .orderBy(desc(sessions.createdAt))
    .limit(limit)
}
