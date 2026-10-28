import { NextResponse } from "next/server";
import { engineHealth } from "@/calculation/health";
import { applicationReady, databaseHealth } from "@/server/database-health";
import { withApiKeyAccess } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiKeyAccess(request, "GET /api/health", { repository: getPrisma, pepper: process.env.API_KEY_PEPPER }, async () => {
    try {
      const [engine, database] = await Promise.all([engineHealth(), databaseHealth()]);
      const ready = applicationReady(engine.ready, database);
      return NextResponse.json({ ...engine, ready, engineReady: engine.ready, database }, { status: ready ? 200 : 503 });
    } catch {
      return NextResponse.json({
        ready: false,
        engineReady: false,
        engine: "unknown",
        database: { status: "unreachable", configured: Boolean(process.env.DATABASE_URL), checked: false },
        error: "Engine health inspection failed.",
      }, { status: 503 });
    }
  });
}
