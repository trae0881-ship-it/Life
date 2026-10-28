# Super Admin Phase A

## Existing functionality found

- `UserRole` already defines `USER`, `DEVELOPER`, `ADMIN`, and `SUPER_ADMIN`.
- Server sessions are opaque, hashed, expiry-checked, and resolved to the user's current database role. `requireRole` authorizes from that session; it does not trust request role values.
- `/admin` is a read-only dashboard for `ADMIN` and `SUPER_ADMIN`, with account, profile, and saved-chart totals.
- `GET /api/admin/users` is an authenticated, role-guarded, read-only endpoint returning a bounded list of account records to `ADMIN` and `SUPER_ADMIN`.
- `scripts/provision-admin.mjs` provisions a first `SUPER_ADMIN` only when no Super Admin exists; it asks for the password interactively and does not accept a password through arguments or environment variables.
- At the initial Phase A audit, there was no audit-log model, audit-log API, platform-settings API, or Super Admin navigation shell in the current schema; Phase A and B below record the later additions.

## Phase A implementation

- Added `/super-admin`, guarded server-side to `SUPER_ADMIN`. Anonymous sessions are redirected to sign-in; all other roles receive a not-found response.
- Added `GET /api/super-admin/overview`, which independently validates the session role on each request and returns only aggregate counts that map to existing tables: accounts, birth profiles, saved charts, and saved questions. Responses are not cached.
- Added an accessible, responsive Super Admin shell with localized navigation. Overview is active; other modules showed an honest unavailable state rather than fake screens.
- Added a sign-out control using the existing session-revoking endpoint.
- Kept `/admin` and `/api/admin/users` unchanged to avoid breaking existing `ADMIN` access.

## Phase B implementation

- Added a Super Admin-only read-only account inspection endpoint and activated the Users navigation.
- Search is limited to opaque account-ID prefixes and role filters. It does not search birth details or include them in results.
- Results use stable `createdAt DESC, id DESC` ordering, bounded 25-row pages, and return only account ID, email, role, creation date, and profile count.
- Every successful list/search read writes an access event in the same database transaction as the queried results. The event contains the Super Admin actor ID, action category, page, result count, and timestamp; it does not store search input, email, birth details, or credentials.
- The user-inspection endpoint fails closed: if its audit-event insert fails, the encompassing transaction fails and the account-list response is not returned. Failed authorization/filter checks do not query or write. Audit-log reads themselves are not logged, to avoid recursive read events. The current schema cannot record success/failure status for attempted actions.
- User-list query parsing rejects unknown and repeated parameters; only the validated page, role enum, and bounded opaque ID prefix are applied.
- The API handler explicitly projects response fields even if a repository unexpectedly returns additional properties; mocked tests cover this omission and verify that failed audit writes do not return account data.
- `ADMIN` is intentionally not permitted on the new `/api/super-admin/*` endpoints. Existing `/admin` and `/api/admin/users` behavior remains unchanged.
- The migration `20261019170000_super_admin_access_audit` is present but has **not** been applied. A disposable database is unavailable, so schema migration, audit-write behavior, pagination, and role isolation have not been DB-tested.
- Added a read-only `/api/super-admin/audit-logs` endpoint and activated Audit Logs. It filters by event type and UTC date, uses stable descending timestamp/ID pagination, and returns only the persisted event ID, actor user ID, action, requested page, result count, and timestamp.
- The current access-event schema does not contain a success/failure field; the UI explicitly says outcome is not recorded instead of inferring one. Log-list reads do not create further access events, avoiding recursive audit noise.
- Audit-log browsing is now implemented but requires the unapplied migration. Report inspection, question audit, and platform settings remain unavailable in the UI.

## Verification boundaries and remaining work

- Unit and mocked-handler tests verify session-role behavior, query parsing, empty/error responses, event-field minimization, and route guards without connecting to the database.
- Aggregate and user-list query execution, persistent audit writes, multi-account isolation, and provisioning behavior have not been integration-tested. No database URL was used and no migration was run.
- No normal authenticated browser session was available. A real unauthenticated browser request to `/super-admin` returned to the sign-in view and the audit-log API returned 401; this does not verify authenticated behavior or the requested responsive widths. Responsive CSS and accessible markup are covered by source-level regression checks, not rendered viewport tests.
- See `VERIFICATION_INVENTORY.md` for the current User Panel, Super Admin, responsive-browser, database, and 38-question coverage gaps.
- Remaining work is safe PostgreSQL integration after a disposable database is explicitly configured, normal-account authenticated browser tests at required viewport sizes, and separate requirements/design for platform settings, report inspection, and question audit. Destructive account actions remain out of scope until explicitly specified, logged, and tested.
