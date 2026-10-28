# LIFE Phase 29 — Production Schema and Data Safety Audit

## Outcome

This was a read-only audit of the existing Supabase PostgreSQL database. **No migration, seed, schema change, migration-history write, or application-data write was performed.**

The authenticated endpoint was checked over the existing session-mode pooler using the supplied project CA with strict certificate and hostname verification. Queries ran inside a read-only transaction with a 12-second statement timeout.

## Verified database facts

The live identity query returned database `postgres`, schema `public`, database role `postgres`, and PostgreSQL `17.11` through the Supabase session pooler at port 5432. The endpoint/project settings agreed with the operator-confirmed existing project. The server address returned by the pooler was IPv6.

The public catalog inventory was:

| Object kind | Live inventory |
|---|---:|
| Tables | 12 |
| Views | 0 |
| Materialized views | 0 |
| Enums | 2 |
| Indexes | 32 |
| Constraints | 22: 12 primary keys and 10 foreign keys |
| `public._prisma_migrations` | Absent |

Tables present:

`BirthProfile`, `ChecklistRequirementDefinition`, `KundliQuestion`, `SavedChart`, `Session`, `SuperAdminAccessLog`, `User`, `VerificationAcknowledgement`, `VerificationApproval`, `VerificationEvidence`, `VerificationRun`, and `VerificationStatusHistory`.

Enums:

- `UserRole`: `USER`, `DEVELOPER`, `ADMIN`, `SUPER_ADMIN`
- `SuperAdminAccessAction`: `USER_LIST_READ`, `USER_FILTERED_READ`, `USER_ROLE_CHANGED`, `BOOTSTRAP_SUPER_ADMIN`

The live columns of the 12 existing Prisma models were compared by name, scalar type, nullability, database default, and the declared `VARCHAR(500)` width against [schema.prisma](./prisma/schema.prisma). **All 104 scalar columns present in those models matched.** The only expected model table absent is `PasswordResetToken`; its six columns, three non-primary indexes, primary key, and user foreign key are absent as expected from the unapplied last migration. All 32 live index names match the migration-defined indexes for the existing 12 tables, and the catalog has the expected 12 primary keys and 10 foreign keys with the observed referential actions. No extra public tables or views were found.

### Approximate row estimates

Only `pg_stat_user_tables` estimates were read; no table rows were scanned or selected. At audit time, the estimates were 1 live / 3 dead tuples for `User`, and 0 live / 0 dead for each other public table. `last_analyze` and `last_autoanalyze` were null for all inspected tables. These statistics are unrefreshed and may be stale; **they do not establish that any table is empty or give exact counts.** No user data was accessed.

## Migration-by-migration safety matrix

The migrations are listed in lexicographic/chronological order. “Blocked” means do not replay as SQL against the current database; the live catalog already contains the named objects or alterations. “Safe after baseline” describes structural safety only and does not authorize application.

| Migration | Intended schema change | Safety classification | Evidence and risk |
|---|---|---|---|
| `20261016000000_init` | Creates `public`, `UserRole`, `User`, `BirthProfile`, `SavedChart`, their indexes and foreign keys. | **Blocked pending migration-history adoption** | `UserRole` and all three tables/indexes/constraints already exist. The type and tables are created without `IF NOT EXISTS`; replay will fail on duplicate objects. It contains no data-copy or destructive statement. |
| `20261016000001_verification_checklist` | Creates five verification tables, indexes, primary/unique keys, and the evidence-to-run cascading foreign key. | **Blocked pending migration-history adoption** | All five tables and their indexes/keys are present. Unconditional `CREATE TABLE` statements would conflict. Cascading deletion from a run to its evidence is already part of the live schema. |
| `20261017063800_phase4_sessions_approvals` | Creates `Session` and `VerificationApproval`, their indexes and user foreign keys. | **Blocked pending migration-history adoption** | Both tables, indexes, and cascading user references already exist. Replay would duplicate tables/indexes. |
| `20261019120000_legal_acceptance_question_history` | Adds `termsVersion` and `termsAcceptedAt` to `User`; creates `KundliQuestion`, indexes, and three foreign keys. | **Blocked pending migration-history adoption** | Both user columns and `KundliQuestion` objects already exist. Unconditional additions/creation conflict. Foreign keys include cascade on user deletion and set-null behavior for optional profile/chart references. |
| `20261019153000_optional_birth_details` | Drops `NOT NULL` from four birth-detail columns and adds `birthPlace` and `birthTimeAccuracy`. | **Blocked pending migration-history adoption** | Live nullability already matches the relaxed state, and both added columns already exist. Replaying the `ADD COLUMN` operations fails on duplicate columns; `DROP NOT NULL` is a relaxation, not a data deletion. |
| `20261019170000_super_admin_access_audit` | Creates `SuperAdminAccessAction` with two initial labels and `SuperAdminAccessLog`, indexes, and a restrictive user foreign key. | **Blocked pending migration-history adoption** | The enum/table/indexes/foreign key exist. Unconditional type/table creation conflicts. The later migration makes `actorUserId` nullable; the live column is nullable. The FK’s `ON DELETE RESTRICT` behavior is present. |
| `20261026120000_super_admin_role_audit` | Adds two enum labels; makes `actorUserId` nullable; adds actor label, target user, and from/to role audit columns. | **Blocked pending migration-history adoption** | Both enum labels and all columns already exist; actor nullability is already relaxed. Duplicate enum labels and `ADD COLUMN` operations prevent replay. |
| `20261026130000_user_full_name` | Adds nullable `User.fullName`. | **Blocked pending migration-history adoption** | `User.fullName` exists with matching type and nullability. Replay fails on duplicate column. |
| `20261026140000_password_reset_tokens` | Adds `PasswordResetToken`, a unique token-hash index, two lookup indexes, and cascading foreign key to `User`. | **Safe as an additive change after migration-history adoption; blocked to run now** | The table and all named indexes/constraints are absent; the referenced `User.id` is present and compatible. SQL contains no data rewrite or destructive operation. A normal `migrate deploy` is not safe while earlier migrations remain pending, because it will attempt the first conflicting migration first. |

