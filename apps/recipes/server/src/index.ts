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
import * as RecipeModel from './db/models/recipes'
import * as ReflectionModel from './db/models/reflections'
import * as IngredientModel from './db/models/ingredients'
import { decodeAndVerifyJWT } from '@home/recipes-shared'
import { AuthError, authFromBody, requireOwnerOrAdmin } from './auth'
import { ValidationError, validateRecipeInput, validateReflectionInput } from './validation'
import { PHOTO_KEY_RE, canPresign, deletePhoto, photoKeys, uploadUrlFor } from './r2'

// The app is served under /<slug>/ on the shared domain; basePath keeps every
// handler's route written as /api/* while matching /<slug>/api/* on the wire.
const app = new Hono<{ Bindings: Env }>().basePath('/recipes')

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
 * Turn typed errors from auth/validation into JSON responses; everything
 * else is a 500.
 */
function errorResponse(c: Context<{ Bindings: Env }>, error: unknown, fallback: string) {
  if (error instanceof AuthError) return c.json({ error: error.message }, error.status)
  if (error instanceof ValidationError) return c.json({ error: error.message }, 400)
  console.error(`${fallback}:`, error)
  return c.json({ error: fallback, message: (error as Error).message }, 500)
}

// ---------------------------------------------------------------------------
// Recipes — the shared household box. Reads included, everything below
// requires a member ({profileJwt} in the body), so app data never leaves
// the household. Membership is granted from the host console's admin UI.
// ---------------------------------------------------------------------------

/**
 * POST /api/recipes/list - All recipes with ingredient chips + tally counts
 */
app.post('/api/recipes/list', async (c) => {
  try {
    const body = await c.req.json()
    const { db } = await authFromBody(c, body)
    const recipes = await RecipeModel.listRecipes(db)
    return c.json({ recipes })
  } catch (error) {
    return errorResponse(c, error, 'Failed to list recipes')
  }
})

/**
 * POST /api/recipes/:id/get - Full recipe: cards, swaps, "Last time" note
 */
app.post('/api/recipes/:id/get', async (c) => {
  try {
    const body = await c.req.json()
    const { db } = await authFromBody(c, body)
    const recipe = await RecipeModel.getRecipeFull(db, c.req.param('id'))
    if (!recipe) return c.json({ error: 'Recipe not found' }, 404)
    return c.json({ recipe })
  } catch (error) {
    return errorResponse(c, error, 'Failed to fetch recipe')
  }
})

/**
 * POST /api/recipes - Create a recipe (validates the 140-char card rule)
 */
app.post('/api/recipes', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)
    const input = validateRecipeInput(body.recipe)
    const recipe = await RecipeModel.createRecipe(db, user.did, input)
    await notifyDO(c, 'recipe-created', { id: recipe.id })
    return c.json({ recipe })
  } catch (error) {
    return errorResponse(c, error, 'Failed to create recipe')
  }
})

/**
 * POST /api/recipes/:id/update - Replace a recipe's fields + ingredients
 */
app.post('/api/recipes/:id/update', async (c) => {
  try {
    const body = await c.req.json()
    const { db } = await authFromBody(c, body)
    const input = validateRecipeInput(body.recipe)
    const recipe = await RecipeModel.updateRecipe(db, c.req.param('id'), input)
    if (!recipe) return c.json({ error: 'Recipe not found' }, 404)
    await notifyDO(c, 'recipe-updated', { id: recipe.id })
    return c.json({ recipe })
  } catch (error) {
    return errorResponse(c, error, 'Failed to update recipe')
  }
})

/**
 * POST /api/recipes/:id/delete - Owner or admin only
 */
app.post('/api/recipes/:id/delete', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)
    const id = c.req.param('id')
    const recipe = await RecipeModel.getRecipeById(db, id)
    if (!recipe) return c.json({ error: 'Recipe not found' }, 404)
    requireOwnerOrAdmin(user, recipe.createdBy)
    await RecipeModel.deleteRecipe(db, id)
    await notifyDO(c, 'recipe-deleted', { id })
    return c.json({ success: true })
  } catch (error) {
    return errorResponse(c, error, 'Failed to delete recipe')
  }
})

// ---------------------------------------------------------------------------
// Ingredient catalog — search + the "You use these a lot" tray
// ---------------------------------------------------------------------------

