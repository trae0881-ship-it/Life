# Missing Features and Implementation Roadmap

## Critical current bugs and integration gaps

1. **Production build is blocked** by the missing `gsap` module despite `gsap` appearing in `package.json` and the lockfile. Resolution under the actual installation is absent.
2. **TypeScript check is blocked** by the same missing module and resulting implicit-`any` cascades.
3. **PostgreSQL integration is unexecuted** because no disposable `LIFE_TEST_DATABASE_URL` is configured.
4. **Live authentication, saved-chart, profile, palmistry RLS, and API persistence are unverified** through a real database/browser run.
5. **Prisma generated output mismatch**: TypeScript previously reported missing `savedAstrologyReading` on `PrismaClient`, although later source/Prisma generation context must be rechecked after a clean install/build.
6. **No complete independent astronomical reference suite** exists for every supported chart output.

## Missing features

| Feature | Status |
|---|---|
| Daily horoscope | Not established |
| Complete Vedic Kundali Koota matching / two-chart score | Not implemented |
| Shared Numerology + Vedic report | Not implemented |
| Shared Numerology + KP report | Not implemented |
| Vedic + KP combined synthesis | Separate in chart, no synthesis |
| Career event prediction from chart | Unsupported/deterministic context only |
| Marriage outcome prediction | Conditional candidate periods only |
| Foreign travel event timing | Unsupported |
| Property purchase timing | Unsupported |
| Business-start timing | Unsupported |
| AI palm-image recognition | Not implemented |
| Native PDF report generator | Not established |
| Complete mobile carrier/country validation | Not implemented |
| Independent predictive outcome validation | Missing |
| Complete live DB/RLS browser verification | Missing |

## Safe implementation roadmap

1. Repair dependency resolution for `gsap` or remove stale package/lock state, then rerun clean install-free build checks.
2. Re-run `prisma generate`, full TypeScript, and build with a consistent dependency tree.
3. Configure an isolated disposable PostgreSQL URL and run migrations plus the guarded integration suite.
4. Add independent fixtures for:
   - Dasha numerical intervals;
   - full KP chains and cusps;
   - Panchanga;
   - rise/set/refraction;
   - sidereal ingress timestamps;
   - exact customer birth charts.
5. Define and source-review any outcome rule before enabling a career/marriage/travel prediction.
6. Decide whether to implement an actual PDF generator or continue with print/browser export only.
7. Add a complete two-chart Vedic matching module only if a deterministic, source-reviewed convention is specified.
8. Add model/license/runtime evidence before any palm automatic recognition feature.
