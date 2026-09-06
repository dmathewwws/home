# CLAUDE.md for Hobbies

This file provides guidance to Claude Code (claude.ai/code) when working with code in this app.

## Project Overview

A mini app living at `apps/hobbies` inside a multi-app workspace, served under
`/hobbies/` on the shared domain (Vite `base`, React Router `basename`, and Hono
`basePath('/hobbies')` are already wired — client API calls are
`import.meta.env.BASE_URL`-relative). Uses Local First Auth spec for user signup and
authentication, SQLite database, WebSocket for real-time updates, REST API for backend
endpoints.

### Project Structure

This is a pnpm workspace monorepo with three packages:

| Package | Description |
|---------|-------------|
| `client/` | React frontend |
| `server/` | Cloudflare Workers, D1 (SQLite), Durable Objects (WebSocket) |
| `shared/` | Shared utilities (JWT verification) |

### Key Files

#### Client (`/client/`)

- `/client/src/components/` - React components
  - `Heatmap.tsx` - The 12-week × 7-day grid; per-day dominant-hobby hue, intensity by session count, today-tile pop animation
  - `HobbyChips.tsx` - Hobby chip row + inline add-hobby form (name, learn/craft, hue swatch)
  - `PiecePicker.tsx` - Learn: rows with lesson-link pills; craft: prompt chips; inline add/edit-piece form; an Edit/Done toggle flips the list into edit mode (✎ rename, × delete-with-confirm)
  - `MuseSection.tsx` - AI ideation for craft hobbies (shimmer → 3 idea cards → save-as-piece)
  - `PhotoAttach.tsx` - Craft-only photo attach: client-side resize → presigned/dev-upload PUT
  - `EntryRow.tsx` - Journal entry (dot, piece, optional thumb, date, delete-with-confirm)
  - `TabNav.tsx` - Fixed bottom Today/Logs tab bar (mobile only, `md:hidden`); also exports `NavPills`, the desktop header nav (`hidden md:flex`)
  - `Toast.tsx` - `ToastProvider` + `useToast()`
  - `Avatar.tsx` - User avatar or placeholder
  - `AdminSection.tsx` - Admin-only controls for resetting the event
  - `Footer.tsx` - Footer with attribution link
  - `HomeButton.tsx` - Icon-only link back to the host console's landing grid (plain `<a>`, not a react-router `Link`)
- `/client/src/hooks/` - React hooks
  - `useLocalFirstAuth.tsx` - Authentication state management, exports `AuthProvider` and `useLocalFirstAuth()` hook
  - `useHobbyData.tsx` - All hobby data: loads `/api/bootstrap` once, patches state from mutation responses (`addHobby`, `addPiece`, `logSession`, `removeSession`, `summonMuse`)
  - `useWebSockets.ts` - WebSocket connection hook (only the admin reset flow; hobby data does not broadcast)
- `/client/src/lib/` - Client utilities
  - `api.ts` - Typed POST helpers (fresh profileJwt per call), `imgUrl()`
  - `types.ts` - API response shapes (`Hobby`, `Piece`, `SessionEntry`, `HeatDatum`, …)
  - `hues.ts` - The fixed 8-hue pastel palette, `mix()` paper-blend, heatmap intensity
  - `dates.ts` - `'YYYY-MM-DD'` day keys (user-local), display formats, trailing-window helper
  - `image.ts` - Client-side photo processing (2048px full / 640px thumb JPEG, strips EXIF) + `putWithProgress`
- `/client/src/routes/` - Route components
  - `index.tsx` - React Router root route (Today at `/`, Logs at `/logs`)
  - `today.tsx` - Heatmap + hobby chips + piece picker + log flow
  - `logs.tsx` - The journal of every session (delete-only), AdminSection for admins
  - `not-found.tsx` - 404 page
- `/client/src/app.tsx` - "Chalk & Paper" shell (430px paper column), auth gates (signed-out hero / waiting / member app), modals
- `/client/src/main.tsx` - Entry point (initializes Local First Auth Simulator when `VITE_ENABLE_LOCAL_FIRST_AUTH_SIMULATOR=true`)
- `/client/public/` - Public files
  - `local-first-auth-manifest.json` - Mini app manifest with metadata and requested permissions
  - `icon.webp` - Mini app icon
- `/client/vite.config.ts` - Vite configuration with proxy to backend

#### Server (`/server/`)

