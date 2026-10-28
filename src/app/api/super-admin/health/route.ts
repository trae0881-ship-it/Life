import { NextRequest } from "next/server";
import { engineHealth } from "@/calculation/health";
import { requireRole } from "@/server/auth";
import { databaseHealth } from "@/server/database-health";
import { handleSuperAdminHealth } from "@/server/super-admin-health-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSuperAdminHealth(request, {
    authorize: requireRole,
    async health() {
      const [engine, database] = await Promise.all([
        engineHealth().catch(() => null),
        databaseHealth(),
      ]);
      return {
        engine: engine?.ready ? "ready" : "unavailable",
        database: database.status,
      };
    },
  });
}
