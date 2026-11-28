import { requireRole } from "@/server/auth";
import { handleSuperAdminDevelopers } from "@/server/api-developer-lifecycle";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const auth = await requireRole(request, ["SUPER_ADMIN"]);
  if (!auth.user || auth.status !== 200) {
    return Response.json(
      { error: auth.status === 401 ? "Sign in is required." : "Super Admin access is required.", code: auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleSuperAdminDevelopers(request, auth.user, getPrisma);
}

export const GET = handle;
