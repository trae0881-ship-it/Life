# Railway deployment

## Status

Dockerfile, `railway.json`, standalone start script, health endpoint, Prisma schema, and migrations are present. The Windows production build and production `npm start` runtime pass. The image explicitly binds to `0.0.0.0`; Railway's injected `PORT` is honored by the standalone server. **Railway deployment is not verified**: Docker and WSL are unavailable, so no Linux image build/run or Railway deployment was performed. Do not deploy this vertical slice as the complete production product.

## Intended deployment procedure (not yet executable)

1. First create a **separate Railway staging project/environment** with a new Railway PostgreSQL service. Confirm it is a distinct database with no valuable production data. Never reference the live Supabase database from staging.
2. Configure the staging app's `DATABASE_URL` using only that staging PostgreSQL service's Railway reference variable. Keep credentials in Railway's variable manager. The application does not use a separate `SESSION_SECRET`. `PORT` is supplied by Railway; the Docker image binds to `0.0.0.0`. Leave `LIFE_TRUST_PROXY_HEADERS` unset/false unless the service is behind a specifically trusted proxy.
3. Require the checked-in GitHub Actions workflow `.github/workflows/docker-ci.yml` to pass before staging. It builds and starts the image with a deliberately unreachable database URL, checks unhealthy readiness and offline location search, verifies the native module and bundled assets, and scans the image for environment files and common credential formats. This workflow does not deploy. Its Linux runner result must be observed before Docker/Linux verification can be called passed.
4. Build from the reviewed commit and pinned lockfile. Do not enable production auto-deploy or automatic migration execution as part of this staging setup.
5. Reconcile the existing Supabase migration history using the procedure below. For a **new, empty staging database only**, an authorized operator may review and apply the repository migrations as a controlled staging operation. Confirm the exact target and that it contains no valuable data before running `npm run db:deploy`; never point this command at Supabase as a shortcut.
6. After staging migrations, create only synthetic staging test accounts using an approved setup procedure. Verify registration/login/logout, profiles, saved charts, question history, ownership checks and admin restrictions in staging. The guarded disposable-PostgreSQL test runner rejects staging database names; do not weaken its safeguards or point it at staging.
7. Provision the staging Super Admin only if needed, using a dedicated staging identity and secure interactive terminal. Do not reuse production credentials.
8. Verify Railway readiness, native engine loading, ephemeris manifest, offline place lookup, logs without personal data/secrets, and rollback procedure. Record the actual deployed commit and results.

## Reconciling Supabase migration history

The repository contains six Prisma migration directories, but the read-only catalog check did not find a Prisma `_prisma_migrations` ledger. This makes historical migration status **UNKNOWN**; matching current table/column/index/constraint metadata does not prove which migration commands were used or when. Do not treat every migration as pending, fabricate the ledger, or run `prisma migrate resolve` based only on current schema shape.

An authorized database operator should:

1. Preserve the current state and obtain approved provider backups/snapshots and deployment/release records before attempting reconciliation. Restrict access to the backup; it may contain personal data.
2. Review deployment logs, automation history, prior schema exports, and approved manual SQL records to establish whether Prisma Migrate, `db push`, or manual SQL was used and which release was last applied.
3. Restore a backup to a separately isolated disposable PostgreSQL clone. Inspect migration metadata and compare the restored schema with every repository migration in order, including enum values, defaults, nullability, indexes, foreign keys, and data transformations. Do not use Supabase for write-based reproduction.
4. If records and the clone do not establish a complete, consistent history, leave status **UNKNOWN** and request a formal migration-baseline decision from the database owner. Any proposed baseline must be reviewed, tested on the clone, backed by evidence and an approved backup/rollback plan before an authorized operator considers a production action.
5. Keep production unchanged until that review and explicit authorization are complete. This application does not run migrations on startup.

## Required eventual checks

- Railway Linux build and native module load.
- Readiness fails when PostgreSQL or required local ephemeris files are unavailable.
- Offline calculation succeeds with outbound network blocked.
- Application binds to the assigned port and shuts down cleanly.
- Migration and backup restore tested against a disposable database.

## Current files and gaps

- `.env.example` contains placeholders only.
- Build uses the pinned package lockfile and standalone output; telemetry is disabled by the build launcher and Docker environment.
- `railway.json` points health checks at `/api/health`.
- The container excludes `.env*` through `.dockerignore`; the standalone build wrapper removes generated `.env` files. A post-build path check found no `.env` files in standalone output.
- Windows production runtime smoke checks: `/` HTTP 200; `/api/health` HTTP 200 with engine and read-only Supabase connectivity ready; `/api/locations` HTTP 200 using the bundled dataset. With a deliberately unreachable, nonconnecting database URL, `/api/health` returned HTTP 503 with the engine ready and database status `unreachable`.
- Read-only Supabase catalog comparison found all 12 expected tables, 99/99 Prisma model columns, 2/2 enums, matching column types/nullability, and all repository-migration index/constraint names. No application rows were queried. No visible Prisma migration ledger was found; applied/pending migration status remains **UNKNOWN**. Catalog compatibility does not establish migration history.
- A non-deploying GitHub Actions workflow now exists at `.github/workflows/docker-ci.yml` for pull requests and pushes to `main`. It requires no secrets and uses only a deliberately unreachable local database URL. It has not yet run on GitHub; no Docker CI result is claimed.
- Dockerfile packages local ephemeris files and explicitly copies the native package to work around Next standalone tracing.
- The pinned `@swisseph/node@1.4.0` package ships a `prebuilds/linux-x64/swisseph.node` binary (confirmed present in `node_modules`). Its presence is necessary but not sufficient: a real Linux/Docker run has still not been executed, so native load on Railway remains **unverified**.
- `npm run db:deploy` is a controlled command; no migration executes at app startup. The initial migration is generated but has not been applied to PostgreSQL.
- No Railway staging resources or credentials were provisioned in this task. The admin provisioning command is implemented but must be run explicitly by an authorized operator. Backup/restore and rollback have not been tested.
- Registration/login and persistent profile/chart/admin-review APIs require the additive Phase 4 migration. Rate limiting is process-local and is not sufficient as a shared control across multiple Railway replicas; configure a shared rate-limit backend before horizontal scaling.

