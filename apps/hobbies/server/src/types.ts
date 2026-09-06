/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  // D1 Database binding
  DB: D1Database

  // Durable Object namespace for real-time WebSocket broadcasting
  DURABLE_OBJECT: DurableObjectNamespace

  // Static assets binding — the worker proxies non-API requests to it with the
  // /hobbies prefix stripped (asset keys are dist-root-relative)
  ASSETS: Fetcher

  // The single production origin this Worker accepts Local First Auth JWTs for;
  // unset in dev, which skips the audience check. local-first-auth v3 signs with
  // a per-origin key, so a JWT minted at another origin carries a different DID —
  // reject it (see shared/src/jwt.ts).
  ALLOWED_PRODUCTION_ORIGIN?: string

  // R2 bucket for chalk-drawing photos. wrangler dev --local simulates it on disk.
  PHOTOS_BUCKET: R2Bucket

  // S3-compat presign values for direct-to-R2 uploads. Deliberately absent in
  // dev — uploads then fall back to the worker's dev-upload route (see r2.ts).
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_ACCOUNT_ID?: string
  R2_BUCKET_NAME?: string

  // OpenAI key for the muse. Deliberately optional: absent (the dev default),
  // the muse serves the curated per-hobby pool instead (see muse.ts).
  OPENAI_API_KEY?: string

  // Example runtime secret (see docs/secrets.md for the full add-a-secret pattern).
  // Dev: plain string from `.env` via [secrets] required in wrangler.toml.
  // Prod: Worker secret bound via alchemy.secret.env in alchemy.run.ts.
  // MY_SECRET?: string
}
