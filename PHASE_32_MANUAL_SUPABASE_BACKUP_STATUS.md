# LIFE Phase 32 — Manual Supabase Backup Status

## Outcome

**Backup not created.** Required backup tooling is not installed, and installation was not authorized. No database backup/export was started, no backup directory or file was created, and no production database write or migration was run.

## Verified local tooling/configuration

- `pg_dump`: not installed or available in `PATH`; checked common PostgreSQL installation directories.
- `pg_restore`: not installed or available in `PATH`.
- Supabase CLI: not installed or available in `PATH`.
- Windows Package Manager (`winget`) is available. Its exact PostgreSQL 17 package is version `17.11-5`, but the verified catalog installer is the full EDB PostgreSQL installer, not a client-only artifact; the official PostgreSQL Windows download page says it includes the PostgreSQL server, pgAdmin, and StackBuilder. It was not downloaded or installed because that exceeds the approved client-tools-only scope unless a verified custom-component install is confirmed.
- Current `.env` contains parseable `DIRECT_URL` on the configured session-mode pooler at port 5432, plus the transaction URL. Values and credentials were not printed.
- The previously operator-supplied CA file is present at `C:\Users\pc\Downloads\prod-ca-2021.crt`. Earlier phases validated it as a CA and used it successfully with strict hostname and certificate verification.
- The repository workspace is `C:\Users\pc\Desktop\life`; no backup file was created inside it.

Because a verified client-only distribution was not available from the checked package listing and the PostgreSQL 17.11 package is a full installer, execution stopped here. No package was downloaded or installed. No backup file size, format, or archive-integrity result exists.

## Read-only backup-scope evidence

A bounded, strict-TLS, read-only catalog inspection confirmed the connected database identity (`postgres`, schema `public`, role `postgres`) and found these non-system schemas:

`auth`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`, `storage`, `vault`.

Installed extensions include:

- `pg_stat_statements` 1.11 in `extensions`
- `pgcrypto` 1.3 in `extensions`
- `uuid-ossp` 1.1 in `extensions`
- `supabase_vault` 0.3.1 in `vault`
- PostgreSQL `plpgsql` 1.0 in `pg_catalog`

`public` contains LIFE's application tables and Supabase grants for roles such as `anon`, `authenticated`, `service_role`, and `postgres`. The LIFE application uses its own public `User` table; it does not use Supabase Auth for LIFE account passwords. A public-schema logical dump is the minimal content scope for the application tables/schema, but extension declarations, role definitions, database-level grants, and Supabase-managed schemas have separate recovery/platform considerations and must be addressed in the restore plan.

## Safe backup scope and limitations

When an authorized operator has installed approved tools, use a PostgreSQL 17 client (`pg_dump`/`pg_restore`) compatible with the verified PostgreSQL 17.11 server, or the official Supabase CLI after review. Use the existing session pooler, strict `verify-full` TLS and the validated project CA. Avoid parallel dump jobs through the session pooler.

For LIFE application recovery, create a custom-format logical dump of the `public` schema (schema and data) into an encrypted/protected location outside the repository, for example:

`%USERPROFILE%\Documents\LIFE-Backups`

Before writing, create the directory with Windows ACLs allowing only the current operator account and required administrators. Do not sync it to an unapproved cloud folder. Use an approved secret-handling method rather than placing the connection URL/password in command-line arguments, shell history, or logs. Preserve ACLs/grants in the dump unless the DBA-approved restore design explicitly handles them separately.

`pg_dump` backs up one database; it does not capture cluster-wide roles. `pg_dumpall --globals-only` is separate and can include sensitive role definitions/password verifiers, so do not generate it or export Supabase-managed roles without a reviewed platform-specific need and secure handling plan. Supabase-managed schemas (`auth`, `storage`, `realtime`, `vault`, GraphQL schemas) and their policies/objects should not be blindly restored from a generic dump into Supabase; confirm the supported procedure with Supabase documentation/support for the intended recovery scenario. Extensions are registered in `extensions`/`vault`; record their names/versions and confirm extension availability/recreation on the target. Database backups do not include Storage file contents, Edge Functions, project settings, environment secrets, API keys, or other external resources.

A successful dump plus archive listing/integrity check is not proof of restorability. Do not claim a recoverable backup until the owner completes a restore test in an already-approved isolated environment. No isolated restore environment was used or created here.

## Secrets and data protection

The backup would contain personal application data and must be treated as highly sensitive. Store it encrypted at rest, restrict NTFS access, calculate and record a SHA-256 checksum in the approved change record, and transfer/store it only through approved protected storage.

Sensitive database and Supabase secret credentials appeared in IDE-selected text in this conversation. Do not reuse those exposed values. An authorized operator should rotate the affected PostgreSQL database password and Supabase secret API key through Supabase's approved controls, update local/deployed secret stores securely, and confirm the new credentials before any future backup attempt. Publishable keys are intended for public clients; secret keys are not.

## Continuation — installer scope and credential gate

The operator approved installing PostgreSQL 17 client tools only, conditional on selecting command-line tools without the server, pgAdmin, or StackBuilder. The official EDB Windows installer documentation confirms a **Command Line Tools** component containing `pg_dump`, `pg_restore`, and related utilities, and lists the server, pgAdmin, and Stack Builder as separate selectable components. The pinned Winget catalog entry is PostgreSQL `17.11-5`; it points to the EDB installer and publishes a SHA-256 hash. However, the installer has not been downloaded or run, and no components were installed.

The operator reported that rotation of the exposed PostgreSQL password and Supabase secret API key is **not complete**. Therefore no database connection or dump may be attempted using the current `.env`. The backup remains blocked until the operator rotates both credentials and securely updates the appropriate local/deployed secret stores. No credentials were printed or changed by this work.

## Exact next steps

1. Rotate the exposed PostgreSQL database password and Supabase secret API key through the approved Supabase controls, then securely update the relevant secret stores; do not paste secrets into chat or reports.
2. After rotation is confirmed, install only the EDB PostgreSQL 17.11-5 **Command Line Tools** component using the official Windows installer. Leave PostgreSQL Server, pgAdmin 4, and Stack Builder unchecked. Verify the publisher/signature and package SHA-256 against the pinned Winget manifest before running it; do not configure or start a local PostgreSQL service.
3. Have the database owner choose the supported dump scope (at minimum `public` schema/data) and separately document handling of grants, extensions, global roles, and Supabase-managed schemas.
4. Create a timestamped backup outside the repository in an ACL-restricted, encrypted location using the session pooler and strict TLS verification.
5. Verify existence, non-zero size, archive format, and integrity using the matching `pg_restore --list`/archive check. Record a checksum without including sensitive content.
6. Test restore only in an already-approved isolated environment before calling the backup restorable.

## Not done

- No installation or system configuration change
- No backup directory/file creation or database dump
- No test restore
- No migration, schema change, seed, user/password/role/session change, or production write

Official references: [Supabase database backups](https://supabase.com/docs/guides/platform/backups), [Supabase CLI `db dump`](https://supabase.com/docs/reference/cli/supabase-db-dump), and [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html).
