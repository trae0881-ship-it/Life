# LIFE Verification Inventory

Updated: 2026-10-21

This inventory distinguishes pure/unit tests, source-contract tests, browser
checks, and PostgreSQL integration. A source assertion is not a rendered UI
test; a mocked repository is not a database authorization test.

## Pre-change repository baseline (2026-10-21)

- Full automated suite: **278 passed, 0 failed, 0 skipped**.
- TypeScript check (`npx tsc --noEmit`): **passed**.
- Production build (`npm run build`): **passed** with a process-scoped,
  deliberately nonconnecting placeholder `DATABASE_URL`.
- PostgreSQL integration and authenticated browser flows: **not run**. No
  disposable database or normal authenticated test account was verified.
- At this pre-change baseline, no D-chart had an independent fixed varga
  mapping fixture. Predictive performance remains unevaluated for all 38
  questions.
- No exact intended marketing/reference repository URL is present in the
  project documentation or supplied roadmap; repository review and
  integration remain blocked rather than guessed.
- Razorpay/PayPal, subscription, refund, role-management, and account
  activation workflows are not implemented. No provider setup or policy was
  inferred from informational legal copy.
- No database migration, production write, payment operation, or application
  source change was made during this baseline check.

Phase 2 D1–D60 mapping validation (2026-10-21): post-change full suite
**281 passed, 0 failed, 0 skipped** (pre-change baseline 278); focused
divisional/rules suite **21 passed, 0 failed**; `npx tsc --noEmit` and
production build **passed**. The build used a deliberately nonconnecting,
process-scoped placeholder `DATABASE_URL`. Fixed PyJHora 4.8.7 transformation
fixtures matched LIFE's D2–D60 sign mappings for **42,588** near-boundary
probes (exact sign-index comparison); these synthetic sidereal inputs test
mapping only, not natal ephemeris positions, ayanamsha, D1, ascendant, or
houses. Corrected the D45 modality start order and removed the fixed epsilon
that misassigned longitudes immediately before equal-division boundaries.
The full PyJHora package could not run on available Python 3.15 because its
pinned NumPy/pyswisseph wheels were unavailable; no PyJHora code or runtime
dependency was added. No database connection, migration, production write,
payment operation, or authenticated browser flow was performed. See
[`D1_D60_VALIDATION_MATRIX.md`](./D1_D60_VALIDATION_MATRIX.md) and
[`CALCULATION_VALIDATION_MATRIX.md`](./CALCULATION_VALIDATION_MATRIX.md).

Phase 3A natal-input reference validation (2026-10-21): full suite
**283 passed, 0 failed, 0 skipped** (baseline 281); focused natal/JPL/engine/
varga tests **42 passed, 0 failed**; `npx tsc --noEmit` and production
build **passed**. Three fixed synthetic, non-user inputs exercise IANA timezone
resolution and the full chart pipeline using fixed public coordinates. Across
three epochs, 14 tropical planet longitude/latitude values match JPL Horizons
DE441 within 0.5 arcseconds; the observed maximum absolute
longitude/latitude differences are 0.125212"/0.096341" for Kiritimati,
0.043156"/0.033989" for Mumbai, and 0.049148"/0.008053" for retrograde
Mercury. The integrated Mercury speed differs from the reference
finite-difference rate by -0.000009914°/day, inside the 0.001°/day tolerance.
This does not independently validate sidereal positions, Lahiri ayanamsha,
ascendant/cusps, D1, or any birth-derived D2–D60 result; synthetic varga
boundary mapping evidence remains separate. No calculation defect was
confirmed, so no production calculation formula changed. The 38-question
evaluation was not changed because these limited tropical comparisons do not
validate interpretation rules or predictive performance. Build used a
deliberately nonconnecting process-scoped `DATABASE_URL`; no live database
connection, migration, write, seed, payment action, or authenticated browser
flow was performed.

Phase 3B sidereal natal pipeline cross-check (2026-10-21): full suite
**286 passed, 0 failed, 0 skipped** (pre-change baseline 283); focused
natal/JPL/varga/rules tests **26 passed, 0 failed**; `npx.cmd tsc --noEmit`
passed; production build via `npm.cmd run build` passed with a deliberately
nonconnecting, process-scoped placeholder `DATABASE_URL`. PyJHora 4.8.7 ran
in isolated Python 3.11.9 with pinned PySwisseph 2.10.3.2 / Swiss Ephemeris
2.10.03 and NumPy 2.1.1. The fixed fixture was reproduced byte-for-byte
(SHA-256 `D6818EBDB86FE80D05D812E072D1C6FCDD511FC14BFD8B1831FEE189F6AA212C`).
Across three non-user fixtures, exact sign indices matched for **2,160**
shared D1–D60 placements; 36 D1 sidereal longitudes and 39 Ascendant/cusp
values matched within four double-precision ULPs. Maximum residuals:
`2.842170943040401e-14°` for D1 longitudes and
`5.684341886080802e-14°` for houses. PyJHora and LIFE share Swiss Ephemeris
and local ephemeris data, so these are pipeline/convention comparisons, not
independent astronomical validation; every end-to-end natal chart remains
NOT INDEPENDENTLY VALIDATED. No calculation formula or answer rule changed.
The 38 question statuses remain 6 implemented, 17 partially supported, and
15 unsupported; interpretation sources remain unreviewed and predictive
performance remains unevaluated. PyJHora uses Swiss Ephemeris 2.10.03; LIFE's
`@swisseph/node` binding does not expose its embedded version. Both use the
Swiss Ephemeris implementation family and local data, so the comparison is
not independent astronomy. No database connection, migration, seed, write,
payment operation, or authenticated browser flow was performed.

The Phase D Super Admin permission matrix and payment/subscription capability
audit are in [`PHASE_D_PRODUCTION_AUDIT.md`](./PHASE_D_PRODUCTION_AUDIT.md).
That file also records all 38 question paths and separates calculation tests,
interpretive source review, matching/non-matching cases, and predictive
performance evaluation.

The Project Excellence Phase 1 prioritized plan, independent calculation
evidence summary, provider-neutral payment invariants, and this stage's
question-evidence changes are in
[`PROJECT_EXCELLENCE_PHASE_1.md`](./PROJECT_EXCELLENCE_PHASE_1.md).
The 18-field Kundli Details source/input/UI/test matrix is in
[`KUNDLI_DETAILS_IMPLEMENTATION_MATRIX.md`](./KUNDLI_DETAILS_IMPLEMENTATION_MATRIX.md).
The Phase 3 versioned 38-question prediction evaluation and its baseline,
final checks, evidence statuses, and reference-repository blocker are in
[`PREDICTION_QUALITY_EVALUATION_V1.md`](./PREDICTION_QUALITY_EVALUATION_V1.md).

Phase 3 verification snapshot (2026-10-19): full suite **271 passed, 0
failed** (baseline 268); focused assistant/acceptance suite **17 passed**;
TypeScript check and production build **passed**. The build used a
deliberately nonconnecting placeholder database URL. No database integration
test, migration, production write, or authenticated browser flow was run.
Prediction performance remains unevaluated.

Phase 4 validation snapshot (2026-10-19): pre-change full-suite baseline
**271 passed, 0 failed**; final suite **276 passed, 0 failed**. Focused
Dasha/Panchanga, KP, events/transits, and divisional-chart tests **38 passed,
0 failed**. TypeScript check and production build **passed**; build used a
deliberately nonconnecting placeholder database URL. No database connection,
migration, production write, payment operation, or authenticated browser flow
was performed. Independent Dasha, complete KP, D9, and ingress numerical
fixtures remain unavailable; see
[`CALCULATION_VALIDATION_MATRIX.md`](./CALCULATION_VALIDATION_MATRIX.md).
The transit direct-call input-validation defect is covered by
`tests/events.test.mjs`.

