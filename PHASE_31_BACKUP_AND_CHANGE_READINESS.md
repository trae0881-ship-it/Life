# LIFE Phase 31 — Backup and Production Change Readiness

## Decision

**NO-GO for production migration-history writes at this time.**

This phase was read-only. No backup was created or verified, and no production database write or migration command was run. The Supabase CLI and an authorized Supabase Management API token were not available locally, so backup/PITR status could not be inspected programmatically. The Supabase project Dashboard was not accessible through the available tools.

## Verified evidence and unchanged scope

- Phase 28 verified the live database identity over the existing session pooler with strict TLS: database `postgres`, schema `public`, PostgreSQL `17.11`. Prisma 7.10.1 reported nine repository migrations unapplied.
- Phase 29's catalog audit found 12 of the 13 Prisma model tables, with `PasswordResetToken` absent; the first eight migrations' schema effects were already represented in the live catalog. It also found no `public._prisma_migrations` table.
- Phase 30 reviewed the same nine local migration files and prepared an eight-migration metadata-adoption plan, explicitly excluding `20261026140000_password_reset_tokens`.
- A fresh local file listing still shows those same nine migration directories. No reason was found to expand the planned scope.
- The reason Prisma migration history is absent remains unknown. No cause is inferred.
- These facts are based on the recorded read-only checks in the Phase 28 and Phase 29 reports. This phase did not repeat database queries because no application/schema change or reported database change required it.

See [Phase 28](./PHASE_28_TRUSTED_TLS_DATABASE_CHECK.md), [Phase 29](./PHASE_29_PRODUCTION_SCHEMA_SAFETY_AUDIT.md), and [Phase 30](./PHASE_30_SAFE_PRISMA_ADOPTION_PLAN.md).

## Backup/PITR status

| Evidence | Result |
|---|---|
| Current backup date / latest successful backup | **Not verified** |
| Backup retention period | **Not verified** |
| PITR enabled and available recovery interval | **Not verified** |
| Restore capability for this project | **Not verified** |
| Operator's effective permission to restore | **Not verified** |
| Independently restorable backup/rehearsal | **Not verified** |

No backup is claimed to exist. Prior general Supabase documentation says daily backups depend on plan and PITR is a separate option; generic documentation cannot establish this project's plan, configuration, actual latest backup, or restore authorization.

### Exact Dashboard checks for the authorized database owner

1. Open the existing project in Supabase Dashboard and verify the project reference and name before checking any recovery settings.
2. Open **Database → Backups** (Scheduled backups). Record the latest completed backup's timestamp, status, and type. Confirm there is at least one successful recovery point from before the planned change. If the page shows no scheduled backups, do not assume a logical export or PITR is available.
3. Record the project's plan and the actual retention window displayed for its available backups. Supabase's published plan-level maximums are not evidence of this project's actual retained backup list.
4. Open **Database → Backups → Point in Time** (PITR). Record whether PITR is enabled and the earliest/latest recovery times shown, including timezone. If disabled, do not claim point-in-time recovery is available.
5. Confirm in the organization's/project **Access Control** settings that the named change operator has the necessary project permissions to initiate an authorized restore. Supabase documents Owner and Administrator as having full access to project resources; still verify the actual operator's assigned scope and account access in the Dashboard. Restore is a separate, high-impact action and is not to be initiated as part of this phase.
6. Confirm which recovery method the owner is relying on, who can execute it, expected downtime, recovery-point loss, and the organization's incident escalation process.
7. If policy requires an independent export, make one using the approved backup procedure and secure storage, then verify it can be read/restored in an already-approved isolated environment. Do not create a database or perform a restore under this task.
8. Save non-secret evidence (project identifier, backup/recovery timestamps, retention, operator, and verification date) in the organization's approved change record. Do not include credentials, connection URLs, user data, or exported secrets.

Supabase references: [Database Backups](https://supabase.com/docs/guides/platform/backups) and [Access Control](https://supabase.com/docs/guides/platform/access-control).

## Go/no-go checklist for the first eight `migrate resolve` operations

Every item must be checked by the authorized database owner/change approver before any production metadata write:

- [ ] Correct existing Supabase project and live database identity re-confirmed immediately before the change using strict CA and hostname verification.
- [ ] Current schema still matches the Phase 29 preconditions for each of the first eight migration postconditions; no intervening schema or migration-history change.
- [ ] Current Prisma 7.10.1 `migrate status` confirms the expected state (all nine local migrations pending before adoption, with no pre-existing/partial migration records).
- [ ] A successful, appropriately recent backup or PITR recovery point is verified in the Dashboard; date/time, retention, and recovery capability are recorded.
- [ ] Restore permissions, recovery operator, expected downtime, recovery-point implications, and escalation path are verified.
- [ ] The migration SQL and Phase 30 command list are reviewed; only the first eight migration identifiers are in scope.
- [ ] The operator understands that each `prisma migrate resolve --applied <name>` **writes production migration metadata** to `public._prisma_migrations`, even though it does not replay the migration SQL.
- [ ] Explicit change approval is recorded for the eight individual metadata writes, with a stop/checkpoint after each command.
- [ ] Strict TLS remains enabled with the validated project CA; session-mode connection override is process-scoped and does not alter application runtime configuration.
- [ ] Abort and recovery ownership is clear; no one will manually delete/edit migration-history rows to undo an unexpected result.

Any unchecked item means **NO-GO**. Even with all items satisfied, these checks establish readiness only; they do not grant implicit authorization. The owner must explicitly authorize the production metadata writes before execution.

## Metadata-write and rollback warning

`prisma migrate resolve --applied` records an existing migration as applied in Prisma's migration history. It does not execute the migration SQL, but it is still a production database write. Once executed, Prisma treats that migration as applied and skips it in future deploys.

There is no guaranteed automatic rollback that safely restores the prior no-history state. A mistaken metadata adoption can require a DBA-reviewed repair, and recovery may require restoring the database from a verified backup/PITR point. A restore can cause downtime and lose changes made after the recovery point. Do not manually edit migration metadata as an improvised rollback.

## Excluded migration

`20261026140000_password_reset_tokens` remains **excluded**. Do not resolve it as applied, apply it, or run `migrate deploy` as part of this adoption decision. After any separately approved adoption of the first eight, read-only status should show only this ninth migration pending. Its later application requires separate review and explicit production approval.

## Exact operator decision required

The authorized project owner must first provide the verified backup/PITR evidence listed above and confirm the recovery operator/permissions. Then explicitly choose one of:

- **NO-GO:** defer all migration-history writes until a prerequisite is satisfied; or
- **APPROVE first-eight metadata adoption:** authorize only the eight individually listed `migrate resolve --applied` operations in Phase 30, with strict TLS and per-command review/stop conditions. This does not authorize applying the ninth migration.

Until that explicit decision and all checklist prerequisites are documented, no production write should occur.