- `/server/src/index.ts` - Cloudflare Workers entry point with Hono router, API endpoints, and WebSocket handling
- `/server/src/auth.ts` - Request auth (`AuthError`, `requireMember`, `authFromBody`): app-data endpoints require a member (`users.is_member`, or admin), granted from the host console
- `/server/src/muse.ts` - The AI muse: OpenAI Chat Completions call (strict JSON schema) with a curated per-hobby fallback pool (`SPARK_POOLS`, keyed by lowercased hobby name, plus a hobby-agnostic default) whenever `OPENAI_API_KEY` is absent or the call fails
- `/server/src/r2.ts` - R2 photo helpers (presigned direct-to-R2 PUTs in prod; dev-upload fallback; `deletePhoto` + edge-cache purge)
- `/server/src/durable-object.ts` - Durable Object class for real-time WebSocket connections (WebSocket message types defined inline)
- `/server/src/db/client.ts` - Database client factory for Cloudflare D1
- `/server/src/db/schema.ts` - Database schema: `users`, `hobbies` (kind: learn|craft, hueIndex), `pieces` (JSON links, source: seed|user|muse), `sessions` (pieceName snapshot, date key, photoId)
- `/server/src/db/seed.ts` - Per-member starter data (the seven founding hobbies + pieces), called from `/api/bootstrap`; self-healing — it inserts only the seed hobbies a member is missing, so hobbies added to `SEED_HOBBIES` later reach existing members on their next bootstrap
- `/server/src/db/models/index.ts` - Export file for all models
- `/server/src/db/models/users.ts` - User database model
- `/server/src/db/models/hobbies.ts`, `pieces.ts`, `sessions.ts` - Hobby-data models, all did-scoped (per-member privacy)
- `/server/src/db/migrations/` - D1 SQL migration files (auto-generated)
- `/server/drizzle.config.js` - Drizzle Kit configuration for migrations
- `/server/src/types.ts` - Type definitions for Cloudflare Workers environment bindings

#### Shared (`/shared/`)

- `/shared/src/index.ts` - Main export file for shared utilities
- `/shared/src/jwt.ts` - JWT decoding and verification utilities (`decodeAndVerifyJWT`, `decodeJWT`)

#### Root

- `/docs/` - App-specific documentation
  - `admin-setup.md` - Admin setup instructions
  - `secrets.md` - The canonical secrets/env-var convention: three buckets, the `[secrets]` gate, `alchemy.secret.env` bindings
- `../../docs/` - Workspace-shared reference docs
  - `local-first-auth-spec.md` - Local First Auth Specification
  - `mini-app-examples.md` - Reference examples and links to other mini apps
  - `port-troubleshooting.md` - Port troubleshooting instructions
- `/scripts/` - Helper scripts
  - `build-client-if-missing.ts` - Builds client if dist doesn't exist (runs before dev via predev hook)
  - `run-dev-migrations.ts` - Database migration script for local development
- `alchemy.run.ts` - Alchemy deployment configuration for Cloudflare Workers
- `pnpm-workspace.yaml` - Workspace configuration
- `.alchemy/state.json` - Tracks your infrastructure (created after first deployment)
- `wrangler.toml` - Cloudflare configuration (used in development only)

---

## Getting Started

### Development Commands

All commands run from this app's directory:

```bash
pnpm install              # Install all workspace dependencies (any directory works)
pnpm run dev              # Start dev server (no simulator)
pnpm run dev:simulator    # Start dev server with Local First Auth Simulator
pnpm run dev:client       # Start only client dev server (no simulator)
pnpm run dev:server       # Start only Wrangler dev server (Cloudflare Workers local mode)
pnpm run build            # Build shared package, then client
pnpm run build:client     # Build only client package
```

**Pre-Dev Hook:** The `pnpm run dev` command automatically runs a `predev` hook that executes `build-client-if-missing.ts` to build the client if the dist folder doesn't exist.

**Note:** This is a pnpm workspace. All dependencies are installed at the root level. Shared dependencies (@noble/curves, base58-universal, jwt-decode, drizzle-orm) are hoisted to the workspace root.

---

## Architecture

### Authentication

We use the library `local-first-auth` to easily add auth and a simple onboarding flow to the mini app. It uses the Local First Auth spec to simplify the signing up and onboarding process. 

**How it works:**
1. User creates a one-time account (no passwords, no email, no signup)
2. Profile details are stored client-side in the browser's local storage
3. The `window.localFirstAuth` API is injected into the page
4. Mini app calls `getProfileDetails()` to access the user's profile details

See `../../docs/local-first-auth-spec.md` for the full specification.

#### Local First Auth Simulator

To use a test user account without having to go through the onboarding flow, you can use the Local First Auth Simulator. The simulator injects the `window.localFirstAuth` API into a regular browser, allowing you to test your mini app locally without having to scan a QR code.

```bash
pnpm dev:simulator    # Start dev server with simulator enabled (floating debug panel visible)
pnpm dev              # Start dev server without simulator
```

**Note:** The simulator is a development-only tool and should never be used in production.

#### Onboarding for Logged-Out Users

