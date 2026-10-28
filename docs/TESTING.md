# Testing and validation

## Current result (legal, assistant, timeline, readiness and saved-report implementation)

On 2026-10-19, validation ran on Windows x64 with Node v24.20.0:

| Command | Result |
|---|---|
| `npm.cmd test` | PASS — 227 tests, 227 passed, 0 failed, 0 skipped. |
| `npx.cmd tsc --noEmit` | PASS — exit code 0. |
| `npm.cmd run build` | PASS — Prisma client generation and optimized Next.js 16.4.2 production build, exit code 0. |
| `npx.cmd prisma validate` | PASS — schema valid; no database connection was made. |
| `npm.cmd run test:postgres` | BLOCKED — guarded runner found no `LIFE_TEST_DATABASE_URL`; no connection or migration was attempted. |
| Lint | NOT RUN — no lint script is configured in `package.json`. |
| `npm.cmd run verify` | NOT RUN during this audit. |

The 9-section dashboard at `/verification` has 59 requirement records. Docker is not installed and WSL has no configured Linux distribution, so Linux deployment, Railway/native loading, and a database migration/persistence test were not run. Neither `DATABASE_URL` nor a dedicated test database URL is configured; no database connection was attempted. Independent planetary validation now consists of ten tropical geocentric bodies at J2000, Sun/Moon/Mars at 2024-06-21, and Mercury's retrograde direction/rate from adjacent 2024-04-15 positions. This is limited snapshot validation, not broad accuracy certification. Full offline network-blocking acceptance, production deployment, and performance testing remain **unverified**.

The planetary status and mobile-navigation tests cover reviewed exaltation/debilitation mappings, combustion boundary behavior, calculated retrograde motion, D1-to-D9/D10 Vargottama comparison, missing-input fail-closed behavior, age/Dasha summaries, and accessible mobile navigation. Production browser QA verified the visible drawer at 320×640, 360×800, 375×812, 390×844, and 430×932, and the desktop sidebar at 1280×900. DOM-triggered menu activation showed labels, updated `aria-expanded`, locked body scrolling, and produced no page-level horizontal overflow; Escape handling closed the drawer and restored focus, and selecting an in-page link closed it. The browser harness's physical pointer click and Enter-key actions did not reliably activate the control, so those input methods were not independently verified. The planetary status badges expose calculated chart facts and selected convention limitations; they do not establish predictive accuracy or independently verify every divisional convention.

The timeline change adds deterministic birthday-boundary tests, Dasha-interval overlap, fail-closed classifications, duplicate/conflicting evidence handling, and EN/HI/Hinglish coverage. Production browser QA used a calculated profile (2000-02-29, 12:00 Asia/Kolkata, New Delhi coordinates): all 60 chart sections and embedded timelines remained present; D1 displayed 80 birthday-to-birthday intervals with the actual overlapping Mahadasha, Antardasha, and Pratyantardasha timestamps; selecting 2024-02-29 showed 12 months and 29 daily periods; the 80th birthday showed age 80; and opening D9 retained its own birth-date selection. Changing the year to before the birth anniversary clamped the selected date to 2000-02-29, and months after the 80th birthday were disabled. The tested chart flow rendered in English, Hindi, and Hinglish. At 320×640, 360×800, 375×812, 390×844, 430×932, and 1280×900, no page-level horizontal overflow was measured. During the final interaction check there were no browser page errors or failed requests. These checks validate UI/data wiring, not a period-direction astrology rule; no favorable/challenging/mixed/neutral classification is currently enabled.

On 2026-10-19, DOB/timeline regression browser QA calculated a real chart for 1997-04-27, 10:30 Asia/Kolkata, Mumbai coordinates. The dashboard rendered `1997-04-27`, timeline start `1997-04-27`, 80th birthday `2077-04-27`, selected/current age 29 on 2026-10-19, 60 ordered chart sections, 60 unique visible timeline summaries, and an 80-age navigation rail in each; D1 showed 80 yearly periods and 819 overlapping Dasha evidence items. No browser page errors or page-level horizontal overflow appeared at 320, 360, 375, 390, 430, or 1280 CSS-pixel viewports. This was an unauthenticated calculation flow: authenticated profile persistence and reopening a report were covered by deterministic structural/real-chart validation tests, not live account/database browser testing.