## User panel, authorization, and admin surfaces

| Functionality | Implementation | Current evidence | Missing verification / dependency | Status |
|---|---|---|---|---|
| User dashboard authentication | `src/app/dashboard/page.tsx`, `src/server/auth.ts` | `tests/dashboard.test.mjs` checks server guard source; `tests/auth-core.test.mjs` exercises session resolution with a fake repository | Normal authenticated browser session and DB-backed session | PARTIAL; no browser/DB verification |
| Profile create, edit, save, reload | `src/app/Dashboard.tsx`, `src/app/api/profiles/route.ts`, `src/app/api/profiles/[profileId]/route.ts` | Source-contract tests; PostgreSQL suite contains CRUD assertions but was not run | Execute profile API flow and refresh using an isolated PostgreSQL test DB and normal test account | NOT VERIFIED end to end |
| Optional birth details and null preservation | `src/presentation/birth-form.ts`, `src/server/birth-validation.ts`, profile API routes, `prisma/schema.prisma` | Unit validation and Postgres integration test definitions cover date-only nulls and omitted PATCH fields | Actual persistence/reload in disposable DB; authenticated editor browser flow | Unit-tested; DB/browser NOT VERIFIED |
| DOB, age, date-only timeline | `src/calculation/date-only.ts`, `src/calculation/life-timeline.ts`, `src/app/page.tsx` | `tests/life-timeline.test.mjs` covers strict date-only validation and regression cases | Real browser input interaction at supported viewport sizes | Unit-tested; browser NOT VERIFIED |
| Saved Kundli/report persistence and reopening | `src/app/Dashboard.tsx`, `src/app/api/saved-charts/route.ts`, `src/app/api/saved-charts/[chartId]/route.ts` | Saved result validation/ownership tests; list order is stable newest-first by creation time and ID, and the profile shortcut picks the first linked result | Create, reload, and reopen a saved snapshot against disposable DB in authenticated browser | NOT VERIFIED end to end; newest selection is source/unit-contract tested |
| Kundli Details fields in live and saved reports | `src/presentation/kundli-details.ts`, `src/app/KundliDetails.tsx`, `src/app/Dashboard.tsx` | Projection, all four new mapping tables, missing-input behavior, localization, and UI wiring have unit/source tests | Render a real authenticated saved report at mobile/desktop widths; no browser session available | Unit/source-tested; authenticated browser NOT VERIFIED |
| Assistant question submission/profile association/history | `src/app/KundliAssistant.tsx`, `src/app/api/assistant/questions/route.ts`, `src/app/api/assistant/questions/[questionId]/route.ts` | Assistant engine/routing tests and API source/validation tests | Persist and reload history with a normal account; switch profiles in browser; DB not available | Engine unit tests; persistence/browser NOT VERIFIED |
| User-to-user isolation | Profile, saved-chart and assistant APIs; `src/server/ownership.ts` | Fake-repository ownership unit tests; PostgreSQL suite defines profile/chart isolation assertions | Execute two-account requests against disposable PostgreSQL; test saved-question isolation too | Unit-tested only; DB isolation NOT VERIFIED |
| Logout and protected session behavior | `src/app/api/auth/logout/route.ts`, `src/server/auth-core.ts` | Mock repository session revocation and expiry tests | Authenticated browser logout followed by protected page/API checks against isolated DB | Unit-tested only; E2E NOT VERIFIED |
| User language/settings/legal links | `src/app/Dashboard.tsx`, `src/presentation/language-preference.ts`, legal routes | Localization and language preference unit tests | Persist/select preference and verify rendered dashboard in browser | Unit-tested; browser NOT VERIFIED |
| D1–D60 and 80-year timelines | `src/calculation/divisional-charts.ts`, `src/calculation/life-timeline.ts`, `src/app/DivisionalTimeline.tsx` | Boundary, mapping, DOB and period unit/regression tests | Full rendered chart/timeline tests at listed viewport widths; independent reference comparison remains feature-specific | Unit-tested; browser/reference gaps remain |
| All 38 assistant question types | `src/presentation/assistant-questions.ts`, `src/presentation/kundli-assistant.ts`, `src/interpretation/rules.ts` | `tests/kundli-predictions.test.mjs` tests all IDs for routing and localized non-placeholder response, with targeted tests for several branches | Per-ID meaningful evidence, valid/missing data and relevant boundary tests; source-reviewed interpretive rules and independent references where claimed | Routing coverage exists; prediction completeness NOT established |
| Super Admin page access | `src/app/super-admin/page.tsx`, `src/server/auth.ts` | Role/session unit test plus route source-contract assertion | Real role sessions, expired DB session, browser access tests | Unit/source-tested; browser/DB NOT VERIFIED |
| Super Admin aggregate counts | `src/app/api/super-admin/overview/route.ts` | Source-contract test checks guarded count queries | Execute aggregate queries as a Super Admin in isolated DB | NOT VERIFIED against DB |
| Admin vs Super Admin separation | Existing `/admin` and `/api/admin/users`; new `/super-admin` and `/api/super-admin/*`; `src/server/auth-core.ts` | Unit test distinguishes ordinary, ADMIN, and SUPER_ADMIN role checks; source guards checked | Database-backed accounts and authenticated route/API tests for each role | Unit/source-tested; multi-role E2E NOT VERIFIED |
| Super Admin user inspection and access audit | `src/app/api/super-admin/users/route.ts`, `src/server/super-admin-users-handler.ts`, `src/server/super-admin-users.ts`, `prisma/schema.prisma`, `prisma/migrations/20261019170000_super_admin_access_audit/migration.sql` | Filter parser tests reject invalid, unknown, duplicate, and empty filters; mocked API tests cover session/role denials, client role tampering, bounded stable pagination, explicit response-field projection, transactional audit, and sanitized audit failure | Apply migration only to disposable DB; verify persisted search, pagination, event creation, and role isolation | Unit/mock-tested; DB behavior NOT VERIFIED |
| Super Admin audit-log viewer | `src/app/api/super-admin/audit-logs/route.ts`, `src/server/super-admin-audit-handler.ts`, `src/server/super-admin-audit-logs.ts`, `src/app/super-admin/SuperAdminDashboard.tsx` | Unit parser tests, mocked handler tests for denial/expired role/empty/error/minimized fields, and source-contract UI/API assertions | Apply access-audit migration only to disposable DB; verify persisted event retrieval, date filters, actor reference, and role isolation | Implemented; DB/browser NOT VERIFIED |
| Verification endpoint privacy | `src/app/api/verification/route.ts`, `src/app/api/verification/approvals/route.ts`, `src/verification/status.ts` | Tests verify ordinary acknowledgements are local-only, authenticated approvals are reviewer-scoped/minimized, and public run data omits process output | Verify privacy behavior with normal reviewer accounts against disposable PostgreSQL and authenticated browser | Unit/source-tested; DB/browser NOT VERIFIED |
| Responsive user and Super Admin layouts | `src/app/dashboard.css`, `src/app/super-admin/super-admin.css`, dashboard components | CSS/source assertions check responsive breakpoints, focus and overflow declarations. Browser probe without a session reached the sign-in view and received 401 from the audit API | Rendered authenticated tests at 320, 360, 375, 390, 430, and 1280 CSS px; keyboard and focus-return behavior | Source-tested; authenticated responsive browser NOT VERIFIED |

### Safe verification environment

The current machine has no `.env.test`, `psql`, Docker, Podman, or local
PostgreSQL listener. No database test, migration, seed, or write operation was
run. `npm.cmd run build` was validated with a deliberately nonconnecting
placeholder `DATABASE_URL`; this is build/code-generation validation only and
does not establish database connectivity or persistence.

## Assistant question-by-question coverage

