# LIFE Final Verification Report

**Updated:** 2026-10-17 07:59 UTC  
**Scope:** Current workspace implementation and validation status. No broad accuracy certification is claimed.

## Overall status

The calculation workbench and its local chart API build and pass the current 100-test suite, a direct TypeScript check, and a production build on Windows. The application remains **NOT READY for production accuracy certification or production use with accounts/persistence**. Pinned NASA/JPL Horizons DE441 snapshots compare ten tropical bodies at J2000, Sun/Moon/Mars at a 2024 epoch, and Mercury's retrograde direction/rate in 2024. They do not validate time-scale conversion, ayanamsa, houses, nodes, Vedic rules, broad date ranges, or the full ephemeris lineage. Linux/Railway execution and database-backed user features remain unimplemented or unverified.

| Section | Status | Main limitation |
|---|---|---|
| 1. Birth Details & Timezone | IMPLEMENTED WITH LIMITATIONS | Known local time, IANA zone, coordinate validation, daylight-saving ambiguity handling; UTC is approximated as UT1 and coordinates are user-supplied. |
| 2. Swiss Ephemeris & Railway | LOCAL ENGINE IMPLEMENTED; RAILWAY UNVERIFIED | Bundled files are checksum-checked and the Windows native binding loads. Linux/Railway execution and data redistribution review remain outstanding. |
| 3. Planetary Calculations | IMPLEMENTED WITH LIMITED REFERENCE VALIDATION | Tropical/configurable sidereal positions, D1 houses and chart data are calculated locally. JPL fixtures cover two position epochs plus one finite-difference retrograde-rate check; no broad certification. |
| 4. Kundali & Divisional Charts | D1–D60 CALCULATED; REFERENCE VALIDATION LIMITED | D1 and D9/D10 are rendered with a selector for D2–D60; non-classical factors use labeled custom mappings. Internal tests exist; independent varga fixtures do not. |
| 5. Dasha & KP | IMPLEMENTED WITH DOCUMENTED CONVENTIONS | Vimshottari Maha/Antar/Pratyantar and KP star/sub/sub-sub lords and significators are calculated and rendered. No independent Dasha/KP reference fixture. |
| 6. Panchanga & Transit | IMPLEMENTED WITH DOCUMENTED LIMITATIONS | Tithi/Karana/Yoga, Nakshatra/Pada, civil weekday, sunrise-based Vara, rise/set, transits, and ingress are calculated locally; no independent reference fixture for these modules. |
| 7. Accuracy & Independent Validation | PARTIALLY VALIDATED | One versioned planetary fixture passes; no independent time/JD, ayanamsa, Lagna, cusp, or broad multi-epoch reference set. |
| 8. Railway, Database & Security | BLOCKED FOR PRODUCTION | No Linux/Railway run or PostgreSQL verification; authentication, saved-chart persistence, ownership enforcement, and backup/restore are not implemented. |
| 9. Final Release | BLOCKED | Accuracy, security, persistence, licensing, and deployment requirements remain incomplete or untested. |

## Priority 1 finding and change

### Finding: UTC was described as Julian UT without disclosing the approximation

`resolveBirthInput()` resolves the local civil time using Node ICU/IANA timezone rules and returns a UTC `Date`. `calculateBirthChart()` then builds a Julian Day from that UTC instant and calls the Swiss binding's `calculatePosition()`, which delegates to Swiss `calc_ut`. Swiss documentation describes UT-based calculation and its internal Delta T conversion; the app did not provide a DUT1 correction or persist a numeric Delta T value. Calling this value simply “JD UT” obscured the distinction between UTC and UT1.

The first correction makes the limitation explicit rather than silently asserting a more precise time scale:

- Receipt now records `julianDayUtc`, the compatibility field `julianDayUt`, and `julianDayUtInputScale: UTC_APPROXIMATED_AS_UT1`.
- Calculation settings and the chart receipt disclose that DUT1 is not applied and Delta T is delegated to Swiss `calc_ut` but not exposed numerically by this binding.
- Checklist item `birth-time-6` has a direct regression test but remains **BLOCKED** pending versioned independent JD/DUT1/Delta-T references.
- No planetary values were changed in this correction. It is a provenance/precision disclosure, not an accuracy fix or independent validation.