### Destructive and operational-risk review

- No local migration contains `DROP TABLE`, `DROP COLUMN`, `DROP TYPE`, `TRUNCATE`, `DELETE`, or data-changing `UPDATE`.
- The `DROP NOT NULL` in the optional-birth-details migration relaxes constraints; the live database already reflects that state.
- Several foreign keys use `ON DELETE CASCADE`. This does not delete data during migration, but deletes of referenced parent rows in normal future operation will cascade. The live database already has these rules.
- Replaying migrations that create existing objects will fail; do not make old migrations “idempotent” by editing their historical SQL merely to force them through.
- Creating indexes and validating foreign keys on non-empty production tables can add locks and load. The reset-token migration creates its indexes on a new table, but it still requires an approved maintenance/change process.
- No migration assumes the database is empty in a safe-to-run sense; the first migration unconditionally creates an enum and tables and is incompatible with the observed existing schema.

## Migration-history absence

The catalog returned `NULL` for `to_regclass('public._prisma_migrations')`; Prisma 7.10.1 `migrate status` previously reported all nine repository migrations as unapplied. These observations establish that this database currently has no Prisma migration-history table and that Prisma cannot associate its existing schema with the local migration sequence.

**The reason the table is absent is unknown.** The audit did not inspect deployment histories or administrative logs. The database may have been provisioned outside Prisma Migrate, managed through another workflow, or have had migration metadata removed; these are possibilities, not verified causes.

Prisma documents baselining for an existing database that must retain its data. Its baseline workflow records an already-existing schema as applied rather than replaying the initial `CREATE` statements. See [Prisma ORM v7: Baselining a database](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining). No baseline or migration-resolution command was run in this audit.

## Recommended safe adoption plan

1. **Do not run `prisma migrate deploy` in the present state.** It would start with `20261016000000_init`, whose enum and tables already exist.
2. Have the database owner verify a restorable backup and approve a maintenance/change window. Preserve the current schema and data; do not reset or recreate the database.
3. In a reviewed change, prepare a baseline/adoption plan. The catalog evidence shows the postconditions of the first eight local migrations are already represented in the live schema, while the password-reset table from migration nine is absent. A conservative path is to record migrations `20261016000000_init` through `20261026130000_user_full_name` as already applied using the pinned Prisma CLI's documented `migrate resolve --applied <migration_name>` workflow, one by one, after reviewing the exact live-schema comparison. This creates/updates migration metadata but does not execute those historical SQL files. It is a production write and was **not** performed here.
4. Re-run read-only `prisma migrate status`; require that only `20261026140000_password_reset_tokens` is pending. Stop if any other migration appears pending or if schema drift is reported.
5. Review the additive password-reset migration, operational impact, backup/restore plan, and provider readiness. Apply it only after separate explicit production approval; this audit does not grant that approval.
6. After an approved change, re-run read-only catalog comparison and Prisma status. Do not test by creating/resetting a real account or sending an email to a real user without separate authorization.

An alternative canonical single-baseline approach would require restructuring/archiving the existing migration directory and coordinating all development environments. Prefer not to rewrite migration history casually; choose that approach only if maintainers explicitly decide to standardize the repository around a new baseline.

## Not performed

- No migration or `migrate resolve` command
- No creation of `_prisma_migrations`
- No `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, seed, or scan of application table rows
- No production account, password, role, or session changes
- No environment/configuration changes