All IDs route through the same deterministic answer function and are included
in the catalog-wide locale/routing tests. That common test confirms dispatch and
text, not the correctness or completeness of question-specific evidence. The
matrix status below describes the currently implemented scope, not prediction
accuracy. See `ANSWER_COVERAGE_MATRIX.md` for the existing requirements and
limitations.

| # | ID | Engine/evidence path | Current test evidence | Missing test/dependency | Status |
|---:|---|---|---|---|---|
| 1 | `marriage_timing` | `kundli-assistant.ts` → `marriage-timing.ts`; KP/Dasha candidate periods | Marriage timing and candidate-window regression cases | Missing KP data, boundary-period and independent event-reference validation | PARTIALLY_SUPPORTED |
| 2 | `partner_timing` | Same conditional KP/Dasha candidate service | Catalog-wide routing/localization | Explicit missing-KP and candidate boundary tests; no partner-meeting rule | PARTIALLY_SUPPORTED |
| 3 | `love_arranged` | Relationship interpretations from `interpretation/rules.ts` | Catalog-wide routing and relationship evidence tests | Dedicated source-reviewed classifier and positive/negative cases | PARTIALLY_SUPPORTED |
| 4 | `marriage_dasha` | Marriage timing branch plus actual Vimshottari intervals | Catalog-wide routing and Dasha hierarchy tests | Branch-specific missing-KP and date-boundary cases; no independently validated outcome mapping | PARTIALLY_SUPPORTED |
| 5 | `marriage_factors` | Relationship section and chart placements | Relationship evidence tests | Explicit per-ID evidence and absent-house cases; interpretation requires reviewed sources | PARTIALLY_SUPPORTED |
| 6 | `partner_indicators` | Relationship section and 7th-house factors | Catalog-wide routing | Dedicated matching/non-matching partner-factor tests and reviewed rule | PARTIALLY_SUPPORTED |
| 7 | `compatibility` | Current selected chart only | Limitation test confirms second chart is required | Owned second-chart input and reviewed compatibility convention | UNSUPPORTED |
| 8 | `marriage_limitations` | Birth-time accuracy, timezone, KP availability | Limitation-only branch test | Missing-timezone and missing-accuracy combinations in all locales; interpretation review | PARTIALLY_SUPPORTED (disclosure branch implemented) |
| 9 | `government_timing` | Career factors and Dasha context only | No-fabricated-date/timing limitation regression | No event rule; requires reviewed method and outcome validation | UNSUPPORTED for event timing |
| 10 | `government_indicators` | Career interpretation section | Career/government evidence tests | Explicit government-specific factor cases and reviewed rule | PARTIALLY_SUPPORTED |
| 11 | `job_type_comparison` | Career/business evidence comparison handler | Catalog-wide routing | No role comparison method; reviewed criteria and negative cases required | UNSUPPORTED |
| 12 | `government_dasha` | Dasha intervals plus career evidence | Dasha hierarchy tests | Dedicated combination branch and missing active Dasha tests | PARTIALLY_SUPPORTED |
| 13 | `career_growth` | Career interpretation section | Career interpretation tests | Per-ID evidence and negative-factor tests; no outcome rule | PARTIALLY_SUPPORTED |
| 14 | `job_transit_dasha` | Career-timing context; no validated trigger | Timing tests verify natal transit snapshot is not misrepresented | No approved career event trigger; source review and boundary tests required | UNSUPPORTED for event timing |
| 15 | `competitive_exams` | Education section | Education/career interpretation tests | Dedicated absent-education and question-specific evidence cases; no exam outcome rule | PARTIALLY_SUPPORTED |
| 16 | `career_delay` | Career factors and limitations | Catalog-wide routing | No causal rule; explicit missing-factor cases and reviewed criteria required | PARTIALLY_SUPPORTED |
| 17 | `new_job_timing` | Career/Dasha context only | Catalog-wide routing | No job-event trigger; reviewed rule and boundary tests required | UNSUPPORTED for event timing |
| 18 | `job_change` | Career factors only | Catalog-wide routing | No change trigger; reviewed method and non-match tests required | UNSUPPORTED for advice/timing |
| 19 | `business_start` | Business factors/Dasha context | Catalog-wide routing | No business-event trigger; reviewed rule and boundaries required | UNSUPPORTED for event timing |
| 20 | `business_job_difference` | Career and business evidence comparison | Catalog-wide routing | No validated comparison criteria or positive/negative tests | UNSUPPORTED |
| 21 | `partnership_business` | Business/relationship factors | Business and relationship interpretation tests | Dedicated partnership criteria and matching/non-matching tests | PARTIALLY_SUPPORTED |
| 22 | `career_dasha` | Dasha intervals and career/business factors | Dasha hierarchy tests | Dedicated combined-context branch and missing-section tests | PARTIALLY_SUPPORTED |
| 23 | `financial_growth` | Finances-only evidence, explicit no-outcome limitation | Finance evidence isolation test | Missing-finance fixture and per-house evidence cases; no growth rule | PARTIALLY_SUPPORTED |
| 24 | `income_savings` | Combined financial context only | Catalog-wide route | Separate income/savings data and reviewed rules | UNSUPPORTED |
| 25 | `property` | Calculated 4th-cusp/occupants | Property evidence test | Missing cusp/occupant cases; no property acquisition rule or timing | PARTIALLY_SUPPORTED |
| 26 | `business_career_income` | Career/business interpretation factors | Catalog-wide route and comparison handler tests | No validated comparison/ranking method; per-question evidence tests | PARTIALLY_SUPPORTED |
| 27 | `financial_timing` | Finance/Dasha context only | Catalog-wide routing | No approved event trigger, date boundaries, or independent validation | UNSUPPORTED for event timing |
| 28 | `foreign_timing` | 3rd/9th/12th house factors | Foreign-house evidence test | No event timing rule; missing house and timezone cases | UNSUPPORTED for event timing |
| 29 | `foreign_travel_indicators` | 3rd/9th/12th cusps and occupants | Foreign house evidence test | Per-house positive/negative matrix and reviewed interpretation | PARTIALLY_SUPPORTED |
| 30 | `foreign_settlement` | 9th/12th factors only | Catalog-wide route | No relocation classifier or source-reviewed criteria | UNSUPPORTED |
| 31 | `abroad_job_study` | Foreign houses plus career/education evidence | Catalog-wide route | No abroad job/admission outcome rule; missing-section cases | PARTIALLY_SUPPORTED |
| 32 | `current_dasha` | Current Mahadasha/Antardasha/Pratyantardasha | Dasha interval and half-open boundary tests | Integration to actual persisted chart remains unverified | IMPLEMENTED as calculated interval facts |
| 33 | `strongest_indicators` | Multiple matching interpretation factors; no actual ranking score | Strongest-factor test checks no unsupported strength ranking | Stable selection/tie and zero-match cases | PARTIALLY_SUPPORTED |
| 34 | `calculated_yogas` | Present `yogasAndDoshas` entries | Yoga match/non-match tests | Independent traditional-reference validation; chart persistence unverified | IMPLEMENTED as engine findings |
| 35 | `rahu_ketu` | Calculated node placements | Node-placement test | Missing-node and node-mode tests for this answer branch | IMPLEMENTED as chart facts |
| 36 | `navamsa` | D9 placements and recorded convention | Divisional boundary tests; catalog route | Missing D9 snapshot and independent reference comparison | IMPLEMENTED as chart facts |
| 37 | `next_12_months_transits` | Local transit snapshot and ingress search at selected instant | Selected-instant and horizon regression test | Additional ingress boundary/reference validation; result is not event prediction | IMPLEMENTED as astronomical facts |
| 38 | `required_data` | Input/settings disclosure from selected chart | Catalog-wide route and provenance tests | Missing optional-field combinations and stale saved-chart browser case | IMPLEMENTED as disclosure |

## Safe test environment

