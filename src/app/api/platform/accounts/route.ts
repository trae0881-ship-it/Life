import { requireRole } from "@/server/auth";
import { executeApiPlatformRoute, handleApiAccounts } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return executeApiPlatformRoute(request, requireRole, (user) => handleApiAccounts(request, user, { repository: getPrisma }));
}
