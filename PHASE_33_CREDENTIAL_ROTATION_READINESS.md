# LIFE Phase 33 — Credential Rotation Readiness

## Actions and status

| Action | Status |
|---|---|
| Inspect `.env` variable names without displaying values | **Completed** |
| Locate local project consumers of database/API variables | **Completed** |
| Connect to Supabase or run a database command | **Not performed** |
| Rotate credentials | **Not performed by this task; operator confirmation required** |
| Verify EDB installer/download/signature/hash | **Not performed; gated on rotation confirmation** |
| Download/install PostgreSQL client tools | **Not performed; separate explicit authorization still required** |

The existing `.env` variable names are `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`, `DATABASE_URL`, and `DIRECT_URL`. Their values were not inspected for reporting.

Repository source references database access through `DATABASE_URL` (`prisma.config.ts`, `src/server/db.ts`, and `src/server/database-health.ts`). `DIRECT_URL` is currently used as the session-mode operator connection URL, but is not the application Prisma runtime URL or Prisma config URL. A credential change to the PostgreSQL password must be reflected in both local connection URLs and every deployment/CI/secret-manager copy that contains either URL.

No `SUPABASE_SECRET_KEY` source-code consumer was found in the searched application, Prisma, and script paths. This does not prove there are no external consumers; inventory deployment settings, CI secrets, Supabase functions, integrations, and operator tooling before revocation. The publishable key and project URL/JWKS URL are not database credentials; do not paste any of these values into chat.

## Manual rotation checklist for the authorized project owner

1. Sign in to the official Supabase Dashboard and select the existing LIFE project by its project identity.
2. In the project's database settings, use the Dashboard's database-password reset/change control to rotate the PostgreSQL database password. Generate/store the replacement only in the approved password manager; do not share it in chat or tickets.
3. Securely update both `DATABASE_URL` (transaction-pooler connection used by app/Prisma config) and `DIRECT_URL` (session-mode operator connection) in the local secret store and every deployed environment, CI workflow, and operator secret store that uses them. Preserve each URL's host, port, database, and username from the correct Supabase connection mode. Percent-encode reserved characters in the URL password component. Do not replace the PostgreSQL password with a Supabase API key.
4. In the project's **Settings → API Keys**, rotate the exposed `SUPABASE_SECRET_KEY`: create/use the replacement secret key, securely update all actual consumers, verify them, then revoke/disable the exposed old key using the Dashboard's key-management controls. A new key does not automatically revoke the previous key. Do not change the publishable key unless a separate exposure is discovered.
5. Check any external secret stores, deployment platforms, CI/CD secrets, monitoring jobs, local operator copies, and integrations for old values. Do not commit `.env` or send values in chat. Ensure local `.env` remains excluded from source control.
6. Confirm only the completion state in chat (both credentials rotated and all relevant secret stores updated). Do not send the replacement values or screenshots that reveal them.

Supabase guidance: [API keys and rotating leaked keys](https://supabase.com/docs/guides/getting-started/api-keys) and [Database Backups](https://supabase.com/docs/guides/platform/backups). Dashboard navigation can change; use the official project's current settings screens and confirm the project identity before changing credentials.

## Credential confirmation gate

The operator previously reported rotation was not complete. Until they confirm both the PostgreSQL database password and Supabase secret API key have been rotated and all relevant stores updated:

- Do not connect to Supabase, including a read-only check.
- Do not run `pg_dump`, Prisma status, migration commands, or any database command.
- Do not verify an EDB installer by downloading it, and do not install any tools.

After that confirmation, the next authorized phase may verify the exact PostgreSQL 17.11-5 EDB installer metadata, publisher signature, and SHA-256 against the pinned Winget manifest. Downloading/installing remains separately gated: install only the **Command Line Tools** component, with server, pgAdmin, and Stack Builder unselected, and only after explicit installer/component approval.