The repository requires `LIFE_TEST_DATABASE_URL` in a local `.env.test` file
pointing to a dedicated database ending in `_test` or `-test`. The runner checks
`current_database()` before applying migrations and cleans only its generated
test accounts.

At this check, `.env.test` is absent; `psql`, Docker, and Podman are unavailable;
and no local PostgreSQL listener was detected. The PostgreSQL suite was not run.
The application's `.env` was not read or used. To unblock, provision an isolated
PostgreSQL service and database, configure only `.env.test` with its dedicated
test URL, verify the database identity, then follow
`DISPOSABLE_POSTGRES_TESTING.md`.

No normal authenticated test account/session or isolated browser application
was available. Browser tests at the requested sizes were not run. Do not infer
browser success from CSS/source assertions or build output.

## Phase 5 — privacy hardening and application readiness review (2026-10-21)

- Baseline before changes: full suite **286 passed, 0 failed, 0 skipped**;
  `npx.cmd tsc --noEmit` passed.
- Question answer paths and evidence routing were reviewed against the
  38-question matrix. No interpretation rule met the source-review and
  independent-evidence requirements for a safe change; question statuses and
  predictive-performance status were not upgraded.
- `/api/verification` no longer reads or writes public free-text
  acknowledgement labels/notes. Ordinary acknowledgement state remains
  browser-local. Existing acknowledgement rows, if any, were not deleted.
- Authenticated verification approval reads are scoped to the current
  reviewer and omit approval notes and account email/role metadata.
- Public verification run responses now omit raw process stdout/stderr and
  host/runtime metadata. Checklist status calculations still use the
  original private report before producing a minimized public projection.
- Added verification regression tests for local-only acknowledgements,
  reviewer-scoped approval projections, and removal of private process output.
- After changes: full automated suite **289 passed, 0 failed, 0 skipped**;
  focused verification suite **14 passed, 0 failed, 0 skipped**;
  `npx.cmd tsc --noEmit` passed; production build passed with a deliberately
  nonconnecting process-scoped placeholder `DATABASE_URL`.
- No schema/migration, database write, role change, payment action, or
  production-data access was performed. PostgreSQL cross-account checks and
  authenticated browser tests remain blocked: `.env.test`, disposable
  PostgreSQL, and authorized test sessions are not available.
- Super Admin account controls/settings/report exports and payment/subscription
  workflows remain unimplemented pending approved role policy, provider,
  plan/pricing/entitlement, currency, sandbox setup, and refund policy. The
  permission proposals and decision requirements are in
  [`PROJECT_EXCELLENCE_PHASE_1.md`](./PROJECT_EXCELLENCE_PHASE_1.md) and
  [`PHASE_D_PRODUCTION_AUDIT.md`](./PHASE_D_PRODUCTION_AUDIT.md).
- Official Razorpay/PayPal order and webhook documentation was reviewed and
  recorded in `PHASE_D_PRODUCTION_AUDIT.md`; no sandbox account or transaction
  was available, so provider integration remains unverified and unimplemented.

## Payment and deployment readiness audit (2026-10-21)

- Payment source inventory: no provider package, checkout/order API, payment
  or subscription model, webhook, transaction service, or payment test exists.
  The `/refund-policy` page is informational text, not a payment/refund flow.
  Provider instructions are design references only; payments are not required
  to deploy the current application.
- Payment design and the exact missing business/configuration decisions are
  listed in [`PHASE_D_PRODUCTION_AUDIT.md`](./PHASE_D_PRODUCTION_AUDIT.md).
  No payment environment keys are currently required or referenced by the app.
- Environment names found in code/templates: `DATABASE_URL` is required for
  persistent application operations; `LIFE_TRUST_PROXY_HEADERS` is an optional
  proxy-trust setting and must be enabled only behind a trusted proxy;
  `LIFE_TEST_DATABASE_URL` is test-only and belongs in `.env.test`;
  `NODE_ENV` and `NEXT_TELEMETRY_DISABLED` are set by the production container.
  `SUPABASE_PROJECT_URL` appears as optional, unused template metadata.
  No environment values were read into this audit. The local `.env` was not
  inspected.
- `Dockerfile` uses Node 24, Next standalone output, and a non-root runtime;
  `railway.json` deploys that Dockerfile and uses `/api/health`. The health
  endpoint now returns ready only when both the ephemeris engine and PostgreSQL
  are available. The chart UI reads `engineReady` separately, preserving the
  meaning of its engine indicator.
- The standalone build wrapper strips generated `.env` files from
  `.next/standalone` before it can be packaged. A local production build with
  an empty/nonconnecting `DATABASE_URL` passed, and the standalone output had
  no `.env` file afterward. The standalone server started successfully:
  `/` returned HTTP 200; `/api/health` returned HTTP 503 with
  `engineReady: true` and database status `unreachable`, as expected for the
  deliberately unreachable placeholder. The server was stopped after probing.
- Runtime environment names/values and the tagged `.env` contents were not
  printed or inspected. `.dockerignore` excludes `.env*` except the example.
- Final Phase 6 verification: full suite **291 passed, 0 failed, 0 skipped**;
  TypeScript check passed; production build passed; deployment readiness
  behavior was manually smoke-tested over loopback using only an invalid,
  nonconnecting database placeholder. No database write, migration, payment
  operation, or authenticated browser session was used.
- Still unverified: Linux/Docker image build and native ephemeris binding,
  connection to a configured deployment database, database migrations,
  authenticated user/admin journeys, and provider sandbox integration. Keep
  database setup and migrations within the deployment’s approved release
  procedure; no migration is authorized by this audit.

## Phase 6 database and deployment readiness review (2026-10-21)

- Re-reviewed `prisma/schema.prisma`, all six checked-in migration SQL files,
  Prisma configuration, database/authentication code, API route handlers,
  Docker/Railway configuration, and the guarded PostgreSQL test runner.
  Schema and migration source are consistent for the user, session, profile,
  saved-chart, question-history, technical-verification, and Super Admin
  access-audit tables, indexes, enum types, and declared foreign keys.
- Migration SQL impact: the initial migration creates users, profiles, and
  saved charts; later migrations add verification tables, database-backed
  sessions/approvals, nullable legal-acceptance fields and question history,
  optional birth-detail fields, and the Super Admin access-audit table. None
  contains `DROP`, `TRUNCATE`, `DELETE`, or bulk `UPDATE` statements. The
  optional-birth-details migration relaxes `NOT NULL` constraints and adds
  nullable columns. Existing foreign-key policies include account-owned data
  cascading on user deletion and optional profile/chart links becoming null
  when their referenced records are deleted; no such deletion was run.
- Applied/pending migration state is **BLOCKED / UNKNOWN**: no authorized,
  read-only connection to the deployment database was available. The checked-
  in migration list is not evidence of deployment state.
- Disposable PostgreSQL integration is **BLOCKED**: `.env.test` is absent and
  `LIFE_TEST_DATABASE_URL` was not configured in the process. The guarded
  migration/integration script was not run. No deployment/disposable database
  connection, migration, seed, test-account creation, or write was attempted.
- Code-only verification: full automated suite **291 passed, 0 failed,
  0 skipped**; `npx.cmd tsc --noEmit` passed; `npm.cmd run build` passed with
  a deliberately nonconnecting, process-scoped placeholder database URL.
  Standalone output contained no generated `.env` files.
- Windows loopback production-startup probe: `/` returned HTTP 200; `/api/health`
  returned HTTP 503, `ready: false`, `engineReady: true`, and database status
  `unreachable`, matching the deliberately unreachable local placeholder.
  The probe process was stopped. Docker was unavailable, so Linux/Docker and
  native ephemeris runtime compatibility remain unverified.
- Unit/source tests and the smoke probe do not establish persisted
  registration/login/logout, owner isolation, selected-profile association,
  or database-backed admin behavior. Authenticated browser verification was
  not performed. No source-code defect was confirmed and no application code
  was changed in this review.
