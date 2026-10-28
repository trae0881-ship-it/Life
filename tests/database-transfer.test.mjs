import test from "node:test";
import assert from "node:assert/strict";
import {
  commitDatabaseImport,
  createDatabaseExportResponse,
  isDatabaseImportCommitEnabled,
  MAX_IMPORT_BYTES,
  previewDatabaseImport,
} from "../src/server/database-transfer.ts";

class TransferRepository {
  constructor({ table = "Thing", columns, rows = [], existingRows = 0, rowLevelSecurity = false } = {}) {
    this.table = table;
    this.columns = columns ?? [
      { name: "id", type: "text", nullable: false, defaultValue: null, generated: false },
      { name: "name", type: "text", nullable: false, defaultValue: null, generated: false },
    ];
    this.rows = rows;
    this.existingRows = existingRows;
    this.rowLevelSecurity = rowLevelSecurity;
    this.audits = [];
    this.inserted = [];
    this.apiPlatformAuditLog = {
      create: async ({ data }) => {
        this.audits.push(data);
        return data;
      },
    };
  }

  async $queryRawUnsafe(query, ...values) {
    if (query.includes("current_database()")) return [{ databaseName: "isolated_test" }];
    if (query.includes("c.relkind IN")) {
      return values[0] === this.table ? [{ tableName: this.table, rowLevelSecurity: this.rowLevelSecurity }] : [];
    }
    if (query.includes("i.indisprimary")) {
      return this.columns.filter((column) => column.name === "id").map(({ name }) => ({ name }));
    }
    if (query.includes("i.indisunique")) {
      return [{ columns: ["id"] }];
    }
    if (query.includes("pg_constraint")) return [];
    if (query.includes("pg_attribute a")) return this.columns;
    if (query.includes("count(*)::bigint")) return [{ count: this.existingRows }];
    if (query.includes("FROM public.")) {
      const offset = Number(values.at(-1) ?? 0);
      return this.rows.slice(offset, offset + Number(values.at(-2) ?? 250));
    }
    throw new Error(`Unexpected mocked query: ${query}`);
  }

  async $executeRawUnsafe(query, ...values) {
    if (query.startsWith("LOCK TABLE")) return 0;
    if (!query.startsWith("INSERT INTO")) throw new Error(`Unexpected mocked execute: ${query}`);
    this.inserted.push({ query, values });
    return 1;
  }

  async $transaction(callback) {
    const insertCount = this.inserted.length;
    try {
      return await callback(this);
    } catch (error) {
      this.inserted.length = insertCount;
      throw error;
    }
  }
}

function importFile(rows, table = "Thing") {
  const columns = [
    { name: "id", type: "text", nullable: false },
    { name: "name", type: "text", nullable: false },
  ];
  return new TextEncoder().encode([
    JSON.stringify({ _lifeExport: { format: "life-jsonl-v1", tables: [{ name: table, columns }] } }),
    ...rows.map((row) => JSON.stringify({ _table: table, row })),
    "",
  ].join("\n"));
}

test("JSONL export streams selected data and never emits secret-like columns", async () => {
  const repository = new TransferRepository({
    table: "User",
    columns: [
      { name: "id", type: "text", nullable: false, defaultValue: null, generated: false },
      { name: "email", type: "text", nullable: false, defaultValue: null, generated: false },
      { name: "passwordHash", type: "text", nullable: false, defaultValue: null, generated: false },
      { name: "apiKeyDigest", type: "text", nullable: false, defaultValue: null, generated: false },
    ],
    rows: [{ id: "u1", email: "private@example.test", passwordHash: "not-exported", apiKeyDigest: "not-exported" }],
  });
  const response = await createDatabaseExportResponse(repository, "super-admin", {
    tables: ["User"],
    format: "jsonl",
    includeSensitive: true,
  });
  const contents = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(contents, /private@example\.test/);
  assert.doesNotMatch(contents, /passwordHash|apiKeyDigest|not-exported/);
  assert.ok(repository.audits.some((audit) => audit.action === "DATABASE_EXPORT_COMPLETED"));
});

test("CSV export escapes delimiters, quotes, and embedded newlines", async () => {
  const repository = new TransferRepository({
    rows: [
      { id: "1", name: 'comma, quote " and line\nbreak' },
      { id: "2", name: null },
    ],
  });
  const response = await createDatabaseExportResponse(repository, "super-admin", {
    tables: ["Thing"],
    format: "csv",
    includeSensitive: false,
  });
  const contents = await response.text();
  assert.equal(response.status, 200);
  assert.match(contents, /^id,name\r\n/);
  assert.match(contents, /"comma, quote "" and line\nbreak"/);
  assert.match(contents, /,\s*\\N\r\n$/);
});

