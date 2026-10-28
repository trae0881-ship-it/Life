import { Pool } from "pg";

export type DatabaseHealth = {
  status: "connected" | "not-configured" | "unreachable";
  configured: boolean;
  checked: boolean;
  error?: string;
};

export function applicationReady(engineReady: boolean, database: DatabaseHealth) {
  return engineReady && database.status === "connected";
}

export async function databaseHealth(): Promise<DatabaseHealth> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { status: "not-configured", configured: false, checked: true };

  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 2_000 });
  try {
    await pool.query("SELECT 1");
    return { status: "connected", configured: true, checked: true };
  } catch {
    return { status: "unreachable", configured: true, checked: true, error: "Database connectivity check failed." };
  } finally {
    await pool.end();
  }
}
