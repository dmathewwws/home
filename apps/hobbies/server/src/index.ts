/**
 * Cloudflare Worker with WebSocket for real-time user updates
 *
 * This is the main API entry point for the Local First Auth starter.
 * Endpoints handle user profile management via JWT-verified requests.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import type { Env } from './types'
import { Broadcaster } from './durable-object'
import { createDb } from './db/client'
import * as UserModel from './db/models/users'
import * as HobbyModel from './db/models/hobbies'
import * as PieceModel from './db/models/pieces'
import * as SessionModel from './db/models/sessions'
import { ensureSeedData } from './db/seed'
import { HOBBY_KINDS, type HobbyKind } from './db/schema'
import { PHOTO_KEY_RE, canPresign, deletePhoto, photoKeys, uploadUrlFor } from './r2'
import { generateIdeas } from './muse'
import { decodeAndVerifyJWT } from '@home/hobbies-shared'
import { AuthError, authFromBody } from './auth'

// The app is served under /<slug>/ on the shared domain; basePath keeps every
// handler's route written as /api/* while matching /<slug>/api/* on the wire.
const app = new Hono<{ Bindings: Env }>().basePath('/hobbies')

/**
 * Verify a Local First Auth JWT and enforce that it was minted for our origin
 * (the ALLOWED_PRODUCTION_ORIGIN binding; unset in dev, which skips the audience
 * check).
 * local-first-auth signs with a per-origin key, so a JWT issued at another origin carries
 * a different DID and would silently create a duplicate user row.
 */
const verifyJwt = (c: Context<{ Bindings: Env }>, jwt: string) =>
  decodeAndVerifyJWT(jwt, c.env.ALLOWED_PRODUCTION_ORIGIN)

// Enable CORS for all requests
app.use('/*', cors({
  origin: '*',
  credentials: true,
}))

/**
 * POST /api/add-user - Add or update user profile (without avatar)
 * Preserves existing avatar if user already exists
 */
app.post('/api/add-user', async (c) => {
  try {
    const body = await c.req.json()
    const { profileJwt } = body

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }

    // Verify and decode the profile JWT
    const profilePayload = await verifyJwt(c, profileJwt)

    // Key the user off the cryptographically verified DID (not data.did, which the
    // caller can set to anyone's DID and would let them overwrite that user's row)
    const did = profilePayload.iss

    // Extract profile data
    const { name, socials } = profilePayload.data as {
      name: string
      socials?: Array<{ platform: string; handle: string }>
    }

    // Create database instance and upsert user
    const db = createDb(c.env.DB)
    const user = await UserModel.addOrUpdateUser(
      db,
      did,
      name,
      socials ?? []
    )

    // Broadcast to all WebSocket clients via Durable Object
    await notifyDO(c, 'user-joined', user)

    return c.json(user)
  } catch (error) {
    console.error('Add user error:', error)
    return c.json(
      { error: 'Failed to add user', message: (error as Error).message },
      500
    )
  }
})

/**
 * POST /api/add-avatar - Add or update user avatar
 * Creates user with avatar only if doesn't exist yet
 */
app.post('/api/add-avatar', async (c) => {
  try {
    const body = await c.req.json()
    const { avatarJwt } = body

    if (!avatarJwt) {
      return c.json({ error: 'Missing avatarJwt' }, 400)
    }

    // Verify and decode the avatar JWT
    const avatarPayload = await verifyJwt(c, avatarJwt)

    // Extract DID from issuer and avatar from data
    const did = avatarPayload.iss
    const { avatar } = avatarPayload.data as { avatar: string }

    if (!avatar) {
      return c.json({ error: 'No avatar data in JWT' }, 400)
    }

    // Create database instance and upsert avatar
    const db = createDb(c.env.DB)
    const user = await UserModel.addOrUpdateUserAvatar(db, did, avatar)

    // Broadcast to all WebSocket clients via Durable Object
    await notifyDO(c, 'user-joined', user)

    return c.json(user)
  } catch (error) {
    console.error('Add avatar error:', error)
    return c.json(
      { error: 'Failed to add avatar', message: (error as Error).message },
      500
    )
  }
})

