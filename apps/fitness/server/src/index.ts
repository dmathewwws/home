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
import * as ActivityLogModel from './db/models/activityLogs'
import * as WeightEntryModel from './db/models/weightEntries'
import { ACTIVITY_KEYS, type ActivityKey } from './db/schema'
import { decodeAndVerifyJWT } from '@home/fitness-shared'
import { AuthError, authFromBody } from './auth'
import { PHOTO_KEY_RE, canPresign, deletePhoto, photoKeys, uploadUrlFor } from './r2'

// The app is served under /<slug>/ on the shared domain; basePath keeps every
// handler's route written as /api/* while matching /<slug>/api/* on the wire.
const app = new Hono<{ Bindings: Env }>().basePath('/fitness')

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

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Loose recency bounds on client-minted local date keys: allow up to UTC
 * today + 1 day (a client west of UTC can legitimately be "behind" it, one
 * east of UTC "ahead") and no more than ~a year back.
 */
function validateLogDate(date: unknown): string | null {
  if (typeof date !== 'string' || !DATE_KEY_RE.test(date)) return null
  const max = new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 10)
  const min = new Date(Date.now() - 366 * 86400 * 1000).toISOString().slice(0, 10)
  if (date > max || date < min) return null
  return date
}

/**
 * POST /api/activities/range - A user's activity logs in an inclusive date range (members only)
 */
app.post('/api/activities/range', async (c) => {
  try {
    const body = await c.req.json()
    const { from, to } = body
    if (typeof from !== 'string' || !DATE_KEY_RE.test(from) ||
        typeof to !== 'string' || !DATE_KEY_RE.test(to) || from > to) {
      return c.json({ error: 'Invalid date range' }, 400)
    }
    const { db, user } = await authFromBody(c, body)
    const logs = await ActivityLogModel.getLogsInRange(db, user.did, from, to)
    return c.json({ logs })
  } catch (error) {
    if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
    console.error('Error fetching activity range:', error)
    return c.json({ error: 'Failed to fetch activities', message: (error as Error).message }, 500)
  }
})

/**
 * POST /api/activities/log - Upsert a user's activity set for one day (members only)
 */
app.post('/api/activities/log', async (c) => {
  try {
    const body = await c.req.json()
    const date = validateLogDate(body.date)
    if (!date) return c.json({ error: 'Invalid date' }, 400)
    if (!Array.isArray(body.activities) || body.activities.length > ACTIVITY_KEYS.length ||
        !body.activities.every((a: unknown) => (ACTIVITY_KEYS as readonly string[]).includes(a as string))) {
      return c.json({ error: 'Invalid activities' }, 400)
    }
    const activities = [...new Set(body.activities as ActivityKey[])]
    const { db, user } = await authFromBody(c, body)
    const log = await ActivityLogModel.upsertLog(db, user.did, date, activities)
    await notifyDO(c, 'activity-logged', { did: user.did, date })
    return c.json({ log })
  } catch (error) {
    if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
    console.error('Error logging activities:', error)
    return c.json({ error: 'Failed to log activities', message: (error as Error).message }, 500)
  }
})

/**
 * POST /api/weights/list - All of a user's weight entries, oldest first (members only)
 */
app.post('/api/weights/list', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)
    const entries = await WeightEntryModel.listEntries(db, user.did)
    return c.json({ entries })
  } catch (error) {
    if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
    console.error('Error fetching weights:', error)
    return c.json({ error: 'Failed to fetch weights', message: (error as Error).message }, 500)
  }
})

/**
 * POST /api/weights/log - Upsert a user's weight for one day, in kg (members only)
 *
 * `photoId` is optional and tri-state: omit it to keep the day's existing
 * photo, pass a uuid to attach one (both R2 objects must already exist), or
 * pass null to clear it. A superseded photo's objects are deleted.
 */
