import { sql } from 'drizzle-orm'
import { text, index, sqliteTable, integer } from 'drizzle-orm/sqlite-core'

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
