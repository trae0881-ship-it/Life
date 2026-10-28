# LIFE Phase 26 — Existing Supabase Database and Password Recovery

## Findings

### Authentication architecture

LIFE uses **custom authentication backed by Prisma and the `public.User` table**, not Supabase Auth:

- `User.passwordHash` is required in [schema.prisma](./prisma/schema.prisma).
- Registration hashes passwords with Argon2id in [auth-core.ts](./src/server/auth-core.ts); login verifies the stored hash and creates LIFE sessions.
- Session creation, validation, and logout use LIFE's Prisma `Session` table and hashed session tokens.
- Password recovery updates the custom user's `passwordHash` with the same Argon2id function, then revokes LIFE sessions.
- No Supabase Auth client or Supabase Auth recovery callback was found in the application source or dependencies inspected.

Therefore Supabase Auth's password-reset UI would not reset a LIFE `public.User.passwordHash`. The existing LIFE flow at `/forgot-password` and `/reset-password` is the appropriate method. No architecture change or duplicate account was introduced.

### Configured database target and connection attempt

Without displaying credentials, local configuration inspection found:

- `DATABASE_URL` points to the Supabase transaction pooler endpoint in `ap-southeast-1`, database path `postgres`, port `6543`.
- `DIRECT_URL` points to the **same pooler host, database path, and database username** on port `5432`, which is the session-mode pooler endpoint. The variable name does not indicate a direct database host in this configuration.
- Both [prisma.config.ts](./prisma.config.ts) and the application Prisma client in [db.ts](./src/server/db.ts) use `DATABASE_URL`; `DIRECT_URL` is not wired into either. No datasource or environment value was changed.

A bounded, read-only diagnostic attempted the session-mode endpoint with TLS certificate verification enabled, an 8-second connection timeout, and an 8-second query timeout. The connection failed during TLS verification with **`SELF_SIGNED_CERT_IN_CHAIN`**. No SQL ran, so the live database identity and remote migration history could not be queried. TLS verification was not disabled.

**Live database identity: not verified.** The endpoint metadata comes from local configuration only; it is not proof of the connected server or the database contents.

**Migration status: unverifiable.** The recovery migration file exists locally at [migration.sql](./prisma/migrations/20261026140000_password_reset_tokens/migration.sql), but the remote `_prisma_migrations` table could not be read. Do not infer that it is pending or applied based on the local file. No migration, write, reset, or provisioning command was run.

The configured session-mode endpoint is the appropriate existing alternative to the transaction pooler for status/migration commands, but it is not currently usable with strict TLS verification. If an operator later runs a status command through `DIRECT_URL`, the override must be scoped to that one CLI process; changing `DATABASE_URL` in the application environment would also change the runtime connection. The earlier transaction-pooler prepared-statement conflict remains a separate issue; using session mode did not solve the TLS certificate-chain failure.

## Recovery email configuration

The local environment check found none of these settings configured: `RESEND_API_KEY`, `LIFE_EMAIL_FROM`, or `LIFE_PUBLIC_APP_URL`. No values were displayed. As a result, email delivery and the actual reset flow are not operationally verified.

For the custom LIFE reset flow:

1. An authorized operator must configure the Resend API key, a sender address/domain verified in Resend, and the public LIFE application URL using the deployment's server-side secret manager.
2. The public URL must use HTTPS outside localhost and must point to the LIFE application containing `/reset-password`; no Supabase Auth redirect URL is involved.
3. The authorized operator must review the additive migration and explicitly approve any production migration operation. The migration has not been applied here.
4. After database TLS trust is corrected, verify migration status read-only against the same session-mode endpoint before separately deciding whether to apply anything.
5. Test delivery and reset only with an approved test account/address. Do not send a test email to a real user without authorization.

Do not work around the TLS error with `rejectUnauthorized: false`, `sslmode=no-verify`, or equivalent. The safe next diagnostic is to have the database/network operator verify the certificate chain presented by the existing session-mode endpoint and configure the correct trusted CA chain through the approved Supabase connection guidance. Then repeat bounded, read-only identity and migration-status checks. Do not apply the migration until its status is known and explicit approval is given.

## Files and validation

- Files changed in Phase 26: this report only.
- No app code, schema, migration, account, role, or production data was changed.
- No tests or build were run in this diagnostic-only phase; Phase 25's existing code and validation results are documented in [PHASE_25_SECURE_PASSWORD_RECOVERY.md](./PHASE_25_SECURE_PASSWORD_RECOVERY.md).
- End-to-end recovery, email delivery, live database identity, and live migration status remain blocked and unverified.
