# Testing and Validation Report

## Exact commands

### Unit and integration tests

```powershell
npm.cmd test
```

Actual result:

- Exit code `0`
- 516 tests reported
- 516 passed
- 0 failed
- 0 skipped
- Duration `10965.7799 ms`

No database integration tests are included in this default suite unless separately guarded.

### TypeScript check

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Actual result: exit code `2`.

Errors:

- `src/app/login/useAuthExperienceMotion.ts(4,22)`: cannot find module `gsap`
- Implicit `any` parameter errors in `useAuthExperienceMotion.ts` at line 38

The build's `prisma generate` then regenerated Prisma Client, but TypeScript source still referenced a missing `gsap` dependency in resolution. This audit did not install or change dependencies.

### Production build

```powershell
npm.cmd run build
```

Actual result: exit code `1`.

Failure:

```text
Module not found: Can't resolve 'gsap'
./src/app/login/useAuthExperienceMotion.ts
```

Prisma client generation completed successfully, but Next.js production compilation stopped at the missing module.

### PostgreSQL integration

```powershell
npm.cmd run test:postgres
```

Actual result: exit code `1`.

```text
LIFE_TEST_DATABASE_URL is required.
```

No disposable PostgreSQL database was available. No database migrations or writes were run.

### Chart engine execution

The existing `calculateBirthChart()` function was executed directly with the synthetic profile:

- `1997-04-27`
- `05:45`
- `Asia/Kolkata`
- `30.483997`
- `76.593948`
- Lahiri
- Placidus
- True node

Result: exit code `0`; chart object, D1, D9, D10, D60, Dasha, Panchanga, and KP values were generated.

### Numerology engine execution

`calculateDateNumbers()`, `getPersonalCycles()`, and both Lo Shu modes were executed directly. Result: exit code `0`.

## Independent verification status

- Tropical JPL fixtures: selected snapshots are documented and software tests pass.
- PyJHora mapping/natal cross-check: exact sign and selected D1/cusp values cross-checked within shared Swiss Ephemeris family. It is a convention cross-check, not independent engine validation.
- This exact synthetic Kundali: not independently reference-validated.
- Vimshottari: internally tested, no independent Dasha numerical fixture.
- KP: internally tested, no complete independent KP output fixture.
- Panchanga/ingress: internally tested, incomplete independent fixtures.
- Yogas/doshas/aspects/dignity: rules tested, classical/source truth not independently established.
- Numerology: formula tests pass, predictive outcomes and marriage truth are not scientifically validated.