/**
 * DELETE /api/remove-user - Remove user
 * Requires JWT verification to ensure user is removing themselves
 */
app.delete('/api/remove-user', async (c) => {
  try {
    const body = await c.req.json()
    const { profileJwt } = body

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }

    // Verify and decode the JWT to get the user's DID
    const payload = await verifyJwt(c, profileJwt)
    const did = payload.iss

    // Create database instance and delete user
    const db = createDb(c.env.DB)
    await UserModel.deleteUserByDID(db, did)

    // Broadcast to all WebSocket clients via Durable Object
    await notifyDO(c, 'user-left', { did })

    return c.json({ success: true, did })
  } catch (error) {
    console.error('Remove user error:', error)
    return c.json(
      { error: 'Failed to remove user', message: (error as Error).message },
      500
    )
  }
})

/**
 * POST /api/users - Get all users (members only).
 *
 * The reference app-data endpoint: reads included, everything carrying app data
 * is a POST with {profileJwt} in the body, gated by authFromBody. Copy this
 * shape for new endpoints.
 */
app.post('/api/users', async (c) => {
  try {
    const body = await c.req.json()
    const { db } = await authFromBody(c, body)
    const users = await UserModel.getAllUsers(db)
    return c.json({ users })
  } catch (error) {
    if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
    console.error('Error fetching users:', error)
    return c.json(
      { error: 'Failed to fetch users', message: (error as Error).message },
      500
    )
  }
})

/** Shared error tail for app-data endpoints: AuthError keeps its status. */
function errorResponse(c: Context<{ Bindings: Env }>, error: unknown, fallback: string) {
  if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
  console.error(`${fallback}:`, error)
  return c.json({ error: fallback, message: (error as Error).message }, 500)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** date minus n days, in the same 'YYYY-MM-DD' space (UTC math on local keys). */
function minusDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const HEATMAP_DAYS = 84 // 12 weeks × 7 days

interface PieceLinkInput {
  label: string
  url: string
}

/** Validate + normalize piece links: uppercased short labels, http(s) URLs only. */
function parseLinks(raw: unknown): PieceLinkInput[] | null {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.length > 4) return null
  const links: PieceLinkInput[] = []
  for (const item of raw) {
    if (typeof item?.label !== 'string' || typeof item?.url !== 'string') return null
    const label = item.label.trim().toUpperCase().slice(0, 6)
    if (!label) return null
    let url: URL
    try {
      url = new URL(item.url)
    } catch {
      return null
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    links.push({ label, url: url.toString() })
  }
  return links
}

/**
 * POST /api/bootstrap - Everything the client needs to render: the member's
 * hobbies, pieces, 12-week heatmap counts, and journal. Seeds the four
 * starter hobbies on a member's first visit.
 */
app.post('/api/bootstrap', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)
    const today: unknown = body.today
    if (typeof today !== 'string' || !DATE_RE.test(today)) {
      return c.json({ error: 'Missing or invalid today (YYYY-MM-DD)' }, 400)
    }

    await ensureSeedData(db, user.did)

    const fromDate = minusDays(today, HEATMAP_DAYS - 1)
    const [hobbies, pieces, heatmap, journal] = await Promise.all([
      HobbyModel.listHobbies(db, user.did),
      PieceModel.listPieces(db, user.did),
      SessionModel.getHeatmap(db, user.did, fromDate, today),
      SessionModel.getJournal(db, user.did),
    ])

    return c.json({
      hobbies,
      pieces: pieces.map((p) => ({ ...p, links: JSON.parse(p.links) })),
      heatmap,
      journal,
    })
  } catch (error) {
    return errorResponse(c, error, 'Failed to load data')
  }
})

/**
 * POST /api/hobbies - Add a hobby (name, kind, hueIndex)
 */
