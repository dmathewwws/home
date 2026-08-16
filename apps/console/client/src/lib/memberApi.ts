/**
 * Per-user app list for the landing grid.
 *
 * The console has no auth context of its own — `useOnboarding()` only runs on the
 * Settings page — so this restores `window.localFirstAuth` from the stored profile
 * when needed (the same pattern the auth library's provider uses), mints a fresh
 * short-lived JWT, and asks the host which managed apps the caller may see
 * (GET /api/my-apps: per-app membership; host admins see all). Visibility gate
 * only: the grid holds no secrets beyond links, and child apps re-verify
 * membership server-side themselves.
 */
import { hasProfile, injectLocalFirstAuthAPI, type LocalFirstAuth } from 'local-first-auth'

export type MyApps =
  | { kind: 'signed-out' }
  | { kind: 'ok'; isAdmin: boolean; slugs: string[] }

export async function getMyApps(): Promise<MyApps> {
  const w = window as unknown as { localFirstAuth?: LocalFirstAuth }
  if (!w.localFirstAuth && hasProfile()) injectLocalFirstAuthAPI()
  if (!w.localFirstAuth) return { kind: 'signed-out' }
  try {
    const jwt = await w.localFirstAuth.getProfileDetails()
    const res = await fetch('/api/my-apps', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    if (!res.ok) return { kind: 'ok', isAdmin: false, slugs: [] }
    const { isAdmin, apps } = (await res.json()) as { isAdmin: boolean; apps: string[] }
    return { kind: 'ok', isAdmin, slugs: apps }
  } catch {
    return { kind: 'ok', isAdmin: false, slugs: [] }
  }
}
