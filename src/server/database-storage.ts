import type { PrismaClient } from "../../generated/prisma/client";

type StorageRepository = Pick<PrismaClient, "$queryRaw">;

export type StorageTableSize = {
  table: string;
  tableBytes: number | null;
  indexBytes: number | null;
  totalBytes: number | null;
};

export type DatabaseStorageMetrics = {
  status: "available" | "unavailable";
  measuredAt: string | null;
  source: "PostgreSQL catalog size functions" | "unavailable";
  databaseBytes: number | null;
  tables: StorageTableSize[];
  quota: { bytes: number | null; source: string | null };
  remainingBytes: number | null;
  usedPercent: number | null;
  objectStorage: { bytes: null; status: "unknown" };
  backupStorage: { bytes: null; status: "unknown" };
  warningThresholds: number[];
  warnings: number[] | null;
  warningStatus: "not-evaluated" | "ok" | "warning";
};

export type VerifiedStorageQuota = { bytes: number; source: string };

type DatabaseSizeRow = { measuredAt: Date | string; databaseBytes: bigint | number };
type TableSizeRow = {
  table: string;
  tableBytes: bigint | number;
  indexBytes: bigint | number;
  totalBytes: bigint | number;
};

const DEFAULT_WARNING_THRESHOLDS = [80, 90, 95];

export function parseStorageWarningThresholds(value: string | undefined) {
  if (!value) return DEFAULT_WARNING_THRESHOLDS;
  const parsed = value.split(",").map((part) => Number(part.trim()));
  if (parsed.length === 0 || parsed.some((threshold) => !Number.isInteger(threshold) || threshold < 1 || threshold > 100)) {
    return DEFAULT_WARNING_THRESHOLDS;
  }
  return [...new Set(parsed)].sort((left, right) => left - right);
}

function bytes(value: bigint | number) {
  const result = Number(value);
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
}

export function evaluateStorageUsage(
  databaseBytes: number | null,
  quota: VerifiedStorageQuota | null,
  warningThresholds: number[],
) {
  if (!Number.isSafeInteger(databaseBytes) || databaseBytes === null || databaseBytes < 0
    || !Number.isSafeInteger(quota?.bytes) || quota?.bytes === undefined || quota.bytes <= 0
    || !quota.source.trim()) {
    return {
      quota: { bytes: null, source: null },
      remainingBytes: null,
      usedPercent: null,
      warnings: null,
      warningStatus: "not-evaluated" as const,
    };
  }
  const usedPercent = (databaseBytes / quota.bytes) * 100;
  const warnings = warningThresholds.filter((threshold) => usedPercent >= threshold);
  return {
    quota: { bytes: quota.bytes, source: quota.source },
    remainingBytes: Math.max(0, quota.bytes - databaseBytes),
    usedPercent,
    warnings,
    warningStatus: warnings.length > 0 ? "warning" as const : "ok" as const,
  };
}

function unavailableStorage(): DatabaseStorageMetrics {
  return {
    status: "unavailable",
    measuredAt: null,
    source: "unavailable",
    databaseBytes: null,
    tables: [],
    ...evaluateStorageUsage(null, null, parseStorageWarningThresholds(process.env.LIFE_DATABASE_STORAGE_WARNING_THRESHOLDS)),
    objectStorage: { bytes: null, status: "unknown" },
    backupStorage: { bytes: null, status: "unknown" },
    warningThresholds: parseStorageWarningThresholds(process.env.LIFE_DATABASE_STORAGE_WARNING_THRESHOLDS),
  };
}

export async function measureDatabaseStorage(
  repository: StorageRepository,
  verifiedQuota: VerifiedStorageQuota | null = null,
): Promise<DatabaseStorageMetrics> {
  try {
    const [databaseRows, tableRows] = await Promise.all([
      repository.$queryRaw<DatabaseSizeRow[]>`
        SELECT statement_timestamp() AS "measuredAt",
          pg_database_size(current_database())::bigint AS "databaseBytes"
      `,
      repository.$queryRaw<TableSizeRow[]>`
        SELECT c.relname AS table,
          pg_table_size(c.oid)::bigint AS "tableBytes",
          pg_indexes_size(c.oid)::bigint AS "indexBytes",
          pg_total_relation_size(c.oid)::bigint AS "totalBytes"
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relname <> '_prisma_migrations'
        ORDER BY pg_total_relation_size(c.oid) DESC, c.relname
      `,
    ]);
    const databaseSize = databaseRows[0];
    if (!databaseSize) return unavailableStorage();

    const databaseBytes = bytes(databaseSize.databaseBytes);
    const warningThresholds = parseStorageWarningThresholds(process.env.LIFE_DATABASE_STORAGE_WARNING_THRESHOLDS);
    return {
      status: "available",
      measuredAt: new Date(databaseSize.measuredAt).toISOString(),
      source: "PostgreSQL catalog size functions",
      databaseBytes,
      tables: tableRows.map((row) => ({
        table: row.table,
        tableBytes: bytes(row.tableBytes),
        indexBytes: bytes(row.indexBytes),
        totalBytes: bytes(row.totalBytes),
      })),
      ...evaluateStorageUsage(databaseBytes, verifiedQuota, warningThresholds),
      objectStorage: { bytes: null, status: "unknown" },
      backupStorage: { bytes: null, status: "unknown" },
      warningThresholds,
    };
  } catch (error) {
    console.error("Database storage measurement failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return unavailableStorage();
  }
}