The readiness and saved-report phase adds tests for all readiness states, malformed/missing DOB, incomplete birth inputs, localized labels, report sections derived from stored results, linked-profile birth-detail changes, saved calculation settings, and comparison with a recalculated chart for the same selected profile. Production browser QA on 2026-10-19 verified `MISSING_DOB`, `DOB_AVAILABLE`, `CHART_READY`, and `ANALYSIS_LIMITED` transitions; a DOB-only dashboard link opened the standalone date timeline with the date prefilled and 80 age intervals rendered. After chart calculation, changing the birth date removed the stale result and returned readiness to `CHART_READY`. The D1 timeline displayed calculated status, age, planetary placement, selected-house lordships, dignity and co-sign facts for overlapping Dasha periods, with no directional event claim. D9 retained its own chart identity and did not receive D1 natal interpretation. Current age in the Dasha summary was checked after calculation, and automated tests cover the configured timezone's calendar date as well as the February 29 age convention. English, Hindi and Hinglish copies were exercised; at 320×640 and 390×844 there was no page-level horizontal overflow and no browser errors. The browser QA was unauthenticated: saved-report list/load and persistent profile-change status could not be tested without a disposable database. No database migration or production data operation was performed.

The saved-report summary retains the calculation conventions stored with each snapshot. A different-settings warning is shown only when a fresh calculation matches the currently selected profile; account-level settings are not persisted, so older reports cannot be compared against a setting that was never saved.

Saved-chart detail responses now fail closed with `UNSUPPORTED_SAVED_CHART` when a persisted result does not match the current dashboard calculation schema. The account UI independently validates the result before selecting its profile or passing it to dashboard hydration. Deterministic tests accept a real `calculateBirthChart()` result and reject partial/malformed shapes; route-contract tests verify the explicit API error path. This guards shape compatibility only: saved-report persistence, migration behavior, and cross-account database access remain unverified without a disposable PostgreSQL test database. No browser test of authenticated saved-chart loading was run.

Phase 1 house analysis tests exercise Moon-relative sign-house orientation, start-inclusive/end-exclusive cusp boundaries, actual engine planetary-house assignments, arithmetic cusp-interval midpoints, Parashari aspect targets, missing data, and separate selected chart inputs. Browser QA with a calculated chart verified the Moon chart, Bhava Chalit cards/tables, and Drishti rows at 320×844, 390×844, and 1280×844 in English, Hindi, and Hinglish. Wide tables remained internally scrollable while horizontal page scrolling remained at zero. These checks do not independently validate the selected astrological conventions.

The Supabase compatibility audit is documented in [`docs/SUPABASE_FREE_AUDIT.md`](./SUPABASE_FREE_AUDIT.md). LIFE is not connected to Supabase Auth or the Supabase client; it uses Prisma/PostgreSQL and custom server-side authentication. `.env.supabase.example` documents a non-secret pooler configuration shape and requires a locally rotated password. `/api/health` now reports local engine readiness separately from an actual database connectivity check. With no `DATABASE_URL`, database status is `not-configured`; with a configured URL, status is only `connected` after a live `SELECT 1` succeeds. The guarded PostgreSQL runner references the existing `tests/postgres.integration.mjs` file and remains blocked unless `LIFE_TEST_DATABASE_URL` identifies a disposable `_test`/`-test` database.

The answer-format regression verifies that Hindi marriage responses use a locale-aware date range only when the controlled KP service returns a supported candidate window. Insufficient evidence produces no date. The malformed legacy pattern (`आपकी शादी की ... tak पर किया जा सकता है।`) is explicitly rejected. All 38 question IDs remain covered; marriage timing is the only event-window path currently implemented, while government employment, private job, promotion, business, money, property, education and foreign-travel dates remain unsupported unless their documented rules are implemented.

The Answer Accuracy Audit v1.0 is documented in [`ANSWER_COVERAGE_MATRIX.md`](./ANSWER_COVERAGE_MATRIX.md) and [`ANSWER_RULES_AND_LIMITATIONS.md`](./ANSWER_RULES_AND_LIMITATIONS.md). The matrix records 6 implemented, 17 partially supported, and 15 unsupported questions. The matrix source-contract tests require exactly one row for each of the 38 registered IDs and verify that unsupported event timing is explicitly prohibited from fabricating dates. These tests validate routing and claim safety, not the truth of astrological interpretations or real-world outcomes.

