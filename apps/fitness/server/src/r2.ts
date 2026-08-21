/**
 * R2 progress-photo storage helpers, following the dweb-camp-cascadia photos app
 * pattern: in prod the client PUTs bytes straight to R2 via presigned URLs
 * (bytes never flow through the worker); in dev — where the four R2_*
 * presign values are deliberately absent — uploads fall back to a worker
 * route writing to the local simulated bucket.
 */

import { AwsClient } from 'aws4fetch'
import type { Env } from './types'

const UPLOAD_URL_EXPIRY_SECS = 900 // 15 min

/** Every place a photo key is accepted must match this exact scheme. */
export const PHOTO_KEY_RE = /^photos\/[0-9a-f-]{36}\/(full|thumb)\.jpg$/

export const photoKeys = (photoId: string) => ({
  fullKey: `photos/${photoId}/full.jpg`,
  thumbKey: `photos/${photoId}/thumb.jpg`,
})

export function canPresign(env: Env): boolean {
  return !!(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ACCOUNT_ID && env.R2_BUCKET_NAME)
}

async function presignPut(env: Env, key: string): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    service: 's3',
    region: 'auto',
  })
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`)
  url.searchParams.set('X-Amz-Expires', String(UPLOAD_URL_EXPIRY_SECS))
  // signQuery signs only host/path/query, so the client's Content-Type header
  // is accepted as-is and stored as the object's content type.
  const signed = await client.sign(new Request(url, { method: 'PUT' }), { aws: { signQuery: true } })
  return signed.url
}

export async function uploadUrlFor(env: Env, key: string): Promise<string> {
  if (canPresign(env)) return presignPut(env, key)
  // Relative → Vite proxy → this worker's dev-upload route
  return `/fitness/api/dev-upload/${key}`
}

/**
 * Best-effort purge of the edge cache entries for a photo's img URLs
 * (they're served with a year-long immutable TTL).
 */
export async function purgeImgCache(requestUrl: string, keys: string[]): Promise<void> {
  const cache = caches.default
  await Promise.all(
    keys.map((key) =>
      cache.delete(new URL(`/fitness/api/img/${key}`, requestUrl).toString()).catch(() => false),
    ),
  )
}

/**
 * Delete a photo's R2 objects and purge their cache entries. Best-effort.
 */
export async function deletePhoto(env: Env, requestUrl: string, photoId: string): Promise<void> {
  const { fullKey, thumbKey } = photoKeys(photoId)
  await Promise.all([
    env.PHOTOS_BUCKET.delete(fullKey).catch(() => undefined),
    env.PHOTOS_BUCKET.delete(thumbKey).catch(() => undefined),
    purgeImgCache(requestUrl, [fullKey, thumbKey]),
  ])
}
