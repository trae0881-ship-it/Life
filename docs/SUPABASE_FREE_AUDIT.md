# Supabase Free-plan compatibility audit

Audit date: 2026-10-17

## Executive finding

LIFE is **not currently connected to Supabase as a platform integration**. The application uses Prisma 7 with the PostgreSQL driver (`pg`) and a server-only `DATABASE_URL`. There is no Supabase client package, Supabase Auth integration, Supabase environment variable, service-role key, or Supabase SQL policy in the repository.

If `DATABASE_URL` is later pointed at a Supabase PostgreSQL endpoint, the application can use that database through Prisma, subject to connection-pooling and schema/RLS decisions. That would be PostgreSQL connectivity through Prisma, not Supabase Auth or Supabase client integration.

`.env.supabase.example` documents the safe setup shape. It contains the project URL only and requires a locally supplied, rotated database password from the Supabase dashboard's Connect dialog. No live connection string or key was added to the repository.

## Persistence and ownership inventory

| Feature | Current implementation | Persistence |
|---|---|---|
| Account registration/login | Custom Argon2id password hashing, `User`, `Session`, HTTP-only cookie | PostgreSQL |
| Birth profiles | `/api/profiles` and owner-scoped Prisma queries | PostgreSQL |
| Saved charts | `/api/saved-charts`, server-side recalculation, owner-scoped Prisma queries | PostgreSQL; chart result JSON is stored |
| Kundali original file | `/api/kundalis`, authenticated owner-scoped routes | PostgreSQL `BYTEA`; one original per LIFE account, replaced/deleted with the same transaction. No Supabase Storage bucket is used. |
| Palmistry hand image and verified observations | `/api/palmistry`, authenticated owner-scoped routes | PostgreSQL `BYTEA` plus JSONB; one private original per LIFE account. The additive migration defines forced owner-scoped RLS; production application/runtime verification is pending. |
| Assistant question history | React component state only | None; cleared on reload |
| Current calculated chart | `life-current-chart` | `sessionStorage`; tab/session scoped |
| Language preference | `life-language` | `localStorage` |
| Verification review state | `life-verification-reviews:<version>` | `localStorage` |
| Remedies | Static `remedyCatalog` | No database persistence |
| Remedy chart context | Reads the currently stored calculated chart | `sessionStorage`; no remedy record persistence |
| Marriage timing context | Reads the currently stored calculated chart | `sessionStorage`; no prediction persistence |
| Admin counts/users | Server-side Prisma queries with role checks | PostgreSQL |
| Verification records | Prisma verification models and API routes | PostgreSQL |
| Calculation engine/ephemerides | Local Swiss Ephemeris files and native binding | Local filesystem |

There is no question-history model, route, or persistence layer. There is no Supabase Storage, Realtime, Edge Function, or Supabase Auth usage.

## Schema, migrations and RLS

The Prisma schema contains `User`, `Session`, `BirthProfile`, `SavedChart`, `KundaliDocument`, `PalmistryRecord`, verification records, and foreign-key/index definitions. Migrations are additive and use standard PostgreSQL types, `BYTEA`, `JSONB`, enums, indexes, and cascading ownership relations.

Most user-owned rows are protected by application-level authorization:

- authenticated session is resolved server-side;
- profile and saved-chart queries include both `userId` and record ID where applicable;
- profile associations are checked against the authenticated owner;
- saved charts are recalculated server-side rather than trusting client planetary positions;
- admin routes require `ADMIN` or `SUPER_ADMIN`.

The Kundali and Palmistry migrations enable and force RLS on their private document tables and add separate SELECT, INSERT, UPDATE, and DELETE owner policies using the transaction-local `life.user_id` setting. Routes set that value only after resolving the LIFE session and still include explicit `userId` filters. This is a custom application identity policy, not `auth.uid()`/Supabase Auth. The migration and policies have not been applied to or tested against the live Supabase database; the configured database role's RLS behavior remains unverified. Direct browser access to any LIFE table remains unsupported.

## Free-plan risk assessment

No usage measurements are available, so this audit does not claim a quota margin or invent request/storage numbers.

- **Database size:** `SavedChart.result`, `settings`, and `inputSnapshot` are JSONB snapshots. Repeated large chart results can consume the database quota faster than normalized profile rows. Verification reports/evidence can also grow over time.
- **Kundali file storage:** each account can retain one original of at most 10 MiB in PostgreSQL `BYTEA`. Replacements and deletion remove the prior database copy, but this consumes database quota and is not Supabase object storage.
- **Palmistry file storage:** each account can retain one original hand image of at most 10 MiB in PostgreSQL `BYTEA`. Replacements and deletion remove the prior database copy; this also consumes database quota and is not Supabase object storage.
- **Egress:** saved-chart detail responses return the complete stored result JSON. Repeated reloads or many large chart downloads can increase egress.
- **Query volume:** authentication performs user/session lookups; account panels list profiles/charts; admin pages count users/profiles/charts. There is no server-side caching layer. High-frequency health probes would add database checks once configured.
- **Connections:** Prisma uses a PostgreSQL adapter pool (`max: 10`). A Supabase direct connection or transaction/session pooler must be selected deliberately; serverless deployments should use a Supabase pooler and avoid multiplying per-instance pools.
- **Auth quotas:** Supabase Auth quotas are not relevant because LIFE uses custom authentication. Migrating to Supabase Auth would be an architectural change and was not performed.
- **Free-plan suspension/limits:** exact current limits depend on the Supabase plan and account configuration; verify them in the Supabase dashboard before production use.

## Integration-test status

The repository has a destructive-test guard in `scripts/test-postgres.mjs`. It requires `LIFE_TEST_DATABASE_URL`, verifies a PostgreSQL database name ending in `_test` or `-test`, confirms the connected database identity, and only then applies repository migrations and starts the standalone app.

`LIFE_TEST_DATABASE_URL` is not configured in this environment. PostgreSQL signup/login, reload, saved-chart persistence, chart ownership isolation, and related API tests are therefore **BLOCKED / NOT RUN**. No production or shared database was contacted.

## Safe changes made by this audit

1. `/api/health` now separates local calculation-engine readiness from an actual database connectivity check. A configured database is never reported as healthy without a live `SELECT 1` check.
2. The PostgreSQL integration runner now invokes the existing integration test file using its actual filename.
3. Added a non-secret Supabase environment template and a regression guard for client-side service-role exposure.

Astrology calculation formulas were not changed.
