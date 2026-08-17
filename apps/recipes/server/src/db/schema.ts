import { sql } from 'drizzle-orm'
import { text, index, sqliteTable, integer, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  did: text('did').notNull().primaryKey(),
  name: text('name'),
  avatar: text('avatar'),
  socials: text('socials'), // JSON array of strings: ["platform:handle", "platform:handle"]
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  // Required by the host console's admin "Block" action, which writes this
  // column directly through its D1 binding to this app's database.
  blocked: integer('blocked', { mode: 'boolean' }).notNull().default(false),
  // The box is members-only: membership is granted from the host console's
  // admin UI (which writes this column directly through its D1 binding).
  // Non-members can't read or write any recipes/reflections. Admins are
  // implicitly members.
  isMember: integer('is_member', { mode: 'boolean' }).notNull().default(false),
  createdAt : integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_users_created_at').on(table.createdAt),
])

export const MEALS = ['main', 'snack', 'sauce', 'salad', 'sandwich', 'dessert'] as const
export type Meal = (typeof MEALS)[number]

export const SOURCE_TYPES = ['video', 'book', 'notes'] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export const INGREDIENT_ROLES = ['protein', 'aromatic', 'produce', 'pantry'] as const
export type IngredientRole = (typeof INGREDIENT_ROLES)[number]

export const VERDICTS = ['keeper', 'another-go', 'never-again'] as const
export type Verdict = (typeof VERDICTS)[number]

/** One instruction card: prose capped at 140 chars, optional timer label ("10 min", "90 sec"). */
export interface RecipeCard {
  text: string
  timer?: string
}

/** "If you're out" swap: the missing ingredient and what to use instead, consequence included. */
export interface RecipeSwap {
  ingredient: string
  replacement: string
}

/** A secondary source: another take on the dish (a pro chef's video, an article) with its tips. */
export interface RecipeSecondarySource {
  url: string
  label: string // who/what it is: "Kenji López-Alt", "Serious Eats"
  notes: string // free-text tips worth keeping from this source, newline-separated points
}

export const recipes = sqliteTable('recipes', {
  id: text('id').notNull().primaryKey(), // crypto.randomUUID()
  title: text('title').notNull(),
  meal: text('meal').notNull().$type<Meal>(),
  minutes: integer('minutes').notNull(),
  sourceType: text('source_type').notNull().$type<SourceType>(),
  sourceUrl: text('source_url'),
  sourceAuthor: text('source_author'), // "Kenji López-Alt" / book title
  sourceDetail: text('source_detail'), // "12:04" / "p.184" / free text
  thumbUrl: text('thumb_url'), // i.ytimg.com thumbnail for imports; null → placeholder art
  // Cards and swaps only ever travel with their recipe and carry intrinsic
  // order, so they live as JSON rather than extra tables.
  cards: text('cards').notNull(), // JSON RecipeCard[]
  swaps: text('swaps').notNull().default('[]'), // JSON RecipeSwap[]
  secondarySources: text('secondary_sources').notNull().default('[]'), // JSON RecipeSecondarySource[]
  createdBy: text('created_by').notNull(), // author DID (verified JWT iss)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_recipes_created_at').on(table.createdAt),
])

export const ingredients = sqliteTable('ingredients', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull().$type<IngredientRole>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  // Case-insensitive identity so "Add as new" can't create "mint" next to "Mint"
  uniqueIndex('idx_ingredients_name').on(sql`lower(${table.name})`),
])

export const recipeIngredients = sqliteTable('recipe_ingredients', {
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id),
  amount: text('amount'), // "400g", "2 cloves" — rides inside the chip
  position: integer('position').notNull(),
}, (table) => [
  primaryKey({ columns: [table.recipeId, table.ingredientId] }),
  // Powers the "You use these a lot" tray (usage counts grouped by ingredient)
  index('idx_ri_ingredient').on(table.ingredientId),
])

export const reflections = sqliteTable('reflections', {
  id: text('id').notNull().primaryKey(),
  // SET NULL + the title snapshot below: the journal survives recipe deletion
  recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  recipeTitle: text('recipe_title').notNull(),
  verdict: text('verdict').notNull().$type<Verdict>(),
  note: text('note'), // "What happened"
  changeNextTime: text('change_next_time'), // the ONE thing — resurfaces on the recipe as "Last time"
  minutes: integer('minutes'), // time at the stove
  // Snapshotted at insert (prior count + 1) so "rep 7" never renumbers if an
  // older reflection is deleted later.
  rep: integer('rep').notNull(),
  photoId: text('photo_id'), // uuid; R2 keys derived as photos/<id>/(full|thumb).jpg
  createdBy: text('created_by').notNull(), // who cooked (verified JWT iss)
  cookedAt: integer('cooked_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_reflections_recipe').on(table.recipeId, table.cookedAt),
  index('idx_reflections_cooked_at').on(table.cookedAt),
])

// Type inference for TypeScript
export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert
export type Recipe = typeof recipes.$inferSelect
export type RecipeInsert = typeof recipes.$inferInsert
export type Ingredient = typeof ingredients.$inferSelect
export type IngredientInsert = typeof ingredients.$inferInsert
export type RecipeIngredient = typeof recipeIngredients.$inferSelect
export type Reflection = typeof reflections.$inferSelect
export type ReflectionInsert = typeof reflections.$inferInsert