## Phase 65 deployment configuration and Developer authentication

### Environment variables (names only)

Set values in the hosting provider's secret/environment manager; do not commit credentials or paste them into source control.

| Variable | Requirement |
|---|---|
| `DATABASE_URL` | Required for database-backed application features. Use the provider's PostgreSQL connection reference, TLS settings, and production database only in the production environment. |
| `LIFE_PUBLIC_APP_URL` | Set to the deployed HTTPS origin (scheme and host only). Used for password-reset links and canonical site metadata; do not leave the localhost example value in production. |
| `API_KEY_PEPPER` | Required for API-key creation and verification. Supply a high-entropy secret of at least 32 bytes through the provider's secret manager. Rotation requires a planned key migration because existing key digests depend on it. |
| `RESEND_API_KEY` | Optional integration credential; required for password-reset email delivery. |
| `LIFE_EMAIL_FROM` | Required with `RESEND_API_KEY` and `LIFE_PUBLIC_APP_URL` to send password-reset emails; use a verified sender identity. |
| `PORT` | Supplied by the hosting platform; the standalone Next.js server uses it. |
| `LIFE_TRUST_PROXY_HEADERS` | Leave unset or `false` unless the deployment has a specifically trusted reverse proxy and the application needs forwarded client identity. |
| `NEXT_PUBLIC_LIFE_MANAGED_SCRIPTS_ENABLED` | Optional public feature switch for managed third-party scripts; leave disabled unless intentionally configured. |
| `LIFE_DATABASE_STORAGE_WARNING_THRESHOLDS` | Optional storage-warning configuration. |
| `LIFE_DATABASE_TRANSFER_IMPORT_ENABLED` | Keep disabled unless an authorized operator has reviewed and explicitly enabled the protected import workflow. |

`NODE_ENV` is set to `production` by the container. Authentication does not require a separate session-signing secret: sessions use random opaque tokens, database-backed hashes, and the production `__Host-` Secure/HttpOnly/SameSite=Lax cookie. OAuth callback URLs are not used; password-reset links are derived from `LIFE_PUBLIC_APP_URL`, and canonical public origins are unavailable when that HTTPS origin is missing or invalid. The SEO management audit intentionally makes a loopback-only self-request to `127.0.0.1:$PORT`; that internal local audit target is not used for public links, callback URLs, or external redirects.

Unexpected login, registration, logout, and session-lookup failures return generic service errors and write only the fixed operation name and error class to server logs; credentials, session tokens, database URLs, and exception messages are not logged by these handlers.

### Developer login and registration policy

- `/developer/login` and `/developer/signup` are separate from `/login` and `/signup`.
- Developer login asks the existing login API to authorize the `DEVELOPER` role before creating a session; successful default navigation is `/developers/dashboard`.
- Developer signup uses the existing registration transaction, which creates a standard `USER` and returns to the approval-required Developer portal. It does not grant Developer permissions or redirect a new standard account to the protected dashboard. Role and product grants remain under the existing authorized administrative workflow.
- Anonymous access to `/developers/dashboard` redirects to the dedicated Developer login route. Signed-in accounts without Developer role are denied. Platform key management continues to enforce Developer ownership and explicit Admin/Super Admin permissions at the API boundary.
- `next` destinations use internal-path validation. External, protocol-relative, malformed, and auth-loop destinations fall back safely; Developer signup also rejects dashboard destinations that require an approved Developer role.

### Pre-deployment checklist

1. Review the exact release and lockfile; require `npm.cmd run verify`, `npx.cmd tsc --noEmit`, `npx.cmd prisma validate`, and `npm.cmd run build` to pass.
2. Observe the existing Linux/Docker CI workflow pass before considering a Railway image ready. A local Windows build does not verify the Linux native Swiss Ephemeris runtime.
3. Configure the environment variables above in the correct Railway environment, and verify `LIFE_PUBLIC_APP_URL` is HTTPS and not localhost without printing secret values.
4. Have the database owner positively identify a new, isolated staging PostgreSQL target and approve the staging migration plan. Do not reuse production or staging credentials across environments. Review and apply migrations only as a separate, explicitly authorized operation; startup does not apply migrations.
5. On isolated staging, verify Developer and ordinary-user auth, session/logout, `/developers/dashboard` access control, API key scopes and ownership, mail delivery, health/readiness, and backup/restore/rollback.
6. Confirm log redaction, HTTPS termination, proxy trust, platform secrets, connection limits, monitoring, rate-limiting strategy, and rollback ownership. This app's current rate limits are process-local and are not sufficient for horizontally scaled deployments.

Current Phase 65 evidence is source-level only. No real Developer session, provider configuration, Linux container run, isolated staging database, backup/restore, migration rehearsal, or deployment was performed. **Deployment is not yet verified as safe for staging or production.**

Local verification on Windows x64 with Node v24.20.0 passed via `npm.cmd run verify`: 424/424 tests, TypeScript, Prisma validation, and production build. The verification report recorded a fresh source fingerprint. These results validate source/build behavior only; they do not replace any of the isolated database, Linux, provider, migration, backup/restore, or live authorization checks above.
