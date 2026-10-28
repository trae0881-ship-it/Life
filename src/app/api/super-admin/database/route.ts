import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { inspectDatabaseInitialization } from "@/server/database-initialization";
import { getLaunchReadiness } from "@/server/launch-readiness";
import { handleSuperAdminDatabase } from "@/server/super-admin-database-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSuperAdminDatabase(request, {
    authorize: requireRole,
    async inspect() {
      const database = await inspectDatabaseInitialization(getPrisma());
      return { ...database, readiness: getLaunchReadiness() };
    },
  });
}
