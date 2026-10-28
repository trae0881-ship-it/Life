import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { handleSuperAdminRoleChange } from "@/server/super-admin-role-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;
  return handleSuperAdminRoleChange(request, userId, {
    authorize: requireRole,
    repository: getPrisma,
  });
}
