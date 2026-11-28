import { requireRole } from "@/server/auth";
import { handleDeveloperSubscription } from "@/server/api-billing";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const auth = await requireRole(request, ["DEVELOPER"]);
  if (!auth.user || auth.status !== 200) {
    return Response.json(
      { error: auth.status === 401 ? "Sign in is required." : "Developer access is required.", code: auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleDeveloperSubscription(request, auth.user, { repository: getPrisma });
}

export const GET = handle;
export const POST = handle;
