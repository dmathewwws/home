/**
 * Landing-grid / admin card shapes.
 *
 * Mini-app cards are derived from the shared MANAGED_APPS registry
 * (shared/src/apps.ts) — which apps a given user actually sees comes from
 * GET /api/my-apps (per-app membership; admins see all). Only host-internal
 * cards (Settings, the admin console's synthetic host card) are defined here.
 */
import { HOST_APP_SLUG, type ManagedApp } from '@home/console-shared'

export interface AppCard {
  /** URL-safe identifier, also the base path segment (e.g. "guestbook"). */
  slug: string
  /** Display name shown on the card. */
  name: string
  /** One-line description shown on the card. */
  description: string
  /** Absolute path this card links to. External cards use `/<slug>/` (trailing slash). */
  path: string
  /** Emoji or short glyph used as the card icon. */
  icon: string
  /** Tailwind gradient classes for the card's icon tile accent. */
  accent: string
  /**
   * When true, this card is a route served by the host itself (e.g. /settings),
   * so it links via client-side routing instead of a cross-document navigation.
   */
  internal?: boolean
}

/** Shown to everyone — signed-in or not — so profiles can be created/imported/exported. */
export const settingsCard: AppCard = {
  slug: 'settings',
  name: 'Settings',
  description: 'Create or edit your profile.',
  path: '/settings',
  icon: '⚙️',
  accent: 'from-slate-400 to-slate-300',
  internal: true,
}

/**
 * Synthetic card for the host's own D1 (landing-grid membership + operators). Not in
 * the managed-app registry — the server resolves this reserved slug to its own DB.
 */
export const hostCard: AppCard = {
  slug: HOST_APP_SLUG,
  name: 'Home (console)',
  description: 'Landing-grid membership and operators.',
  path: '/',
  icon: '🏠',
  accent: 'from-slate-400 to-slate-300',
  internal: true,
}

/**
 * Grid card for a managed mini app. The path is derived as `/<slug>/` — a real
 * cross-document link with a trailing slash, since child Workers only claim
 * `/<slug>/*` and the bare `/<slug>` path falls through to the host.
 */
export function cardForManagedApp(app: ManagedApp): AppCard {
  return {
    slug: app.slug,
    name: app.name,
    description: app.description,
    path: `/${app.slug}/`,
    icon: app.icon,
    accent: app.accent,
  }
}
