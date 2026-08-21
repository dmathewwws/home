/**
 * Typed API helpers. Every call — reads included — carries a profileJwt in
 * the body (the app is members-only), and every helper fetches a
 * FRESH JWT via getJwt() at call time: tokens expire in ~2 minutes, so a JWT
 * must never be threaded through a multi-step flow.
 */

import type { ActivityKey } from './activities'
import type { ActivityLog, WeightEntry } from './types'

export type GetJwt = () => Promise<string | undefined>

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Thrown when there's no signed-in user to mint a JWT from. */
export class AuthNeededError extends Error {
  constructor() {
    super('Sign in first')
  }
}

const api = (path: string) => `${import.meta.env.BASE_URL}api/${path}`

async function post<T>(getJwt: GetJwt, path: string, body: Record<string, unknown> = {}): Promise<T> {
  const profileJwt = await getJwt()
  if (!profileJwt) throw new AuthNeededError()
  const res = await fetch(api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, profileJwt }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new ApiError(
      typeof data.error === 'string' ? data.error : `Request failed (${res.status})`,
      res.status,
    )
  }
  return data as T
}

export const fetchActivityRange = (getJwt: GetJwt, from: string, to: string) =>
  post<{ logs: ActivityLog[] }>(getJwt, 'activities/range', { from, to }).then((r) => r.logs)

export const logActivities = (getJwt: GetJwt, date: string, activities: ActivityKey[]) =>
  post<{ log: ActivityLog }>(getJwt, 'activities/log', { date, activities }).then((r) => r.log)

export const listWeights = (getJwt: GetJwt) =>
  post<{ entries: WeightEntry[] }>(getJwt, 'weights/list').then((r) => r.entries)

/**
 * Upsert one day's weight. `photoId` is tri-state, matching the endpoint:
 * omit to keep the day's existing photo, a uuid to attach one, null to clear.
 */
export const logWeight = (getJwt: GetJwt, date: string, kg: number, photoId?: string | null) =>
  post<{ entry: WeightEntry }>(getJwt, 'weights/log', {
    date,
    kg,
    ...(photoId === undefined ? {} : { photoId }),
  }).then((r) => r.entry)

export const deleteWeight = (getJwt: GetJwt, date: string) =>
  post<{ success: boolean }>(getJwt, 'weights/delete', { date })

export const requestUpload = (getJwt: GetJwt) =>
  post<{ photoId: string; fullUrl: string; thumbUrl: string }>(getJwt, 'request-upload')

/** Photo URL from its id — ids live in D1, URLs are derived here. */
export const imgUrl = (photoId: string, size: 'full' | 'thumb') =>
  api(`img/photos/${photoId}/${size}.jpg`)