/**
 * POST /api/ingredients/search - Case-insensitive catalog search
 */
app.post('/api/ingredients/search', async (c) => {
  try {
    const body = await c.req.json()
    const { db } = await authFromBody(c, body)
    const q = typeof body.q === 'string' ? body.q.trim() : ''
    if (!q) return c.json({ error: 'Missing q' }, 400)
    const ingredients = await IngredientModel.searchIngredients(db, q)
    return c.json({ ingredients })
  } catch (error) {
    return errorResponse(c, error, 'Failed to search ingredients')
  }
})

/**
 * POST /api/ingredients/frequent - Most-used ingredients, padded with staples
 */
app.post('/api/ingredients/frequent', async (c) => {
  try {
    const body = await c.req.json()
    const { db } = await authFromBody(c, body)
    const ingredients = await IngredientModel.frequentIngredients(db)
    return c.json({ ingredients })
  } catch (error) {
    return errorResponse(c, error, 'Failed to fetch frequent ingredients')
  }
})

// ---------------------------------------------------------------------------
// Reflections — the cooking journal
// ---------------------------------------------------------------------------

/**
 * POST /api/reflections/list - All reflections, newest cook first
 */
app.post('/api/reflections/list', async (c) => {
  try {
    const body = await c.req.json()
    const { db } = await authFromBody(c, body)
    const reflections = await ReflectionModel.listReflections(db)
    return c.json({ reflections })
  } catch (error) {
    return errorResponse(c, error, 'Failed to list reflections')
  }
})

/**
 * POST /api/reflections - Create a reflection. If it carries a photo, both
 * R2 objects must already exist (uploaded via request-upload URLs).
 */
app.post('/api/reflections', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)
    const input = validateReflectionInput(body.reflection)

    if (input.photoId) {
      const { fullKey, thumbKey } = photoKeys(input.photoId)
      if (!PHOTO_KEY_RE.test(fullKey)) return c.json({ error: 'Invalid photoId' }, 400)
      const [full, thumb] = await Promise.all([
        c.env.PHOTOS_BUCKET.head(fullKey),
        c.env.PHOTOS_BUCKET.head(thumbKey),
      ])
      if (!full || !thumb) return c.json({ error: 'Photo upload incomplete — try the photo again' }, 400)
    }

    const reflection = await ReflectionModel.createReflection(db, user.did, input)
    if (!reflection) return c.json({ error: 'Recipe not found' }, 404)
    await notifyDO(c, 'reflection-created', { id: reflection.id, recipeId: reflection.recipeId })
    return c.json({ reflection })
  } catch (error) {
    return errorResponse(c, error, 'Failed to save reflection')
  }
})

/**
 * POST /api/reflections/:id/delete - Owner or admin; removes R2 photo too
 */
app.post('/api/reflections/:id/delete', async (c) => {
  try {
    const body = await c.req.json()
    const { db, user } = await authFromBody(c, body)
    const id = c.req.param('id')
    const reflection = await ReflectionModel.getReflectionById(db, id)
    if (!reflection) return c.json({ error: 'Reflection not found' }, 404)
    requireOwnerOrAdmin(user, reflection.createdBy)
    await ReflectionModel.deleteReflection(db, id)
    if (reflection.photoId) {
      await deletePhoto(c.env, c.req.url, reflection.photoId)
    }
    await notifyDO(c, 'reflection-deleted', { id, recipeId: reflection.recipeId })
    return c.json({ success: true })
  } catch (error) {
    return errorResponse(c, error, 'Failed to delete reflection')
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
  const key = decodeURIComponent(c.req.path.replace('/recipes/api/dev-upload/', ''))
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
  const key = decodeURIComponent(c.req.path.replace('/recipes/api/img/', ''))
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
    if (url.pathname === '/recipes/api' || url.pathname.startsWith('/recipes/api/')) {
      return app.fetch(request, env, ctx)
    }

    // Assets are uploaded at dist-root keys; strip the subpath before lookup.
    // Unknown paths fall through to index.html via not_found_handling (SPA).
    url.pathname = url.pathname.slice('/recipes'.length) || '/'
    return env.ASSETS.fetch(new Request(url.toString(), request))
  },
}
