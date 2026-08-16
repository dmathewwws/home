# CLAUDE.md — Host Console

Guidance for Claude Code when working on `apps/console`, the multi-app **host**.

## Project Overview

This app is the catch-all Cloudflare Worker for the whole domain. It serves a **landing
grid** of mini apps at `/`, filtered per user: the grid shows the apps the caller is a
member of (`GET /api/my-apps` checks each child app's D1; host admins see every
registered app), plus a Settings card for everyone — see Authentication below.
`/settings` stays open so visitors can create/import/export a profile. It also serves an
SPA fallback for unclaimed paths and an authed **admin console** (Settings → Admin).
Card metadata lives in the shared registry (`shared/src/apps.ts`). Each mini app is an
independent Worker bound to `<domain>/<slug>/*` — the most-specific route wins, so child
apps automatically override this catch-all for their own paths. The bare `/<slug>` path
is not claimed; inbound links always use the trailing-slash form `/<slug>/`.

Unlike the mini apps, the host has **no Durable Object and no WebSockets**. It does have
its own D1 (`users.is_admin` gates the admin console and grants full grid visibility)
and binds each managed child app's D1 directly, both so operators can manage users
across apps (membership included) and to answer per-user grid visibility.

See [`docs/domain-setup.md`](./docs/domain-setup.md) (zone + proxied DNS + routes
prerequisite) and [`docs/hosting-a-mini-app.md`](./docs/hosting-a-mini-app.md)
(child-app subpath + admin contract).

## Key Files

### Client (`client/`)

- `src/lib/appCards.ts` — the `AppCard` grid/admin card shape, the host-internal cards
  (Settings, the synthetic "Home (console)" admin card), and `cardForManagedApp()`
  deriving a card (path `/<slug>/`) from a shared-registry entry
- `src/routes/home.tsx` — landing grid: joins the caller's `GET /api/my-apps` slugs
  against `MANAGED_APPS` for metadata, always appends the Settings card, plus the
  members-only and "no mini apps yet" states
- `src/routes/settings.tsx` — profile + the admin section (stays open to non-members)
- `src/components/admin/` — `AdminSection.tsx` (self-gating via `GET /api/admin/status`;
  lists the host card plus every `MANAGED_APPS` entry),
  `AdminAppCard.tsx` (per-app user management)
- `src/lib/adminApi.ts` — typed client for the admin API
- `src/lib/memberApi.ts` — `getMyApps()`: restores `window.localFirstAuth` from the
  stored profile and asks `GET /api/my-apps` (the console has no auth context/hook)
- `public/local-first-auth-manifest.json` — mini-app manifest (name, icon, permissions)

### Server (`server/`)

- `src/index.ts` — Hono router: profile endpoints + admin API (tables below)
- `src/admin-apps.ts` — resolves a managed app slug to its bound D1 (`dbForSlug`)
- `src/types.ts` — `Env`: host `DB`, `ALLOWED_PRODUCTION_ORIGIN`, plus one binding per
  `ChildBindingKey`
- `src/db/` — Drizzle schema, models, migrations for the host's own D1

### Shared (`shared/`)

- `src/apps.ts` — **`MANAGED_APPS` registry + `ChildBindingKey` + `HOST_APP_SLUG`**, the
  single source of truth shared by `alchemy.run.ts` (binds each child D1 by UUID),
  `server/src/admin-apps.ts`, and the client landing grid (card display metadata:
  name/description/icon/accent). `HOST_APP_SLUG` (`'console'`) is a reserved slug the
  admin API resolves to the host's own D1. Extend `MANAGED_APPS` + `ChildBindingKey`
  when registering an app
- `src/jwt.ts` — `decodeAndVerifyJWT` (EdDSA signature, expiry, allowed origin)

## Development Commands

```bash
pnpm dev              # from apps/console: worker :8787 + vite :5173
pnpm dev:simulator    # …with a fake Local First Auth user (no phone needed)
pnpm build            # build shared, then client
pnpm db:run-migrations       # migrate the local host D1
pnpm db:generate-migrations  # regenerate migrations from schema changes
```

## API Reference

### Profile (host's own D1)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api` | Health check | Public |
| `POST` | `/api/add-user` | Upsert caller's profile (name + socials) | JWT |
| `POST` | `/api/add-avatar` | Upsert caller's avatar | JWT |
| `GET` | `/api/member/status` | Is the caller a member of the host itself? (never errors; `isMember: false`; admins implicitly members) | JWT (Bearer) |
| `GET` | `/api/my-apps` | Which managed apps the landing grid shows the caller (`{isAdmin, apps}`; admins get all, others get per-app membership from each child D1; never errors) | JWT (Bearer) |

### Admin (`/api/admin/*` — caller must be flagged `is_admin` in the host D1)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/status` | Is the caller an operator? (never errors; `isAdmin: false`) |
| `GET` | `/api/admin/apps/:slug/users` | List a managed app's users |
| `POST` | `/api/admin/apps/:slug/users/:did/grant-admin` | Make a user an admin of that app |
| `POST` | `/api/admin/apps/:slug/users/:did/revoke-admin` | Revoke a user's admin |
| `POST` | `/api/admin/apps/:slug/users/:did/grant-member` | Make a user a member of that app |
| `POST` | `/api/admin/apps/:slug/users/:did/revoke-member` | Revoke a user's membership |
| `DELETE` | `/api/admin/apps/:slug/users/:did` | Remove a user from that app |
| `POST` | `/api/admin/apps/:slug/users/:did/block` | Block a user (needs a `blocked` column in the child app) |

