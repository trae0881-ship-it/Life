import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { handleSuperAdminAuditLogs } from "@/server/super-admin-audit-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSuperAdminAuditLogs(request, {
    authorize: requireRole,
    repository: getPrisma,
  });
}
