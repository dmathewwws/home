# CLAUDE.md for Fitness

This file provides guidance to Claude Code (claude.ai/code) when working with code in this app.

## Project Overview

A mini app living at `apps/fitness` inside a multi-app workspace, served under
`/fitness/` on the shared domain (Vite `base`, React Router `basename`, and Hono
`basePath('/fitness')` are already wired — client API calls are
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
  - `Chrome.tsx` - App chrome: `TopBar` (its `home` flag adds the leading `HomeButton`), `HomeButton` (icon-only link back to the host console — a plain `<a>`, since a react-router `Link` resolves against the router basename), `NavPills` (desktop nav, rendered in each tab screen's TopBar), `TabBar` (mobile bottom tabs)
  - `ActivityCalendar.tsx` - 3-month calendar card (desktop 3-up, mobile single month + ‹ › nav), legend, day-detail strip
  - `MonthGrid.tsx` - One month of day tiles (solid / diagonal-split / rest / future, ink ring on today)
  - `QuickLog.tsx` - "What did you do?" chips, optimistic upsert of today's log
  - `WeightChart.tsx` - SVG weight trend (adaptive gridlines, dashed goal line)
  - `AdminSection.tsx` - Admin-only controls for resetting the event
- `/client/src/hooks/` - React hooks
  - `useLocalFirstAuth.tsx` - Auth state + `subscribeToEvents` broadcast bus, exports `AuthProvider` and `useLocalFirstAuth()`
  - `useWebSockets.ts` - WebSocket connection hook for real-time updates
  - `useAppData.ts` - `useActivityRange` / `useTodayLog` / `useWeights`: fetch on mount, refetch on matching broadcasts
- `/client/src/lib/` - `activities.ts` (activity catalog — mirror of server ACTIVITY_KEYS), `api.ts` (POST helpers, fresh JWT per call), `dates.ts`, `period.ts` (3-month window), `weight-math.ts`, `constants.ts` (`GOAL_KG`)
- `/client/src/routes/` - Route components
  - `index.tsx` - React Router root route
  - `app-shell.tsx` - Full-viewport shell + members-only gate (loading / logged-out / waiting / member)
  - `tab-shell.tsx` - Tab routes wrapper (scrollable outlet + mobile TabBar)
  - `activities.tsx` - Activities tab: calendar + quick-log (+ admin section for admins)
  - `weight.tsx` - Weight tab: current weight + entry input, trend chart + stats
  - `not-found.tsx` - 404 page
- `/client/src/app.tsx` - Main component with React Router and Local First Auth integration
- `/client/src/main.tsx` - Entry point (initializes Local First Auth Simulator when `VITE_ENABLE_LOCAL_FIRST_AUTH_SIMULATOR=true`)
- `/client/public/` - Public files
  - `local-first-auth-manifest.json` - Mini app manifest with metadata and requested permissions
  - `icon.webp` - Mini app icon
- `/client/vite.config.ts` - Vite configuration with proxy to backend

#### Server (`/server/`)

- `/server/src/index.ts` - Cloudflare Workers entry point with Hono router, API endpoints, and WebSocket handling
- `/server/src/auth.ts` - Request auth (`AuthError`, `requireMember`, `authFromBody`): app-data endpoints require a member (`users.is_member`, or admin), granted from the host console
- `/server/src/durable-object.ts` - Durable Object class for real-time WebSocket connections (WebSocket message types defined inline)
- `/server/src/db/client.ts` - Database client factory for Cloudflare D1
- `/server/src/db/schema.ts` - Database schema (used by Drizzle Kit to generate migrations)
- `/server/src/db/models/index.ts` - Export file for all models
- `/server/src/db/models/users.ts` - User database model
- `/server/src/db/models/activityLogs.ts` - Per-user per-day activity sets (JSON `ActivityKey[]`, unique on `(did, date)`)
- `/server/src/db/models/weightEntries.ts` - Per-user per-day weight in kg (unique on `(did, date)`)
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

Server endpoints verify JWTs using `decodeAndVerifyJWT` from `@home/fitness-shared`. The function validates the signature, expiration, and returns the typed payload. See `/shared/src/jwt.ts` for implementation.

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
| `activity-logged` | `{did, date}` — refetch activity ranges |
| `weight-logged` | `{did, date}` — refetch weight entries |
| `reset` | Admin reset with message |

### Responsive Layout

- **Mobile**: Full-bleed single column with a bottom tab bar (`TabBar`)
- **Desktop (md, 768px+)**: Centered 660px content column (`.page-col`), tab bar replaced by `NavPills` beside the page title in `TopBar`; the calendar shows all 3 months side-by-side

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
| `POST` | `/api/activities/range` | `{from, to}` date keys → caller's activity logs in window | Member |
| `POST` | `/api/activities/log` | `{date, activities[]}` upsert of one day (keys validated against `ACTIVITY_KEYS`) | Member |
| `POST` | `/api/weights/list` | All of the caller's weight entries, oldest first | Member |
| `POST` | `/api/weights/log` | `{date, kg}` upsert of one day (30–250 kg, rounded to 0.1) | Member |
| `GET` | `/api` | Health check | Public |

All activity/weight data is **per-user**: rows are keyed by the verified JWT's
DID, and endpoints only ever return the caller's own rows.

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
pnpm wrangler d1 execute home-fitness-mini-app-dev-db --local --command "SELECT * FROM users;"
```

**Production (Remote D1):**
```bash
# Find the database name (format: home-fitness-mini-app-<stage>-db)
pnpm wrangler d1 list

# Run a query
pnpm wrangler d1 execute home-fitness-mini-app-prod-db --remote --command "SELECT * FROM users;"
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
The server mounts everything under the subpath (`basePath('/fitness')`), so the API
lives at `http://localhost:<worker-port>/fitness/api/...` — a bare `/api/...` request
returns 404. The Vite dev server proxies `/fitness/api` to the worker for you.