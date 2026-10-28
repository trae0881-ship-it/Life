# LIFE Phase 27 — Existing Supabase TLS Diagnostic

## Result

**Not resolved.** A bounded PostgreSQL TLS handshake to the configured session-mode pooler still fails strict certificate verification with `SELF_SIGNED_CERT_IN_CHAIN`. Since a trusted PostgreSQL connection could not be established, no database identity query or Prisma migration-status query ran. No application configuration, database, schema, user, role, password, or session was changed.

## Connection configuration

Inspected the existing `.env` in-process without printing or storing its contents:

- `DATABASE_URL` uses `aws-0-ap-southeast-1.pooler.supabase.com:6543`, database `postgres`, and the transaction-mode `postgres.<project-ref>` username shape.
- `DIRECT_URL` uses the same pooler host, database, username/project suffix, and database, but port `5432`. This matches Supabase's documented **shared pooler session-mode** endpoint format. It is not a direct database host; it is session pooler access.
- The matching host/database/username metadata makes `DIRECT_URL` structurally consistent with the same configured Supabase project as `DATABASE_URL`. That configuration comparison does not independently prove the remote server's identity.

Prisma CLI configuration in [prisma.config.ts](./prisma.config.ts) explicitly reads `process.env.DATABASE_URL`; `schema.prisma` declares the PostgreSQL provider but no connection URL. The application Prisma client in [db.ts](./src/server/db.ts) also reads `DATABASE_URL`. `DIRECT_URL` is not used by either. Thus, running Prisma commands as currently configured uses the transaction pooler and can encounter its prepared-statement limitation. A session-pooler diagnostic would require a **process-scoped CLI-only** `DATABASE_URL` override; changing `.env` or application runtime configuration is unnecessary and was not done.

Supabase documents transaction mode as not supporting prepared statements and recommends session mode for prepared-statement-compatible clients; its connection guide also recommends direct or session-mode connections for migration tooling. See [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres#which-connection-method-do-you-use) and [transaction pooler limitations](https://supabase.com/docs/guides/database/connecting-to-postgres#transaction-mode-limitations).

## TLS diagnostic

The session-mode endpoint was tested using PostgreSQL's SSL negotiation followed by a TLS handshake with strict certificate verification enabled and bounded connection/query timeouts. The server accepted PostgreSQL SSL negotiation, but certificate validation failed with `SELF_SIGNED_CERT_IN_CHAIN`. No SQL was sent and the connection was rejected.

This error establishes that the local TLS verifier did not accept the presented certificate chain. It does **not** establish why:

- The Supabase project CA may not be available to the current client trust configuration.
- The endpoint may be presenting a different chain than the expected Supabase chain.
- Network TLS interception cannot be ruled in or out without comparing the presented certificate chain to the project's official CA/certificate information.

The diagnostic environment had no `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `SSL_CERT_DIR`, or `PGSSLROOTCERT` override configured. This alone does not determine the contents of Node's or Windows' trusted CA stores. The peer chain could not be confirmed against an official project CA from this environment. No verification bypass was used. A separate raw-TLS probe is not appropriate for PostgreSQL endpoints because PostgreSQL first requires its SSL negotiation message; the reported result is from the PostgreSQL-aware handshake.

Supabase's [SSL enforcement and certificate verification guidance](https://supabase.com/docs/guides/platform/ssl-enforcement#a-note-about-postgres-ssl-modes) explains that `verify-full` requires the database CA certificate available from the project's Dashboard under Database Settings → SSL Configuration. The CA must be obtained and validated through the authorized Supabase project UI; do not substitute an arbitrary certificate or disable verification.

## Live database and migration status

| Check | Result |
|---|---|
| Trusted TLS connection to configured session pooler | Failed: `SELF_SIGNED_CERT_IN_CHAIN` |
| `current_database()` | Not run; connection was rejected before SQL |
| `current_schema()` | Not run |
| Connected server/endpoint identity | Not verified remotely; only configured endpoint metadata was inspected |
| Prisma migration status | Not run; no trusted database connection |
| `20261026140000_password_reset_tokens` | **Unverifiable**; local migration file exists, but remote `_prisma_migrations` could not be read |

No attempt was made to apply migrations or use the transaction pooler for a redundant status check. Local migration history is not evidence of remote migration state.

## Configuration changes

None. `.env`, Prisma CLI configuration, schema, and application runtime connection behavior remain unchanged. No tests, build, migration, provisioning, password reset, or production write was run.

## Next operator-approved action

1. An authorized Supabase project operator should retrieve the database CA certificate from **Database Settings → SSL Configuration** and confirm its authenticity/fingerprint using the project's approved channel. The database/network operator should also confirm whether TLS interception is expected on this network and whether it is presenting the expected certificate chain.
2. After the certificate is validated, configure it as trust **only for the bounded diagnostic/Prisma CLI process** using the supported client mechanism; preserve hostname and CA verification. Do not change `.env`, application runtime, or TLS verification policy.
3. Use a process-scoped override of Prisma CLI's `DATABASE_URL` to the already-configured session-mode URL, then run only bounded, read-only identity queries and the repository-pinned `prisma migrate status`. Keep passwords and connection strings out of terminal output and reports.
4. If and only if that trusted connection and identity query succeed, report the live migration state. The reset-token migration still requires separate explicit approval before any application.

## Official guidance referenced

- [Supabase: Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Postgres SSL enforcement and certificate verification](https://supabase.com/docs/guides/platform/ssl-enforcement)