app.post('/api/hobbies', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name.length < 1 || name.length > 40) {
      return c.json({ error: 'Hobby name must be 1–40 characters' }, 400)
    }
    if (!HOBBY_KINDS.includes(body.kind)) {
      return c.json({ error: 'Kind must be "learn" or "craft"' }, 400)
    }
    const hueIndex = body.hueIndex
    if (!Number.isInteger(hueIndex) || hueIndex < 0 || hueIndex > 7) {
      return c.json({ error: 'hueIndex must be 0–7' }, 400)
    }

    const existing = await HobbyModel.listHobbies(db, user.did)
    if (existing.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
      return c.json({ error: 'You already have a hobby with that name' }, 409)
    }

    const hobby = await HobbyModel.createHobby(db, user.did, {
      name,
      kind: body.kind as HobbyKind,
      hueIndex,
      sortOrder: existing.length,
    })
    return c.json({ hobby })
  } catch (error) {
    return errorResponse(c, error, 'Failed to add hobby')
  }
})

/**
 * POST /api/pieces - Add a piece to one of the caller's hobbies. Learn pieces
 * carry labeled links; craft prompts have none. The muse also lands here
 * (source: 'muse') so accepted ideas become chips and future muse context.
 */
app.post('/api/pieces', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)

    const hobby = typeof body.hobbyId === 'string'
      ? await HobbyModel.getHobby(db, user.did, body.hobbyId)
      : undefined
    if (!hobby) return c.json({ error: 'Hobby not found' }, 404)

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name.length < 1 || name.length > 80) {
      return c.json({ error: 'Piece name must be 1–80 characters' }, 400)
    }
    const links = parseLinks(body.links)
    if (links === null) {
      return c.json({ error: 'Links must be up to 4 {label, url} pairs with http(s) URLs' }, 400)
    }
    const source = body.source === 'muse' ? 'muse' : 'user'

    const existing = await PieceModel.listPiecesForHobby(db, user.did, hobby.id)
    if (existing.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return c.json({ error: 'That piece already exists' }, 409)
    }

    const piece = await PieceModel.createPiece(db, user.did, {
      hobbyId: hobby.id,
      name,
      links,
      source,
    })
    return c.json({ piece: { ...piece, links: JSON.parse(piece.links) } })
  } catch (error) {
    return errorResponse(c, error, 'Failed to add piece')
  }
})

/**
 * POST /api/sessions - Log a session. pieceName is snapshotted server-side
 * from the (owned) piece so the journal survives piece rename/delete. Photos
 * are craft-only; both R2 objects must exist before the row is written.
 */
app.post('/api/sessions', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)

    const hobby = typeof body.hobbyId === 'string'
      ? await HobbyModel.getHobby(db, user.did, body.hobbyId)
      : undefined
    if (!hobby) return c.json({ error: 'Hobby not found' }, 404)

    const date: unknown = body.date
    if (typeof date !== 'string' || !DATE_RE.test(date)) {
      return c.json({ error: 'Missing or invalid date (YYYY-MM-DD)' }, 400)
    }

    let pieceId: string | null = null
    let pieceName: string | null = null
    if (body.pieceId != null) {
      const piece = typeof body.pieceId === 'string'
        ? await PieceModel.getPiece(db, user.did, body.pieceId)
        : undefined
      if (!piece || piece.hobbyId !== hobby.id) {
        return c.json({ error: 'Piece not found' }, 404)
      }
      pieceId = piece.id
      pieceName = piece.name
    }

    let photoId: string | null = null
    if (body.photoId != null) {
      if (hobby.kind !== 'craft') {
        return c.json({ error: 'Photos are only for craft hobbies' }, 400)
      }
      if (typeof body.photoId !== 'string') return c.json({ error: 'Invalid photoId' }, 400)
      const { fullKey, thumbKey } = photoKeys(body.photoId)
      if (!PHOTO_KEY_RE.test(fullKey)) return c.json({ error: 'Invalid photoId' }, 400)
      const [full, thumb] = await Promise.all([
        c.env.PHOTOS_BUCKET.head(fullKey),
        c.env.PHOTOS_BUCKET.head(thumbKey),
      ])
      if (!full || !thumb) {
        return c.json({ error: 'Photo upload incomplete — try the photo again' }, 400)
      }
      photoId = body.photoId
    }

    const session = await SessionModel.createSession(db, {
      did: user.did,
      hobbyId: hobby.id,
      pieceId,
      pieceName,
      date,
      photoId,
    })
    return c.json({ session })
  } catch (error) {
    return errorResponse(c, error, 'Failed to log session')
  }
})

