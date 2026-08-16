/**
 * Registry of the managed mini apps — the single source of truth shared by
 * alchemy.run.ts (references each child D1 by UUID and binds it), server/src/admin-apps.ts
 * (resolves a slug to its bound D1), GET /api/my-apps (per-user membership lookup), and the
 * client landing grid (card display metadata). Keep wrangler.toml's dev bindings in sync
 * with the bindingKey values here.
 *
 * The host only REFERENCES these databases by UUID for its Worker binding — it never
 * provisions or migrates them. Each child app owns and migrates its own D1. `databaseId`
 * is the sync point: if a child app ever replaces its DB (new UUID), update it here.
 *
 * This registry is bundled into the client (D1 UUIDs are identifiers, not secrets). A
 * card's link path is derived as `/<slug>/` — trailing slash by construction, since the
 * bare `/<slug>` path is not claimed by child Workers.
 */
/**
 * Reserved slug for the host's own D1, so the admin UI can manage console
 * membership/operators through the same per-app card + routes. No MANAGED_APPS
 * entry may use this slug.
 */
export const HOST_APP_SLUG = 'console'

export type ChildBindingKey = 'DB_RECIPES'

export interface ManagedApp {
  /** URL slug; the landing-grid card links to `/<slug>/`. */
  slug: string
  /** Display name shown on the landing-grid card. */
  name: string
  /** One-line description shown on the card. */
  description: string
  /** Emoji or short glyph used as the card icon. */
  icon: string
  /** Tailwind gradient classes for the card's icon tile accent. */
  accent: string
  /** Key on the host Worker Env for this child app's D1 binding. */
  bindingKey: ChildBindingKey
  /** Cloudflare D1 database name (the child app owns it). */
  dbName: string
  /** Real Cloudflare D1 UUID (prod). The host references this DB by id; the child app owns/migrates it. */
  databaseId: string
}

export const MANAGED_APPS: ManagedApp[] = [
  {
    slug: 'recipes',
    name: 'Recipe Box',
    description: 'Recipes to try out.',
    icon: '🍳',
    accent: 'from-amber-400 to-orange-300',
    bindingKey: 'DB_RECIPES',
    dbName: 'home-recipes-mini-app-prod-db',
    databaseId: '0536c6b8-3f42-4c11-a0af-a26be54e5413',
  },
]
