# LIFE Phase 28 — Trusted TLS and Read-Only Live Database Verification

## Outcome

TLS certificate verification now succeeds using the locally supplied CA, but PostgreSQL authentication fails with sanitized error code **`28P01`** on the existing session-mode pooler. Therefore no authenticated SQL query ran and Prisma migration status was not checked. The live database identity and all requested migration states remain **unverifiable**.

No database writes, migrations, resets, provisioning, role changes, or application configuration changes were performed.

## Confirmed local configuration

- The pinned local Prisma CLI is **7.10.1**.
- [prisma.config.ts](./prisma.config.ts) uses `process.env.DATABASE_URL` for Prisma CLI commands.
- [schema.prisma](./prisma/schema.prisma) declares PostgreSQL and relies on Prisma config for its connection URL.
- [db.ts](./src/server/db.ts) uses `DATABASE_URL` for application runtime.
- `DIRECT_URL` is not currently used by either Prisma configuration or the application client.
- Sanitized inspection showed `DATABASE_URL` and `DIRECT_URL` target the same Supabase pooler host, database path, and username/project suffix. `DATABASE_URL` uses port 6543 (transaction mode); `DIRECT_URL` uses port 5432 (session mode). This confirms configured endpoint consistency, not remote database identity.

## TLS and connection verification

The supplied file `C:\Users\pc\Downloads\prod-ca-2021.crt` was parsed locally as a CA certificate. Its subject and issuer are `CN=Supabase Root 2021 CA`; its SHA-256 fingerprint is:

`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`

Using that CA with strict verification enabled (`rejectUnauthorized: true`) and the session pooler's configured hostname as TLS server name advanced the PostgreSQL connection to database authentication. The server then rejected authentication with `28P01`. The prior TLS-chain error was not reproduced with this CA, and no TLS verification bypass was used.

This result confirms that this client accepted the presented TLS certificate chain under the supplied CA and hostname for the attempted connection. It does not prove the remote database identity because authentication failed before SQL. The certificate was not independently retrieved from the Supabase Dashboard by this process; its provenance is based on the operator's confirmation that the CA was supplied through the approved project workflow.

Two bounded attempts were made using the existing session-mode URL: one with parsed connection fields and one with the driver's native connection-string parser. Both returned `28P01`. No credentials or connection strings were printed. No further retry will be made until an authorized operator verifies the session-pooler login configuration through the Supabase Dashboard or another approved secret-management path.

## Live identity and migration checks

| Check | Result |
|---|---|
| Strict TLS verification to session-mode endpoint | Passed to PostgreSQL authentication stage using supplied CA |
| PostgreSQL authentication | Failed: `28P01` |
| `current_database()` / `current_schema()` | Not run; authentication was rejected |
| Connected database/server identity | Not verified |
| Prisma 7.10.1 `migrate status` | Not run; authenticated connection unavailable |
| `20261026120000_super_admin_role_audit` | Unverifiable |
| `20261026130000_user_full_name` | Unverifiable |
| `20261026140000_password_reset_tokens` | Unverifiable |

The session URL is structurally configured for Supabase shared session mode, but live connectivity is not usable until database authentication succeeds. The Prisma status command was deliberately not run because the prerequisite trusted, authenticated database connection was not established. No production mutation is authorized.

## Configuration changes and validation

- No files containing environment configuration were modified.
- No application code, schema, migration, or runtime connection behavior changed.
- No tests or build were run; this was a read-only diagnostic.

## Exact next operator action

An authorized operator should verify in the existing Supabase project's **Connect** panel that the session-mode connection string uses the current database password and correct pooler username for this exact project. Check reserved-character URL encoding and refresh the local secret from the approved secret manager if needed; do not paste credentials into chat or expose them in logs. Do not change the project or database.

Once the operator confirms the existing secret/URL is corrected locally, repeat the bounded, strict-TLS read-only identity query. Only after that succeeds, run the pinned Prisma 7.10.1 migration-status command using a process-scoped `DATABASE_URL` override to the existing session-mode URL. Keep `.env` and application runtime behavior unchanged. Do not apply migrations without separate explicit approval.

## Continuation — local credential availability

After the above checks, the current local `.env` was inspected by key name only. It contains no `DATABASE_URL` or `DIRECT_URL`, and neither variable is present in the current process environment. The operator confirmed the connection settings have **not yet been restored** and will need to configure them locally. No values from `.env` were displayed or changed.

The earlier `28P01` result is from the prior configured session URL. No new authentication attempt could be made after that because the URL is currently unavailable. Do not treat the earlier endpoint values as the current local configuration.

Before retrying, configure these locally through the approved secure workflow:

- `DIRECT_URL`: the existing Supabase project's Dashboard → Connect → **Session pooler** URL, using the displayed host, port, database, and pooler username, plus the current PostgreSQL database password.
- `DATABASE_URL`: retain the project's existing transaction-pooler URL for application runtime, with its matching current PostgreSQL database password.
- Percent-encode reserved characters in the URL password component. Do not use a Supabase API key as the PostgreSQL password. Do not put either value in chat, source control, or command output.
- Keep the validated CA available locally for strict certificate and hostname verification.

No database identity query or migration status command was run during this continuation. Resume only after both variables are securely available locally. First perform the bounded strict-TLS read-only identity query; run Prisma status only if authentication and identity checks succeed. No production mutation is authorized.

