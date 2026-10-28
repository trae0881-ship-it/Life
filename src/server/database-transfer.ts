import type { Prisma, PrismaClient } from "../../generated/prisma/client";

const MAX_EXPORT_BYTES = 100 * 1024 * 1024;
const MAX_EXPORT_ROWS = 100_000;
const EXPORT_PAGE_SIZE = 250;
const MAX_EXPORT_DURATION_MS = 15 * 60 * 1000;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_ROWS = 10_000;
const MAX_IMPORT_LINE_BYTES = 256 * 1024;

const NEVER_EXPORT_TABLES = new Set([
  "_prisma_migrations",
  "Session",
  "PasswordResetToken",
  "ManagedScript",
  "ManagedScriptAuditLog",
  "ApiKeyAuditLog",
  "ApiPlatformAuditLog",
  "SuperAdminAccessLog",
  "VerificationRun",
  "VerificationEvidence",
  "VerificationAcknowledgement",
  "VerificationStatusHistory",
]);

const SENSITIVE_TABLES = new Set([
  "User",
  "BirthProfile",
  "SavedChart",
  "KundliQuestion",
  "VerificationApproval",
  "ApiKey",
  "ApiAccountGrant",
  "ApiAdminPermission",
  "ApiAccountUsageWindow",
  "ApiKeyUsageWindow",
]);

const NEVER_EXPORT_COLUMN = /password|token|digest|hash|secret|pepper|credential|private.?key|api.?key|access.?key|session|reset|bearer|cookie|authorization|salt|otp|totp|mfa/i;

type Column = {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  generated: boolean;
};

type ForeignKey = {
  name: string;
  referencedTable: string;
  columns: Array<{ name: string; referencedName: string }>;
};

type TableSchema = {
  name: string;
  columns: Column[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
  uniqueKeys: string[][];
  rowLevelSecurity: boolean;
};

type TransferExecutor = Prisma.TransactionClient;

export type DatabaseExportOptions = {
  tables: string[];
  format: "csv" | "jsonl";
  includeSensitive: boolean;
};

export type ImportPreview = {
  compatible: boolean;
  targetDatabase: string;
  table: string | null;
  rows: number;
  columns: string[];
  issues: string[];
};

export function isDatabaseImportCommitEnabled(nodeEnvironment: string | undefined, setting: string | undefined) {
  return (nodeEnvironment === "development" || nodeEnvironment === "test") && setting === "true";
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function safeFilename(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "table";
}

function jsonValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonValue(item)]));
  }
  return value;
}