The 2026-10-19 legal and assistant changes add a `KundliQuestion` PostgreSQL model and a safe additive migration, explicit version/timestamp terms acceptance, separate Terms & Conditions, Privacy Policy and Disclaimer pages, and authenticated question/history APIs. Deterministic answers are derived from a saved chart owned by the user and linked to a birth profile; the route checks the chart's birth date, local time, timezone and coordinates against that profile. History is owner-scoped, limited to 20 records per page, searchable, filterable by topic/date and supports individual deletion. Retries reuse a request identifier and conflicting re-use is rejected. New tests cover legal routes/translations, explicit acceptance contracts, chart validation, profile/chart matching, owner-scoped route contracts and additive migration safety. Persistent behavior remains unverified because the guarded PostgreSQL runner had no disposable database URL. Real-browser checks against the built application covered the legal pages in English, Hindi and Hinglish, plus the logged-out assistant at 320×640, 360×800, 375×812, 390×844, 430×932 and 1280×900; no missing translation labels, page errors or page-level horizontal overflow were observed. Authenticated question submission/history, mobile signup acceptance, and database behavior were not browser-tested.

The D1–D60 display increment is documented in [`D1_D60_VALIDATION_MATRIX.md`](./D1_D60_VALIDATION_MATRIX.md). Each chart now has a distinct navigable section, calculated-facts table, immediate birth-details report, convention label, and provenance/independent-validation limitation. The engine has software boundary coverage for D2–D60, but no divisional chart is independently verified against a suitable external Vedic varga reference.

The typed chart-purpose catalogue is implemented in `src/calculation/divisional-metadata.ts`. It intentionally keeps interpretation states at `REVIEW_REQUIRED` or `UNSUPPORTED`; the registry does not activate predictive rules merely because a chart renders.

The test suite includes a source/runtime dependency audit for external calculation clients, bounded JSON request-body parsing, proxy-aware rate-limit key selection, timezone conversion, leap dates, DST gaps/overlaps, ephemeris checksums and npm lock integrity, deterministic D1 receipts, name-independent calculations, selectable settings, tropical/sidereal internal consistency, D2–D60 mapping boundaries, Vimshottari period hierarchy and duplicate active-lord evidence, KP boundaries and significators, Panchanga tithi/karana/yoga/nakshatra boundaries, sunrise/set and transit behavior, yoga/dosha rules, selected house system semantics at multiple locations and high latitudes, sensitivity sweeps, no-fallback behavior, and sampled ephemeris boundary points for 12 bodies. The JPL comparison fixtures are local and tests never make network calls. A successful test or build is not evidence of broad astronomical accuracy.

Phase 12 additionally verifies that duplicate Dasha intersections are removed, overlapping but distinct intervals remain separately traceable, timezone-local date boundaries are preserved, and broad qualifying results are not rendered as one continuous marriage period. The previous 252-intersection result was caused by aggregating every qualifying intersection into global earliest/latest bounds; it is now represented as separate candidate windows. This does not establish real-world marriage accuracy or validate an event probability.

### Acceptance regression suite (TC-01–TC-25)

The new `tests/acceptance-regression.test.mjs` suite runs with the normal `npm.cmd test` command. It added 12 acceptance tests and increased the full suite from 140 to 152 passing tests. These are deterministic unit/service and source-contract tests; they do not claim to replace browser or PostgreSQL integration testing.