## Latest continuation — URLs restored, authentication still blocked

The current local `.env` was inspected in-process without displaying its values. Both `DATABASE_URL` and `DIRECT_URL` exist and parse as PostgreSQL URLs. The installed Prisma CLI is still **7.10.1**. The URL metadata is structurally consistent with the operator-confirmed existing project and session pooler:

- Session URL: same Supabase pooler host, port 5432, database `postgres`, and pooler username whose project suffix matches the `SUPABASE_URL` project reference.
- Transaction URL: same host/database/pooler username on port 6543.
- [prisma.config.ts](./prisma.config.ts) still sources Prisma CLI connections from `DATABASE_URL`; application runtime also uses `DATABASE_URL`. No configuration was changed.

The supplied local CA was used with strict CA verification and hostname verification. The bounded, read-only session-pooler identity attempt again failed at PostgreSQL authentication with sanitized error code **`28P01`**. No SQL ran. Accordingly, live database identity is not verified and `prisma migrate status` was not run.

The current local endpoint fields match the operator-confirmed dashboard host, port, database, and username, and match the intended project reference encoded in local Supabase configuration. The remaining configuration to investigate is the **PostgreSQL database password component of `DIRECT_URL`**, including whether it is current and correctly percent-encoded. This is not proven to be the cause; `28P01` alone does not distinguish a stale/incorrect password from other server-side authentication rejection. Do not substitute the Supabase API secret/publishable key for the database password.

**Security note:** a database credential was included in IDE-selected text shared with this conversation. Do not reuse or repeat that exposed value. An authorized project operator should rotate the PostgreSQL database password through Supabase's approved dashboard workflow, then update both local connection URLs through the secure local workflow. Never paste the replacement in chat, logs, or source control. Keep the existing verified CA and strict TLS settings.

| Read-only check | Latest result |
|---|---|
| Local URL presence and parseability | Confirmed for both URLs |
| Pinned Prisma CLI | 7.10.1 |
| Session endpoint metadata | Matches operator-confirmed session pooler settings |
| Strict TLS | Certificate verification enabled using supplied CA |
| Authentication | Failed: `28P01` |
| `current_database()`, `current_schema()`, `current_user`, server address/port | Not run; authentication rejected |
| Prisma migration status | Not run |
| `20261026120000_super_admin_role_audit` | Unverifiable |
| `20261026130000_user_full_name` | Unverifiable |
| `20261026140000_password_reset_tokens` | Unverifiable |

No application configuration, database data, migration state, password, role, or account was changed by this continuation. After an authorized operator rotates and securely updates the database password, retry the bounded identity query. Run the pinned, read-only migration-status command only after the identity is verified; do not apply migrations without separate approval.

## Latest continuation — trusted identity and migration status verified

The current local `.env` was read in-process; values were not printed. Both database URLs are present and parse as PostgreSQL URLs. The installed CLI is Prisma **7.10.1**. The sanitized session URL metadata matches the operator-confirmed Supabase session-pooler host, port 5432, database `postgres`, and pooler username; its project suffix also matches the existing `SUPABASE_URL` project reference. The transaction-pooler URL has the same host/database/username on port 6543.

Using `DIRECT_URL` with the supplied CA, strict certificate-chain and hostname verification enabled, and bounded connection/query timeouts, a read-only query succeeded. It returned:

- `current_database()`: `postgres`
- `current_schema()`: `public`
- `current_user`: `postgres`
- Connected pooler endpoint: `aws-0-ap-southeast-1.pooler.supabase.com:5432`
- Server address: IPv6 address returned by the pooler; server port 5432
- PostgreSQL version: `17.11`
- `public._prisma_migrations`: absent (`to_regclass` returned `NULL`)

The configured Supabase project reference in `SUPABASE_URL`, the project-specific pooler username suffix, and the operator-confirmed Dashboard connection details all agree. This is sufficient to identify the authenticated connection as targeting the intended configured project, while the query's database/user/server facts above are the directly observed live values.

Only after that identity query succeeded, Prisma's pinned **7.10.1** CLI `migrate status` was run with a process-scoped `DATABASE_URL` override to the same session URL. The override added `sslmode=verify-full`, the supplied CA path as `sslrootcert`, and an 8-second connection timeout. `NODE_EXTRA_CA_CERTS` was scoped to that process as well. `.env` and application runtime configuration were not changed. Prisma reported 9 local migrations and that all 9 have not yet been applied; the command exited with code 1 because migrations are pending. No migration was applied.

| Requested migration | Verified status |
|---|---|
| `20261026120000_super_admin_role_audit` | **Pending** |
| `20261026130000_user_full_name` | **Pending** |
| `20261026140000_password_reset_tokens` | **Pending** |

The live database migration table was not present before running Prisma status, and the CLI independently reported all local migrations unapplied. No `INSERT`, `UPDATE`, or `DELETE` was run. No schema changes, account/password changes, role changes, provisioning, or other production writes were performed.

### Current report summary

The earlier continuation documented the prior `28P01` failure. After the operator updated the local URLs, that failure no longer occurred: the identity query and read-only Prisma status both succeeded using strict TLS. The cause of the earlier authentication failure was not independently established. No configuration files were changed during these checks.

The requested database verification is complete. Applying the pending migrations remains a separate production operation and was not authorized or performed here.