function exportValue(value: unknown, column: Column) {
  if (column.type === "date" && value instanceof Date) return value.toISOString().slice(0, 10);
  return jsonValue(value);
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "\\N";
  const normalized = jsonValue(value);
  let text = typeof normalized === "string" ? normalized : JSON.stringify(normalized);
  if (typeof normalized === "string" && /^[\s\u0000-\u001f]*[=+\-@]/.test(normalized)) {
    text = `'${text}`;
  }
  const escaped = text === "\\N" ? "\\\\N" : text;
  return /[",\r\n]/.test(escaped) ? `"${escaped.replaceAll('"', '""')}"` : escaped;
}

function includedColumns(schema: TableSchema) {
  return schema.columns.filter((column) => !column.generated && !NEVER_EXPORT_COLUMN.test(column.name));
}

function isNeverExportTable(table: string) {
  return NEVER_EXPORT_TABLES.has(table) || table.startsWith("_") || table.startsWith("pg_");
}

async function getDatabaseName(repository: TransferExecutor) {
  const rows = await repository.$queryRawUnsafe<Array<{ databaseName: string }>>(
    'SELECT current_database() AS "databaseName"',
  );
  const name = rows[0]?.databaseName;
  if (!name || name.length > 63) throw new Error("Database identity could not be verified.");
  return name;
}

async function getTableSchema(repository: TransferExecutor, table: string): Promise<TableSchema | null> {
  const baseRows = await repository.$queryRawUnsafe<Array<{
    tableName: string;
    rowLevelSecurity: boolean;
  }>>(
    `SELECT c.relname AS "tableName", c.relrowsecurity AS "rowLevelSecurity"
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = $1 AND c.relkind IN ('r', 'p')`,
    table,
  );
  if (!baseRows[0]) return null;

  const [columns, primaryKey, uniqueRows, foreignKeyRows] = await Promise.all([
    repository.$queryRawUnsafe<Array<{
      name: string;
      type: string;
      nullable: boolean;
      defaultValue: string | null;
      generated: boolean;
    }>>(
      `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type,
        NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "defaultValue",
        a.attgenerated <> '' OR a.attidentity <> '' AS generated
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
       WHERE n.nspname = 'public' AND c.relname = $1
         AND a.attnum > 0 AND NOT a.attisdropped
       ORDER BY a.attnum`,
      table,
    ),
    repository.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT a.attname AS name
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
       WHERE n.nspname = 'public' AND c.relname = $1 AND i.indisprimary
         AND k.ord <= i.indnkeyatts
       ORDER BY k.ord`,
      table,
    ),
    repository.$queryRawUnsafe<Array<{ columns: string[] }>>(
      `SELECT array_agg(a.attname ORDER BY k.ord) AS columns
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
       WHERE n.nspname = 'public' AND c.relname = $1 AND i.indisunique
         AND k.ord <= i.indnkeyatts
         AND i.indpred IS NULL AND i.indexprs IS NULL
       GROUP BY i.indexrelid`,
      table,
    ),
    repository.$queryRawUnsafe<Array<{
      name: string;
      referencedTable: string;
      columns: Array<{ name: string; referencedName: string }>;
    }>>(
      `SELECT con.conname AS name, target.relname AS "referencedTable",
        json_agg(json_build_object('name', sourceAttribute.attname,
          'referencedName', targetAttribute.attname) ORDER BY sourceKey.ord) AS columns
       FROM pg_constraint con
       JOIN pg_class source ON source.oid = con.conrelid
       JOIN pg_namespace sourceSchema ON sourceSchema.oid = source.relnamespace
       JOIN pg_class target ON target.oid = con.confrelid
       JOIN unnest(con.conkey) WITH ORDINALITY AS sourceKey(attnum, ord) ON true
       JOIN unnest(con.confkey) WITH ORDINALITY AS targetKey(attnum, ord)
         ON targetKey.ord = sourceKey.ord
       JOIN pg_attribute sourceAttribute ON sourceAttribute.attrelid = source.oid
         AND sourceAttribute.attnum = sourceKey.attnum
       JOIN pg_attribute targetAttribute ON targetAttribute.attrelid = target.oid
         AND targetAttribute.attnum = targetKey.attnum
       WHERE sourceSchema.nspname = 'public' AND source.relname = $1
         AND con.contype = 'f'
       GROUP BY con.conname, target.relname`,
      table,
    ),
  ]);
  return {
    name: table,
    columns,
    primaryKey: primaryKey.map((column) => column.name),
    uniqueKeys: uniqueRows.map((row) => row.columns),
    foreignKeys: foreignKeyRows,
    rowLevelSecurity: baseRows[0].rowLevelSecurity,
  };
}

async function writeAudit(
  repository: PrismaClient,
  actorUserId: string,
  action: string,
  targetId: string,
  details: Record<string, string | number | boolean | string[]>,
) {
  await repository.apiPlatformAuditLog.create({
    data: {
      actorUserId,
      action,
      targetType: "DATABASE_TRANSFER",
      targetId: targetId.slice(0, 120),
      details,
    },
  });
}

function allowedExportColumns(schema: TableSchema) {
  const columns = includedColumns(schema);
  if (columns.length === 0) throw new Error("No non-secret columns are available for this table.");
  if (columns.some((column) => column.type === "bytea")) {
    throw new Error("Binary columns are not supported by portable database exports.");
  }
  return columns;
}

async function readPage(
  repository: TransferExecutor,
  schema: TableSchema,
  columns: Column[],
  offset: number,
) {
  const orderBy = schema.primaryKey.length
    ? ` ORDER BY ${schema.primaryKey.map(quoteIdentifier).join(", ")}`
    : "";
  const selected = columns.map((column) => quoteIdentifier(column.name)).join(", ");
  return repository.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT ${selected} FROM public.${quoteIdentifier(schema.name)}${orderBy} LIMIT $1 OFFSET $2`,
    EXPORT_PAGE_SIZE,
    offset,
  );
}

export async function createDatabaseExportResponse(
  repository: PrismaClient,
  actorUserId: string,
  options: DatabaseExportOptions,
) {
  const selected = [...new Set(options.tables)];
  if (selected.length === 0 || selected.length > 100
    || selected.some((table) => !/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(table) || isNeverExportTable(table))
    || (options.format !== "csv" && options.format !== "jsonl")
    || (options.format === "csv" && selected.length !== 1)) {
    return Response.json({ error: "Export selection or format is invalid.", code: "INVALID_EXPORT" }, { status: 400 });
  }

  let schemas: TableSchema[];
  try {
    schemas = [];
    for (const table of selected) {
      const schema = await getTableSchema(repository, table);
      if (!schema) return Response.json({ error: "A selected table is unavailable.", code: "TABLE_NOT_FOUND" }, { status: 404 });
      if (SENSITIVE_TABLES.has(table) && !options.includeSensitive) {
        return Response.json({ error: "Sensitive table export requires explicit confirmation.", code: "SENSITIVE_CONFIRMATION_REQUIRED" }, { status: 403 });
      }
      if (schema.rowLevelSecurity) {
        return Response.json({ error: "Tables protected by row-level security cannot be exported through this workflow.", code: "RLS_TABLE_UNSUPPORTED" }, { status: 409 });
      }
      allowedExportColumns(schema);
      schemas.push(schema);
    }
    await writeAudit(repository, actorUserId, "DATABASE_EXPORT_STARTED", "MULTIPLE", {
      format: options.format,
      tables: selected,
      includeSensitive: options.includeSensitive,
    });
  } catch (error) {
    console.error("Database export could not be prepared.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Database export could not be prepared.", code: "EXPORT_UNAVAILABLE" }, { status: 503 });
  }

  const filename = `life-database-${selected.length === 1 ? safeFilename(selected[0]) : "tables"}-${new Date().toISOString().replaceAll(":", "-")}.${options.format}`;
  const expiresAt = Date.now() + MAX_EXPORT_DURATION_MS;
  let offset = 0;
  let tableIndex = 0;
  let exportedRows = 0;
  let exportedBytes = 0;
  let ended = false;
  let expirationTimer: ReturnType<typeof setTimeout> | null = null;
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  const emit = (text: string) => {
    const bytes = encoder.encode(text);
    exportedBytes += bytes.byteLength;
    if (exportedBytes > MAX_EXPORT_BYTES) throw new Error("Export exceeded the configured size limit.");
    streamController.enqueue(bytes);
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      if (options.format === "jsonl") {
        emit(`${JSON.stringify({
          _lifeExport: {
            format: "life-jsonl-v1",
            createdAt: new Date().toISOString(),
            tables: schemas.map((schema) => ({
              name: schema.name,
              columns: allowedExportColumns(schema).map(({ name, type, nullable }) => ({ name, type, nullable })),
            })),
          },
        })}\n`);
      } else {
        emit(`${allowedExportColumns(schemas[0]).map((column) => csvCell(column.name)).join(",")}\r\n`);
      }
      expirationTimer = setTimeout(() => {
        if (ended) return;
        ended = true;
        controller.error(new Error("Database export stream expired."));
        void writeAudit(repository, actorUserId, "DATABASE_EXPORT_FAILED", "MULTIPLE", {
          format: options.format,
          tables: selected,
          rows: exportedRows,
        }).catch((auditError: unknown) => {
          console.error("Expired database export audit could not be recorded.", {
            errorType: auditError instanceof Error ? auditError.name : "UnknownError",
          });
        });
      }, Math.max(0, expiresAt - Date.now()));
      expirationTimer.unref();
    },
    async pull(controller) {
      if (ended) return;
      try {
        while (true) {
          if (Date.now() >= expiresAt) throw new Error("Database export stream expired.");
          const schema = schemas[tableIndex];
          if (!schema) {
            ended = true;
            if (expirationTimer) clearTimeout(expirationTimer);
            await writeAudit(repository, actorUserId, "DATABASE_EXPORT_COMPLETED", "MULTIPLE", {
              format: options.format,
              tables: selected,
              rows: exportedRows,
              bytes: exportedBytes,
            });
            controller.close();
            return;
          }
          const columns = allowedExportColumns(schema);
          const rows = await readPage(repository, schema, columns, offset);
          if (ended) return;
          if (rows.length === 0) {
            tableIndex += 1;
            offset = 0;
            continue;
          }
          for (const row of rows) {
            if (ended) return;
            if (exportedRows >= MAX_EXPORT_ROWS) throw new Error("Export exceeded the configured row limit.");
            const safeRow = Object.fromEntries(columns.map((column) => [column.name, exportValue(row[column.name], column)]));
            emit(options.format === "csv"
              ? `${columns.map((column) => csvCell(exportValue(row[column.name], column))).join(",")}\r\n`
              : `${JSON.stringify({ _table: schema.name, row: safeRow })}\n`);
            exportedRows += 1;
          }
          offset += rows.length;
          return;
        }
      } catch (error) {
        if (ended) return;
        ended = true;
        if (expirationTimer) clearTimeout(expirationTimer);
        console.error("Database export stream failed.", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        await writeAudit(repository, actorUserId, "DATABASE_EXPORT_FAILED", "MULTIPLE", {
          format: options.format,
          tables: selected,
          rows: exportedRows,
        }).catch((auditError: unknown) => {
          console.error("Database export failure audit could not be recorded.", {
            errorType: auditError instanceof Error ? auditError.name : "UnknownError",
          });
        });
        controller.error(new Error("Database export failed."));
      }
    },
    async cancel() {
      if (ended) return;
      ended = true;
      if (expirationTimer) clearTimeout(expirationTimer);
      await writeAudit(repository, actorUserId, "DATABASE_EXPORT_CANCELLED", "MULTIPLE", {
        format: options.format,
        tables: selected,
        rows: exportedRows,
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": options.format === "csv" ? "text/csv; charset=utf-8" : "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Transfer-Expires-At": new Date(expiresAt).toISOString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

type ImportDocument = {
  _lifeExport?: {
    format?: string;
    tables?: Array<{ name?: string; columns?: Array<{ name?: string; type?: string; nullable?: boolean }> }>;
  };
  _table?: string;
  row?: Record<string, unknown>;
};

export class DatabaseTransferInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseTransferInputError";
  }
}

function supportedImportType(type: string) {
  return /^(text|character varying|character|boolean|smallint|integer|bigint|real|double precision|numeric(?:\(\d+(?:,\s*\d+)?\))?|date|uuid|json|jsonb|timestamp(?:\(\d+\))? without time zone|timestamp(?:\(\d+\))? with time zone)$/.test(type);
}

function validateScalar(value: unknown, column: Column) {
  if (value === null) return column.nullable ? null : `${column.name} cannot be null.`;
  if (column.type === "json" || column.type === "jsonb") {
    return value !== undefined ? null : `${column.name} is missing.`;
  }
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return `${column.name} must be a scalar value.`;
  }
  if (["smallint", "integer", "bigint"].includes(column.type)) {
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isSafeInteger(number)) return `${column.name} must be a safe integer.`;
  } else if (["real", "double precision", "numeric"].includes(column.type) || column.type.startsWith("numeric(")) {
    if (value === "" || !Number.isFinite(Number(value))) return `${column.name} must be numeric.`;
  } else if (column.type === "boolean" && typeof value !== "boolean") {
    return `${column.name} must be boolean.`;
  } else if (column.type === "date" && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)))) {
    return `${column.name} must be an ISO date.`;
  } else if (column.type.startsWith("timestamp") && (typeof value !== "string" || !Number.isFinite(Date.parse(value)))) {
    return `${column.name} must be an ISO timestamp.`;
  } else if ((column.type === "text" || column.type === "character varying" || column.type === "character") && typeof value !== "string") {
    return `${column.name} must be text.`;
  }
  return null;
}

