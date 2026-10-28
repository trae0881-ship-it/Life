import type { PrismaClient } from "../../generated/prisma/client";
import {
  measureDatabaseStorage,
  parseStorageWarningThresholds,
  type DatabaseStorageMetrics,
} from "./database-storage.ts";

export const REQUIRED_MIGRATIONS = [
  "20261016000000_init",
  "20261016000001_verification_checklist",
  "20261017063800_phase4_sessions_approvals",
  "20261019120000_legal_acceptance_question_history",
  "20261019153000_optional_birth_details",
  "20261019170000_super_admin_access_audit",
  "20261026120000_super_admin_role_audit",
  "20261026130000_user_full_name",
  "20261026140000_password_reset_tokens",
  "20261026150000_blog_cms",
  "20261027111700_admin_script_manager",
  "20261027120000_api_platform",
] as const;

const SENSITIVE_TABLES = new Set([
  "User",
  "Session",
  "PasswordResetToken",
  "BirthProfile",
  "SavedChart",
  "KundliQuestion",
  "VerificationApproval",
  "SuperAdminAccessLog",
  "ApiKey",
  "ApiKeyAuditLog",
  "ApiPlatformAuditLog",
]);

export type InitializationState =
  | "connection-unavailable"
  | "schema-missing"
  | "migrations-incomplete"
  | "recovery-required"
  | "initialized"
  | "initialized-no-super-admin"
  | "empty-database"
  | "first-time-setup-required";

export type DatabaseColumn = {
  name: string;
  type: string;
  nullable: boolean;
};

export type DatabaseIndex = {
  name: string;
  definition: string;
  unique: boolean;
  valid: boolean;
};

export type DatabaseConstraint = {
  name: string;
  type: string;
  definition: string;
  validated: boolean;
};

export type DatabasePolicy = {
  name: string;
  command: string;
  permissive: boolean;
  using: string | null;
  check: string | null;
};

export type DatabaseTable = {
  name: string;
  estimatedRows: number | null;
  sensitive: boolean;
  rowLevelSecurity: boolean;
  indexes: DatabaseIndex[];
  constraints: DatabaseConstraint[];
  policies: DatabasePolicy[];
  columns: DatabaseColumn[];
};

export type DatabaseInitialization = {
  state: InitializationState;
  engine: "PostgreSQL";
  database: string | null;
  schema: string | null;
  serverVersion: string | null;
  migrations: {
    applied: number;
    expected: number;
    pending: string[];
    incomplete: string[];
  };
  application: {
    users: number | null;
    superAdmins: number | null;
  };
  storage: DatabaseStorageMetrics;
  tables: DatabaseTable[];
};

type DatabaseRepository = Pick<PrismaClient, "$queryRaw">;
type IdentityRow = { databaseName: string; schemaName: string; serverVersion: string };
type TableRow = {
  tableName: string;
  estimatedRows: bigint | number;
  rowLevelSecurity: boolean;
  indexes: DatabaseIndex[];
  constraints: DatabaseConstraint[];
  policies: DatabasePolicy[];
  columns: DatabaseColumn[];
};
type MigrationRow = { migrationName: string; finished: boolean; rolledBack: boolean };
type UserCounts = { users: bigint | number; superAdmins: bigint | number };

function unavailable(): DatabaseInitialization {
  return {
    state: "connection-unavailable",
    engine: "PostgreSQL",
    database: null,
    schema: null,
    serverVersion: null,
    migrations: {
      applied: 0,
      expected: REQUIRED_MIGRATIONS.length,
      pending: [...REQUIRED_MIGRATIONS],
      incomplete: [],
    },
    application: { users: null, superAdmins: null },
    storage: {
      status: "unavailable",
      measuredAt: null,
      source: "unavailable",
      databaseBytes: null,
      tables: [],
      quota: { bytes: null, source: null },
      remainingBytes: null,
      usedPercent: null,
      objectStorage: { bytes: null, status: "unknown" },
      backupStorage: { bytes: null, status: "unknown" },
      warningThresholds: parseStorageWarningThresholds(process.env.LIFE_DATABASE_STORAGE_WARNING_THRESHOLDS),
      warnings: null,
      warningStatus: "not-evaluated",
    },
    tables: [],
  };
}

