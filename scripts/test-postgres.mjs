import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { assertFreshTestDatabase, parseTestDatabaseUrl } from "./test-database-target.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(root, ".env.test"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} failed${signal ? ` (${signal})` : ` with exit code ${code}`}.`));
    });
  });
}

const target = parseTestDatabaseUrl(process.env.LIFE_TEST_DATABASE_URL);
const standaloneServer = path.join(root, ".next", "standalone", "server.js");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
if (!existsSync(standaloneServer)) {
  throw new Error("Production standalone server not found. Run npm.cmd run build before PostgreSQL integration tests.");
}
if (!existsSync(prismaCli)) {
  throw new Error("Prisma CLI not found. Restore dependencies before PostgreSQL integration tests.");
}

process.env.DATABASE_URL = target.url.toString();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5_000 });
try {
  const { rows } = await pool.query(`
    SELECT current_database() AS database_name,
      (
        SELECT (
          SELECT count(*)
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND n.nspname NOT LIKE 'pg_toast%'
            AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
        ) + (
          SELECT count(*)
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND n.nspname NOT LIKE 'pg_toast%'
        ) + (
          SELECT count(*)
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND n.nspname NOT LIKE 'pg_toast%'
            AND t.typtype IN ('d', 'e', 'r')
        ) + (
          SELECT count(*)
          FROM pg_namespace
          WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'public')
            AND nspname NOT LIKE 'pg_toast%'
        ) + (
          SELECT count(*)
          FROM pg_extension e
          JOIN pg_namespace n ON n.oid = e.extnamespace
          WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND e.extname <> 'plpgsql'
        ) + (
          SELECT count(*)
          FROM pg_foreign_server
        )
      )::bigint AS user_object_count
  `);
  const actualDatabaseName = rows[0]?.database_name;
  if (actualDatabaseName !== target.databaseName) {
    throw new Error("Refusing migrations: connected PostgreSQL database identity did not match the configured test database.");
  }
  assertFreshTestDatabase(rows[0]?.user_object_count);
} catch (error) {
  if (error.message?.startsWith("Refusing migrations:")) throw error;
  throw new Error("Could not verify the configured disposable PostgreSQL database. No migrations were run.");
} finally {
  await pool.end();
}

console.log(`Verified loopback PostgreSQL test database: ${target.databaseName}`);
console.log("Applying repository migrations only to this verified test database.");
await run(process.execPath, [prismaCli, "migrate", "deploy"], process.env);
await run(process.execPath, [
  "--disable-warning=ExperimentalWarning",
  "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
  "--experimental-strip-types",
  "--test-reporter=tap",
  "--test",
  "tests/postgres.integration.mjs",
], process.env);
