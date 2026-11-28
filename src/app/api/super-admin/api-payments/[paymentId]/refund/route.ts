import { requireRole } from "@/server/auth";
import { handleSuperAdminRefund } from "@/server/api-billing";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  const auth = await requireRole(request, ["SUPER_ADMIN"]);
  if (!auth.user || auth.status !== 200) {
    return Response.json(
      { error: auth.status === 401 ? "Sign in is required." : "Super Admin access is required.", code: auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { paymentId } = await context.params;
  return handleSuperAdminRefund(request, paymentId, auth.user, { repository: getPrisma });
}