| Test ID | Result | File and test | Evidence / limitation |
|---|---|---|---|
| TC-01 | PASS | `acceptance-regression.test.mjs` — valid, missing-date and invalid-input boundaries | Real local chart calculation retained submitted date, time and timezone; no external calculation service. |
| TC-02 | PASS | `acceptance-regression.test.mjs` — saved-record ownership predicate is user scoped | Owner predicates differ by authenticated user; full PostgreSQL cross-user API test remains blocked. |
| TC-03 | PASS | Same boundary test | Empty birth date returns `valid: false` for `localDate`. |
| TC-04 | PASS | Same boundary test | Invalid timezone and latitude are rejected. |
| TC-05 | PASS | `acceptance-regression.test.mjs` — provenance accepts only calculated current charts | Two real calculations have different result hashes; fixture and incomplete records are rejected. |
| TC-06 | PASS | Same provenance test | The home page removes `life-current-chart` before a new calculation, preventing stale-result reuse. |
| TC-07 | PASS | `acceptance-regression.test.mjs` — health reports local engine readiness | Health reports Swiss binding/readiness and `outboundCalculationServices: "none"`; readiness is not treated as prediction accuracy. |
| TC-08 | PASS | `acceptance-regression.test.mjs` — every question ID routes to declared intent | All 38 catalog IDs return their declared topic with chart provenance. Marriage timing remains limited unless supported evidence exists. |
| TC-09 | PASS | `acceptance-regression.test.mjs` — unsupported event questions | Government-job answers contain limitations and no fabricated ISO dates or percentages. |
| TC-10 | PASS | Same unsupported-event test | Business-start answers do not claim unsupported dates. |
| TC-11 | PASS | Same unsupported-event test | Foreign-timing answers do not claim unsupported dates or countries. |
| TC-12 | PASS | All-38 routing test | Exactly 38 question IDs were iterated and checked for topic routing and nonempty evidence/explanation. |
| TC-13 | PASS | `acceptance-regression.test.mjs` — localized answer types | English, Hindi and Hinglish marriage answers have consistent limited status and shared chart provenance. |
| TC-14 | PASS | Same localization/no-chart test | All three languages return `needs-chart` with no personalized evidence when chart is absent. |
| TC-15 | PASS | `acceptance-regression.test.mjs` — remedies contain real category records | Remedy catalog contains records for all configured categories; chart personalization remains provenance-gated. |
| TC-16 | PASS | Same remedies test | Empty/invalid provenance does not qualify as chart context; general catalog remains available. |
| TC-17 | PASS | Same remedies test | Catalog context is independent of stale/invalid chart objects. |
| TC-18 | PASS | `acceptance-regression.test.mjs` — category filtering data | Saatvik records are present and category-filterable. |
| TC-19 | PASS | Same category test | Lal Kitab records are present and category-filterable. |
| TC-20 | PASS | Same category test | Tantra category has an actual `Tantra` record, not just a label. |
| TC-21 | PASS | `acceptance-regression.test.mjs` — unknown-price sorting | Free and configured prices sort numerically; unknown prices sort after known prices and are never treated as ₹0. |
| TC-22 | PASS | `acceptance-regression.test.mjs` — remedy safety | Every remedy has safety text and the catalog contains no tested coercive, harmful, supernatural-power or guaranteed-outcome instruction. |
| TC-23 | PASS | `acceptance-regression.test.mjs` — public pages omit source details | Public component source does not import/render source URLs, source IDs, rule IDs or `SourceDetails`; internal registries remain private. |
| TC-24 | NOT RUN in this acceptance command | Manual browser verification documented in Phase 9/11 sections above | Prior manual checks covered 320, 375, 390, 768 and 1280px without overflow. A fresh browser run was not part of this command. |
| TC-25 | PASS | `acceptance-regression.test.mjs` — invalid session records rejected | Null, fixture, incomplete and malformed provenance records are rejected without producing chart answers. |

#### Layer status

- **Unit/service:** PASS — 152 total tests, 152 passed, 0 failed.
- **TypeScript:** PASS — `npx.cmd tsc --noEmit`, exit code 0.
- **Production build:** PASS — `npm.cmd run build`, including Prisma client generation and Next.js static/server route generation.
- **Browser:** NOT RUN for the new acceptance file. Existing manual responsive and no-chart/source-hiding checks remain documented above; no new automated browser assertions are claimed.
- **PostgreSQL/database:** BLOCKED / NOT RUN. No disposable `LIFE_TEST_DATABASE_URL` is configured, so migration, persistence and HTTP ownership-isolation assertions against PostgreSQL were not executed.

The presentation regression suite in `tests/presentation.test.mjs` exercises birth-form date/time/timezone/coordinate validation, the Rajpura example with an omitted optional name, busy/valid submission gating, all 31 FAQ entries and category/search behavior, required UI/result-copy keys, missing-translation handling, nonblank translations, presentation invariance for calculated data, and language-preference restoration through a fresh storage read. The saved language preference uses the `life-language` local-storage key and changes presentation only, not calculation inputs or results. The full suite currently contains 163 passing tests.

### Phase 5 language and mobile checks