- Release status remains **NOT PRODUCTION-READY / NOT FULLY VERIFIED** until
  deployment database connectivity and migration state, disposable-DB
  integration workflows, authenticated user/admin workflows, and the target
  Linux/Docker runtime are checked through authorized, isolated procedures.

## Same-day local production-target verification (2026-10-21)

- Configuration was inspected by presence only. The local `.env` exists and
  `DATABASE_URL` is configured there; no value was displayed, copied, or
  changed. The user identified this as a production PostgreSQL connection.
  The check below applies only to that local-configured target and does not
  establish that it matches the Railway service configuration.
- Database connectivity: **PASS** for a read-only transaction containing
  `SELECT 1`. No application tables or user records were queried. No writes,
  migration, seed, test-account creation, or schema changes were performed.
- Prisma migration status: **UNKNOWN / BLOCKED**. The read-only
  `prisma migrate status` command exceeded its bounded timeout on two attempts.
  Raw command output was suppressed. Connectivity success does not verify
  migration ledger state; no migration was applied.
- Current checks: full automated suite **291 passed, 0 failed, 0 skipped**;
  `npx.cmd tsc --noEmit` passed; production build passed using a
  deliberately nonconnecting process-scoped placeholder URL. No generated
  `.env` files were present in `.next/standalone`.
- Existing tests cover mocked/unit authentication, session expiry/logout,
  ownership predicates, assistant profile association contracts, D1–D60
  calculations, engine readiness, and Super Admin role enforcement. Real
  persisted registration/profile/chart/question/admin workflows remain
  **BLOCKED** because no disposable PostgreSQL target was configured for
  integration tests. No real account was used.
- Railway runtime equivalence remains **UNKNOWN**. Docker/Linux validation is
  **BLOCKED** because Docker is unavailable. The source configuration uses
  the Dockerfile, Node 24 Debian slim, standalone Next output, a non-root
  runtime user, local Swiss Ephemeris assets, and `/api/health`; these source
  facts do not prove successful target-platform execution. Production cookie
  settings are `__Host-life_session`, HttpOnly, Secure, SameSite=Lax, and
  Path=/.
- No application code defect was confirmed and no application source change
  was made. This verification note is the only file changed for this pass.
- Release remains **NOT FULLY VERIFIED**. Next actions: obtain the Railway
  deployment’s own configured-target confirmation without exposing its
  secrets; use an approved read-only deployment procedure to inspect migration
  status (the local Prisma command timed out); configure and authorize a
  disposable PostgreSQL database for integration tests; then validate the
  Docker image on the target Linux platform and perform authenticated browser
  checks with test accounts.

## Phase 7 local Supabase read-only verification (2026-10-21)

- Prisma package and client configuration reviewed: Prisma CLI/client
  **7.10.1**, PostgreSQL datasource with no explicit schema (default `public`),
  `@prisma/adapter-pg` **7.10.1**, pool maximum 10, and 5-second client
  connection timeout. Prisma config loads the local environment file; the
  CLI migration status had previously timed out twice. No migration or
  schema-changing command was retried in this phase.
- The connection target was identified only as a Supabase pooler-style
  endpoint from its URL structure; no host, port, database name, or credential
  was emitted. A bounded `pg` client check completed `SELECT 1` in a
  `BEGIN READ ONLY` transaction: **PASS**. The transaction was rolled back.
- Read-only PostgreSQL catalog checks report active schema `public`, and all
  12 application model tables expected by the current Prisma schema are
  present there. Only `information_schema`/catalog metadata was queried; no
  application records or personal information were accessed.
- The public `_prisma_migrations` ledger table is **MISSING**. Therefore
  applied/pending migration status is **UNKNOWN**, not “up to date”. The
  presence of application tables does not establish how or when they were
  created. No ledger records were read because the table was absent.
- Prisma CLI timeout root cause remains **UNPROVEN**. The successful bounded
  PostgreSQL client queries show this local environment can reach the
  pooler-style target using `pg`, but do not establish why Prisma CLI status
  timed out. Possible CLI, pooler compatibility, or migration-ledger
  interaction cannot be distinguished from this evidence. No further CLI
  retry was performed.
- Current full automated suite: **291 passed, 0 failed, 0 skipped**;
  `npx.cmd tsc --noEmit` passed. These are unit/mock/source tests; PostgreSQL
  integration tests were not run against Supabase or any other database.
  Existing relevant test files cover auth/session behavior,
  assistant/profile matching, dashboard/API contracts, D1–D60 calculations,
  health behavior, and mocked Super Admin authorization.
- Local browser UI check: `http://localhost:3000` returned connection refused;
  no application page was available for rendered UI validation in this
  session. This does not contradict source/unit test results.
- No application or database code/schema was changed. No writes, migrations,
  seeds, test-account creation, or user-row queries occurred. This note is the
  only file changed.
- Database-backed workflows remain **BLOCKED** despite successful read-only
  connectivity and table-presence checks. Next safe actions: investigate the
  missing Prisma ledger using an authorized DBA/operator review; diagnose the
  Prisma CLI timeout outside production (for example against a disposable
  clone with matching pooler mode); start the local application and perform
  non-mutating public UI/health checks; use only a disposable database for
  persisted auth/profile/report/admin workflow tests.

## Phase 8 local app and migration-history investigation (2026-10-21)

- Startup inspection: `package.json` defines `npm.cmd run dev` as
  `next dev --hostname 0.0.0.0`; production `start` uses the standalone server.
  Next config uses standalone output, local ephemeris tracing, and production
  security headers. Prisma 7.10.1 is configured for PostgreSQL, with six
  repository migration directories. No app startup error was observed.
- Port 3000 was free and no matching Next application process was running
  before startup. Started with the existing command `npm.cmd run dev`; the
  process is left running for the user. No unrelated process was stopped.
- Local UI verification: homepage `http://localhost:3000/` returned HTTP 200
  and rendered in the integrated browser with title “LIFE — Jyotish
  Workbench”. `/api/health` returned HTTP 200 with `ready: true`,
  `engineReady: true`, and database status `connected`. This route performs a
  connectivity query only; no user records were read.
- Recent Next log inspection found no startup/error markers. The local app
  loaded the configured environment, but no environment values were displayed
  or copied. No files under `.env` were modified.
- Migration process evidence: Prisma Migrate is the repository's intended
  migration workflow: SQL migration directories are checked in; `db:deploy`
  invokes `prisma migrate deploy`; the disposable PostgreSQL script uses
  `migrate deploy` only after verifying the test database; and
  `docs/TESTING.md` says production migrations are explicit release
  operations and startup does not migrate. This establishes repository
  intent, not historical execution against this Supabase database.
- Read-only catalog inspection confirms the expected 12 application tables
  in `public`. No `_prisma_migrations` table exists in `public` or any
  visible schema, and no Supabase CLI `supabase_migrations.schema_migrations`
  table was found. Thus applied/pending migration status and the actual
  historical schema-management method remain **UNKNOWN**. Manual SQL,
  Prisma `db push`, or migration use outside this repository cannot be
  confirmed or excluded from repository evidence.
- No schema or migration ledger was created or changed. No migration,
  `db push`, seed, insert/update/delete, test-account creation, or user-row
  query occurred. No live user data was exposed. Prisma CLI was not retried.
- Browser UI verification is limited to the public homepage and health route.
  No registration, login, logout, profile, saved-chart, assistant, or admin
  mutation was submitted against Supabase. Those persisted workflows remain
  **BLOCKED** and require a disposable database.
- Root cause of absent migration ledger: **UNKNOWN**. An authorized database
  operator should check the provider's migration/release records, historical
  deployment logs, backups/schema exports, and any approved manual SQL or
  schema-push records. Do not fabricate or mark migration history from the
  present schema alone.

