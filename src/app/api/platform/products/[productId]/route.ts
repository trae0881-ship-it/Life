import { requireRole } from "@/server/auth";
import { executeApiPlatformRoute, handleApiProduct } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ productId: string }> };

async function handle(request: Request, context: RouteContext) {
  return executeApiPlatformRoute(request, requireRole, async (user) => {
    const { productId } = await context.params;
    return handleApiProduct(request, productId, user, { repository: getPrisma });
  });
}

export async function GET(request: Request, context: RouteContext) { return handle(request, context); }
export async function PATCH(request: Request, context: RouteContext) { return handle(request, context); }