app.post('/api/weights/log', async (c) => {
  try {
    const body = await c.req.json()
    const date = validateLogDate(body.date)
    if (!date) return c.json({ error: 'Invalid date' }, 400)
    const kg = typeof body.kg === 'number' && Number.isFinite(body.kg)
      ? Math.round(body.kg * 10) / 10
      : NaN
    if (!(kg >= 30 && kg <= 250)) return c.json({ error: 'Weight must be between 30 and 250 kg' }, 400)

    // undefined = keep whatever the row has; null = clear; string = set
    let photoId: string | null | undefined
    if (body.photoId === null) {
      photoId = null
    } else if (typeof body.photoId === 'string') {
      photoId = body.photoId
    } else if (body.photoId !== undefined) {
      return c.json({ error: 'Invalid photoId' }, 400)
    }

    const { db, user } = await authFromBody(c, body)

    if (typeof photoId === 'string') {
      const { fullKey, thumbKey } = photoKeys(photoId)
      if (!PHOTO_KEY_RE.test(fullKey)) return c.json({ error: 'Invalid photoId' }, 400)
      const [full, thumb] = await Promise.all([
        c.env.PHOTOS_BUCKET.head(fullKey),
        c.env.PHOTOS_BUCKET.head(thumbKey),
      ])
      if (!full || !thumb) return c.json({ error: 'Photo upload incomplete — try the photo again' }, 400)
    }

    // Read the stored photo before the upsert so a replaced one can be purged
    const previous = photoId === undefined ? null : await WeightEntryModel.getEntry(db, user.did, date)
    const entry = await WeightEntryModel.upsertEntry(db, user.did, date, kg, photoId)
    if (previous?.photoId && previous.photoId !== entry.photoId) {
      await deletePhoto(c.env, c.req.url, previous.photoId)
    }
    await notifyDO(c, 'weight-logged', { did: user.did, date })
    return c.json({ entry })
  } catch (error) {
    if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
    console.error('Error logging weight:', error)
    return c.json({ error: 'Failed to log weight', message: (error as Error).message }, 500)
  }
})

/**
 * POST /api/weights/delete - Remove the caller's entry for one day, and its
 * progress photo if it had one (members only)
 */
app.post('/api/weights/delete', async (c) => {
  try {
    const body = await c.req.json()
    if (typeof body.date !== 'string' || !DATE_KEY_RE.test(body.date)) {
      return c.json({ error: 'Invalid date' }, 400)
    }
    const { db, user } = await authFromBody(c, body)
    // Scoped to the verified DID — a caller can only ever delete their own row
    const deleted = await WeightEntryModel.deleteEntry(db, user.did, body.date)
    if (!deleted) return c.json({ error: 'No entry for that date' }, 404)
    if (deleted.photoId) await deletePhoto(c.env, c.req.url, deleted.photoId)
    await notifyDO(c, 'weight-deleted', { did: user.did, date: body.date })
    return c.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
    console.error('Error deleting weight:', error)
    return c.json({ error: 'Failed to delete weight', message: (error as Error).message }, 500)
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
    if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
    console.error('Error requesting upload:', error)
    return c.json({ error: 'Failed to request upload', message: (error as Error).message }, 500)
  }
})

/**
 * PUT /api/dev-upload/* - Dev-only byte sink into the local simulated
 * bucket; self-disables when presigning is configured (prod)
 */
app.put('/api/dev-upload/*', async (c) => {
  if (canPresign(c.env)) return c.json({ error: 'Not found' }, 404)
  const key = decodeURIComponent(c.req.path.replace('/fitness/api/dev-upload/', ''))
  if (!PHOTO_KEY_RE.test(key)) return c.json({ error: 'Invalid key' }, 400)
  await c.env.PHOTOS_BUCKET.put(key, c.req.raw.body, {
    httpMetadata: { contentType: c.req.header('content-type') ?? 'image/jpeg' },
  })
  return c.json({ ok: true })
})

/**
 * GET /api/img/* - Serve photos from R2 with a year-long immutable edge
 * cache. Public by unguessable UUID key, so a plain <img src> works.
 */
app.get('/api/img/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace('/fitness/api/img/', ''))
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
    if (url.pathname === '/fitness/api' || url.pathname.startsWith('/fitness/api/')) {
      return app.fetch(request, env, ctx)
    }

    // Assets are uploaded at dist-root keys; strip the subpath before lookup.
    // Unknown paths fall through to index.html via not_found_handling (SPA).
    url.pathname = url.pathname.slice('/fitness'.length) || '/'
    return env.ASSETS.fetch(new Request(url.toString(), request))
  },
}