/**
 * POST /api/sessions/:id/delete - Owner or admin; removes the R2 photo too.
 */
app.post('/api/sessions/:id/delete', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)

    const session = await SessionModel.getSession(db, c.req.param('id'))
    if (!session) return c.json({ error: 'Entry not found' }, 404)
    if (session.did !== user.did && !user.isAdmin) {
      return c.json({ error: 'Only the owner or an admin can delete this entry' }, 403)
    }

    if (session.photoId) {
      await deletePhoto(c.env, c.req.url, session.photoId)
    }
    await SessionModel.deleteSession(db, session.id)
    return c.json({ success: true })
  } catch (error) {
    return errorResponse(c, error, 'Failed to delete entry')
  }
})

/**
 * POST /api/muse - Three fresh {title, why} ideas for a craft hobby.
 * Real OpenAI call when the key is present; curated pool otherwise (muse.ts).
 */
app.post('/api/muse', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)

    const hobby = typeof body.hobbyId === 'string'
      ? await HobbyModel.getHobby(db, user.did, body.hobbyId)
      : undefined
    if (!hobby) return c.json({ error: 'Hobby not found' }, 404)
    if (hobby.kind !== 'craft') {
      return c.json({ error: 'The muse only visits craft hobbies' }, 400)
    }

    const excludeTitles = Array.isArray(body.excludeTitles)
      ? (body.excludeTitles as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 12)
      : []

    const [hobbyPieces, recent] = await Promise.all([
      PieceModel.listPiecesForHobby(db, user.did, hobby.id),
      SessionModel.getRecentSessionsForHobby(db, user.did, hobby.id),
    ])

    const result = await generateIdeas(c.env, {
      hobbyName: hobby.name,
      recentPieceNames: hobbyPieces.slice(-10).map((p) => p.name),
      recentSessions: recent.slice(0, 10).map((s) => ({ pieceName: s.pieceName, date: s.date })),
      excludeTitles,
    })
    return c.json(result)
  } catch (error) {
    return errorResponse(c, error, 'The muse is unavailable')
  }
})

// ---------------------------------------------------------------------------
// Photos — presigned direct-to-R2 uploads in prod, worker fallback in dev
// ---------------------------------------------------------------------------

/**
 * POST /api/request-upload - Mint a photoId + PUT URLs for full + thumb
 */
app.post('/api/request-upload', async (c) => {
  try {
    const body = await c.req.json()
    await authFromBody(c, body)
    const photoId = crypto.randomUUID()
    const { fullKey, thumbKey } = photoKeys(photoId)
    const [fullUrl, thumbUrl] = await Promise.all([
      uploadUrlFor(c.env, fullKey),
      uploadUrlFor(c.env, thumbKey),
    ])
    return c.json({ photoId, fullUrl, thumbUrl })
  } catch (error) {
    return errorResponse(c, error, 'Failed to request upload')
  }
})

/**
 * PUT /api/dev-upload/* - Dev-only byte sink into the local simulated
 * bucket; self-disables when presigning is configured (prod)
 */
