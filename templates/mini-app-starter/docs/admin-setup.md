# Admin Setup

Admin status is stored in the D1 database (`is_admin` column in the `users` table). To make a user an admin, they must first add their profile details, then update their status using SQL.

**Development (Local D1):**
```bash
pnpm wrangler d1 execute __APP_NAME__-dev-db --local --command "UPDATE users SET is_admin = 1 WHERE did = 'did:key:z...';"
```

**Production (Remote D1):**
```bash
pnpm wrangler d1 execute __APP_NAME__-prod-db --remote --command "UPDATE users SET is_admin = 1 WHERE did = 'did:key:z...';"
```

## Membership

The app is members-only: app-data endpoints require a **member** (`is_member`
column on `users`, checked by `server/src/auth.ts`; admins are implicitly
members). New signups see a "Members only" waiting screen until they're let in.

- **Membership is managed from the host console**: an operator opens
  Settings → Admin on the host and taps **Make member** next to a waiting user
  on this app's card (the console writes `users.is_member` directly through its
  D1 binding — see the console's `docs/hosting-a-mini-app.md`). This only works
  after the app is registered in `MANAGED_APPS`.
- The waiting screen re-checks every ~30 seconds, so a freshly approved member
  unlocks without a manual refresh.
- Before the app is registered (or in dev, where the console's local copy of
  this app's DB is separate), grant membership with SQL:
  `UPDATE users SET is_member = 1 WHERE did = 'did:key:z...';`
