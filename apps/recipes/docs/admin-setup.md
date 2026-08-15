# Admin Setup

Admin status is stored in the D1 database (`is_admin` column in the `users` table). To make a user an admin, they must first add their profile details, then update their status using SQL.

**Development (Local D1):**
```bash
pnpm wrangler d1 execute home-recipes-mini-app-dev-db --local --command "UPDATE users SET is_admin = 1 WHERE did = 'did:key:z...';"
```

**Production (Remote D1):**
```bash
pnpm wrangler d1 execute home-recipes-mini-app-prod-db --remote --command "UPDATE users SET is_admin = 1 WHERE did = 'did:key:z...';"
```

To find your DID: sign in, then run `SELECT did, name FROM users;` the same way.

## Membership

The box is members-only: every recipe/reflection endpoint (reads included)
requires a **member** (`is_member` column on `users`). New signups land on a
"Waiting to be let in" screen until an admin lets them in. Admins are
implicitly members.

- **Membership is managed from the host console**: an operator opens
  Settings → Admin on the host and taps **Make member** next to a waiting
  user on the Recipes card (the console writes `users.is_member` directly
  through its D1 binding — see the console's `docs/hosting-a-mini-app.md`).
  The same button revokes access.
- The waiting screen re-checks every ~30 seconds, so a freshly approved
  member unlocks without a manual refresh (there is no live WebSocket unlock).
- In dev, the console's local copy of this app's DB is separate, so grant
  membership with SQL instead:
  `UPDATE users SET is_member = 1 WHERE did = 'did:key:z...';`
- `is_member` is separate from the host console's `blocked` column, which
  also locks a user out when set.
