import { sql } from 'drizzle-orm'
import { text, index, uniqueIndex, sqliteTable, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  did: text('did').notNull().primaryKey(),
  name: text('name'),
  avatar: text('avatar'),
  socials: text('socials'), // JSON array of strings: ["platform:handle", "platform:handle"]
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  // Required by the host console's admin "Block" action, which writes this
  // column directly through its D1 binding to this app's database.
  blocked: integer('blocked', { mode: 'boolean' }).notNull().default(false),
  // The app is members-only: membership is granted from the host console's
  // admin UI, which reads/writes this column directly through its D1 binding
  // (part of the host's admin contract — see the console's
  // docs/hosting-a-mini-app.md). Admins are implicitly members.
  isMember: integer('is_member', { mode: 'boolean' }).notNull().default(false),
  createdAt : integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_users_created_at').on(table.createdAt),
])

// Type inference for TypeScript
export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert

// The learn-vs-craft split drives the whole UI: "learn" hobbies have pieces
// that carry lesson links (WATCH/READ/TAB pills); "craft" hobbies have prompt
// pieces, the AI muse, and photo attachments. A future hobby just declares
// its kind.
export const HOBBY_KINDS = ['learn', 'craft'] as const
export type HobbyKind = (typeof HOBBY_KINDS)[number]

export const PIECE_SOURCES = ['seed', 'user', 'muse'] as const
export type PieceSource = (typeof PIECE_SOURCES)[number]

// All hobby data is per-member: every row is scoped by the owner's did and
// never shown to other members.
export const hobbies = sqliteTable('hobbies', {
  id: text('id').notNull().primaryKey(), // crypto.randomUUID()
  did: text('did').notNull(),
  name: text('name').notNull(),
  kind: text('kind', { enum: HOBBY_KINDS }).notNull(),
  // Index into the client's fixed 8-hue pastel palette (client/src/lib/hues.ts)
  hueIndex: integer('hue_index').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_hobbies_did').on(table.did),
  // Also the race-safety backstop for per-did seeding
  uniqueIndex('idx_hobbies_did_name').on(table.did, table.name),
])

export const pieces = sqliteTable('pieces', {
  id: text('id').notNull().primaryKey(),
  did: text('did').notNull(),
  hobbyId: text('hobby_id').notNull(),
  name: text('name').notNull(),
  // JSON array of {label, url} lesson links; '[]' for craft prompts
  links: text('links').notNull().default('[]'),
  source: text('source', { enum: PIECE_SOURCES }).notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_pieces_did').on(table.did),
  uniqueIndex('idx_pieces_hobby_name').on(table.hobbyId, table.name),
])

export const sessions = sqliteTable('sessions', {
  id: text('id').notNull().primaryKey(),
  did: text('did').notNull(),
  hobbyId: text('hobby_id').notNull(),
  pieceId: text('piece_id'),
  // Snapshot at log time so the journal survives piece rename/delete;
  // null renders as "General practice"
  pieceName: text('piece_name'),
  // User-local calendar day 'YYYY-MM-DD' (client-supplied) — the heatmap key
  date: text('date').notNull(),
  // R2 photo id → keys photos/<id>/(full|thumb).jpg; craft hobbies only
  photoId: text('photo_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_sessions_did_date').on(table.did, table.date),
  index('idx_sessions_did_created').on(table.did, table.createdAt),
])

export type Hobby = typeof hobbies.$inferSelect
export type HobbyInsert = typeof hobbies.$inferInsert
export type Piece = typeof pieces.$inferSelect
export type PieceInsert = typeof pieces.$inferInsert
export type Session = typeof sessions.$inferSelect
export type SessionInsert = typeof sessions.$inferInsert
