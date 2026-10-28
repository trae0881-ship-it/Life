# LIFE architecture

## Repository baseline (2026-10-16)

This repository was empty at initial inspection: no application, package manifest, database schema, migrations, deployment configuration, or tests were present. The only detected runtime was Node.js v24.20.0 with npm 11.19.0. The `python` command resolves to an inaccessible Windows Store launcher. No Docker command or Railway environment variables were available. The target architecture below describes the intended system; the current implementation and its gaps are recorded separately.

## Target architecture

- A single deployable TypeScript web application (Next.js) on Railway.
- Railway PostgreSQL for users, profiles, saved charts, audit metadata, and reports.
- A server-only calculation module behind a versioned internal interface. It owns timezone resolution, time-scale conversion, ephemeris access, chart derivations, and provenance.
- No runtime calls to third-party calculation, geocoding, AI, authentication, email, analytics, or rendering services.
- Ephemeris assets are immutable application data packaged in the deployment image after source, checksum, range, and license review. Startup checks fail closed when required files are absent or corrupt.
- One process initially; calculation concurrency is bounded and native engine calls are serialized unless thread safety is demonstrated.

## Proposed boundaries

`src/calculation` owns deterministic numerical methods and has no database or HTTP dependencies. `src/server` validates inputs, enforces authentication/ownership/rate limits, invokes calculations, and persists results transactionally. `src/app` renders user and admin experiences. Prisma (or an equivalent maintained PostgreSQL layer) owns versioned migrations. Engine, data-file, rule-set, and configuration versions are attached to every calculation audit record.

## Deployment shape

Build a Linux image with pinned runtime and native build dependencies. Validate environment variables at boot; bind to `0.0.0.0:$PORT`; expose liveness/readiness checks; run migrations as an explicit release step; never run destructive schema changes automatically. Keep the database on Railway PostgreSQL. Do not store user files or ephemeris assets only in ephemeral runtime storage.

## Current implementation (0.1.0)

The current Next.js 16 / React 19 TypeScript application has a server-only calculation module using `@swisseph/node@1.4.0`, checksummed local ephemeris assets, local IANA timezone resolution, selectable Lahiri/Raman/Krishnamurti sidereal settings, four house systems, mean/true/both lunar nodes, D9/D10, Vimshottari MD/AD, and basic tithi/karana/yoga. The frontend submits to the application's own `/api/charts` route. A receipt with a deterministic result hash and explicit unverified reference status is returned but not persisted yet. Engine health checks local file checksums and native binding load state.

Prisma 7.10.1 schema/client and versioned PostgreSQL migrations are present. Authentication, session handling, ownership-scoped profile/saved-chart routes, and explicitly controlled administrator provisioning are implemented. Production migrations and database restoration remain operator-controlled; the application does not apply schema changes automatically.

## Authentication route behavior

`/login` and `/signup` render distinct forms through the shared account form component; the selected form mode is keyed to the route so client-side navigation cannot retain stale login/signup state. Both pages validate the optional `next` destination as an internal path and default to `/dashboard`. Authentication forms verify the newly issued server session through `/api/auth/me` before redirecting. Registration currently creates a session immediately; there is no email/OTP verification step in this flow. The dashboard checks the server-side session and redirects anonymous requests to `/login?next=%2Fdashboard`. Logout revokes the session and clears its cookie before returning to the public homepage.

The public homepage header reads the current session to show sign-in/create-account links or authenticated dashboard/sign-out actions. The dashboard provides its own account navigation and sign-out control. Browser checks cover public auth-page rendering, login/signup client-side navigation, the signup `next` URL, and the anonymous dashboard redirect; successful authentication and logout still require a confirmed test account/session and were not exercised in the unverified database environment.

The shared global footer includes a keyboard-accessible Developer disclosure linking to the public endpoint catalogue, API docs, and OpenAPI document. Its separate Developer Login action targets `/login` with the internal Developer dashboard return path; Create Developer Account targets the regular `/signup` flow. Signup creates a `USER`, not a Developer role. The panel states that Developer access and API product grants follow the existing role/grant process. A verified Developer session additionally sees the protected Developer dashboard link. This footer behavior is covered by source-level regression tests; it does not imply real authenticated-session verification.

The Next standalone trace omits the dynamically loaded native binary, so the Railway Dockerfile copies the pinned package from the builder stage explicitly. This packaging change has not been tested on Linux. See [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md), [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md), and [DEPLOYMENT_RAILWAY.md](DEPLOYMENT_RAILWAY.md).
