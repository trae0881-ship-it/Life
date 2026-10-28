# LIFE — Jyotish Workbench

**A chart you can inspect.** LIFE is an AGPL-3.0 local-calculation astrology workbench. It resolves a known local birth time through the runtime IANA timezone database and uses the local Swiss Ephemeris binding and bundled ephemeris files. Normal calculations do not call external astrology, astronomy, geocoding, or AI services.

## Implemented calculation features

- D1 tropical and configurable Lahiri, Raman, or Krishnamurti sidereal positions for the Sun through Pluto and the selected mean/true Rahu-Ketu node pair(s). Ketu is derived 180° opposite its selected Rahu node; each body carries latitude, distance, angular speed, retrograde/direct status, sign, nakshatra, and pada.
- Ascendant, Midheaven, and Whole Sign, Placidus, Koch, or Equal (Ascendant) house cusps and planetary house placements.
- Calculated D2–D60 varga placements with named mapping conventions. Non-classical vargas use an explicitly labeled custom cyclic mapping; these and the classical mappings have internal boundary tests but no independent numerical Vedic reference fixture.
- Vimshottari Mahadasha, Antardasha, and Pratyantardasha with start/end dates, durations, and documented 365.2425-day year convention.
- KP star, sub, and sub-sub lords plus planetary and cusp significators, calculated with KP's Krishnamurti ayanamsa and Placidus cusps. KP is reported as unavailable where those cusps cannot be calculated.
- Panchanga tithi, karana, yoga, nakshatra/pada, civil weekday, and separately calculated sunrise-based Vara.
- Swiss Ephemeris sunrise, sunset, moonrise, moonset, transit snapshots, and next sign-ingress events. Missing rise/set events are reported without inventing times.
- Documented Parashari-rule-based planetary dignity, combustion, aspects, yogas, and doshas.
- Input validation for calendar dates, geographic coordinates, and IANA time zones, including explicit handling of daylight-saving gaps and ambiguous local times.
- A calculation receipt with normalized UTC input, settings, local-data checksums, consistency checks, limitations, and a deterministic result hash.
- Birth-time sensitivity sampling and a verification dashboard.

The browser app renders an overview of calculated key placements, D1 Rashi charts in North Indian diamond and South Indian fixed-sign layouts, D1–D60 selectors and tables, planetary positions, Dasha/Panchanga, house cusps and rise/set, KP, yogas/doshas, and selectable-date local transits. The full name is optional and display-only. Deterministic rule-based readings show the chart factors and convention used; they are explicitly traditional interpretations, not certain predictions. Health-related astrology rules are not implemented, and no health inference or medical diagnosis is provided. The Rajpura example is opt-in and does not prefill other users' details.

## Validation status and limitations

The current project is a working calculation vertical slice, **not a complete production astrology product or an accuracy certification**.

- The available independent JPL Horizons DE441 fixture validates ten tropical planetary positions at one epoch only; it does not validate houses, ayanamsa, the Vedic rules, or broad date ranges.
- Dasha, KP, divisional-chart, Panchanga, event, yoga, and dosha implementations have internal tests and documented conventions, but no comprehensive independent reference fixtures.
- Rule-based readings are a limited, deterministic traditional interpretation layer. Unsupported factors are omitted, and its outputs are not scientific forecasts or independently validated predictions.
- UTC is used as a UT1 approximation without DUT1 correction. Rise/set uses the Swiss binding's default refraction at sea level; observer altitude is not collected.
- Unknown birth time is not guessed; date-only planetary ranges are not implemented. Coordinates must be supplied by the user; no place search or geocoding is provided.
- Registration/login, Argon2id password hashing, opaque database-backed sessions, role-guarded admin/review routes, and owner-scoped profile/chart CRUD are implemented. These flows require PostgreSQL and the Phase 4 migration; the migration has not been applied and no database integration run is claimed.
- Rate limits currently use an in-process memory store. They reset on restart and are not shared between multiple application instances; use a shared limiter before horizontally scaled public deployment.
- Linux/Docker/Railway execution, Linux native-module loading, and a network-blocked offline acceptance run have not been verified.
- Review Swiss Ephemeris and data redistribution rights before public deployment.

See [calculation methods](docs/CALCULATION_METHODS.md), [known limitations](docs/KNOWN_LIMITATIONS.md), and [Railway deployment](docs/DEPLOYMENT_RAILWAY.md) for conventions and release blockers.

## Run locally

Requires Node.js 22 or newer. Install dependencies with `npm ci`, then run:

```powershell
npm run dev
```

Open `http://localhost:3000`. Enter the local birth date and time, an IANA timezone, and manually verified coordinates. `GET /api/health` reports local engine and ephemeris readiness.

Run tests, type-check, and build with:

```powershell
npm test
npx tsc --noEmit
npm run build
```

On Windows PowerShell installations where script execution blocks `npm.ps1`/`npx.ps1`, use `npm.cmd` and `npx.cmd` instead.

## Database and Railway

