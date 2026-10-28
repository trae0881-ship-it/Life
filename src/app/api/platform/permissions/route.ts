import { requireRole } from "@/server/auth";
import { executeApiPlatformRoute, handleApiAdminPermissions } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return executeApiPlatformRoute(request, requireRole, (user) => handleApiAdminPermissions(request, user, { repository: getPrisma }));
}

export async function POST(request: Request) {
  return executeApiPlatformRoute(request, requireRole, (user) => handleApiAdminPermissions(request, user, { repository: getPrisma }));
}