## Phase 9 local feature audit (2026-10-21)

Audit method: current source/routes and feature documentation; automated
unit/mock/source suite; non-persistent synthetic chart API request; public
homepage browser inspection at mobile/desktop widths; prior read-only health
check. Supabase was treated as production. No authenticated mutation, user
record query, test-account creation, migration, seed, or database write was
performed. No isolated PostgreSQL test URL is configured.

| Feature | Status | Evidence and boundary |
|---|---|---|
| Homepage / public workbench | WORKING (observed local route) | Local homepage returned HTTP 200 and rendered in browser with LIFE title and main content. Resized public page to 320×640, 390×844 and 1280×900; no horizontal overflow observed. This is not full authenticated UI coverage. |
| Birth input validation | WORKING (unit/API) | Full suite covers form and validation paths. Synthetic chart API accepted a valid fixed fixture and returned HTTP 200; invalid latitude returned HTTP 422 `INVALID_COORDINATES`. |
| Local Kundli calculation API | WORKING (observed synthetic request) | Synthetic request returned calculated provenance, 12 planetary entries, 12 houses and D2–D60 output keys (59 divisional charts). This verifies local execution and response shape for one fixture, not broad numerical accuracy. |
| D1–D60 calculation/rendering | PARTIAL | Divisional boundary/reference mapping and UI source tests pass; current API probe returned all D2–D60. End-to-end chart rendering at this phase was not exercised from the form; not every natal output or tradition is independently validated. |
| Registration, login, logout and sessions | PARTIAL | Auth-core tests cover hashing, validation, session expiry/revocation and server-derived roles; route/source tests exist. No registration/login/logout was submitted against Supabase; persistence and session behavior in the configured database remain unverified. |
| Profile create/edit/delete and ownership | PARTIAL | Route validation and owner-scoping are implemented; unit/source contracts and guarded disposable-DB test definitions exist. No profile mutation or cross-account database test was run. |
| Saved Kundlis / reports | PARTIAL | Owner-scoped CRUD, stable ordering, snapshot validation and summary tests exist. No save/reopen or persistence operation was performed in Supabase; disposable DB integration is unavailable. PDF/export is not implemented. |
| Ask My Kundli and question history | PARTIAL | Unit/source tests cover selected profile/chart matching, owner-scoped history, pagination and question routing. No question submission, history write, or authenticated profile-switch flow was performed against the live DB. |
| Astrology details and 38 answer types | PARTIAL | Existing tests cover catalog routing and relevant selected-answer behavior. The documented inventory remains 6 implemented, 17 partially supported, 15 unsupported; interpretation source review and predictive performance remain incomplete/unevaluated. Independent calculation evidence is feature-specific and limited. |
| Admin dashboard and user inspection | PARTIAL | Source implements aggregate dashboard and bounded read-only user inspection. Mock tests cover role checks, minimization, pagination and transactional audit behavior. No authenticated Admin account or DB-backed query was tested. Administrative account actions are not implemented. |
| Super Admin access and audit views | PARTIAL | Server-side exact-role guards and mocked API tests exist. Audit views rely on the `SuperAdminAccessLog` table. No authenticated browser or persisted audit write/read was tested; migration history is unknown. Role management, settings, report export and question audit remain unavailable. |
| Health and safe database outage behavior | WORKING (observed readiness only) | Local `/api/health` returned HTTP 200 with engine ready and database connected. Prior bounded outage smoke and unit tests establish fail-closed readiness behavior. Health performs connectivity checks, not schema or workflow verification. |
| Responsive UI / navigation | PARTIAL | Public homepage at 320, 390 and 1280 CSS px had no horizontal overflow. Prior browser evidence covers other chart-layout widths. Admin/account authenticated layouts, all links and all controls were not exhaustively exercised in this pass. No broken control was confirmed; this is not a complete interactive control audit. |
| Payments, PDF export, account role management, platform settings | NOT IMPLEMENTED | Repository audit documents no payment integration, PDF renderer, account-role mutation API, or platform-settings service. No product policy/pricing/entitlements were inferred. |
| Live database workflows / migration status | BLOCKED / UNKNOWN | All expected application tables were previously confirmed by read-only metadata. No visible Prisma migration ledger was found, so migration history is unknown. No isolated test database is configured; live Supabase was not used for workflow writes. |

**Defect assessment:** no confirmed application code defect was found during
this pass. No application source fix was justified. The feature-inventory
summary was corrected to remove stale claims that the workspace was empty and
that authentication was absent; see [`FEATURE_INVENTORY.md`](./FEATURE_INVENTORY.md).

**Verification:** latest Phase 9 full suite **291 passed, 0 failed, 0 skipped**;
`npx.cmd tsc --noEmit` passed. Live public runtime checks: homepage HTTP 200,
health HTTP 200, synthetic chart API HTTP 200 with expected output shape, and
invalid chart request HTTP 422. Production build was not rerun in this phase.
The public browser check did not submit authenticated or persistent changes.
No production data was written or queried beyond database connectivity and
previously recorded catalog metadata checks.

**Prioritized remaining work:** (1) have an authorized database operator
establish the schema/migration history from release records/backups without
modifying Supabase; (2) provision an isolated disposable PostgreSQL database
and run guarded integration coverage for auth, profiles, reports, assistant
history and admin/audit; (3) perform authenticated UI checks with dedicated
test accounts in that isolated environment; (4) decide whether missing PDF,
role-management, settings, report-export or payment features are product
requirements; (5) continue independently validating calculation conventions
and interpretation sources. Production readiness is not claimed.

## Phase 10 core workflows (2026-10-21)

**Plan:** trace each requested workflow through its current UI, route, service,
schema and regression tests; fix only confirmed defects; verify code with the
full local test/type/build checks; keep all persistence tests blocked unless an
isolated disposable PostgreSQL URL is explicitly configured.

**Outcome:** source inspection and existing unit/mock coverage confirm that
the requested authentication/session, owner-scoped profile and saved-chart,
assistant history, and admin/Super Admin paths already exist. No confirmed
code defect was found, so no application code change was justified. This is
not equivalent to verifying persisted workflows.

| Workflow | Status | Evidence and verification boundary |
|---|---|---|
| Registration/login/logout and persisted sessions | PARTIAL | Auth routes, DB-backed opaque sessions, hashing, expiry/revocation, role guards and unit/mock tests are present. No isolated DB credentials or authenticated integration execution. |
| Profile editing and owner isolation | PARTIAL | CRUD routes, validation, ownership filters and source/mock tests exist. Persist/reload and cross-user DB isolation remain unverified. |
| Saved Kundli/report persistence | PARTIAL | Owner-scoped create/list/reopen/update/delete routes and contract tests exist. Persistence and ownership integration remain unverified. |
| Ask My Kundli/profile association/history | PARTIAL | Profile/chart association, ownership validation and history routes/source tests exist. Actual history persistence remains unverified. |
| Admin/Super Admin access, users and audit | PARTIAL | Server role guards and mocked admin/audit tests exist. Real DB aggregates, role accounts and persisted audit behavior remain unverified. |
| D1–D60 and calculation engine | PARTIAL | Prior suite and synthetic API checks cover calculation outputs; independent reference coverage remains limited, and this phase did not add validation. |
| Authenticated loading/error/empty/mobile UI | BLOCKED | Components and source tests exist, but authenticated browser flows were not run with isolated test accounts. |
| PDF export, role mutation, platform settings, report exports, payments | NOT IMPLEMENTED | No new requirements were assumed or implemented; product decisions remain required. |

**Checks:** `npm.cmd test` — **291 passed, 0 failed, 0 skipped**;
`npx.cmd tsc --noEmit` — **PASS**; `npm.cmd run build` — **PASS**. The
production build used a process-scoped unreachable placeholder database URL,
not the live Supabase URL, and no database operation was requested by the
build. The local dev server was restarted after the build and reached its
ready state. No live database writes, migrations, seeds, user-row queries or
schema changes were performed.

