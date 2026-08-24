/**
 * Piece model - the things you work on inside a hobby. Learn pieces carry
 * lesson links; craft pieces are prompts. Scoped by the owner's did.
 */

import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../client.js'
import { pieces, type Piece, type PieceSource } from '../schema.js'

export type { Piece, PieceSource }

export interface PieceLink {
  label: string
  url: string
}

export async function listPieces(db: Database, did: string): Promise<Piece[]> {
  return await db
    .select()
    .from(pieces)
    .where(eq(pieces.did, did))
    .orderBy(asc(pieces.createdAt))
}

export async function getPiece(db: Database, did: string, id: string): Promise<Piece | undefined> {
  const [piece] = await db
    .select()
    .from(pieces)
    .where(and(eq(pieces.did, did), eq(pieces.id, id)))
    .limit(1)
  return piece
}

export async function listPiecesForHobby(db: Database, did: string, hobbyId: string): Promise<Piece[]> {
  return await db
    .select()
    .from(pieces)
    .where(and(eq(pieces.did, did), eq(pieces.hobbyId, hobbyId)))
    .orderBy(asc(pieces.createdAt))
}

export async function createPiece(
  db: Database,
  did: string,
  input: { hobbyId: string; name: string; links: PieceLink[]; source: PieceSource },
): Promise<Piece> {
  const [piece] = await db
    .insert(pieces)
    .values({
      id: crypto.randomUUID(),
      did,
      hobbyId: input.hobbyId,
      name: input.name,
      links: JSON.stringify(input.links),
      source: input.source,
    })
    .returning()
  return piece
}
