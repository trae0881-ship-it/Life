import { requireRole } from "@/server/auth";
import { executeApiPlatformRoute, handleApiKey } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ keyId: string }> };
const dependencies = { repository: getPrisma, pepper: process.env.API_KEY_PEPPER };

async function handle(request: Request, context: RouteContext) {
  return executeApiPlatformRoute(request, requireRole, async (user) => {
    const { keyId } = await context.params;
    return handleApiKey(request, keyId, user, dependencies);
  });
}

export async function GET(request: Request, context: RouteContext) { return handle(request, context); }
export async function PATCH(request: Request, context: RouteContext) { return handle(request, context); }
export async function DELETE(request: Request, context: RouteContext) { return handle(request, context); }
export async function POST(request: Request, context: RouteContext) { return handle(request, context); }
