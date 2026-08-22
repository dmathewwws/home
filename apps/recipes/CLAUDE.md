# CLAUDE.md for Recipes

This file provides guidance to Claude Code (claude.ai/code) when working with code in this app.

## Project Overview

A mini app living at `apps/recipes` inside a multi-app workspace, served under
`/recipes/` on the shared domain (Vite `base`, React Router `basename`, and Hono
`basePath('/recipes')` are already wired — client API calls are
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
  - `Chrome.tsx` - App chrome: `NavPills` (desktop nav, rendered in the tab screens' `TopBar`), `TopBar` (its `home` flag adds the leading `HomeButton`), `HomeButton` (icon-only link back to the host console — a plain `<a>`, since a react-router `Link` resolves against the router basename), `BackButton`, `TabBar` (mobile bottom tabs), `Fab`, `AddSheet`, `SaveBar`
- `/client/src/hooks/` - React hooks
  - `useLocalFirstAuth.tsx` - Authentication state management, exports `AuthProvider` and `useLocalFirstAuth()` hook
  - `useWebSockets.ts` - WebSocket connection hook for real-time updates
- `/client/src/routes/` - Route components
  - `index.tsx` - React Router root route
  - `app-shell.tsx` - Full-viewport kraft shell + household gate (loading / logged-out / waiting / member)
  - `tab-shell.tsx` - Tab routes wrapper (recipe list + reflections) with FAB and bottom tabs
  - `recipe-list.tsx`, `recipe-detail.tsx`, `reflections-list.tsx`, `new-reflection.tsx`, `eating-out-list.tsx`, `new-dish.tsx` - Main screens
  - `paste-json.tsx`, `import-review.tsx`, `manual-entry.tsx` - Add-recipe flows (paste external-tool JSON → review, or type it out; see `docs/recipe-import-spec.md`)
  - `not-found.tsx` - 404 page
- `/client/src/app.tsx` - Main component with React Router and Local First Auth integration
- `/client/src/main.tsx` - Entry point (initializes Local First Auth Simulator when `VITE_ENABLE_LOCAL_FIRST_AUTH_SIMULATOR=true`)
- `/client/public/` - Public files
  - `local-first-auth-manifest.json` - Mini app manifest with metadata and requested permissions
  - `icon.webp` - Mini app icon
- `/client/vite.config.ts` - Vite configuration with proxy to backend

#### Server (`/server/`)

- `/server/src/index.ts` - Cloudflare Workers entry point with Hono router, API endpoints, and WebSocket handling
- `/server/src/durable-object.ts` - Durable Object class for real-time WebSocket connections (WebSocket message types defined inline)
- `/server/src/db/client.ts` - Database client factory for Cloudflare D1
- `/server/src/db/schema.ts` - Database schema (used by Drizzle Kit to generate migrations)
- `/server/src/db/models/index.ts` - Export file for all models
- `/server/src/db/models/users.ts` - User database model
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
  - `recipe-import-spec.md` - JSON contract for the "Paste recipe JSON" add flow (external tool → paste → review → save)
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
| Logged In | `user !== null` | User content |

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

Server endpoints verify JWTs using `decodeAndVerifyJWT` from `@home/recipes-shared`. The function validates the signature, expiration, and returns the typed payload. See `/shared/src/jwt.ts` for implementation.

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
| `recipe-created` / `recipe-updated` / `recipe-deleted` | `{id}` — refetch recipe lists |
| `reflection-created` / `reflection-deleted` | `{id, recipeId}` — refetch reflections + recipe tallies |
| `dish-created` / `dish-deleted` | `{id}` — refetch the eating-out journal |
| `reset` | Admin reset with message |

### Responsive Layout

- **Mobile**: Full-bleed single column with a bottom tab bar
- **Desktop (md, 768px+)**: Centered 660px content column (`.page-col`), tab bar replaced by `NavPills` beside the page title in `TopBar`

---

## API Reference

### REST Endpoints

**Auth model:** the box is members-only. Every app-data endpoint — reads
included — is a POST carrying `{profileJwt}` in the body and requires a
**member** (`users.is_member`, or admin; checked by `server/src/auth.ts`).
Membership is granted from the host console's admin UI, which writes
`users.is_member` directly through its D1 binding (see `docs/admin-setup.md`);
the client's Waiting screen polls every ~30s to spot the grant. DO broadcasts
carry minimal `{id}`/`{did}` payloads only (the WS endpoint is
unauthenticated); clients refetch via the API.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/add-user` | Add or update user profile | JWT (any) |
| `POST` | `/api/add-avatar` | Add or update user avatar | JWT (any) |
| `DELETE` | `/api/remove-user` | Remove user | JWT (any) |
| `POST` | `/api/recipes/list` | Recipes + chips + tally counts | Member |
| `POST` | `/api/recipes/:id/get` | Full recipe + cards/swaps + "Last time" | Member |
| `POST` | `/api/recipes` | Create recipe (cards hard-capped at 140 chars) | Member |
| `POST` | `/api/recipes/:id/update` | Replace recipe fields + ingredients | Member |
| `POST` | `/api/recipes/:id/delete` | Delete recipe | Owner/admin |
| `POST` | `/api/ingredients/search` | Catalog search (`{q}`) | Member |
| `POST` | `/api/ingredients/frequent` | "You use these a lot" tray | Member |
| `POST` | `/api/reflections/list` | Cooking journal, newest first | Member |
| `POST` | `/api/reflections` | Log a cook (verifies R2 photo objects exist) | Member |
| `POST` | `/api/reflections/:id/delete` | Delete reflection + R2 photo + cache purge | Owner/admin |
| `POST` | `/api/dishes/list` | Eating-out journal, newest first | Member |
| `POST` | `/api/dishes` | Log a restaurant dish (name required; place/photo/note optional) | Member |
| `POST` | `/api/dishes/:id/delete` | Delete dish + R2 photo + cache purge | Owner/admin |
| `POST` | `/api/request-upload` | Mint photoId + presigned R2 PUT URLs (dev: worker fallback URLs) | Member |
| `PUT` | `/api/dev-upload/*` | Dev-only upload sink (404s in prod) | — |
| `GET` | `/api/img/*` | Serve photos from R2, immutable edge cache | Public (UUID keys) |
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
pnpm wrangler d1 execute home-recipes-mini-app-dev-db --local --command "SELECT * FROM users;"
```

**Production (Remote D1):**
```bash
# Find the database name (format: home-recipes-mini-app-<stage>-db)
pnpm wrangler d1 list

# Run a query
pnpm wrangler d1 execute home-recipes-mini-app-prod-db --remote --command "SELECT * FROM users;"
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
The server mounts everything under the subpath (`basePath('/recipes')`), so the API
lives at `http://localhost:<worker-port>/recipes/api/...` — a bare `/api/...` request
returns 404. The Vite dev server proxies `/recipes/api` to the worker for you.