# LIFE Verification Master Plan v1.0

## Purpose

This plan defines reproducible evidence gates for LIFE. It deliberately
separates:

1. **Calculation verified** — numerical or deterministic output passed a
   declared reference/tolerance or invariant test.
2. **Interpretation reviewed** — a human verified the tradition, source
   passage, scope, and limitations.
3. **Software behavior tested** — routing, validation, provenance, ownership,
   localization, and failure behavior passed automated tests.
4. **Predictive performance evaluated** — a preregistered empirical study
   compared outcomes against a defined baseline.
5. **Not verified** — required evidence is missing or blocked.

No combined score, test pass rate, or implementation percentage is an
astrological accuracy claim.

## Current release gates

| Gate | Current result | Evidence |
|---|---|---|
| Local calculation engine loads checked-in assets | PASS on Windows | `tests/engine.test.mjs`; ephemeris checksum manifest |
| Repeated calculation is deterministic | PASS | `tests/engine.test.mjs`, chart receipt/result hash |
| Selected tropical planetary snapshots | PASS within fixture tolerances | `tests/reference.test.mjs`; offline DE441 fixtures |
| Time-zone/DST input handling | PASS for covered cases | `tests/time.test.mjs` |
| D1 and D2–D60 software mapping behavior | PASS for implemented boundary tests | `tests/engine.test.mjs` and calculation tests |
| Full independent D1–D60 astronomical validation | NOT VERIFIED | No compatible external fixture for every output |
| Dasha/KP independent validation | NOT VERIFIED | Software boundary tests exist; no independent reference suite |
| Panchanga/rise-set independent validation | PARTIAL | Selected published day-length/rise checks; no full reference set |
| Interpretation source review | PENDING | `INTERPRETATION_VALIDATION.md` |
| All 38 answer software routing | PASS for covered contracts | `tests/acceptance-regression.test.mjs`, `tests/kundli-predictions.test.mjs` |
| Real-world predictive performance | NOT EVALUATED | No preregistered outcome study |
| Production release readiness | NOT READY | Independent and environment-specific gates remain open |

## Evidence workflow

For each feature:

1. Freeze input conventions and software versions.
2. Record the exact fixture source and compatible coordinate/time-scale
   definition.
3. Run the deterministic test in an offline environment.
4. Compare only compatible quantities, with wrap-aware angular differences.
5. Record tolerance, observed maximum error, and pass/fail result.
6. Review missing-input and boundary behavior.
7. For interpretation, separately record tradition, source passage, reviewer,
   disagreements, and prohibited claims.
8. Publish the result in the matrices; do not infer verification from a UI
   rendering or a passing build.

## Safety and privacy

No production migrations, destructive SQL, or production records are required
for this plan. Integration tests must use a disposable database configured via
`LIFE_TEST_DATABASE_URL`. Future empirical studies must minimize birth data,
remove direct identifiers, define retention/deletion, and obtain independent
review before collection.

## Predictive evaluation protocol (future work only)

Any future outcome study must be preregistered before outcome inspection, use
an outcome definition that is observable and time-bounded, include a
non-astrological baseline, report uncertainty and missingness, prevent chart
leakage, and publish an independent review. It must not be used to imply
guarantees for an individual user.