**Auth States:**
| State | Condition | What to Show |
|-------|-----------|--------------|
| Loading | `loading === true` | Loading spinner |
| Logged Out | `user === null` | Onboarding trigger |
| Waiting | `user && !user.isMember && !user.isAdmin` | Members-only waiting screen (handled by `Layout` in `app.tsx`; polls `refreshUser` every ~30s) |
| Member | `user.isMember \|\| user.isAdmin` | User content |

**Pattern:**

```tsx
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'

function MyComponent() {
  const { user, setIsOnboardingModalOpen, getProfileJwt } = useLocalFirstAuth()

  // For UI that requires login
  if (!user) {
    return <button onClick={() => setIsOnboardingModalOpen(true)}>Add a thing</button>
  }

  // For actions that require auth
  const handleAction = async () => {
    const profileJwt = await getProfileJwt()
    if (!profileJwt) {
      setIsOnboardingModalOpen(true)
      return
    }
    // Make authenticated API call with profileJwt
  }

  return <div>Welcome, {user.name}!</div>
}
```

**Auth checks:**
- `!user` - Quick sync check for UI rendering
- `!profileJwt` - Use when making API calls (async)

#### JWT Verification

Server endpoints verify JWTs using `decodeAndVerifyJWT` from `@home/hobbies-shared`. The function validates the signature, expiration, and returns the typed payload. See `/shared/src/jwt.ts` for implementation.

### Real-time Architecture

The app uses a **single Durable Object instance** (`idFromName: 'default'`) for WebSocket broadcasting:

1. **Client connects**: WebSocket upgrade request → Worker → Durable Object
2. **User action**: POST endpoint → Worker verifies JWT → Saves to D1 → Notifies DO
3. **Broadcast**: Durable Object sends WebSocket message to all connected clients
4. **Auto-eviction**: Cloudflare automatically evicts DO when all connections close

### WebSocket Message Types

Defined inline in `/server/src/durable-object.ts` and `/server/src/index.ts`.

**Client ← Server:**
| Type | Description |
|------|-------------|
| `connected` | Initial connection confirmation |
| `user-joined` | New user or updated user profile |
| `user-left` | User removed |

**Hobby data does not broadcast.** All hobby/piece/session data is per-member
(did-scoped, private), so the new endpoints deliberately never call `notifyDO`
— the single global Broadcaster room would leak who-logged-what to every
member. Only the scaffold's user/reset events use WebSockets.

### Responsive Layout

- **Mobile**: a 430px paper column (`.shell` in `index.css` — grain background, ring shadow) centered over the `#EFEEE8` backdrop, with a fixed bottom Today/Logs tab bar (`TabNav`)
- **Desktop (md, 768px+)**: `.shell` goes full-bleed (cap and shadow drop, the paper + dot grid become the page); header and main content center in a 660px `.page-col`. Nav is duplicated, not morphed: `TabNav` is `md:hidden`, `NavPills` (Today/Logs pills beside `HomeButton` in the header row) is `hidden md:flex`
- One pastel hue per hobby (`client/src/lib/hues.ts`), applied inline as `--dot`; Bricolage Grotesque headlines, Hanken Grotesk body, Spline Sans Mono for dates/labels (Google Fonts in `index.html`)

---

## API Reference

### REST Endpoints

