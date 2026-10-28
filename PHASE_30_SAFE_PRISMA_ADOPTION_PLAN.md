# LIFE Phase 30 — Safe Prisma Migration Adoption Plan

## Status and scope

This is an operator-review plan only. **No production write was authorized or performed.** No backup was created or verified by this task. No `migrate resolve`, `migrate deploy`, `db push`, or schema-changing SQL was run.

The documented PowerShell URL-preparation expression was syntax/parameter-checked locally without connecting to the database; it constructed a strict `verify-full` session URL in a process-scoped variable and did not display the value. No Prisma migration command was executed.

The Phase 29 read-only audit found 12 of 13 Prisma model tables in `public`; only `PasswordResetToken` was absent. Existing columns, enums, indexes, constraints, and foreign-key actions matched the first eight migrations' postconditions. The database did not have `public._prisma_migrations`. The reason it is absent is unknown.

## Reviewed migration order and effects

The nine SQL files were inspected in lexicographic migration order:

| Order | Migration | SQL effect | Phase 29 live catalog finding |
|---:|---|---|---|
| 1 | `20261016000000_init` | Creates schema, `UserRole`, `User`, `BirthProfile`, `SavedChart`, indexes, and foreign keys. | Objects already exist; replay conflicts. |
| 2 | `20261016000001_verification_checklist` | Creates five verification tables, primary/unique keys, indexes, and one foreign key. | Tables and objects already exist; replay conflicts. |
| 3 | `20261017063800_phase4_sessions_approvals` | Creates `Session` and `VerificationApproval`, indexes, and user foreign keys. | Objects already exist; replay conflicts. |
| 4 | `20261019120000_legal_acceptance_question_history` | Adds two `User` terms columns; creates `KundliQuestion`, indexes, and three foreign keys. | Columns and objects already exist; replay conflicts. |
| 5 | `20261019153000_optional_birth_details` | Drops `NOT NULL` on four birth fields; adds birthplace and accuracy columns. | Relaxed nullability and columns already exist; `ADD COLUMN` conflicts. |
| 6 | `20261019170000_super_admin_access_audit` | Creates audit enum and `SuperAdminAccessLog`, indexes, and restrictive actor FK. | Objects already exist; replay conflicts. |
| 7 | `20261026120000_super_admin_role_audit` | Adds two enum values; makes actor nullable; adds audit metadata and role columns. | Values and columns already exist; replay conflicts. |
| 8 | `20261026130000_user_full_name` | Adds nullable `User.fullName`. | Column already exists; replay conflicts. |
| 9 | `20261026140000_password_reset_tokens` | Creates reset-token table, indexes, and cascading user FK. | All target objects are absent; additive, but intentionally excluded from adoption. |

The SQL contains no `DROP TABLE`, `DROP COLUMN`, `DROP TYPE`, `TRUNCATE`, `DELETE`, or data-changing `UPDATE`. Foreign keys with `ON DELETE CASCADE` do affect future parent-row deletion behavior, but those constraints are already present in the live database. The first eight files are not safe to execute on this live schema because their object-creation/addition statements are unconditional. The ninth is structurally additive, but is not approved for application here.

## Proposed adoption method

Prisma documents `migrate resolve --applied <migration_name>` for baselining an existing database. It **writes migration metadata** to `public._prisma_migrations` and marks the named local migration as applied; it does not replay that migration's SQL. It is not read-only and requires explicit production change authorization.

The installed local Prisma CLI reports version **7.10.1**. Its `migrate resolve --help` confirms this syntax:

```text
prisma migrate resolve --applied <migration_name>
```

The repository's [prisma.config.ts](./prisma.config.ts) loads the datasource URL from `process.env.DATABASE_URL`. The [application Prisma client](./src/server/db.ts) also uses `DATABASE_URL`; do not edit `.env` or runtime configuration for this plan. Scope the session-pooler override to a dedicated PowerShell window/process, and keep strict TLS verification and the validated CA.

### Process-scoped session URL setup

After approval, open a dedicated PowerShell window at the project root. This expression reads the existing `.env` in a child Node process, constructs the session URL from `DIRECT_URL`, adds strict CA/hostname verification parameters, and assigns the result only to that PowerShell process environment. The URL is captured into a variable and is not printed:

```powershell
$env:DATABASE_URL = (& node --input-type=module -e "delete process.env.DATABASE_URL; delete process.env.DIRECT_URL; process.loadEnvFile('.env'); const u = new URL(process.env.DIRECT_URL); u.searchParams.set('sslmode','verify-full'); u.searchParams.set('sslrootcert','C:\\Users\\pc\\Downloads\\prod-ca-2021.crt'); u.searchParams.set('connect_timeout','8'); process.stdout.write(u.toString())")
if ($LASTEXITCODE -ne 0 -or -not $env:DATABASE_URL) { throw 'Could not prepare the scoped session-pooler connection.' }
```

Do not run `Write-Output $env:DATABASE_URL`, echo the URL, or paste it into a command transcript. The connection string contains a secret; treat the PowerShell process environment as sensitive. Close the dedicated PowerShell window after the approved operation. If the CA file path or location changes, stop and revalidate the CA through the project's approved Supabase workflow; do not remove TLS verification.

### Preflight and individual resolve commands

