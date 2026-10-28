import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { handleSuperAdminUsers } from "@/server/super-admin-users-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSuperAdminUsers(request, {
    authorize: requireRole,
    repository: getPrisma,
  });
}
