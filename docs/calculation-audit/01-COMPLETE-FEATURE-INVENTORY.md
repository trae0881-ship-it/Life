# Complete Feature Inventory

Audit date: 2026-11-26

## Verification basis

This inventory distinguishes source implementation, executed software tests, reference evidence, and live database validation. Commands and results are recorded in `07-TESTING-AND-VALIDATION-REPORT.md`.

## Implemented calculation and report areas

| Area | Implementation status | Primary source | API/UI/database |
|---|---|---|---|
| Birth chart / D1 | IMPLEMENTED AND SOFTWARE TESTED; individual sample not independently verified | `src/calculation/chart.ts`, `src/calculation/time.ts`, `src/calculation/rules.ts` | `/api/charts`, Chart Studio, saved charts |
| D2-D60 divisional charts | IMPLEMENTED AND SOFTWARE TESTED; mapping cross-check present; full natal output not independently verified | `src/calculation/rules.ts`, `src/calculation/divisional-metadata.ts` | Chart workspace D1-D60 sections |
| Vimshottari Dasha | IMPLEMENTED AND SOFTWARE TESTED; independent numerical reference absent | `src/calculation/rules.ts`, `src/calculation/dasha-summary.ts` | Chart workspace, assistant, saved chart result |
| Panchanga / Vara / rise-set / transits | IMPLEMENTED AND SOFTWARE TESTED; independent Panchanga/rise/ingress fixtures partial | `src/calculation/rules.ts`, `src/calculation/events.ts` | Chart API/UI, transit route |
| Yogas / doshas / dignity / aspects | IMPLEMENTED AND SOFTWARE TESTED; classical/source review incomplete | `src/calculation/yogas.ts`, `src/calculation/planetary-status.ts` | Chart workspace and assistant |
| KP lords / cusps / significators | IMPLEMENTED AND SOFTWARE TESTED; no independent complete KP fixture | `src/calculation/kp.ts`, `src/calculation/chart.ts` | Chart API/UI, `/kp-astrology`, marriage timing |
| Numerology DOB/name/Lo Shu/mobile | IMPLEMENTED AND SOFTWARE TESTED | `src/calculation/numerology.ts`, `src/calculation/numerology-recommendations.ts` | `/ank-jyotish`, `/api/astrology-readings` |
| Palmistry | MANUAL OBSERVATION IMPLEMENTED; upload storage implemented; automatic image recognition absent | `src/palmistry/engine.ts`, `src/palmistry/storage.ts`, `src/palmistry/knowledge.ts` | `/palmistry`, `/api/palmistry*`, local/DB history paths |
| Tarot | IMPLEMENTED SOFTWARE FUNCTION; reflection interpretations, not astrology calculation | `src/calculation/tarot.ts` | `/tarot-reading`, `/api/astrology-readings` |
| Saved chart reports | SOURCE IMPLEMENTED; database integration not executed | `src/server/saved-report-summary.ts`, `src/app/api/saved-charts/route.ts`, Prisma `SavedChart` | Dashboard, `/api/saved-charts` |
| Kundali document upload | PARTIAL: original-file storage/manual review only | `src/server/kundali-files.ts`, Prisma `KundaliDocument` | `/api/kundalis*` |
| Kundali matching | NOT IMPLEMENTED as Vedic/Koota matching | Only separate numerology compatibility exists | No complete two-chart matching report |

## Engine-to-product trace

1. `calculateBirthChart()` in `src/calculation/chart.ts` validates/resolves a birth profile, calls Swiss Ephemeris, builds D1/D2-D60/Dasha/Panchanga/events/yogas/KP, hashes the result, and returns a complete result object.
2. `POST /api/charts` validates the payload, checks engine health and authentication/API-key access, invokes `calculateBirthChart()`, and returns JSON.
3. Chart Studio invokes the route and renders D1, divisional charts, Panchanga, Dasha, KP, and interpretation panels.
4. Saved-chart routes recalculate submitted birth input before storing the snapshot and owner-scoped JSON in PostgreSQL.
5. Numerology/Tarot/Astrology-reading routes use separate local calculation functions or fixed interpretation tables and are persisted by `SavedAstrologyReading`.

## Calculation inventory

A targeted exported-function enumeration found **102 exported functions** across `src/calculation`, `src/palmistry`, and `src/interpretation`. This is an upper-level callable-inventory count, not a feature-count. Core calculation outputs and formula locations are documented in the module-specific reports.

## Master status table

| Module | Implemented | Software tested | Independent verification | Missing/blocked |
|---|---:|---:|---:|---|
| DOB/name/mobile/Lo Shu numerology | Yes | Yes | No | predictive/compatibility truth, mobile carrier validation |
| Vedic D1/D2-D60 | Yes | Yes | Limited selected references | complete independent natal reference |
| Dasha/Panchanga/events | Yes | Yes | Partial/none | independent Dasha/Panchanga/ingress fixtures |
| KP | Yes | Yes | No complete KP reference | independent full KP result |
| Palmistry/Tarot | Yes/Yes | Palm/Tarot tests | Not applicable/No predictive validation | automatic palm recognition; AI |
| Saved reports/database | Source yes | Mock/source tests | No live DB integration | disposable PostgreSQL run |
| Kundali matching | No | No | No | complete Vedic Koota/matching engine |