function parseImportDocument(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_IMPORT_BYTES) throw new DatabaseTransferInputError("Import file exceeds the 10 MiB size limit.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DatabaseTransferInputError("Import file must be valid UTF-8 JSONL.");
  }
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length < 2 || lines.length - 1 > MAX_IMPORT_ROWS) throw new DatabaseTransferInputError("Import must contain a header and at most 10,000 rows.");
  if (lines.some((line) => Buffer.byteLength(line, "utf8") > MAX_IMPORT_LINE_BYTES)) {
    throw new DatabaseTransferInputError("An import line exceeds the 256 KiB line limit.");
  }
  let header: ImportDocument;
  const rows: ImportDocument[] = [];
  try {
    header = JSON.parse(lines[0]) as ImportDocument;
    for (const line of lines.slice(1)) rows.push(JSON.parse(line) as ImportDocument);
  } catch {
    throw new DatabaseTransferInputError("Import file is malformed JSONL.");
  }
  return { header, rows };
}

async function validateImport(
  repository: TransferExecutor,
  bytes: Uint8Array,
): Promise<{ preview: ImportPreview; schema: TableSchema | null; rows: Record<string, unknown>[] }> {
  const parsed = parseImportDocument(bytes);
  const issues: string[] = [];
  const tables = parsed.header?._lifeExport?.tables;
  if (parsed.header?._lifeExport?.format !== "life-jsonl-v1" || !Array.isArray(tables) || tables.length !== 1) {
    issues.push("Only a single-table LIFE JSONL export can be imported.");
  }
  const table = tables?.[0]?.name ?? null;
  if (!table || !/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(table) || isNeverExportTable(table) || SENSITIVE_TABLES.has(table)) {
    issues.push("The selected table is not eligible for import.");
  }
  const schema = table && issues.length === 0 ? await getTableSchema(repository, table) : null;
  if (table && !schema) issues.push("The target table does not exist in the current public schema.");
  const declaredColumns = tables?.[0]?.columns ?? [];
  if (schema && declaredColumns.length !== includedColumns(schema).length) {
    issues.push("Source and target column sets do not match.");
  }
  if (schema) {
    for (const declared of declaredColumns) {
      const current = schema.columns.find((column) => column.name === declared.name);
      if (!current || current.type !== declared.type || current.nullable !== declared.nullable) {
        issues.push(`Column compatibility mismatch: ${declared.name ?? "unknown"}.`);
      } else if (!supportedImportType(current.type)) {
        issues.push(`Unsupported PostgreSQL target type for ${current.name}: ${current.type}.`);
      }
    }
    for (const column of schema.columns) {
      if (column.generated) continue;
      if (!column.nullable && !column.defaultValue && !declaredColumns.some((item) => item.name === column.name)) {
        issues.push(NEVER_EXPORT_COLUMN.test(column.name)
          ? `Required secret-like target column is excluded: ${column.name}.`
          : `Required target column is missing: ${column.name}.`);
      }
    }
    if (!schema.primaryKey.length) issues.push("Target table has no primary key; no-overwrite validation is unavailable.");
    if (schema.rowLevelSecurity) issues.push("Row-level-security tables are not supported by the import workflow.");
    if (schema.foreignKeys.some((key) => key.columns.some(({ name }) => NEVER_EXPORT_COLUMN.test(name)))) {
      issues.push("A foreign-key column is sensitive and cannot be imported.");
    }
  }
  const rowValues: Record<string, unknown>[] = [];
  if (schema && issues.length === 0) {
    const columns = includedColumns(schema);
    const duplicateKeys = new Set<string>();
    const uniqueValues = schema.uniqueKeys.map(() => new Set<string>());
    for (let index = 0; index < parsed.rows.length; index += 1) {
      const document = parsed.rows[index];
      if (document._table !== table || !document.row || typeof document.row !== "object" || Array.isArray(document.row)) {
        issues.push(`Row ${index + 1} has an invalid table or row shape.`);
        continue;
      }
      const row = document.row;
      const rowKeys = Object.keys(row);
      if (rowKeys.length !== columns.length
        || rowKeys.some((key) => !columns.some((column) => column.name === key))
        || columns.some((column) => !Object.hasOwn(row, column.name))) {
        issues.push(`Row ${index + 1} has missing or unknown columns.`);
        continue;
      }
      const rowErrors = columns.map((column) => validateScalar(row[column.name], column)).filter(Boolean);
      if (rowErrors.length) {
        issues.push(`Row ${index + 1}: ${rowErrors.join(" ")}`);
        continue;
      }
      const primary = JSON.stringify(schema.primaryKey.map((column) => row[column]));
      if (duplicateKeys.has(primary)) issues.push(`Duplicate primary key in uploaded rows at row ${index + 1}.`);
      duplicateKeys.add(primary);
      schema.uniqueKeys.forEach((key, keyIndex) => {
        const values = key.map((column) => row[column]);
        if (values.some((value) => value === null || value === undefined)) return;
        const canonical = JSON.stringify(values);
        if (uniqueValues[keyIndex].has(canonical)) issues.push(`Duplicate unique key in uploaded rows at row ${index + 1}.`);
        uniqueValues[keyIndex].add(canonical);
      });
      rowValues.push(row);
    }
    if (schema.columns.some((column) => column.type === "bytea" || column.type.endsWith("[]"))) {
      issues.push("Binary and array columns require database-specific conversion and are unsupported.");
    }
    if (schema.foreignKeys.length && rowValues.length > 0) {
      const fkIssues = await validateForeignKeys(repository, schema, rowValues);
      issues.push(...fkIssues);
    }
    if (schema.primaryKey.length) {
      const countRows = await repository.$queryRawUnsafe<Array<{ count: bigint | number }>>(
        `SELECT count(*)::bigint AS count FROM public.${quoteIdentifier(schema.name)}`,
      );
      if (Number(countRows[0]?.count ?? 0) !== 0) {
        issues.push("Target table is not empty. Imports never overwrite or merge existing rows.");
      }
    }
  }
  let targetDatabase = "unavailable";
  try {
    targetDatabase = await getDatabaseName(repository);
  } catch {
    issues.push("The target database identity could not be verified.");
  }
  return {
    preview: {
      compatible: issues.length === 0,
      targetDatabase,
      table,
      rows: parsed.rows.length,
      columns: declaredColumns.map((column) => column.name ?? ""),
      issues: [...new Set(issues)],
    },
    schema,
    rows: rowValues,
  };
}