Prisma models and additive migrations support accounts, sessions, profiles, saved charts, checklist acknowledgements, and authenticated approvals. No migration runs at application startup. Configure `DATABASE_URL` for a private PostgreSQL database. Use `npm run db:deploy` only after reviewing the pending migration and confirming its target; do not run it against production without explicit authorization and a verified backup/rollback plan.

Registration is available at `/signup`, always creates a `USER`, and ignores client-provided role fields. It requires a full name, normalized email, password and matching confirmation; passwords must be 12–128 characters and are stored as Argon2id hashes. Duplicate email registration returns a helpful sign-in message. The database has no phone, preferred-language, or account city/country fields, so registration does not collect them. It never requests Kundli birth details; those are entered later in the authenticated Chart Studio. Email/phone verification during signup is not implemented.

The Developer portal has separate `/developer/login` and `/developer/signup` routes; ordinary `/login` and `/signup` remain separate. Developer login requires an already approved `DEVELOPER` role before a session is issued. Developer signup creates only a standard `USER` account and returns to the approval-required portal; it does not grant API or Developer permissions. Safe internal `next` paths are preserved, external redirect targets are rejected, and a new standard account is not sent directly to the protected Developer dashboard.

Password recovery is available at `/forgot-password` and `/reset-password`. Email delivery uses the Resend Email API ([send email API](https://resend.com/docs/api-reference/emails/send-email)). Configure `RESEND_API_KEY`, `LIFE_EMAIL_FROM`, and `LIFE_PUBLIC_APP_URL` as server-side environment values. Verify the sender domain/address in Resend before enabling delivery; production app URLs must use HTTPS. Keep the Resend key private and out of client-visible variables. Reset tokens are random, expire after 30 minutes, are single-use, and are stored only as SHA-256 hashes. A successful reset uses the existing Argon2id settings and revokes all sessions for that account. Requests are rate limited; responses do not disclose whether an email belongs to an account. Account lookup and delivery run after the generic response is sent to reduce timing-based account enumeration.

The additive migration `prisma/migrations/20261026140000_password_reset_tokens/migration.sql` must be reviewed and applied by an authorized operator before enabling the reset endpoints against a database. It has not been applied automatically. Automated recovery tests use mocked persistence and provider calls; actual email delivery requires an operator-configured Resend account and verified sender domain.

`User.id` is a PostgreSQL `TEXT NOT NULL` column with no database-side default. The Prisma schema declares `@default(cuid())`, which Prisma Client generates when creating a user through `/signup`. Do not create accounts with a direct SQL insert that omits `id`; use `/signup` so Prisma applies its configured ID default. The Super Admin provisioning CLI only promotes an existing account and never creates one.

To provision the one-time initial `SUPER_ADMIN` account (`am123allindiafree@gmail.com`):

1. In an approved, access-controlled database console, verify the intended target with `SELECT current_database();` and check migration status with `npx.cmd prisma migrate status`. Review `prisma/migrations/20261026120000_super_admin_role_audit/migration.sql` and `prisma/migrations/20261026130000_user_full_name/migration.sql`. Apply pending migrations only through the normal reviewed operator process; the bootstrap CLI does not apply migrations.
2. Check whether the exact target account already exists. If it does not, register it through the normal `/signup` flow (do not insert a row directly in SQL). If it exists, do not create a duplicate or reset its password. Signup grants only `USER`.
3. In a protected operator terminal, configure `DATABASE_URL` for the verified target database. Run the command below with the exact database name and an attributable operator name or change-ticket identity. The CLI verifies `current_database()`, requires both migrations to be successfully recorded, and requires the exact target account to exist. It refuses to promote another email or any account when a Super Admin already exists.

```powershell
npm.cmd run admin:provision -- --email am123allindiafree@gmail.com --database-name <verified-database-name> --operator <operator-name-or-ticket> --confirm
```

The `--database-name` and `--operator` values are mandatory; never put a database URL, password, or other secret in the command line. The role change and operator label are recorded in the audit log in a serializable transaction. A repeat run is idempotent when the sole Super Admin is this target. The operation never creates accounts, changes passwords, or applies migrations. This repository task did not verify the live account or migration status, and did not run provisioning.

Keep the database URL private; never use production credentials in automated tests or local development. Database integration tests require a dedicated `LIFE_TEST_DATABASE_URL` and never fall back to `DATABASE_URL`.

The session token is generated randomly, stored only as a SHA-256 hash in PostgreSQL, and sent in an HttpOnly, SameSite=Lax cookie (Secure and `__Host-` prefixed in production). No `SESSION_SECRET` is used. Authentication and saved-data APIs return an explicit service-unavailable response when database access is unavailable. Ordinary verification labels are unauthenticated acknowledgements; authenticated approvals are stored separately and require a signed-in reviewer role.

Railway Docker and health-check configuration is present, but Linux/Railway deployment has not been tested. See [Railway deployment](docs/DEPLOYMENT_RAILWAY.md) and [testing and validation](docs/TESTING.md).

## License

The project targets AGPL-3.0-or-later. Review [LICENSE](LICENSE), bundled notices, dependency terms, and ephemeris-data redistribution rights before public deployment. This engineering record is not legal advice.
#   L i f e  
 