**Database status:** isolated PostgreSQL was not configured, so all
database-backed workflow integration is **BLOCKED**. Live migration history
remains **UNKNOWN** because the visible Prisma migration ledger was previously
not found; repository migration files do not establish which migrations were
applied to Supabase. Production readiness is not claimed.

**Next safe actions:** (1) provision and explicitly identify a disposable
PostgreSQL test database and run the guarded integration suite there; (2) use
dedicated test accounts only in that isolated environment for authenticated
browser coverage; (3) have an authorized operator reconcile Supabase migration
history from deployment records/backups without changing the database; and
(4) obtain product decisions for the listed unimplemented features.

## Phase 11 disposable PostgreSQL integration verification (2026-10-21)

**Setup check:** `scripts/test-postgres.mjs` loads only `.env.test`, requires
`LIFE_TEST_DATABASE_URL`, validates PostgreSQL URL syntax and a database name
ending in `_test` or `-test`, rejects names indicating production/staging,
and refuses to continue unless the standalone server and Prisma CLI exist.
Before migration, it connects with a bounded timeout and compares the actual
database name with the configured name. It then runs `prisma migrate deploy`
and `tests/postgres.integration.mjs`. That integration test creates dedicated
randomized accounts and records, runs API checks, and deletes test users in
cleanup. Therefore, this runner performs writes and is suitable only for a
verified disposable database.

Checked presence only; no values were read or displayed:

- `.env.test`: **absent**
- `LIFE_TEST_DATABASE_URL` in process, user, or machine environment:
  **absent**
- Database identity/content and emptiness: **not checked; no connection made**

**Integration result: BLOCKED before execution.** No database was available
through the permitted test-only configuration, so no integration command,
migration, API-backed test, browser test, or database query was run. No
fallback to `DATABASE_URL` or Supabase occurred. There are no integration
pass/fail results to report. Registration/session persistence, profile and
saved-chart ownership, assistant history persistence, admin/Super Admin
authorization, and cross-user access remain unverified against PostgreSQL.

**Exact safe setup required:** provision a dedicated disposable PostgreSQL
instance/database containing no valuable data and isolated from Supabase and
staging; copy `.env.test.example` to `.env.test`; set only
`LIFE_TEST_DATABASE_URL` to that database, whose name ends in `_test` or
`-test`; verify the target independently and confirm it is disposable/empty.
Then run `npm.cmd run build` if the standalone server is not present, followed
by `npm.cmd run test:postgres`. The runner applies the repository migrations
to that configured test database and its integration test performs cleanup.
Do not set this variable to a production or shared staging target.

**Changes:** documentation only; no application code or test code changed.
No defect was found because integration execution was blocked. Live Supabase
was not contacted or modified. Production migration status remains unknown.

## Phase 12 offline birthplace search (2026-10-21)

**Implementation:** added a server-side local search API backed by a bundled
GeoNames `cities500` extract (the source note states 236,560 places), timezone/admin labels,
and 620 compressed city-name prefix shards. A later audit found 237,018 shard rows
and 236,275 distinct IDs; the 285-ID difference from the source note is unresolved.
No geocoding request or API key is
used at runtime. Selection fills the editable birthplace label, latitude,
longitude, IANA timezone and `gazetteer` coordinate-source field. Editing any
selected location detail changes that source to `manual-unknown`. Manual
coordinate/timezone entry remains supported. Ambiguous results show region and
country; no-result, loading, API failure and invalid response states are
handled. Coordinates and IANA identifiers are validated on the server and in
the client response parser.

**Evidence:** focused fixture tests cover selected-field mapping, accent
matching, ambiguity, empty results, invalid/range-boundary coordinates,
invalid IANA timezones, duplicate aliases, failed dataset streams and failed
or malformed API responses. A real offline test searches the bundled index
without any external request. Browser testing selected “New York City” and
observed `40.71427`, `-74.00597`, `America/New_York`, and `gazetteer` source;
editing latitude changed source to `manual-unknown`. Browser checks also
observed ambiguous, no-results, loading and simulated HTTP 503 states. At 320
and 390 CSS-pixel widths, the form remained available and no horizontal
overflow was observed.

The local API returned HTTP 200 with ten ranked New York matches, 28 total,
and `ambiguous: true`; an unmatched query returned HTTP 200 with zero matches;
a normalized-invalid query returned HTTP 422. The post-build local homepage,
health endpoint and place-search endpoint returned HTTP 200. Production build
output included the manifest and all 620 compressed location shards.

**Checks:** final `npm.cmd test` — **302 passed, 0 failed, 0 skipped**;
`npx.cmd tsc --noEmit` — **PASS**; `npm.cmd run build` — **PASS**. The build
used a process-scoped unreachable placeholder `DATABASE_URL`; no database
operation was run by this feature. The dev server was restored after the
build.

**Limitations and safety:** the `cities500` gazetteer is not exhaustive for
every village, neighborhood or address; users can enter verified values
manually when a place is absent. Attribution/license and dataset provenance
are documented in [`data/locations/README.md`](../data/locations/README.md).
No API key, paid service, runtime geocoding request, Supabase write, migration,
seed, or user-record query was used. This verifies the local search workflow
for included records, not the completeness or independent correctness of each
gazetteer coordinate.

## Phase 13 Windows production deployment preparation (2026-10-21)

**Configuration inspected:** `package.json` production start is
`node .next/standalone/server.js`; the Docker image starts its standalone
`server.js`. `railway.json` selects `Dockerfile` and `/api/health`. Deployment
requires `DATABASE_URL`; `LIFE_TRUST_PROXY_HEADERS` is optional and must only
be enabled behind a trusted proxy. `PORT` is supplied by the hosting platform.
`LIFE_TEST_DATABASE_URL` is test-only and is not a deployment setting. No
environment-variable values were printed or recorded.

**Confirmed configuration fix:** the standalone server uses
`process.env.HOSTNAME` when present. The Docker runtime now sets
`HOSTNAME=0.0.0.0`, preventing container-provided hostnames from determining
the listener address while preserving the platform-provided `PORT`.
`tests/deployment-config.test.mjs` asserts the image bind, production start
command, Railway Docker builder, and health-check path.

**Production build/runtime:** `npm.cmd run build` passed with a
process-scoped, deliberately nonconnecting placeholder database URL.
`npx.cmd tsc --noEmit` passed. The final full test suite passed **303 tests,
0 failed, 0 skipped**. Standalone output contains `server.js`, the
ephemeris manifest, the location-search manifest and all 620 location
shards, and the Swiss Ephemeris package. No `.env`-named files were found in
the standalone output. `.dockerignore` excludes `.env*` except the example.

The actual `npm.cmd start` production command was exercised on loopback with
`HOSTNAME=0.0.0.0` and a read-only health probe: homepage HTTP 200, `/api/health`
HTTP 200 (`ready=true`, engine ready, database connected), and local location
search HTTP 200. A separate run with a deliberately unreachable database
returned health HTTP 503 (`engineReady=true`, database `unreachable`) while
the homepage and offline location search remained HTTP 200. The connected
health probe executes `SELECT 1`; no application record was read or changed.

**Read-only Supabase schema metadata:** the configured target was identified
as Supabase without displaying its hostname or connection configuration.
Catalog-only comparisons found 12/12 expected application tables, 99/99
Prisma model columns, and 2/2 enums in `public`; column types and nullability
matched, as did every index and constraint name defined in the six repository
migrations. No application rows were queried. No Prisma migration ledger was
found. `auth.schema_migrations` and `realtime.schema_migrations` are visible,
but they are not Prisma's `_prisma_migrations` ledger. Therefore current
schema shape is compatible with the repository model at the checked metadata
level, but which migrations were historically applied remains **UNKNOWN**.
No migrations or writes were run.

