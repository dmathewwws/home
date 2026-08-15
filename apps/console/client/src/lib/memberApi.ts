/**
 * Membership check for the landing grid.
 *
 * The console has no auth context of its own — `useOnboarding()` only runs on the
 * Settings page — so this restores `window.localFirstAuth` from the stored profile
 * when needed (the same pattern the auth library's provider uses), mints a fresh
 * short-lived JWT, and asks the host whether the caller is a member. Visibility
 * gate only: the grid holds no secrets beyond links, and child apps re-verify
 * membership server-side themselves.
 */
import { hasProfile, injectLocalFirstAuthAPI, type LocalFirstAuth } from 'local-first-auth'

export type MemberStatus = 'signed-out' | 'member' | 'not-member'

export async function getMemberStatus(): Promise<MemberStatus> {
  const w = window as unknown as { localFirstAuth?: LocalFirstAuth }
  if (!w.localFirstAuth && hasProfile()) injectLocalFirstAuthAPI()
  if (!w.localFirstAuth) return 'signed-out'
  try {
    const jwt = await w.localFirstAuth.getProfileDetails()
    const res = await fetch('/api/member/status', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    if (!res.ok) return 'not-member'
    const { isMember } = (await res.json()) as { isMember: boolean }
    return isMember ? 'member' : 'not-member'
  } catch {
    return 'not-member'
  }
}
