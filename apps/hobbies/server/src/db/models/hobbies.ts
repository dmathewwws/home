/**
 * Hobby model - all queries scoped by the owner's did (per-member data)
 */

import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../client.js'
import { hobbies, type Hobby, type HobbyKind } from '../schema.js'

export type { Hobby, HobbyKind }

export async function listHobbies(db: Database, did: string): Promise<Hobby[]> {
  return await db
    .select()
    .from(hobbies)
    .where(eq(hobbies.did, did))
    .orderBy(asc(hobbies.sortOrder), asc(hobbies.createdAt))
}

export async function getHobby(db: Database, did: string, id: string): Promise<Hobby | undefined> {
  const [hobby] = await db
    .select()
    .from(hobbies)
    .where(and(eq(hobbies.did, did), eq(hobbies.id, id)))
    .limit(1)
  return hobby
}

export async function createHobby(
  db: Database,
  did: string,
  input: { name: string; kind: HobbyKind; hueIndex: number; sortOrder: number },
): Promise<Hobby> {
  const [hobby] = await db
    .insert(hobbies)
    .values({ id: crypto.randomUUID(), did, ...input })
    .returning()
  return hobby
}
