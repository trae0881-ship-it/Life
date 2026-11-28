import { requireRole } from "@/server/auth";
import { handleApiAnalytics } from "@/server/api-analytics";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["DEVELOPER", "SUPER_ADMIN"]);
  if (!auth.user || auth.status !== 200) {
    return Response.json(
      { error: auth.status === 401 ? "Sign in is required." : "Developer or Super Admin access is required.", code: auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleApiAnalytics(request, auth.user, { repository: getPrisma });
}