test("CSV export neutralizes spreadsheet formula injection", async () => {
  const repository = new TransferRepository({
    rows: [
      { id: "1", name: "=HYPERLINK(\"https://example.test\",\"open\")" },
      { id: "2", name: " \t+SUM(1,1)" },
      { id: "3", name: "ordinary text" },
    ],
  });
  const response = await createDatabaseExportResponse(repository, "super-admin", {
    tables: ["Thing"],
    format: "csv",
    includeSensitive: false,
  });
  const contents = await response.text();
  assert.match(contents, /"'=HYPERLINK/);
  assert.match(contents, /"' \t\+SUM/);
  assert.match(contents, /,ordinary text/);
});

test("export rejects sensitive tables without explicit confirmation and rejects RLS tables", async () => {
  const sensitive = new TransferRepository({ table: "User" });
  const deniedSensitive = await createDatabaseExportResponse(sensitive, "admin", {
    tables: ["User"], format: "jsonl", includeSensitive: false,
  });
  assert.equal(deniedSensitive.status, 403);

  const rls = new TransferRepository({ rowLevelSecurity: true });
  const deniedRls = await createDatabaseExportResponse(rls, "admin", {
    tables: ["Thing"], format: "jsonl", includeSensitive: false,
  });
  assert.equal(deniedRls.status, 409);

  const restricted = await createDatabaseExportResponse(
    new TransferRepository({ table: "ManagedScript" }),
    "admin",
    { tables: ["ManagedScript"], format: "jsonl", includeSensitive: true },
  );
  assert.equal(restricted.status, 400);
});

test("import preview validates the LIFE JSONL schema and reports an empty target", async () => {
  const repository = new TransferRepository();
  const { preview } = await previewDatabaseImport(repository, importFile([{ id: "1", name: "first" }]));
  assert.deepEqual(preview, {
    compatible: true,
    targetDatabase: "isolated_test",
    table: "Thing",
    rows: 1,
    columns: ["id", "name"],
    issues: [],
  });
});

test("import preview rejects duplicate keys, non-empty targets, and secret tables", async () => {
  const duplicate = await previewDatabaseImport(
    new TransferRepository(),
    importFile([{ id: "1", name: "first" }, { id: "1", name: "second" }]),
  );
  assert.equal(duplicate.preview.compatible, false);
  assert.ok(duplicate.preview.issues.some((issue) => issue.includes("Duplicate primary key")));

  const occupied = await previewDatabaseImport(
    new TransferRepository({ existingRows: 1 }),
    importFile([{ id: "1", name: "first" }]),
  );
  assert.equal(occupied.preview.compatible, false);
  assert.ok(occupied.preview.issues.some((issue) => issue.includes("not empty")));

  const sensitive = await previewDatabaseImport(
    new TransferRepository({ table: "User" }),
    importFile([{ id: "1", name: "first" }], "User"),
  );
  assert.equal(sensitive.preview.compatible, false);
  assert.ok(sensitive.preview.issues.some((issue) => issue.includes("not eligible")));
});

test("import rejects malformed and oversized JSONL before database writes", async () => {
  const repository = new TransferRepository();
  await assert.rejects(previewDatabaseImport(repository, new TextEncoder().encode("{bad}\n{}")), /malformed JSONL/);
  await assert.rejects(previewDatabaseImport(repository, new Uint8Array(MAX_IMPORT_BYTES + 1)), /10 MiB size limit/);
  assert.equal(repository.inserted.length, 0);
});

test("import commits only after exact database confirmation and uses a transaction", async () => {
  const repository = new TransferRepository();
  const bytes = importFile([{ id: "1", name: "first" }]);
  const denied = await commitDatabaseImport(repository, "super-admin", bytes, "production");
  assert.equal(denied.committed, false);
  assert.equal(repository.inserted.length, 0);

  const committed = await commitDatabaseImport(repository, "super-admin", bytes, "isolated_test");
  assert.equal(committed.committed, true);
  assert.equal(repository.inserted.length, 1);
  assert.ok(repository.audits.some((audit) => audit.action === "DATABASE_IMPORT_COMPLETED"));
});

test("import commits are opt-in outside production and always disabled in production", () => {
  assert.equal(isDatabaseImportCommitEnabled("development", undefined), false);
  assert.equal(isDatabaseImportCommitEnabled("development", "true"), true);
  assert.equal(isDatabaseImportCommitEnabled("test", "true"), true);
  assert.equal(isDatabaseImportCommitEnabled("production", "true"), false);
  assert.equal(isDatabaseImportCommitEnabled(undefined, "true"), false);
});

test("failed import transactions roll back inserted rows and record failure", async () => {
  const repository = new TransferRepository();
  const originalConsoleError = console.error;
  console.error = () => {};
  const execute = repository.$executeRawUnsafe.bind(repository);
  repository.$executeRawUnsafe = async (query, ...values) => {
    if (query.startsWith("INSERT INTO")) {
      repository.inserted.push({ query, values });
      throw new Error("simulated insert failure");
    }
    return execute(query, ...values);
  };
  try {
    const result = await commitDatabaseImport(
      repository,
      "super-admin",
      importFile([{ id: "1", name: "first" }]),
      "isolated_test",
    );
    assert.equal(result.committed, false);
    assert.equal(repository.inserted.length, 0);
    assert.ok(result.preview.issues.some((issue) => issue.includes("no rows were committed")));
    assert.ok(repository.audits.some((audit) => audit.action === "DATABASE_IMPORT_FAILED"));
    assert.equal(repository.audits.some((audit) => audit.action === "DATABASE_IMPORT_COMPLETED"), false);
  } finally {
    console.error = originalConsoleError;
  }
});
