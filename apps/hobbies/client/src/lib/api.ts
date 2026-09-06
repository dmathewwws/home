/**
 * Typed API helpers. Every call — reads included — carries a profileJwt in
 * the body (the app is members-only), and every helper fetches a
 * FRESH JWT via getJwt() at call time: tokens expire in ~2 minutes, so a JWT
 * must never be threaded through a multi-step flow.
 */

import type {
  BootstrapData,
  Hobby,
  HobbyKind,
  MuseIdea,
  Piece,
  PieceLink,
  SessionEntry,
} from './types'

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

export const fetchBootstrap = (getJwt: GetJwt, today: string) =>
  post<BootstrapData>(getJwt, 'bootstrap', { today })

export const createHobby = (getJwt: GetJwt, name: string, kind: HobbyKind, hueIndex: number) =>
  post<{ hobby: Hobby }>(getJwt, 'hobbies', { name, kind, hueIndex }).then((r) => r.hobby)

export const createPiece = (
  getJwt: GetJwt,
  hobbyId: string,
  name: string,
  links: PieceLink[] = [],
  source?: 'muse',
) =>
  post<{ piece: Piece }>(getJwt, 'pieces', { hobbyId, name, links, ...(source ? { source } : {}) })
    .then((r) => r.piece)

export const updatePiece = (getJwt: GetJwt, id: string, name: string, links: PieceLink[] = []) =>
  post<{ piece: Piece }>(getJwt, `pieces/${id}`, { name, links }).then((r) => r.piece)

export const deletePiece = (getJwt: GetJwt, id: string) =>
  post<{ success: boolean }>(getJwt, `pieces/${id}/delete`)

export const logSession = (
  getJwt: GetJwt,
  hobbyId: string,
  pieceId: string | null,
  date: string,
  photoId?: string,
) =>
  post<{ session: SessionEntry }>(getJwt, 'sessions', {
    hobbyId,
    pieceId,
    date,
    ...(photoId ? { photoId } : {}),
  }).then((r) => r.session)

export const deleteSession = (getJwt: GetJwt, id: string) =>
  post<{ success: boolean }>(getJwt, `sessions/${id}/delete`)

export const summonMuse = (getJwt: GetJwt, hobbyId: string, excludeTitles: string[] = []) =>
  post<{ ideas: MuseIdea[]; source: 'openai' | 'pool' }>(getJwt, 'muse', { hobbyId, excludeTitles })

export const requestUpload = (getJwt: GetJwt) =>
  post<{ photoId: string; fullUrl: string; thumbUrl: string }>(getJwt, 'request-upload')

/** Photo URL from its id — ids live in D1, URLs are derived here. */
export const imgUrl = (photoId: string, size: 'full' | 'thumb') =>
  api(`img/photos/${photoId}/${size}.jpg`)