async function validateForeignKeys(repository: TransferExecutor, schema: TableSchema, rows: Record<string, unknown>[]) {
  const issues: string[] = [];
  for (const key of schema.foreignKeys) {
    const references = new Map<string, unknown[]>();
    for (const row of rows) {
      const values = key.columns.map(({ name }) => row[name]);
      if (values.every((value) => value === null || value === undefined)) continue;
      if (values.some((value) => value === null || value === undefined)) {
        issues.push(`Foreign key ${key.name} has a partially null value.`);
        continue;
      }
      references.set(JSON.stringify(values), values);
    }

    const entries = [...references.values()];
    for (let offset = 0; offset < entries.length; offset += 200) {
      const batch = entries.slice(offset, offset + 200);
      const parameters: unknown[] = [];
      const valueRows = batch.map((values, rowIndex) => {
        const row = values.map((value) => {
          parameters.push(value);
          return `$${parameters.length}`;
        });
        return `(${offset + rowIndex}::integer, ${row.join(", ")})`;
      });
      const incomingColumns = [
        `"ord"`,
        ...key.columns.map((column) => quoteIdentifier(column.name)),
      ].join(", ");
      const predicates = key.columns.map((column) =>
        `target.${quoteIdentifier(column.referencedName)} = incoming.${quoteIdentifier(column.name)}`,
      ).join(" AND ");
      const missing = await repository.$queryRawUnsafe<Array<{ ord: number }>>(
        `SELECT incoming."ord" AS "ord"
         FROM (VALUES ${valueRows.join(", ")}) AS incoming(${incomingColumns})
         WHERE NOT EXISTS (
           SELECT 1 FROM public.${quoteIdentifier(key.referencedTable)} AS target
           WHERE ${predicates}
         )`,
        ...parameters,
      );
      if (missing.length) {
        issues.push(`Foreign key ${key.name} references missing target rows.`);
        break;
      }
    }
  }
  return [...new Set(issues)];
}