First, review the identity and schema audit with the database owner, verify the backup/restore prerequisites below, and obtain explicit approval for each production metadata write. Then run the read-only status command:

```powershell
.\node_modules\.bin\prisma.cmd migrate status --schema prisma\schema.prisma
```

The expected pre-adoption status is nine pending migrations, as previously observed. Stop if the target/identity differs, an unexpected migration appears, or the CLI output reports drift/connection errors.

After approval, run these **individually, in order**, checking the exit code and reviewed output after each. Each command writes one applied-migration record; none executes the migration SQL:

```powershell
.\node_modules\.bin\prisma.cmd migrate resolve --applied 20261016000000_init --schema prisma\schema.prisma
```

```powershell
.\node_modules\.bin\prisma.cmd migrate resolve --applied 20261016000001_verification_checklist --schema prisma\schema.prisma
```

```powershell
.\node_modules\.bin\prisma.cmd migrate resolve --applied 20261017063800_phase4_sessions_approvals --schema prisma\schema.prisma
```

```powershell
.\node_modules\.bin\prisma.cmd migrate resolve --applied 20261019120000_legal_acceptance_question_history --schema prisma\schema.prisma
```

```powershell
.\node_modules\.bin\prisma.cmd migrate resolve --applied 20261019153000_optional_birth_details --schema prisma\schema.prisma
```

```powershell
.\node_modules\.bin\prisma.cmd migrate resolve --applied 20261019170000_super_admin_access_audit --schema prisma\schema.prisma
```

```powershell
.\node_modules\.bin\prisma.cmd migrate resolve --applied 20261026120000_super_admin_role_audit --schema prisma\schema.prisma
```

```powershell
.\node_modules\.bin\prisma.cmd migrate resolve --applied 20261026130000_user_full_name --schema prisma\schema.prisma
```

Stop immediately on any nonzero exit, unexpected output, identity mismatch, TLS warning, or unexpected migration state. Do not run the next resolve command until the failure is understood. If a partial sequence has completed, do not try to “undo” it ad hoc; preserve logs without secrets and have the DBA/Prisma maintainer review the resulting migration table.

After all eight separately approved operations succeed, run:

```powershell
.\node_modules\.bin\prisma.cmd migrate status --schema prisma\schema.prisma
```

Expected status: the first eight migrations are recorded as applied and only `20261026140000_password_reset_tokens` remains pending. A nonzero status caused solely by that pending ninth migration is expected. If any earlier migration remains pending, status differs, or Prisma reports a failed/inconsistent migration, stop. **Do not run `migrate deploy` or resolve/apply the ninth migration as part of this plan.**

## Backup and recovery prerequisites

No backup was inspected, created, or verified in this work. Before production metadata writes, the database owner should:

1. Confirm the correct existing Supabase project and database in the Dashboard.
2. Confirm the project's current backup/PITR coverage, retention window, and point-in-time recovery capability in the Supabase Dashboard. Record the recovery point and who can initiate restoration.
3. Ensure a recent recoverable backup exists that covers both schema and application data. If policy requires an export, create it using the organization's approved PostgreSQL backup workflow with strict CA/hostname verification and protected output storage; do not put credentials in shell history, command arguments, logs, or reports.
4. Verify that recovery access and required decryption keys are available to the authorized operator. Prefer a restore rehearsal to an already-approved isolated environment if one exists; do not create another database under this task.
5. Agree on a change window, owner, monitoring, abort criteria, and communication plan. Preserve a copy of the current migration files and record the exact Prisma CLI version and target identity.

## Rollback limits

`migrate resolve --applied` is a database metadata write. It does not change application tables, but it creates/updates `_prisma_migrations` and changes Prisma's future interpretation of migration history. There is no automatic rollback that restores the previous no-history state while preserving a known-good sequence. `migrate resolve --rolled-back` marks a migration as rolled back; it does **not** undo the applied metadata operation in a general, safe way and does not reverse schema changes.

If a wrong migration is marked applied, stop and do not edit/delete `_prisma_migrations` rows manually. Recovery requires an approved Prisma/DBA repair plan, potentially restoring the pre-change database state from the verified backup. Since these operations are metadata-only but still change production, backup and recovery access are prerequisites.

## Stop conditions

Do not proceed if any of these apply:

- No explicit approval for production migration-history writes.
- Backup/PITR state or recovery operator cannot be verified.
- The connected database/project identity or strict CA/hostname verification differs from Phase 28.
- The live schema has changed since the Phase 29 audit or any expected object/constraint is missing/different.
- Existing migration history appears after fresh status, or statuses are not the expected nine pending before adoption.
- Any resolve command fails or reports an unexpected migration state.
- Prisma status after eight resolves does not leave only the password-reset migration pending.
- Anyone proposes applying migration `20261026140000_password_reset_tokens`, editing historical SQL, using `db push`, disabling TLS verification, or resetting/recreating the database in this adoption step.

## Sources

- Installed Prisma CLI 7.10.1 `migrate resolve --help` (local, exact command syntax).
- [Prisma ORM v7: Baselining a database](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining) — marks migrations already represented in an existing data-bearing database as applied and documents `migrate resolve --applied`.
- [Phase 29 production schema and data safety audit](./PHASE_29_PRODUCTION_SCHEMA_SAFETY_AUDIT.md) — live catalog evidence and migration-by-migration risk analysis.