The chart workspace, birth form, planetary and house tables, D1–D60 selector, Panchanga/Dasha, sunrise/set, transits, KP, rule-match tables, interpretation summaries, FAQ, chart-layout controls, account actions, validation labels and loading/error/empty states use English, Hindi and Hinglish dictionary entries. The dictionaries are checked for missing or blank keys, and fixed translation calls in the main app components are statically checked by the presentation tests. The three language dictionaries are not a claim that every engine-generated explanation has been translated: calculated values and names are preserved, and convention/evidence/prediction rule text that remains English is identified as original technical wording. `/verification` and `/admin` are developer/admin pages whose detailed content remains English-only; a notice localized from the saved preference makes that limitation explicit.

On 2026-10-17, browser verification with a calculated Rajpura chart checked document/body horizontal overflow at 320, 375, 390, 768, and 1280 CSS pixels in English, Hindi, and Hinglish: no overflow was observed. Paired birth-form fields were stacked at narrow widths and placed in two columns at tablet/desktop widths. The mobile account panel opened from its compact control, exposed the form, and closed with Escape without creating overflow. Browser checks also confirmed that changing language left the displayed result hash unchanged, no missing-translation marker appeared on the chart screen, and the selected language was restored after a page reload. These are manual integrated-browser checks, not part of `npm test`.

### Phase 6 personal Kundli assistant

The assistant regression tests cover chart-specific Lagna/Moon evidence, Dasha hierarchy, transit snapshots, interpretation-rule evidence, actual D1/D9/D10 placements and missing divisions, missing chart/planet/period/transit data, unsupported questions, answer localization across the three workspace languages, Hindi/Hinglish topic matching, and invariance of the input chart data. The integrated browser was also checked at 320, 375, 390, 768, and 1280 CSS pixels for document and assistant-panel horizontal overflow in the no-chart state. These are manual browser checks, not part of `npm test`. Responses are deterministic and based on the currently supplied chart and existing interpretation engine; this is not an external or generative AI service.

### Phase 7 popular questions

The personal assistant question catalog contains 38 translated prompts across marriage, government/career, private job/business, money/property, foreign travel/settlement and general chart topics. Tests cover every ID and language label, search/category filtering, routing, chart-derived relationship/career/finance/cusp/Dasha/transit evidence, and missing data. Timing questions deliberately report that no marriage-event, government-job, career-event, property or foreign-settlement timing rule is implemented; the available calculated Dasha intervals or transit ingress times are shown only as astronomical/traditional context, never as event dates or probabilities.

### Phase 9 Remedies & Upay

The standalone `/remedies` route contains 8 structured records: 5 Saatvik, 2 Lal Kitab educational records and 1 Tantra educational record. Every record has English, Hindi and Hinglish content, a free alternative, safety text, evidence classification and either a configured zero price or an explicit unconfigured price. `tests/remedies.test.mjs` checks unique IDs, category completeness, price validity, sorting, free alternatives, required source/evidence disclosures and non-guarantee wording. The page was manually checked at 320, 375, 390, 768 and 1280 CSS pixels with no horizontal overflow; language switching and the session-stored chart-context state were also checked. Chart context is evidence only: no unsupported personalized remedy rule or remedy-effectiveness percentage is claimed.

### Phase 11 real-chart and public-answer audit

`docs/QUESTION_ANSWER_AUDIT.md` records all 38 question IDs, their required evidence, implementation surfaces, date-support status and test status. The production example birth-data control was removed. A new calculation clears stale `life-current-chart` storage before starting, and remedies/marriage timing reject storage records without a calculated result hash, engine version, UTC input and timezone. Public pages no longer render source URLs, bibliography records, internal source IDs, rule IDs or raw source-detail sections; source registries remain internal for developer auditability. Browser verification of `/marriage-timing` and `/remedies` at 320, 375, 390, 768 and 1280 CSS pixels found no horizontal overflow and no public source-reference section. The no-chart marriage page displayed its explicit no-chart state without a fabricated date. These are manual browser checks, not part of `npm test`.

