import test from "node:test";
import assert from "node:assert/strict";
import { evaluateStorageUsage, measureDatabaseStorage, parseStorageWarningThresholds } from "../src/server/database-storage.ts";

test("storage measurement returns database and table/index sizes with explicit unknown quotas", async () => {
  const calls = [];
  const measuredAt = new Date("2026-10-27T09:00:00.000Z");
  const repository = {
    async $queryRaw(strings) {
      const sql = strings.join(" ");
      calls.push(sql);
      if (sql.includes("pg_database_size")) return [{ measuredAt, databaseBytes: 3n * 1024n * 1024n }];
      if (sql.includes("pg_table_size")) return [
        { table: "ApiKey", tableBytes: 2048n, indexBytes: 1024n, totalBytes: 3072n },
      ];
      throw new Error("Unexpected query");
    },
  };
  const result = await measureDatabaseStorage(repository);
  assert.equal(result.status, "available");
  assert.equal(result.measuredAt, measuredAt.toISOString());
  assert.equal(result.databaseBytes, 3 * 1024 * 1024);
  assert.deepEqual(result.tables[0], { table: "ApiKey", tableBytes: 2048, indexBytes: 1024, totalBytes: 3072 });
  assert.deepEqual(result.quota, { bytes: null, source: null });
  assert.equal(result.remainingBytes, null);
  assert.equal(result.usedPercent, null);
  assert.deepEqual(result.objectStorage, { bytes: null, status: "unknown" });
  assert.deepEqual(result.backupStorage, { bytes: null, status: "unknown" });
  assert.deepEqual(result.warningThresholds, [80, 90, 95]);
  assert.equal(result.warningStatus, "not-evaluated");
  assert.equal(calls.length, 2);
  assert.match(calls[0], /pg_database_size\(current_database\(\)\)/);
  assert.match(calls[1], /pg_total_relation_size/);
});

test("unavailable storage measurements never become zero values", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await measureDatabaseStorage({ $queryRaw: async () => { throw new Error("private connection detail"); } });
    assert.equal(result.status, "unavailable");
    assert.equal(result.databaseBytes, null);
    assert.equal(result.measuredAt, null);
    assert.deepEqual(result.tables, []);
  } finally {
    console.error = originalError;
  }
});

test("warning thresholds are configurable but invalid values fail back to safe defaults", () => {
  assert.deepEqual(parseStorageWarningThresholds("75,90,95"), [75, 90, 95]);
  assert.deepEqual(parseStorageWarningThresholds("95,80,95"), [80, 95]);
  assert.deepEqual(parseStorageWarningThresholds("0,101"), [80, 90, 95]);
});

test("usage warnings are calculated only from an explicitly sourced quota", () => {
  const atThreshold = evaluateStorageUsage(90, { bytes: 100, source: "verified test quota" }, [80, 90, 95]);
  assert.deepEqual(atThreshold, {
    quota: { bytes: 100, source: "verified test quota" },
    remainingBytes: 10,
    usedPercent: 90,
    warnings: [80, 90],
    warningStatus: "warning",
  });
  assert.deepEqual(
    evaluateStorageUsage(90, null, [80, 90, 95]),
    {
      quota: { bytes: null, source: null },
      remainingBytes: null,
      usedPercent: null,
      warnings: null,
      warningStatus: "not-evaluated",
    },
  );
  assert.equal(evaluateStorageUsage(10, { bytes: 100, source: "test" }, [80, 90, 95]).warningStatus, "ok");
  assert.equal(evaluateStorageUsage(100, { bytes: 0, source: "test" }, [80, 90, 95]).warningStatus, "not-evaluated");
});
