import { requireRole } from "@/server/auth";
import { executeApiPlatformRoute, handleApiKeys } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dependencies = { repository: getPrisma, pepper: process.env.API_KEY_PEPPER };

export async function GET(request: Request) {
  return executeApiPlatformRoute(request, requireRole, (user) => handleApiKeys(request, user, dependencies));
}

export async function POST(request: Request) {
  return executeApiPlatformRoute(request, requireRole, (user) => handleApiKeys(request, user, dependencies));
}
