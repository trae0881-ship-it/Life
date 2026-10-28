import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertFreshTestDatabase, parseTestDatabaseUrl } from "../scripts/test-database-target.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, "scripts", "test-postgres.mjs");

test("PostgreSQL test target accepts only fresh loopback test databases", () => {
  const parsed = parseTestDatabaseUrl("postgresql://test-user:test-password@127.0.0.1:55432/life_integration_test");
  assert.equal(parsed.databaseName, "life_integration_test");
  assert.doesNotThrow(() => assertFreshTestDatabase(0));
  assert.throws(() => assertFreshTestDatabase(1), /database is not empty/);
  assert.throws(() => assertFreshTestDatabase(null), /could not verify/);
});

function runRunner(databaseUrl) {
  return spawnSync(process.execPath, [runner], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, LIFE_TEST_DATABASE_URL: databaseUrl },
    timeout: 10_000,
    windowsHide: true,
  });
}

test("PostgreSQL integration runner refuses remote targets before database work", () => {
  const result = runRunner("postgresql://test-user:test-password@db.example.test:5432/life_integration_test");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /loopback hosts only/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /test-password/);
});

test("PostgreSQL integration runner refuses production-named loopback databases", () => {
  const result = runRunner("postgresql://test-user:test-password@localhost:5432/life_production_test");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /production and staging database names are not allowed/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /test-password/);
});
