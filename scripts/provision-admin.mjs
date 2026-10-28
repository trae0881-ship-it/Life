import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { parseBootstrapArguments, provisionExistingSuperAdmin } from "./provision-admin-core.mjs";

async function main() {
  const { email, operator, databaseName } = parseBootstrapArguments(process.argv.slice(2));
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must target the intended database.");

  let prisma;
  try {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5_000 });
    prisma = new PrismaClient({ adapter });
    let databases;
    try {
      databases = await prisma.$queryRaw`SELECT current_database() AS database_name`;
    } catch {
      throw new Error("Could not verify database identity; no account was changed.");
    }
    if (databases[0]?.database_name !== databaseName) {
      throw new Error("Connected database name does not match --database-name; no account was changed.");
    }
    let appliedMigrations;
    try {
      appliedMigrations = await prisma.$queryRaw`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE migration_name IN (
          '20261026120000_super_admin_role_audit',
          '20261026130000_user_full_name'
        )
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
      `;
    } catch {
      throw new Error("Could not verify required migration status; no account was changed.");
    }
    if (new Set(appliedMigrations.map((migration) => migration.migration_name)).size !== 2) {
      throw new Error("Required Super Admin migrations are not applied; verify migration status and apply reviewed migrations first.");
    }
    const result = await provisionExistingSuperAdmin(prisma, email, operator);
    process.stdout.write(result === "already-provisioned"
      ? `The account ${email} is already SUPER_ADMIN; no changes were made.\n`
      : `Promoted the existing account ${email} to SUPER_ADMIN and recorded the bootstrap action.\n`);
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "";
  const safeMessages = new Set([
    "DATABASE_URL must target the intended database.",
    "Could not verify database identity; no account was changed.",
    "Connected database name does not match --database-name; no account was changed.",
    "Could not verify required migration status; no account was changed.",
    "Required Super Admin migrations are not applied; verify migration status and apply reviewed migrations first.",
    `The explicit target must be am123allindiafree@gmail.com.`,
    "An explicit operator identity is required.",
    "The explicitly named account does not exist; no account was changed.",
    "A SUPER_ADMIN already exists; refusing to promote another account.",
    "Multiple SUPER_ADMIN accounts exist; refusing an unsafe bootstrap operation.",
  ]);
  process.stderr.write(`${safeMessages.has(message)
    ? message
    : "Provisioning failed. Verify target database, migrations, and operator permissions; no credential details are shown."}\n`);
  process.exitCode = 1;
}
