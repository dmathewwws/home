import { sql } from 'drizzle-orm'
import { text, index, sqliteTable, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  did: text('did').notNull().primaryKey(),
  name: text('name'),
  avatar: text('avatar'),
  socials: text('socials'), // JSON array of strings: ["platform:handle", "platform:handle"]
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  // Gates the landing grid, and doubles as the cross-app admin contract: the host
  // reads/writes this column in every managed child app's users table too (the
  // admin user list selects it through this schema), so every child must have it.
  isMember: integer('is_member', { mode: 'boolean' }).notNull().default(false),
  createdAt : integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_users_created_at').on(table.createdAt),
])

// Type inference for TypeScript
export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert
