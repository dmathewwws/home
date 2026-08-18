/**
 * Request auth for the members-only app.
 *
 * App-data endpoints require a member: a valid Local First Auth JWT whose DID
 * maps to a users row that is not blocked and has `is_member` set (admins are
 * implicitly members). Membership is granted from the host console's admin UI,
 * which writes `users.is_member` directly through its D1 binding to this app's
 * database. Profile endpoints (add-user/add-avatar/remove-user) stay open so a
 * visitor can sign in and wait to be let in.
 */

import type { Context } from 'hono'
import { decodeAndVerifyJWT } from '@home/fitness-shared'
import type { Env } from './types'
import { createDb, type Database } from './db/client'
import * as UserModel from './db/models/users'
import type { User } from './db/schema'

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 400 | 401 | 403,
  ) {
    super(message)
  }
}

type Ctx = Context<{ Bindings: Env }>

async function verifiedJwtDid(c: Ctx, profileJwt: unknown): Promise<string> {
  if (!profileJwt || typeof profileJwt !== 'string') {
    throw new AuthError('Missing profileJwt', 400)
  }
  try {
    // Key everything off the cryptographically verified DID (payload.iss),
    // never off caller-supplied data.
    const payload = await decodeAndVerifyJWT(profileJwt, c.env.ALLOWED_PRODUCTION_ORIGIN)
    return payload.iss
  } catch (error) {
    throw new AuthError(`Invalid profileJwt: ${(error as Error).message}`, 401)
  }
}

/**
 * JWT valid + user exists + not blocked + member (or admin).
 */
export async function requireMember(c: Ctx, db: Database, profileJwt: unknown): Promise<User> {
  const did = await verifiedJwtDid(c, profileJwt)
  const user = await UserModel.getUserByDID(db, did)
  if (!user || user.blocked) throw new AuthError('Unauthorized', 403)
  if (!user.isMember && !user.isAdmin) {
    throw new AuthError('Members only: ask an admin to let you in', 403)
  }
  return user
}

/** Convenience for route handlers: db + member user in one call. */
export async function authFromBody(c: Ctx, body: { profileJwt?: unknown }): Promise<{ db: Database; user: User }> {
  const db = createDb(c.env.DB)
  const user = await requireMember(c, db, body.profileJwt)
  return { db, user }
}
