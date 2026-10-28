import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { REQUIRED_MIGRATIONS, inspectDatabaseInitialization } from "../src/server/database-initialization.ts";
import { handleSuperAdminDatabase } from "../src/server/super-admin-database-handler.ts";

const userTable = {
  tableName: "User",
  estimatedRows: 4n,
  rowLevelSecurity: true,
  indexes: [{ name: "User_pkey", definition: "CREATE UNIQUE INDEX User_pkey ON public.\"User\" USING btree (id)", unique: true, valid: true }],
  constraints: [{ name: "User_pkey", type: "p", definition: "PRIMARY KEY (id)", validated: true }],
  policies: [],
  columns: [
    { name: "id", type: "text", nullable: false },
    { name: "role", type: "UserRole", nullable: false },
    { name: "passwordHash", type: "text", nullable: false },
  ],
};

function repository({
  migrations = REQUIRED_MIGRATIONS.map((migrationName) => ({ migrationName, finished: true, rolledBack: false })),
  migrationLedger = true,
  tables = [userTable],
  users = 4n,
  superAdmins = 1n,
  failAt,
} = {}) {
  return {
    async $queryRaw(strings) {
      const sql = strings.join(" ");
      if (sql.includes("SELECT current_database() AS")) {
        if (failAt === "identity") throw new Error("private connection failure");
        return [{ databaseName: "life_test", schemaName: "public", serverVersion: "17.11" }];
      }
      if (sql.includes("pg_database_size")) return [{ measuredAt: new Date("2026-10-27T09:00:00.000Z"), databaseBytes: 1024n ** 3n }];
      if (sql.includes("pg_table_size")) return [{ table: "User", tableBytes: 1024n, indexBytes: 512n, totalBytes: 1536n }];
      if (sql.includes("FROM pg_class c")) {
        if (failAt === "inventory") throw new Error("private catalog failure");
        return tables;
      }
      if (sql.includes("to_regclass")) return [{ exists: migrationLedger }];
      if (sql.includes('FROM public."_prisma_migrations"')) return migrations;
      if (sql.includes('FROM public."User"')) return [{ users, superAdmins }];
      throw new Error("Unexpected query.");
    },
  };
}

test("database initialization distinguishes connectivity, missing schema, pending migrations and recovery", async () => {
  const unavailable = await inspectDatabaseInitialization(repository({ failAt: "identity" }));
  assert.equal(unavailable.state, "connection-unavailable");
  assert.equal(unavailable.application.users, null);

  const incompleteSchema = await inspectDatabaseInitialization(repository({ migrationLedger: false }));
  assert.equal(incompleteSchema.state, "schema-missing");
  assert.deepEqual(incompleteSchema.migrations.pending, [...REQUIRED_MIGRATIONS]);

  const pendingMigrations = await inspectDatabaseInitialization(repository({
    migrations: REQUIRED_MIGRATIONS.slice(0, -1).map((migrationName) => ({ migrationName, finished: true, rolledBack: false })),
  }));
  assert.equal(pendingMigrations.state, "migrations-incomplete");
  assert.deepEqual(pendingMigrations.migrations.pending, [REQUIRED_MIGRATIONS.at(-1)]);

  const emptyTarget = await inspectDatabaseInitialization(repository({ migrationLedger: false, tables: [] }));
  assert.equal(emptyTarget.state, "empty-database");

  const failedMigration = await inspectDatabaseInitialization(repository({
    migrations: [
      ...REQUIRED_MIGRATIONS.slice(0, -1).map((migrationName) => ({ migrationName, finished: true, rolledBack: false })),
      { migrationName: REQUIRED_MIGRATIONS.at(-1), finished: false, rolledBack: false },
    ],
  }));
  assert.equal(failedMigration.state, "recovery-required");
  assert.deepEqual(failedMigration.migrations.incomplete, [REQUIRED_MIGRATIONS.at(-1)]);

  const catalogUnavailable = await inspectDatabaseInitialization(repository({ failAt: "inventory" }));
  assert.equal(catalogUnavailable.state, "connection-unavailable");
  assert.equal(catalogUnavailable.application.users, null);
});

test("required migration sequence matches the checked-in migrations", () => {
  const directories = readdirSync(new URL("../prisma/migrations/", import.meta.url), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual([...REQUIRED_MIGRATIONS], directories);
});

test("initialized database, empty setup and missing Super Admin are not conflated", async () => {
  assert.equal((await inspectDatabaseInitialization(repository())).state, "initialized");
  assert.equal((await inspectDatabaseInitialization(repository({ users: 0n, superAdmins: 0n }))).state, "first-time-setup-required");
  assert.equal((await inspectDatabaseInitialization(repository({ users: 4n, superAdmins: 0n }))).state, "initialized-no-super-admin");
});

test("inventory returns metadata and estimated counts without row values", async () => {
  const result = await inspectDatabaseInitialization(repository());
  assert.equal(result.database, "life_test");
  assert.equal(result.serverVersion, "17.11");
  assert.equal(result.storage.status, "available");
  assert.equal(result.storage.databaseBytes, 1024 ** 3);
  assert.equal(result.storage.tables[0].indexBytes, 512);
  assert.equal(result.storage.quota.bytes, null);
  assert.equal(result.storage.usedPercent, null);
  assert.equal(result.storage.objectStorage.bytes, null);
  assert.equal(result.storage.backupStorage.bytes, null);
  assert.deepEqual(result.tables[0], {
    name: "User",
    estimatedRows: 4,
    sensitive: true,
    rowLevelSecurity: true,
    indexes: userTable.indexes,
    constraints: userTable.constraints,
    policies: userTable.policies,
    columns: userTable.columns,
  });
  assert.doesNotMatch(JSON.stringify(result), /private connection failure|passwordHash.*[a-z0-9]{20,}/i);
});

test("Super Admin database endpoint denies other roles before inspection", async () => {
  let inspectCalls = 0;
  for (const [status, expected] of [[401, 401], [403, 403]]) {
    const response = await handleSuperAdminDatabase(new Request("https://life.example/api/super-admin/database"), {
      authorize: async (_request, allowed) => {
        assert.deepEqual(allowed, ["SUPER_ADMIN"]);
        return { status, user: status === 401 ? null : { id: "admin" } };
      },
      inspect: async () => {
        inspectCalls += 1;
        return {
          ...await inspectDatabaseInitialization(repository()),
          readiness: { checkedAt: new Date().toISOString(), completed: 0, total: 10, overall: "Not ready", items: [] },
        };
      },
    });
    assert.equal(response.status, expected);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(inspectCalls, 0);
});

test("database endpoint does not expose inspection exceptions", async () => {
  const response = await handleSuperAdminDatabase(new Request("https://life.example/api/super-admin/database"), {
    authorize: async () => ({ status: 200, user: { id: "root" } }),
    inspect: async () => { throw new Error("postgres://secret-password"); },
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Database status is temporarily unavailable.",
    code: "DATABASE_UNAVAILABLE",
  });
});

test("Admin dashboard checks authentication before initialization and blocks incomplete setup", () => {
  const page = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  assert.ok(page.indexOf("getCurrentUser()") < page.lastIndexOf("inspectDatabaseInitialization("));
  assert.match(page, /initialization\.state !== "initialized"/);
  assert.match(page, /not treated as an empty database/);
  assert.doesNotMatch(page, /<form|type="file"|handleUpload/i);
});
