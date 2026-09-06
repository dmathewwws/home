/**
 * Per-member starter data. Every member begins with the seven founding hobbies
 * and their starter pieces so the Today screen is never blank.
 *
 * Seeding is self-healing: it diffs SEED_HOBBIES against the hobbies the member
 * already has and inserts only what's missing, so a hobby added to the list
 * later reaches existing members on their next bootstrap. Pieces are seeded only
 * alongside a hobby that was itself missing, so a piece a member deleted stays
 * deleted. The (did, name) unique indexes make concurrent requests race-safe.
 */

import { eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { hobbies, pieces, type HobbyKind } from './schema.js'

interface SeedPiece {
  name: string
  links: Array<{ label: string; url: string }>
}

interface SeedHobby {
  name: string
  kind: HobbyKind
  hueIndex: number
  pieces: SeedPiece[]
}

const yt = (query: string) =>
  `https://www.youtube.com/results?search_query=${query}`

export const SEED_HOBBIES: SeedHobby[] = [
  {
    name: 'Chalk drawing',
    kind: 'craft',
    hueIndex: 3,
    pieces: [
      { name: 'Seawall mural sketch', links: [] },
      { name: 'Portrait study', links: [] },
      { name: 'Free doodle', links: [] },
    ],
  },
  {
    name: 'Guitar',
    kind: 'learn',
    hueIndex: 0,
    pieces: [
      { name: 'Layla', links: [{ label: 'WATCH', url: yt('layla+unplugged+guitar+lesson') }] },
      { name: 'Blackbird', links: [{ label: 'WATCH', url: yt('blackbird+fingerpicking+lesson') }] },
      { name: 'Here Comes the Sun', links: [{ label: 'WATCH', url: yt('here+comes+the+sun+guitar+lesson') }] },
      { name: 'Chord changes', links: [{ label: 'WATCH', url: yt('guitar+chord+change+practice') }] },
    ],
  },
  {
    name: 'Piano',
    kind: 'learn',
    hueIndex: 1,
    pieces: [
      { name: 'Clair de Lune', links: [{ label: 'WATCH', url: yt('clair+de+lune+piano+tutorial') }] },
      { name: 'Für Elise', links: [{ label: 'WATCH', url: yt('fur+elise+piano+tutorial') }] },
      { name: 'Tum Hi Ho', links: [{ label: 'WATCH', url: yt('tum+hi+ho+piano+tutorial') }] },
    ],
  },
  {
    name: 'Hindi',
    kind: 'learn',
    hueIndex: 2,
    pieces: [
      { name: 'Numbers 40–60', links: [{ label: 'WATCH', url: yt('hindi+numbers+40+to+60') }] },
      { name: 'Bollywood lyrics', links: [{ label: 'WATCH', url: yt('learn+hindi+through+bollywood+songs') }] },
      { name: 'Duolingo unit 12', links: [{ label: 'TAB', url: 'https://www.duolingo.com/learn' }] },
    ],
  },
  {
    name: 'Cooking',
    kind: 'craft',
    hueIndex: 6,
    pieces: [
      { name: 'Weeknight dal', links: [] },
      { name: 'Whatever is in the fridge', links: [] },
      { name: 'A new knife skill', links: [] },
    ],
  },
  {
    name: 'Reading',
    kind: 'learn',
    hueIndex: 4,
    pieces: [
      { name: 'Currently reading', links: [{ label: 'TAB', url: 'https://www.goodreads.com/review/list' }] },
      { name: 'Next on the shelf', links: [] },
      { name: '10 pages before bed', links: [] },
    ],
  },
  {
    name: 'Cleaning',
    kind: 'craft',
    hueIndex: 5,
    pieces: [
      { name: 'One drawer', links: [] },
      { name: 'Kitchen counters', links: [] },
      { name: '15-minute reset', links: [] },
    ],
  },
]

/**
 * Seed any starter hobbies + pieces the member is missing.
 * Called from the bootstrap endpoint only.
 */
export async function ensureSeedData(db: Database, did: string): Promise<void> {
  const existing = await db
    .select({ name: hobbies.name })
    .from(hobbies)
    .where(eq(hobbies.did, did))
  const have = new Set(existing.map((h) => h.name))
  const missing = SEED_HOBBIES.filter((h) => !have.has(h.name))
  if (missing.length === 0) return

  const hobbyRows = missing.map((h) => ({
    id: crypto.randomUUID(),
    did,
    name: h.name,
    kind: h.kind,
    hueIndex: h.hueIndex,
    // Position in SEED_HOBBIES, so chip order stays stable however late a
    // hobby is backfilled.
    sortOrder: SEED_HOBBIES.indexOf(h),
  }))
  await db.insert(hobbies).values(hobbyRows).onConflictDoNothing()

  // Re-select so pieces reference whichever hobby rows won a concurrent race
  // (the (did, name) unique index drops losing duplicates).
  const inserted = await db.select().from(hobbies).where(eq(hobbies.did, did))
  const idByName = new Map(inserted.map((h) => [h.name, h.id]))

  const pieceRows = missing.flatMap((h) => {
    const hobbyId = idByName.get(h.name)
    if (!hobbyId) return []
    return h.pieces.map((p) => ({
      id: crypto.randomUUID(),
      did,
      hobbyId,
      name: p.name,
      links: JSON.stringify(p.links),
      source: 'seed' as const,
    }))
  })
  if (pieceRows.length === 0) return
  await db.insert(pieces).values(pieceRows).onConflictDoNothing()
}
