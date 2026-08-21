import { sql } from 'drizzle-orm'
import { text, index, uniqueIndex, sqliteTable, integer, real } from 'drizzle-orm/sqlite-core'

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

// Canonical activity keys — display names/colors live in
// client/src/lib/activities.ts; keep the two lists in sync.
export const ACTIVITY_KEYS = ['bike', 'yoga', 'bball', 'stretch', 'outrig', 'disc', 'badm', 'swim'] as const
export type ActivityKey = (typeof ACTIVITY_KEYS)[number]

// One row per user per day; `activities` is a JSON ActivityKey[] so a day can
// hold any subset without a migration when the catalog changes.
export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').notNull().primaryKey(),
  did: text('did').notNull(),
  date: text('date').notNull(), // user-local 'YYYY-MM-DD'
  activities: text('activities').notNull().default('[]'), // JSON ActivityKey[]
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  uniqueIndex('idx_activity_logs_did_date').on(table.did, table.date),
])

export const weightEntries = sqliteTable('weight_entries', {
  id: text('id').notNull().primaryKey(),
  did: text('did').notNull(),
  date: text('date').notNull(), // user-local 'YYYY-MM-DD'
  kg: real('kg').notNull(),
  // uuid; R2 keys derived as photos/<id>/(full|thumb).jpg
  photoId: text('photo_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  uniqueIndex('idx_weight_entries_did_date').on(table.did, table.date),
])

export type ActivityLogRow = typeof activityLogs.$inferSelect
export type ActivityLogInsert = typeof activityLogs.$inferInsert
export type WeightEntryRow = typeof weightEntries.$inferSelect
export type WeightEntryInsert = typeof weightEntries.$inferInsert
