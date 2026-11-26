# Integration and API Audit

## Birth chart trace

Calculation: `src/calculation/chart.ts` -> `calculateBirthChart()`

API: `POST /api/charts` in `src/app/api/charts/route.ts`

UI: Chart Studio in `src/app/ChartStudioWorkspace.tsx`

Database: saved snapshots in `src/app/api/saved-charts/route.ts` and Prisma `SavedChart`

## Main API areas

| Area | Route / source | Status |
|---|---|---|
| Chart calculation | `/api/charts` | Implemented source; authentication/API-key/rate-limit code present |
| Chart sensitivity | `/api/charts/sensitivity` | Implemented source |
| Saved charts | `/api/saved-charts*` | Source implemented; live DB unverified |
| Numerology/Tarot/Palmistry readings | `/api/astrology-readings*` | Source implemented |
| Palmistry | `/api/palmistry*` | Upload/observation routes; live DB/RLS unverified |
| Kundali documents | `/api/kundalis*` | Manual-review original storage; no extraction |
| Profiles | `/api/profiles*` | Source implemented; live DB unverified |
| Assistant | `/api/assistant/questions*` | Source implemented; live persistence unverified |
| KP | KP is not a separate calculation route; it is returned inside chart JSON | Connected to Chart Studio |
| Transits | `/api/transits` | Implemented source |

## Database

Prisma 7.10.1 models include birth profiles, saved charts, saved astrology readings, Kundali documents, palmistry records/hand images/readings, sessions, questions, API platform, and auth data.

The PostgreSQL integration command was blocked:

`npm.cmd run test:postgres`

Result: exit code 1, `LIFE_TEST_DATABASE_URL is required.`

No database migration or write was performed during this audit.

## Authentication and report integration

Session/auth and ownership helpers exist. Chart and saved report API code is owner-scoped or role/API-key guarded. Live browser/session/database behavior was not verified in this environment.

## Cross-system integration gaps

- Numerology + Vedic: no shared report pipeline.
- Numerology + KP: no shared report pipeline.
- DOB + name + mobile: numerology profile supports this combination.
- Vedic + KP: both exist in chart JSON but are separate calculation settings and no synthesis report exists.
- Career/marriage/foreign cross-system synthesis: not implemented.
