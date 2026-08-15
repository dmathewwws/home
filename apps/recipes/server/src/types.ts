/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  // D1 Database binding
  DB: D1Database

  // Durable Object namespace for real-time WebSocket broadcasting
  DURABLE_OBJECT: DurableObjectNamespace

  // Static assets binding — the worker proxies non-API requests to it with the
  // /recipes prefix stripped (asset keys are dist-root-relative)
  ASSETS: Fetcher

  // The single production origin this Worker accepts Local First Auth JWTs for;
  // unset in dev, which skips the audience check. local-first-auth v3 signs with
  // a per-origin key, so a JWT minted at another origin carries a different DID —
  // reject it (see shared/src/jwt.ts).
  ALLOWED_PRODUCTION_ORIGIN?: string

  // R2 bucket holding reflection photos (full-size + thumbnail per photo)
  PHOTOS_BUCKET: R2Bucket

  // S3-compat credentials for presigning direct-upload PUT URLs. All four are
  // deliberately absent in dev (NOT in [secrets] required), which flips
  // uploads onto the worker's dev-upload route against the local simulated
  // bucket. Creds come from Cloudflare dashboard → R2 → Manage R2 API Tokens.
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ACCOUNT_ID?: string
  R2_BUCKET_NAME?: string

  // OpenAI key for the video-import parser (transcript → ingredients + cards).
  // Dev: plain string from `.env` via [secrets] required in wrangler.toml.
  // Prod: Worker secret bound via alchemy.secret.env in alchemy.run.ts.
  // When unset, /api/parse-video returns 503 and manual entry still works.
  OPENAI_API_KEY?: string
}