Phase 4 adds unit coverage for Argon2id password hashing, generic invalid-credential results, server-set USER roles, opaque session storage/expiry/revocation, server-side role decisions, owner-scoped query predicates, and rate limiting. These tests use a fake repository and do not replace PostgreSQL API integration tests. The separate `tests/postgres.integration.mjs` suite exercises the real API against PostgreSQL: registration/password hashing, login response parity, authenticated access, expiry and logout revocation, profile and chart CRUD, cross-user denial, validation/missing-record responses, database-unavailable handling, and SQL transaction rollback. Cleanup deletes only user IDs returned by that test run. A disposable PostgreSQL database is not configured in this environment, so migration execution and all PostgreSQL integration assertions remain **NOT RUN**. Registration and initial session creation now share a database transaction.

### Safe PostgreSQL integration setup

1. Provision an empty, disposable PostgreSQL database named with a `_test` suffix (for example `life_integration_test`) on a local PostgreSQL service or a dedicated test-only instance. Do not reuse a production or shared staging database.
2. Copy `.env.test.example` to the ignored local file `.env.test`, then set only `LIFE_TEST_DATABASE_URL` to the disposable database URL. Keep the file and credentials local.
3. From the repository root, run:

   ```powershell
   npx.cmd prisma validate
   npm.cmd run build
   npm.cmd run test:postgres
   ```

   The PostgreSQL runner rejects missing URLs, non-PostgreSQL URLs, database names without a `_test` or `-test` suffix, and names containing production/staging markers. It connects only using `LIFE_TEST_DATABASE_URL`, verifies `current_database()` against the URL database name, then runs `prisma migrate deploy` against that verified database and starts the built standalone app for HTTP integration tests. It never runs `migrate reset` or deletes database contents; the suite removes only the exact user IDs returned by its own test registrations.
4. The integration suite verifies that test-created users are cleaned up after a run. If it fails partway through, inspect its generated `life-it-<run UUID>` test accounts in the disposable database and remove only those records after confirming they belong to that run. Never copy the test URL into a production environment.

### Rate-limit and proxy assumptions

The application rate limiter is an in-process `Map`, so limits are per application process and are not shared across replicas or restarts. Forwarded host/protocol and IP headers are ignored unless `LIFE_TRUST_PROXY_HEADERS=true`. With that opt-in, `requestRateLimitKey()` uses the last `X-Forwarded-For` entry, falling back to `X-Real-IP` and then `unknown`; `isSameOriginMutation()` also trusts forwarded host/protocol. Enable the setting only when the trusted ingress overwrites or appends its verified client address as the final forwarded IP and prevents direct untrusted access to the app. If a proxy merely forwards client-supplied headers, clients can choose the value used for limiting and influence origin validation. When the setting is false, requests share the per-route `unknown` bucket, which fails closed against spoofing but can cause false throttling. Verify actual ingress behavior before enabling the setting; multiple instances still need a shared limiter or edge-level rate limiting. No deployment proxy configuration was available for this audit.

## Database safety

Before a production migration, review the exact pending SQL and schema diff, take a provider backup, and verify a restore into a disposable database. Apply migrations as an explicit release operation (`npm run db:deploy`); application startup never migrates the database. For rollback, first stop writes and preserve a fresh backup, then use the provider's tested restore procedure or a separately reviewed forward-fix migration. Do not drop/recreate tables or use `prisma migrate reset` on any shared or production database. The Phase 4 migration adds tables/indexes and does not backfill user records.

## Required test layers

- Unit: date/time validation, UTC conversion, time scales, zodiac wraparound, nakshatra/varga boundaries, dasha/KP interval boundaries, numerology conventions.
- Integration: local engine plus real ephemeris files; persistence transactions and ownership checks; report generation.
- Golden/reference: fixtures with source, engine/data version, coordinate convention, and per-value tolerances. Never fabricate reference values.
- Property/regression: deterministic repeatability, normalized angular ranges, chronological dasha hierarchy, no gaps/overlaps, version-aware cache keys.
- Security: authorization at server boundaries, password/session behavior, CSRF, rate limits, input handling, privacy-aware logs.
- Deployment: Linux native dependency build/load, migrations, health checks, startup failure on missing/corrupt data, graceful shutdown.
- Offline acceptance: block outbound network and exercise all implemented workflows against only local DB/data. Record the actual network-blocking mechanism and results.

## Release reporting

Report each command, environment, test count, failures, skipped cases, fixture provenance, tolerances, and limitations. The deterministic input used by current tests is a smoke case, not an independent golden fixture. A successful build is not evidence of astronomical accuracy.