**Deployment result:** Docker and Podman are unavailable; no Linux image,
native Linux binding, or Railway deployment was executed. A controlled
Windows production-runtime check passes, but production deployment to the
current Supabase target is **not cleared** until an authorized operator
reconciles migration history from deployment records/backups and approves a
safe migration/rollback plan. Docker/Linux verification remains blocked until
a Linux CI runner or Docker-capable environment is available. Database-backed
workflow integration remains blocked pending a separately verified
disposable PostgreSQL database.

## Phase 14 Docker CI and safe staging readiness (2026-10-21)

**CI inspection:** no `.github/workflows` directory, GitLab CI file, CircleCI
configuration, Azure pipeline, Jenkinsfile, or Bitbucket pipeline exists in
the repository. GitHub Actions or another CI system is therefore not already
configured. Per the requested conditional scope, no new CI provider/workflow
was introduced. There is no CI runner result to report.

**Docker verification:** Docker and Podman are unavailable in this
environment. The Docker image was not built or started; Linux native
module loading, container port binding, container health behavior, bundled
asset presence inside an image, and Docker image secret exclusion remain
**BLOCKED**, not passed. Windows production-runtime checks from Phase 13 do
not substitute for an image run. No production credentials are required for
the proposed CI smoke test; it must use a deliberately unreachable,
nonconnecting database URL and must not deploy.

**Staging requirements:** create an explicitly separate Railway staging
environment and PostgreSQL service containing no valuable production data;
set only that service's `DATABASE_URL` reference; retain the platform-provided
`PORT`; keep proxy-header trust disabled unless a trusted proxy is confirmed;
deploy a reviewed commit only after a Docker-capable CI image/runtime check;
review and apply repository migrations only to a verified empty staging
database; create synthetic staging accounts only; and verify health, auth,
ownership, chart persistence, question history, admin access and offline
calculation/location behavior. Do not point staging or integration tests at
live Supabase. This task did not create a Railway resource, set variables, run
migrations, or deploy.

**Migration safety:** Supabase's current catalog shape matched the checked
Prisma models and repository migration constraints in Phase 13, but the
Prisma migration ledger was absent and applied migration history remains
**UNKNOWN**. An authorized operator must review actual deployment logs,
release automation, approved SQL/schema exports and backups; restore a
protected backup to an isolated disposable clone; and compare the schema and
each migration's effects in order. If evidence is incomplete, keep status
UNKNOWN and obtain a formal baseline decision. Do not fabricate/alter the
ledger or run `migrate resolve`, `migrate deploy`, `db push`, reset, seeds or
test writes against Supabase.

**Exact next manual actions:** (1) an authorized repository maintainer decides
whether to enable GitHub Actions or identifies an existing Docker-capable CI
provider; (2) run the requested non-deploying container smoke workflow there;
(3) an authorized Railway operator creates an isolated staging app/database
and securely sets its database reference; (4) the database owner reconciles
Supabase migration history from real records and clone testing; and (5) only
after staging database identity and migration scripts are reviewed, an
authorized operator applies migrations to staging and performs synthetic
workflow verification. No deployment success or Docker/Linux pass is
claimed.

## Phase 15 Docker CI workflow setup (2026-10-21)

Added `.github/workflows/docker-ci.yml`, triggered by pull requests and pushes
to `main`. It uses an Ubuntu Linux runner, Node.js 24, `npm ci`, the existing
`npm test` and `npx tsc --noEmit` commands, and the repository Dockerfile. The
runtime check starts the image with a nonconnecting loopback database URL and
asserts homepage HTTP 200, health HTTP 503 with engine ready/database
unreachable, and location-search HTTP 200 with matches. It checks all 620
location shards, every manifest-listed ephemeris file, native Swiss Ephemeris
module loading, absence of non-example `.env` files, and common credential
patterns in packaged text. It inspects image-config environment names for
database URLs or secret-like variables. The workflow has read-only repository
permissions and contains no deploy step, production secrets, or Supabase
target.

`tests/deployment-config.test.mjs` now checks the CI triggers, test/typecheck
and Docker steps, unreachable database target, endpoint checks, shard count,
and absence of deployment/secrets wiring. Local `npm.cmd test` passed **304
tests, 0 failed, 0 skipped**; `npx.cmd tsc --noEmit` passed. The workflow
YAML could not be parsed by a local YAML parser because none is installed;
regression assertions cover its expected structure.

**Execution status:** this workspace has no `.git` directory or configured
remote, and Docker/Podman are unavailable. The workflow was not run and the
Docker image was not built. To trigger it, an authorized maintainer must add
these changes to the repository, push the workflow and changes to a branch
and open a pull request, or push directly to `main`; then inspect the Linux
job result. Docker/Linux verification remains **BLOCKED** until that job
completes successfully.

Staging requirements and safe Supabase migration-history reconciliation are
documented in `docs/DEPLOYMENT_RAILWAY.md`. No Railway resources were created,
no staging database was configured, and no production database action was
performed. Supabase migration history remains **UNKNOWN**; database-backed
workflow verification remains blocked pending isolated staging/disposable
PostgreSQL testing.

## Phase 16 repository and CI handoff (2026-10-21)

**Repository state:** this workspace is not a Git repository (`.git` is
absent), and the Git executable is unavailable. No remote was inspected or
configured, and no push/commit was attempted. Do not invent a remote. The
existing GitHub Actions workflow is at `.github/workflows/docker-ci.yml`, but
cannot start running until its contents are added to the user's actual GitHub
repository and pushed.

**Ignore rules:** `.gitignore` excludes `.env` and `.env.*` while preserving
`.env.example` and `.env.test.example`; it excludes `node_modules/`, `.next/`,
`out/`, and `coverage/`, and now also excludes local `*.db`, `*.db-*`,
`*.sqlite`, `*.sqlite-*`, and `*.sqlite3` files. No local SQLite/database
files were found in the workspace. `.dockerignore` excludes `.env*` except
the safe `.env.example`.

**Local verification:** `npm.cmd test` passed **305 tests, 0 failed, 0
skipped**; `npx.cmd tsc --noEmit` passed. The workflow-focused assertions
check pull-request and `main` triggers, test/typecheck/image steps, the
unreachable local database URL, expected APIs and all 620 shards. No local
YAML parser, Docker, or Podman is installed, so YAML parser and Docker image
execution checks are not claimed. GitHub Actions has not run; CI is **NOT
YET VERIFIED**.

**Exact handoff to the existing GitHub repository:** in the user's actual
clone, first verify `git status` and `git remote -v` locally, without sharing
remote credentials. Confirm the intended existing `origin` and compare the
working tree to this workspace. Stage only the intended workflow, ignore
rules, regression test, and documentation changes; review `git diff --cached`
for secrets and local data; commit and push a feature branch; open a pull
request against `main`. After the GitHub Actions `Docker CI` job passes, merge
only under the repository's normal review policy. Alternatively, push to
`main` only if that is already the user's authorized practice. Do not add
secrets to GitHub Actions; this workflow requires none. Confirm the Linux job
result in Actions before reporting Docker/Linux verification as passed.

**Railway staging remains unprovisioned:** use a separate Railway staging
environment with a distinct disposable PostgreSQL service containing no
valuable production data. Configure only the staging service's `DATABASE_URL`;
`PORT` is supplied by Railway. `LIFE_TRUST_PROXY_HEADERS` is optional and
should remain false/unset unless a trusted proxy is explicitly configured.
Do not use Supabase for staging or integration-test writes. No external
service, database, migration, or deployment was changed. Production Supabase
migration history remains **UNKNOWN** and requires authorized reconciliation
from actual release records and isolated clone/backup review.
