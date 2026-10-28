# Feature inventory

## Inspection result

The current workspace is a Next.js/TypeScript LIFE application with local Swiss Ephemeris calculations, chart presentation, account routes and verification tooling. This inventory records evidence for the current implementation; it does not claim that every requested astrology convention or real-world outcome is validated.

## Requested feature status

| Area | Status | Evidence / next work |
|---|---|---|
| Repository and deployment inventory | Implemented; target Linux deployment unverified | Existing Next.js/TypeScript app, Dockerfile, Railway configuration, local ephemeris assets, Prisma schema and routes are present. The current local Windows app runs; Docker/Linux runtime is not verified. |
| Architecture and limitation documentation | Baseline + product strategy | Includes calculation receipt, sensitivity, and method comparison direction |
| Local Swiss Ephemeris | Implemented for first D1 slice | `@swisseph/node@1.4.0`; AGPL selected; local checksummed files; Windows binding loads, Linux not executed |
| Timezone and birth input | Implemented for known-time charts; offline gazetteer search | Bundled GeoNames `cities500` search selects a disambiguated populated place and supplies its coordinates and IANA timezone; manual editing remains available. Small localities not in the dataset still need manual verified details. IANA conversion, leap-day and DST gaps/overlaps are tested. |
| Planet positions and houses | Implemented for D1 slice | Tropical + Lahiri/Raman/Krishnamurti sidereal; Whole Sign/Placidus/Koch/Equal; mean/true/both nodes; internal consistency checks; pinned JPL comparisons for ten bodies at J2000, Sun/Moon/Mars at 2024, and Mercury retrograde rate in 2024; full accuracy is not established |
| Unknown birth time | Explicitly blocked without invention | UI explains time-dependent calculations unavailable; date-only planetary ranges not implemented |
| Kundali/divisional charts and rules | D1–D60 calculations and displays implemented; independent evidence is limited | D2–D60 mappings and selected convention labels are documented; every segment boundary is tested, including both D30 unequal interval sets. Fixed PyJHora mapping fixtures cover D2–D60 sign mappings, but do not independently validate every end-to-end natal chart. Non-classical factors are explicitly custom cyclic mappings. South Indian renderer remains absent. |
| Vimshottari Dasha and KP | Vimshottari Mahadasha, Antardasha and Pratyantardasha implemented; KP (Krishnamurti) star/sub/sub-sub lords and planetary/house significators implemented | 365.2425-day year and proportional hierarchy documented; parent-child boundaries and duration tests exist; KP uses its own Krishnamurti ayanamsa and Placidus cusps and degrades to unavailable at polar latitudes; no independent Dasha/KP fixture |
| Panchanga and transit events | Tithi/Karana/Yoga, sidereal-Moon Nakshatra/Pada, sunrise-based Vara, sunrise/sunset/moonrise/moonset, transits and sign-ingress implemented | Equal-division Nakshatra/Pada boundary tests plus rise/set and ingress tests exist and results render in the chart UI; the Panchanga weekday field stays civil while Vara is reported separately; no independent Panchanga/rise-refraction reference fixture |
| Yogas, doshas, dignity and aspects | Planetary dignity (incl. combustion and retrogression), Parashari graha-drishti aspects, and yoga/dosha detection implemented | Rule-derived from documented Parashari conventions with boundary unit tests; no independent classical-text cross-check; the Moon's paksha-dependent benefic status is not applied to Amala/Adhi |
| Numerology | Not implemented | Optional; convention selection needed |
| PostgreSQL schema and migration set | Implemented in repository; live migration history unknown | Prisma 7 schema/client and six SQL migrations exist. The configured local Supabase target has the expected application tables, but no visible Prisma migration ledger; applied/pending status and historical schema-management method remain unknown. No migration was applied during the audit. |
| Authentication, roles, admin provisioning | Implemented in source; persisted workflows not integration-verified | Registration/login/logout, hashed sessions, role guards, and guarded admin provisioning exist. Unit/mock tests pass; real account workflows remain unverified against an isolated disposable database. |
| UI | Birth-chart calculation workbench | Birth input, D1 chart, D9/D10 tables, a varga selector, Vimshottari Mahadasha/Antardasha/Pratyantardasha table, Panchanga, rise & set with sunrise-based Vara, transit/sign-ingress, dignity & aspects, yogas/doshas, a KP section (with an explicit unavailable state), evidence-backed chart Q&A in English/Hindi/Hinglish, tropical/sidereal positions, house cusp table, receipt, sensitivity sweep, and explicit reference-validation status |
| Saved reports and PDF export | Saved-chart persistence implemented in source; PDF export not implemented | Owner-scoped report APIs, saved snapshots, summary projection and reopening paths exist. Database persistence is not integration-verified; no PDF/export feature exists. |
| Security/performance controls | Partial foundation | Origin validation, in-memory limits, security headers, privacy-conscious errors; no full audit/security tests |
| Local app and deployment runtime | Local Windows app verified; Linux/Docker target unverified | Local development server and health route have returned HTTP 200 with engine/database connected. Dockerfile, Railway health path, standalone server and native-binary copy exist; no Linux/Docker run was performed. |
| Offline acceptance suite | Partial only | Local build/API use no external calculation API; no actual network-blocked acceptance run |