app.put('/api/dev-upload/*', async (c) => {
  if (canPresign(c.env)) return c.json({ error: 'Not found' }, 404)
  const key = decodeURIComponent(c.req.path.replace('/hobbies/api/dev-upload/', ''))
  if (!PHOTO_KEY_RE.test(key)) return c.json({ error: 'Invalid key' }, 400)
  await c.env.PHOTOS_BUCKET.put(key, c.req.raw.body, {
    httpMetadata: { contentType: c.req.header('content-type') ?? 'image/jpeg' },
  })
  return c.json({ ok: true })
})

/**
 * GET /api/img/* - Serve photos from R2 with a year-long immutable edge
 * cache. Public by unguessable UUID key (photos-app trade-off).
 */
app.get('/api/img/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace('/hobbies/api/img/', ''))
  if (!PHOTO_KEY_RE.test(key)) return c.json({ error: 'Not found' }, 404)

  const cache = caches.default
  const cached = await cache.match(c.req.raw)
  if (cached) return cached

  const obj = await c.env.PHOTOS_BUCKET.get(key)
  if (!obj) return c.json({ error: 'Not found' }, 404)

  const res = new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg',
      'ETag': obj.httpEtag,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
  c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()))
  return res
})

/**
 * POST /api/reset - Reset event (admin only)
 * Broadcasts reset message and clears all non-admin users
 */
app.post('/api/reset', async (c) => {
  try {
    const body = await c.req.json()
    const { profileJwt, message } = body

    if (!profileJwt) {
      return c.json({ error: 'Missing profileJwt' }, 400)
    }

    if (!message || typeof message !== 'string') {
      return c.json({ error: 'Missing or invalid message' }, 400)
    }

    // Verify and decode the JWT to get the user's DID
    const payload = await verifyJwt(c, profileJwt)
    const did = payload.iss

    // Check if user is admin
    const db = createDb(c.env.DB)
    const isAdmin = await UserModel.isUserAdmin(db, did)

    if (!isAdmin) {
      return c.json({ error: 'Unauthorized: Admin access required' }, 403)
    }

    // Broadcast reset message to all connected clients
    await notifyDO(c, 'reset', { message })

    // Clear all non-admin users from database
    await UserModel.deleteNonAdminUsers(db)

    return c.json({ success: true })
  } catch (error) {
    console.error('Reset error:', error)
    return c.json(
      { error: 'Failed to reset', message: (error as Error).message },
      500
    )
  }
})

/**
 * Helper function to notify Durable Object about user changes
 */
async function notifyDO(c: Context<{ Bindings: Env }>, event: string, data: any): Promise<void> {
  try {
    const id = c.env.DURABLE_OBJECT.idFromName('default')
    const stub = c.env.DURABLE_OBJECT.get(id)
    await stub.fetch(new Request('http://do/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }))
  } catch (err) {
    console.error('Error notifying Durable Object:', err)
  }
}

/**
 * GET /api/ws - WebSocket endpoint for real-time updates
 * Forwards to Durable Object for connection management
 */
app.get('/api/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade')

  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket upgrade', 426)
  }

  // Forward WebSocket upgrade to Durable Object
  const id = c.env.DURABLE_OBJECT.idFromName('default')
  const stub = c.env.DURABLE_OBJECT.get(id)

  return stub.fetch(new Request('http://do/ws', {
    headers: c.req.raw.headers,
  }))
})
/**
 * GET /api - Root api endpoint - Used for health check
 */
app.get('/api', (c) => {
  return c.text('😁')
})

// Export Durable Object
export { Broadcaster }

// Export Worker fetch handler. run_worker_first routes every request here, so
// anything that isn't the API is proxied to the ASSETS binding.
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // API + WebSocket routes stay on Hono
    if (url.pathname === '/hobbies/api' || url.pathname.startsWith('/hobbies/api/')) {
      return app.fetch(request, env, ctx)
    }

    // Assets are uploaded at dist-root keys; strip the subpath before lookup.
    // Unknown paths fall through to index.html via not_found_handling (SPA).
    url.pathname = url.pathname.slice('/hobbies'.length) || '/'
    return env.ASSETS.fetch(new Request(url.toString(), request))
  },
}