**Auth model:** the app is members-only. App-data endpoints — reads included —
are POSTs carrying `{profileJwt}` in the body and require a **member**
(`users.is_member`, or admin; checked by `server/src/auth.ts`). Membership is
granted from the host console's admin UI (see `docs/admin-setup.md`). Profile
endpoints stay open so a visitor can sign in and wait to be let in.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/add-user` | Add or update user profile | JWT (any) |
| `POST` | `/api/add-avatar` | Add or update user avatar | JWT (any) |
| `DELETE` | `/api/remove-user` | Remove user | JWT (any) |
| `POST` | `/api/users` | Get all users from database | Member |
| `POST` | `/api/bootstrap` | `{today}` → hobbies, pieces, 84-day heatmap counts, journal (≤500); seeds any missing starter data | Member |
| `POST` | `/api/hobbies` | Add a hobby `{name, kind: learn\|craft, hueIndex}` | Member |
| `POST` | `/api/pieces` | Add a piece `{hobbyId, name, links?, source?}`; links are `{label, url}[]`, http(s) only | Member |
| `POST` | `/api/pieces/:id` | Rename a piece / replace its links `{name, links?}`; journal entries keep their snapshotted `pieceName` | Member |
| `POST` | `/api/pieces/:id/delete` | Delete a piece (owner only); sessions keep their `pieceName` snapshot | Member |
| `POST` | `/api/sessions` | Log a session `{hobbyId, pieceId?, date, photoId?}`; pieceName snapshotted server-side; photos craft-only, R2 objects verified | Member |
| `POST` | `/api/sessions/:id/delete` | Delete an entry (owner or admin); removes R2 photo + cache | Member |
| `POST` | `/api/muse` | `{hobbyId, excludeTitles?}` → 3 `{title, why}` ideas (OpenAI, or pool when key absent); craft-only | Member |
| `POST` | `/api/request-upload` | Mint photoId + presigned/dev PUT URLs (full + thumb) | Member |
| `PUT` | `/api/dev-upload/*` | Dev-only byte sink into the simulated bucket (404 when presigning is configured) | Dev only |
| `GET` | `/api/img/*` | Serve R2 photos, year-long immutable edge cache (public by unguessable UUID) | Public |
| `GET` | `/api` | Health check | Public |

### WebSocket Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ws` | Establish WebSocket connection for real-time updates |

---

## Database

### Commands

Run from workspace root unless noted:

```bash
pnpm db:generate-migrations  # Generate D1 migration files from schema (from /server/)
pnpm db:run-migrations       # Run all pending migrations on local D1 database
pnpm db:push                 # Push schema changes directly without migrations (from /server/)
pnpm db:studio               # Open Drizzle Studio for database inspection (from /server/)
```

### Migration Workflow

1. **Edit schema** in `/server/src/db/schema.ts`
2. **Generate migration**: `pnpm db:generate-migrations` (uses `drizzle.config.js` to read schema)
3. **Apply locally**: `pnpm db:run-migrations` (runs `run-dev-migrations.ts`)
4. **Deploy to production**: `pnpm run deploy:cloudflare` (Alchemy automatically applies migrations via `migrationsDir`)

### Database Queries

Use the Wrangler CLI to run SQL queries against D1 databases.

**Development (Local D1):**
```bash
pnpm wrangler d1 execute home-hobbies-mini-app-dev-db --local --command "SELECT * FROM users;"
```

**Production (Remote D1):**
```bash
# Find the database name (format: home-hobbies-mini-app-<stage>-db)
pnpm wrangler d1 list

# Run a query
pnpm wrangler d1 execute home-hobbies-mini-app-prod-db --remote --command "SELECT * FROM users;"
```

Or log in to the Cloudflare dashboard, go to the D1 database, and run SQL queries directly.

---

## Deployment

This project uses [Alchemy](https://alchemy.run) for deployment to Cloudflare Workers.

### Configuration

- `alchemy.run.ts` - Alchemy configuration file defining the Cloudflare Worker, D1 database, and Durable Object bindings
- `.alchemy/state.json` - Created after first deployment, tracks infrastructure state

### Commands

```bash
pnpm run deploy:cloudflare  # Deploy to Cloudflare
pnpm run destroy:cloudflare # Destroy Alchemy deployment
```

No manual migration steps needed - everything is handled by `alchemy.run.ts` configuration.

---

## Reference

### Third Party Libraries

#### Client

- **React** - UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Routing for the app
- **local-first-auth** - Authentication library using the Local First Auth spec
- **local-first-auth-simulator** - Simulates different test users (dev only)
- **Vite** - Build tool and dev server

#### Server

- **Hono** - Lightweight REST API framework for Cloudflare Workers
- **Drizzle ORM** - TypeScript ORM for D1 database operations
- **Drizzle Kit** - Migration generator and database studio
- **Cloudflare Workers** - Serverless runtime environment
- **Cloudflare D1** - Serverless SQLite database
- **Cloudflare Durable Objects** - Stateful WebSocket coordination

#### Shared (hoisted to workspace root)

- **@noble/curves** - Ed25519 signature verification
- **base58-universal** - Base58 encoding/decoding for DIDs
- **jwt-decode** - JWT decoding
- **drizzle-orm** - Database ORM

#### Development Tools

- **Alchemy** - Infrastructure as Code tool for deploying to Cloudflare

### Troubleshooting

**JWT Verification Failures:**
- Expired JWT (`exp` claim)
- Invalid signature
- Malformed DID (must start with `did:key:z`)
- Audience claim mismatch (must match production URL)

**Profile Not Loading:**
- Check if API exists: `console.log(window.localFirstAuth)`

**Build Errors:**
- Run `pnpm install`
- Check TypeScript errors: `pnpm run build`

**Port Already in Use (8787):**
See [Port Troubleshooting](../../docs/port-troubleshooting.md)

**API 404s in dev when hitting the worker directly:**
The server mounts everything under the subpath (`basePath('/hobbies')`), so the API
lives at `http://localhost:<worker-port>/hobbies/api/...` — a bare `/api/...` request
returns 404. The Vite dev server proxies `/hobbies/api` to the worker for you.