## Phase 9 remedies and evidence-based completion

The current auditable feature set contains 20 areas. A feature counts as **implemented and verified** only when the requested surface exists and has executable regression/build evidence; a passing test does not establish astrological truth or user outcomes.

| Feature area | Status | Evidence |
|---|---|---|
| Birth form and validation | Implemented and verified | `tests/presentation.test.mjs`, `npm.cmd test` |
| Astronomical calculations | Implemented with limited verification | Swiss Ephemeris and local assets; independent fixtures cover selected snapshots only |
| D1–D60 charts | Implemented with limited verification | Boundary tests and rendered tables; no independent fixture for every varga |
| Panchanga and astronomical events | Implemented with limited verification | Engine and regression tests; no independent fixture for every event |
| Vimshottari Dasha | Implemented and verified | Hierarchy, boundary and duration tests |
| KP | Implemented with limited verification | KP tests and UI; no independent KP fixture |
| Yogas and Doshas | Implemented with limited verification | Rule tests; no independent classical-text cross-check |
| Transit calculations | Implemented with limited verification | Transit and ingress tests; reference scope is limited |
| Prediction and interpretation engine | Implemented and verified | Interpretation regression tests and evidence rendering |
| FAQ | Implemented and verified | Multilingual search tests |
| Personal Kundli Assistant | Implemented with limited verification | All 38 question IDs remain present with localized prompts and question-specific answer copy. Marriage timing now uses the implemented KP service and a typed localized formatter: dates appear only for a supported candidate window, while insufficient evidence produces a natural no-date answer. Answers use the selected calculated chart and disclose unsupported timing. Deterministic event rules remain unavailable for most career, finance, business, education and foreign questions. See `docs/QUESTION_ANSWER_AUDIT.md`. |
| Multilingual UI | Implemented and verified | Translation and presentation tests for supported interface |
| Responsive layout | Implemented with limited verification | Browser checks at required widths; no committed browser suite |
| Authentication and sessions | Implemented with limited verification | Unit/security tests; database-backed environment unavailable |
| Profile and saved-chart persistence | Implemented with limited verification | Route/schema coverage; no disposable PostgreSQL run |
| Remedies & Upay page | Implemented and verified | Structured 9-record catalog, multilingual fields, sorting/filter tests, production build |
| Independent calculation validation | Partially implemented | Selected JPL/reference comparisons only; not full astrology validation |
| Database integration testing | Blocked by unavailable test environment | No disposable PostgreSQL `DATABASE_URL` was available |
| Production/Linux native verification | Blocked by unavailable test environment | Windows build verified; Linux/Docker execution not run |

**Completion calculation:** 7 areas are implemented and verified out of 20 defined areas = **35% implementation evidence ratio**. The remaining 13 are explicitly limited, partial, or blocked; this is not a prediction-accuracy, remedy-effectiveness, customer-success or revenue percentage. Automated test pass rate is reported separately.