export async function previewDatabaseImport(repository: PrismaClient, bytes: Uint8Array) {
  return validateImport(repository, bytes);
}

export async function commitDatabaseImport(
  repository: PrismaClient,
  actorUserId: string,
  bytes: Uint8Array,
  confirmedDatabase: string,
) {
  const validation = await validateImport(repository, bytes);
  const { preview, schema, rows } = validation;
  if (!preview.compatible || !schema || !preview.targetDatabase || confirmedDatabase !== preview.targetDatabase) {
    return { committed: false, preview };
  }
  const columnNames = includedColumns(schema).map((column) => column.name);
  const placeholders = columnNames.map((name, index) => {
    const column = schema.columns.find((candidate) => candidate.name === name);
    const placeholder = `$${index + 1}`;
    return column?.type === "json" || column?.type === "jsonb" ? `${placeholder}::${column.type}` : placeholder;
  });
  const query = `INSERT INTO public.${quoteIdentifier(schema.name)} (${columnNames.map(quoteIdentifier).join(", ")})
    VALUES `;
  await writeAudit(repository, actorUserId, "DATABASE_IMPORT_STARTED", schema.name, {
    format: "life-jsonl-v1",
    tables: [schema.name],
    rows: rows.length,
  });
  try {
    await repository.$transaction(async (transaction) => {
      const executor = transaction;
      await executor.$executeRawUnsafe(
        `LOCK TABLE public.${quoteIdentifier(schema.name)} IN SHARE ROW EXCLUSIVE MODE`,
      );
      const currentCount = await executor.$queryRawUnsafe<Array<{ count: bigint | number }>>(
        `SELECT count(*)::bigint AS count FROM public.${quoteIdentifier(schema.name)}`,
      );
      if (Number(currentCount[0]?.count ?? 0) !== 0) throw new Error("Import target changed after validation.");
      const batchSize = Math.max(1, Math.min(250, Math.floor(60_000 / Math.max(1, columnNames.length))));
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize);
        const values: unknown[] = [];
        const valueRows = batch.map((row) => {
          const rowPlaceholders = columnNames.map((name) => {
            const column = schema.columns.find((candidate) => candidate.name === name);
            const value = row[name];
            values.push(column?.type === "json" || column?.type === "jsonb"
              ? JSON.stringify(value)
              : value);
            const parameter = `$${values.length}`;
            return column?.type === "json" || column?.type === "jsonb"
              ? `${parameter}::${column.type}`
              : parameter;
          });
          return `(${rowPlaceholders.join(", ")})`;
        });
        await executor.$executeRawUnsafe(`${query}${valueRows.join(", ")}`, ...values);
      }
      await executor.apiPlatformAuditLog.create({
        data: {
          actorUserId,
          action: "DATABASE_IMPORT_COMPLETED",
          targetType: "DATABASE_TRANSFER",
          targetId: schema.name.slice(0, 120),
          details: {
            format: "life-jsonl-v1",
            tables: [schema.name],
            rows: rows.length,
          },
        },
      });
    });
    return { committed: true, preview };
  } catch (error) {
    console.error("Database import failed and its transaction was rolled back.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    await writeAudit(repository, actorUserId, "DATABASE_IMPORT_FAILED", schema.name, {
      format: "life-jsonl-v1",
      tables: [schema.name],
      rows: rows.length,
    });
    return {
      committed: false,
      preview: {
        ...preview,
        compatible: false,
        issues: [...preview.issues, "Import transaction failed; no rows were committed."],
      },
    };
  }
}

export async function logDatabaseImportPreview(
  repository: PrismaClient,
  actorUserId: string,
  preview: ImportPreview,
) {
  await writeAudit(repository, actorUserId, "DATABASE_IMPORT_PREVIEW", preview.table ?? "UNKNOWN", {
    format: "life-jsonl-v1",
    tables: preview.table ? [preview.table] : [],
    rows: preview.rows,
    compatible: preview.compatible,
  });
}

export function safeImportError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Import file could not be validated.";
}