### Evidence

- `src/calculation/time.ts` — `resolveBirthInput()` validates calendar input, applies IANA timezone offsets, and requires explicit selection for ambiguous wall times.
- `src/calculation/chart.ts` — constructs JD from normalized UTC, calls Swiss `calc_ut` through `calculatePosition`, requests Swiss Ephemeris and speed flags, verifies returned Swiss flags, and records the time-scale convention.
- `node_modules/@swisseph/node/dist/index.js` — `calculatePosition()` delegates to native `binding.calc_ut()`; this binding does not expose a per-result Delta T value.
- `tests/time.test.mjs` — normal timezone conversion, leap date, DST gap, and DST overlap tests.
- `tests/engine.test.mjs` — new test `chart receipt states UTC input scale and Swiss calc_ut Delta T handling`; asserts JD for 2000-01-01 12:00 UTC equals 2451545, the input-scale disclosure, and `fullyVerified === false`.
- External primary method references consulted: [Swiss Ephemeris Programming Interface](https://www.astro.com/swisseph/swephprg.htm) documents UT calculations and Delta T behavior; [IERS Bulletin D metadata](https://datacenter.iers.org/productMetadata.php?id=17) describes DUT1 (UT1−UTC) data and its stated precision. Neither source has yet been converted into a checked-in test fixture.

## Priority 1 first reference fixture: planetary positions

`data/reference/jpl-horizons-de441-2000-01-01.json` stores NASA/JPL Horizons API version 1.2 output retrieved 2026-10-17, for 2000-01-01 12:00 UT, geocenter (`500@399`), quantity 31, ten major bodies. Horizons identifies the source ephemeris as DE441. Quantity 31 is observer-centered IAU76/80 ecliptic-of-date apparent longitude/latitude, including light-time, solar gravitational deflection and stellar aberration, with no atmospheric refraction. The fixture records request parameters, output resolution, and tolerance.

The offline test compares Swiss Ephemeris 1.4.0 local-file tropical outputs to JPL longitude/latitude within 0.5 arcsecond per coordinate. JPL prints 0.0000001 degrees. All ten bodies pass at this epoch. This is a single-epoch cross-system check; it does not certify broad accuracy, time conversion, sidereal settings or complete upstream ephemeris independence. No network call occurs during test execution.

Audit-run commands and results:

- `node --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test-reporter=tap --test tests/reference.test.mjs` — **PASS**, 1 test, 1 passed, 0 failed.
- `npm test` — **PASS**, 36 tests, 36 passed, 0 failed, 0 skipped.
- New test: `tropical positions match the versioned JPL Horizons DE441 offline fixture within declared tolerance`.
- Fixture/test/method files: `data/reference/jpl-horizons-de441-2000-01-01.json`, `tests/reference.test.mjs`, `docs/CALCULATION_METHODS.md`.
- Test run was local Windows x64, Node v24.20.0; it does not verify Linux, Railway, or network-blocked runtime behavior.

## Actual commands and results

Recorded verification run `87ae3afe-d7de-4f83-a321-47b9950642b7`, environment `win32-x64; Node v24.20.0`:

| Command | Result |
|---|---|
| `npm test` (prior recorded run) | PASS — 35 tests, 35 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit` | PASS — exit code 0. |
| `npm run build` | PASS — optimized Next.js production build, exit code 0. |

These results are Windows-local. They do **not** verify Linux native loading, Railway startup/deployment, PostgreSQL, egress-blocked offline execution, or independent astronomical accuracy. No live deployment was performed.

## Priority 1 unresolved work

1. Expand planetary reference coverage across epochs and quantify Swiss/JPL model differences. Nodes also need a suitable independent reference method; do not infer them from planet fixtures.
2. Determine and document a safe offline DUT1 source/range. Do not silently extrapolate DUT1 outside its published coverage. For historical dates, distinguish local civil-time interpretation and UT1 uncertainty explicitly.
3. Establish which Delta T model/version is compiled into the native Swiss library. The current binding reports `@swisseph/node` 1.4.0 but not the compiled Swiss library version or numeric Delta T output.
4. Compare tropical longitude, sidereal longitude and Lahiri/Raman/Krishnamurti ayanamsa against independent references using compatible settings.
5. Add independent ascendant and house-cusp fixtures, with high-latitude and house-system failure cases.
6. Verify Nakshatra/Pada boundary conventions against independent reference values; current tests are internal boundary-rule tests only.

Keep independent validation **BLOCKED** for release and chart `fullyVerified` false until broader compatible comparisons execute successfully; the single JPL snapshot check is a limited **PASS** for its declared scope only.

## Implementation phase: Vimshottari Pratyantardasha

Implemented a third Dasha level using the existing 120-year lord cycle and the same proportional child-period formula documented for Antardasha. Each retained Antardasha now contains nine Pratyantardasha intervals, starting from that Antardasha's lord; intervals are contiguous and the final child end is pinned to its parent end to prevent floating-point boundary drift. The existing chart API result includes these periods, and the current Dasha table renders Antardasha and Pratyantardasha labels from that result. The calculation rule is cross-checked against the English translation of *Brihat Parashara Hora Shastra*, Chapter 61, verses 1–2. This is rule provenance, not a golden numeric fixture or independent validation of LIFE's dates.

The chart calculation convention version was advanced to `life-core-0.1.1`. Chart-specific `independentReferenceValidation` remains `not-performed` and `fullyVerified` remains false.

Verification run `312aeb06-ad72-425a-b501-62d3c889919c`, environment `win32-x64; Node v24.20.0`, 2026-10-17 05:26:30–05:26:47 UTC:

| Command | Result |
|---|---|
| `npm test` | PASS — 36 tests, 36 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit` | PASS — exit code 0. |
| `npm run build` | PASS — optimized Windows-local Next.js production build, exit code 0. |

The run is stored in `data/verification/latest.json`. Focused pre-run `tests/rules.test.mjs` and `tests/engine.test.mjs` also passed 18/18 after implementation. No Linux/Docker, Railway, database migration, authentication, or network-isolation test was run. Production release remains **NOT READY**.

## Phase 2 implementation increment: Panchanga Nakshatra/Pada

**Status: implemented, internally boundary-tested, website-integrated; independent validation NOT TESTED.**

The Panchanga result now includes the Nakshatra name/index, Pada, and normalized sidereal Moon longitude. `calculatePanchanga()` delegates to `calculateNakshatraPada()`, which wraps finite longitudes, partitions the zodiac into 27 equal 13°20′ segments and each segment into four equal padas, with start-inclusive boundaries. The existing chart API returns this result as part of `calculateBirthChart()`; the page renders it as `PANCHANGA NAKSHATRA · PADA`. The calculation shares the same full-precision sidereal Moon input as the existing chart and Vimshottari result. It does not calculate sunrise-adjusted Vara.

Evidence and tests:

- `src/calculation/rules.ts` — `calculateNakshatraPada()` and `calculatePanchanga()` result.
- `src/app/api/charts/route.ts` — POST path returns the complete calculated chart object.
- `src/app/page.tsx` — response type and Panchanga summary UI render `chart.panchanga.nakshatra`.
- `tests/rules.test.mjs` — all 27 Nakshatra segment starts and 108 Pada segment starts, wraparound, invalid input, and Panchanga output.
- `tests/engine.test.mjs` — chart result Nakshatra/Pada matches the Dasha birth-Moon fields.
- Built standalone website smoke check — started with `npm start`, POSTed a real chart input to `http://localhost:3000/api/charts` with same-origin headers, and received `panchanga.nakshatra = Swati`, `pada = 4`, matching the returned Moon's `Swati`; response included a result hash. The server was stopped after the request. This verifies the API data path; build success plus page source verifies compilation/render wiring, not browser interaction or independent accuracy.
- `docs/CALCULATION_METHODS.md`, `docs/FEATURE_INVENTORY.md`, `docs/KNOWN_LIMITATIONS.md` — method and limitation status.

Verification on Windows x64, Node v24.20.0:

- Focused rules/engine test command — PASS, 19/19. The preceding test run had one incorrect expected value (12° is Ashwini Pada 4); the expectation was corrected and the focused rerun passed.
- `npm test` — PASS, 37/37.
- `npx tsc --noEmit` — PASS, exit 0.
- `npm run build` — PASS, Next.js optimized production build, exit 0.

This does not establish an independent Panchanga reference comparison. No database, deployment setting, or Railway environment was changed or verified. Overall release remains **NOT READY**.

## Phase 3 implementation increment: KP, Yogas/Doshas/Aspects/Dignity, and astronomical events

**Status: implemented, internally boundary/integration-tested, website-integrated; independent reference validation NOT TESTED for every new module.**

Implemented and wired into the chart pipeline, `/api/charts`, and the browser UI:

- **KP (Krishnamurti Paddhati)** — star/sub/sub-sub lords via the Vimshottari-proportional subdivision of each nakshatra span, using KP's own Krishnamurti ayanamsa and Placidus cusps independently of the chart's selected ayanamsa/house system, plus four-fold planetary and derived house significators. Reported as unavailable (`kp: null`) at polar latitudes where Placidus cusps are undefined, instead of substituting another house system. Evidence: `src/calculation/kp.ts`, `tests/kp.test.mjs`, `tests/charts-api.test.mjs`.
- **Yogas, doshas, dignity and Parashari aspects** — exaltation/moolatrikona/debilitation/friendship/combustion/retrogression, full-strength graha drishti, and named Nabhasa/Sun/Moon yogas plus Kaal Sarpa/Mangal doshas. Evidence: `src/calculation/yogas.ts`, `tests/yogas.test.mjs`.
- **Astronomical events** — sunrise/sunset/moonrise/moonset, sunrise-based Vara, and transits with the next sign-ingress found by forward scan refined by bisection (bracket < 1e-7 day); circumpolar rise/set returns `no-event` rather than a fabricated time. Evidence: `src/calculation/events.ts`, `tests/events.test.mjs`.

The chart convention version is now `life-core-0.2.0`. Chart-specific `independentReferenceValidation` remains `not-performed` and `fullyVerified` remains false. These modules are rule-derived with internal boundary tests; none has an independent classical or astronomical reference fixture.

Verification on Windows x64, Node v24.20.0:

| Command | Result |
|---|---|
| `npm test` | PASS — 76 tests, 76 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit` | PASS — exit code 0. |
| `npm run build` | PASS — optimized Next.js production build, exit code 0; routes `/`, `/api/charts`, `/api/charts/sensitivity`, `/api/health`, `/api/verification`, `/verification` emitted. |

No Linux/Docker, Railway, PostgreSQL migration, authentication, or network-isolated run was executed. The verification checklist definitions were updated so KP, yogas/doshas/aspects/dignity and transit events no longer read as `NOT_IMPLEMENTED`, while authentication, saved-chart persistence and Railway/Linux execution remain correctly unimplemented/untested. **Overall release remains NOT READY.**

## Database and security status

Honest status as of 2026-10-17:

- **Schema present, no application layer.** `prisma/schema.prisma` and additive migrations define `User`, `BirthProfile`, `SavedChart` (with `settings`/`inputSnapshot`/`result` JSON and `resultHash`) and the verification tables. No auth routes, session handling, password hashing, admin provisioning, or saved-chart/birth-profile endpoints exist. The only database write path is `/api/verification` acknowledgement upserts.
- **Secrets.** `DATABASE_URL` and `SESSION_SECRET` are read from the environment (`.env.example` holds placeholders only); no secret is hard-coded in source.
- **Input handling.** `/api/charts` validates and rejects malformed payloads (HTTP 422 mapping); `/api/verification` enforces a same-origin check (403), returns 503 when `DATABASE_URL` is unset, and caps request size (413 above 5 KB).
- **Ownership/authorization.** Not implemented — no private data routes exist yet, so server-side ownership checks cannot be claimed. Saved-chart persistence, birth-profile persistence, authentication and backup/restore remain **NOT_IMPLEMENTED / NOT_TESTED**.
- **Not performed:** no migration was applied to any database; no disposable test database was stood up; no deployment occurred.