function asCount(value: bigint | number) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function logInspectionFailure(stage: string, error: unknown) {
  console.error(`Database initialization ${stage} failed.`, {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
}

export async function inspectDatabaseInitialization(
  repository: DatabaseRepository,
): Promise<DatabaseInitialization> {
  let identity: IdentityRow[];
  try {
    identity = await repository.$queryRaw<IdentityRow[]>`
      SELECT current_database() AS "databaseName",
        current_schema() AS "schemaName",
        current_setting('server_version') AS "serverVersion"
    `;
  } catch (error) {
    logInspectionFailure("connection check", error);
    return unavailable();
  }

  try {
    const tableRows = await repository.$queryRaw<TableRow[]>`
      SELECT c.relname AS "tableName",
        c.reltuples::bigint AS "estimatedRows",
        c.relrowsecurity AS "rowLevelSecurity",
      COALESCE((
        SELECT json_agg(json_build_object(
          'name', ix.relname,
          'definition', pg_get_indexdef(i.indexrelid),
          'unique', i.indisunique,
          'valid', i.indisvalid
        ) ORDER BY ix.relname)
        FROM pg_index i
        JOIN pg_class ix ON ix.oid = i.indexrelid
        WHERE i.indrelid = c.oid
      ), '[]'::json) AS indexes,
      COALESCE((
        SELECT json_agg(json_build_object(
          'name', con.conname,
          'type', con.contype,
          'definition', pg_get_constraintdef(con.oid, true),
          'validated', con.convalidated
        ) ORDER BY con.conname)
        FROM pg_constraint con
        WHERE con.conrelid = c.oid
      ), '[]'::json) AS constraints,
      COALESCE((
        SELECT json_agg(json_build_object(
          'name', p.polname,
          'command', p.polcmd,
          'permissive', p.polpermissive,
          'using', pg_get_expr(p.polqual, p.polrelid),
          'check', pg_get_expr(p.polwithcheck, p.polrelid)
        ) ORDER BY p.polname)
        FROM pg_policy p
        WHERE p.polrelid = c.oid
      ), '[]'::json) AS policies,
      COALESCE(
          json_agg(
            json_build_object(
              'name', a.attname,
              'type', format_type(a.atttypid, a.atttypmod),
              'nullable', NOT a.attnotnull
            ) ORDER BY a.attnum
          ) FILTER (WHERE a.attnum > 0),
          '[]'::json
        ) AS columns
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attribute a ON a.attrelid = c.oid
        AND a.attnum > 0
        AND NOT a.attisdropped
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        AND c.relname <> '_prisma_migrations'
      GROUP BY c.oid, c.relname, c.reltuples
      ORDER BY c.relname
    `;

    const hasMigrationLedger = await repository.$queryRaw<{ exists: boolean }[]>`
      SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS "exists"
    `;
    const migrationRows = hasMigrationLedger[0]?.exists
      ? await repository.$queryRaw<MigrationRow[]>`
        SELECT migration_name AS "migrationName",
          finished_at IS NOT NULL AS finished,
          rolled_back_at IS NOT NULL AS "rolledBack"
        FROM public."_prisma_migrations"
      `
      : [];
    const migrationsByName = new Map(migrationRows.map((row) => [row.migrationName, row]));
    const pending = REQUIRED_MIGRATIONS.filter((name) => {
      const row = migrationsByName.get(name);
      return !row || !row.finished || row.rolledBack;
    });
    const incomplete = migrationRows
      .filter((row) => !row.finished && !row.rolledBack)
      .map((row) => row.migrationName);

    const userTable = tableRows.find((row) => row.tableName === "User");
    const hasRoleColumn = userTable?.columns.some((column) => column.name === "role") === true;
    const userCounts = userTable && hasRoleColumn
      ? await repository.$queryRaw<UserCounts[]>`
        SELECT count(*)::bigint AS users,
          count(*) FILTER (WHERE role = 'SUPER_ADMIN')::bigint AS "superAdmins"
        FROM public."User"
      `
      : [];
    const users = userCounts[0] ? asCount(userCounts[0].users) : null;
    const superAdmins = userCounts[0] ? asCount(userCounts[0].superAdmins) : null;
    const ledgerExists = hasMigrationLedger[0]?.exists === true;
    let state: InitializationState;

    if (incomplete.length > 0) {
      state = "recovery-required";
    } else if (!ledgerExists && tableRows.length === 0) {
      state = "empty-database";
    } else if (!ledgerExists || !userTable || !hasRoleColumn || users === null || superAdmins === null) {
      state = "schema-missing";
    } else if (pending.length > 0) {
      state = "migrations-incomplete";
    } else if (users === 0) {
      state = "first-time-setup-required";
    } else if (superAdmins === 0) {
      state = "initialized-no-super-admin";
    } else {
      state = "initialized";
    }

    return {
      state,
      engine: "PostgreSQL",
      database: identity[0]?.databaseName ?? null,
      schema: identity[0]?.schemaName ?? null,
      serverVersion: identity[0]?.serverVersion ?? null,
      migrations: {
        applied: REQUIRED_MIGRATIONS.filter((name) => {
          const row = migrationsByName.get(name);
          return row?.finished && !row.rolledBack;
        }).length,
        expected: REQUIRED_MIGRATIONS.length,
        pending: [...pending],
        incomplete,
      },
      application: { users, superAdmins },
      storage: await measureDatabaseStorage(repository),
      tables: tableRows.map((row) => ({
        name: row.tableName,
        estimatedRows: asCount(row.estimatedRows),
        sensitive: SENSITIVE_TABLES.has(row.tableName),
        rowLevelSecurity: row.rowLevelSecurity,
        indexes: row.indexes,
        constraints: row.constraints,
        policies: row.policies,
        columns: row.columns,
      })),
    };
  } catch (error) {
    logInspectionFailure("schema inspection", error);
    return {
      ...unavailable(),
      database: identity[0]?.databaseName ?? null,
      schema: identity[0]?.schemaName ?? null,
      serverVersion: identity[0]?.serverVersion ?? null,
    };
  }
}