The reserved slug `console` (`HOST_APP_SLUG`) targets the host's own D1, so operators
can manage landing-grid membership/operators from the same routes. Every admin endpoint
independently re-verifies the caller server-side; the client-side gate is visibility
only. Granting the first operator is a manual DB edit — see
[`docs/admin-setup.md`](./docs/admin-setup.md).

## Registering a mini app with the host

The canonical checklist is **"Register with the host console"** in
[`docs/hosting-a-mini-app.md`](./docs/hosting-a-mini-app.md). In short, after the
child app's first deploy (you need its real prod D1 UUID from `wrangler d1 list`):

1. `shared/src/apps.ts` — add the entry to `MANAGED_APPS` (including the card metadata:
   name, description, icon, accent — the grid links to `/<slug>/`, derived) **and**
   extend `ChildBindingKey` (replace `never` with the union of binding keys, e.g.
   `'DB_CHECK_IN'` — a `MANAGED_APPS` entry without it is a compile error)
2. `wrangler.toml` — add the matching `DB_<SLUG>` dev binding (commented example block
   is in the file)
3. Redeploy the host (`pnpm deploy:cloudflare`)

## Database

The host owns only its own D1 (`<workspace>-dev-db` locally, `<workspace>-<stage>-db`
in prod). Child databases are referenced by UUID, never created or migrated here.

```bash
pnpm wrangler d1 execute home-dev-db --local --command "SELECT * FROM users;"
pnpm wrangler d1 execute home-prod-db --remote --command "SELECT * FROM users;"
```

Migration workflow: edit `server/src/db/schema.ts` → `pnpm db:generate-migrations` →
`pnpm db:run-migrations` locally; production migrations apply automatically on deploy
via Alchemy's `migrationsDir`.

## Authentication

Auth uses the Local First Auth spec (full spec:
[`../../docs/local-first-auth-spec.md`](../../docs/local-first-auth-spec.md)): the
browser injects `window.localFirstAuth`, identity is a `did:key`, and API calls carry
short-lived EdDSA JWTs verified by `shared/src/jwt.ts` against `ALLOWED_PRODUCTION_ORIGIN`
(prod only — it's unset in dev, which skips the audience check).

The console client has **no auth context/provider** — Settings uses `useOnboarding()`
from `local-first-auth/react` directly, and the Home route asks
`getMyApps()` (`client/src/lib/memberApi.ts`), which restores
`window.localFirstAuth` from the stored profile and calls `GET /api/my-apps`.
Both Home and Settings best-effort upsert the caller into the host D1 on mount via
`syncProfileToDatabase()` (`client/src/lib/userApi.ts`) — this is what registers
native-host (Antler) users, who never pass through the web profile editors.

Landing-grid states (`Home` in `client/src/routes/home.tsx`):

| State | Condition | Show |
|---|---|---|
| Resolving | result still `null` | Subtle loading text |
| Signed out | no profile / no `window.localFirstAuth` | Members-only card → "create your profile in Settings" |
| No memberships | zero app memberships and not a host admin | Members-only card → "ask an admin to make you a member" |
| Member / admin | member of ≥1 app, or host admin (sees all) | The grid, filtered to their apps, plus Settings |

## Deployment

`alchemy.run.ts` deploys the Worker + host D1 + managed-app bindings
(`pnpm deploy:cloudflare`). `wrangler.toml` is **dev-only**. The `<domain>/*` catch-all
route attaches automatically at deploy once `ALLOWED_PRODUCTION_ORIGIN` is your real
domain (path routing needs a real zone + proxied DNS record — see
[`docs/domain-setup.md`](./docs/domain-setup.md)); with the placeholder still in place
you only get the workers.dev URL. The `ALLOWED_PRODUCTION_ORIGIN` value is a committed
literal in `alchemy.run.ts` on purpose (see [`docs/secrets.md`](./docs/secrets.md)) —
replace `https://your-domain.example` with your domain.

## Troubleshooting

- **JWT verification failures** — expired token, invalid signature, malformed DID
  (must start with `did:key:z`), or (prod only) the JWT's `aud` doesn't match
  `ALLOWED_PRODUCTION_ORIGIN`
- **Admin section not showing** — the caller's DID isn't flagged `is_admin` in the
  *host's* D1 ([`docs/admin-setup.md`](./docs/admin-setup.md))
- **"Unknown app" from admin endpoints** — slug not in `MANAGED_APPS`, or the dev
  binding is missing from `wrangler.toml`
- **Grid empty / members-only card in dev** — the dev child-app bindings are empty
  local copies, so nobody has memberships. Either grant yourself host admin locally
  ([`docs/admin-setup.md`](./docs/admin-setup.md) — admins see every app) or seed the
  local child copy, e.g.
  `pnpm wrangler d1 execute home-recipes-mini-app-dev-db --local --command "INSERT INTO users (did, is_member) VALUES ('<your did>', 1) ON CONFLICT(did) DO UPDATE SET is_member=1"`
- **Port 8787 in use** — see
  [`../../docs/port-troubleshooting.md`](../../docs/port-troubleshooting.md)
