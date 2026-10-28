import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { handleManagedScript } from "@/server/admin-scripts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ scriptId: string }> };

async function handle(request: NextRequest, context: RouteContext) {
  const { scriptId } = await context.params;
  return handleManagedScript(request, scriptId, {
    authorize: requireRole,
    repository: getPrisma,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}