## Phase 11 data integrity and public-answer audit

- The visible Rajpura example-data control was removed from the production chart workspace. Rajpura values remain only in isolated test fixtures.
- New calculations remove the previous `life-current-chart` value before a request starts, preventing a failed or changed calculation from leaving stale personalized answers available to linked pages.
- Calculated charts now carry a non-sensitive calculation timestamp in provenance. Remedies and Marriage Timing reject storage values without calculated status, result hash, engine version, UTC input and timezone.
- Saved-chart server routes continue to constrain reads and mutations by authenticated owner and recalculate submitted birth input on save.
- Public interpretation, assistant, remedies and marriage-timing surfaces no longer render source URLs, bibliography records, internal source IDs, rule IDs or raw source-detail components. Internal registries remain in presentation code for developer auditability.
- The exact 38-question coverage, required evidence and unsupported capabilities are documented in `docs/QUESTION_ANSWER_AUDIT.md`.

## Immediate release blockers

1. Review redistribution rights for the bundled ephemeris files before public release.
2. Run the Docker image on Linux and verify the native binding loads there.
3. Verify persisted auth, profile, saved-chart, assistant-history, and admin workflows against a separately configured disposable PostgreSQL database; never use live Supabase for test writes.
4. Resolve live database migration history through authorized operator records; the visible Prisma migration ledger is absent and applied/pending status remains unknown. Do not fabricate or apply migration history.
5. Add independent astronomical reference fixtures and then implement remaining modules incrementally.

## Phase 10 core-workflow implementation status (2026-10-21)

The Phase 9 audit found no confirmed application-code defect requiring a
change. The core user/admin paths are already implemented in this repository;
the remaining gap is primarily persisted end-to-end evidence, which cannot be
obtained safely without a disposable PostgreSQL target. Do not label these
workflows fully verified on the basis of source or mocked tests alone.

| Workflow | Status | Current implementation/evidence | Next safe verification |
|---|---|---|---|
| Authentication and session lifecycle | PARTIAL | Registration/login/logout routes, Argon2id hashing, opaque hashed DB sessions, expiry/revocation, secure production cookies and role guard unit tests. | Run registration/login/logout/session persistence against a disposable DB, with isolated test accounts. |
| User profile create/edit/delete and ownership | PARTIAL | Owner-scoped CRUD API, birth-input validation, optional fields and fake-repository/source-contract coverage. | Verify persistence, reload and cross-account isolation against a disposable DB. |
| Saved Kundli/report create/list/reopen/delete | PARTIAL | Owner-scoped endpoints, calculated snapshot creation, stable newest-first ordering, result validation and summary tests. | Verify persistence, reopening, deletion and ownership isolation against a disposable DB. |
| Ask My Kundli and history | PARTIAL | Selected profile/chart ownership and birth-input matching; idempotent request handling; paginated, filtered owner-scoped history; unit/source tests. | Verify actual history persistence and multi-profile isolation against a disposable DB. |
| Admin/Super Admin authorization and access audit | PARTIAL | Server-derived exact role guards; bounded/minimized user inspection; transactional audit handler; mocked authorization/audit tests. | Verify aggregate/list/audit queries and persisted audit behavior using disposable role accounts. |
| Calculation, D1–D60, health/readiness | PASS for software checks; PARTIAL for full validation | Unit/boundary tests, public synthetic chart API response, local health check, selected reference fixtures. | Expand independent calculation references; verify UI with a synthetic chart and separate browser tests. |
| Loading, error and empty UI states | PARTIAL | Account/dashboard/assistant/admin components include loading, empty, unavailable and retry states; source-level tests. | Exercise all authenticated states in an isolated DB browser environment. |
| PDF export, role mutation, settings, report/question exports, payments | NOT IMPLEMENTED | No implementation or product requirements sufficient to build these safely. | Obtain explicit product decisions before implementation; do not infer policy. |

No live database writes or schema changes were made for this status update.
