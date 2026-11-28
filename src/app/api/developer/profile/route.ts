import { requireRole } from "@/server/auth";
import { handleDeveloperProfile } from "@/server/api-developer-lifecycle";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const auth = await requireRole(request, ["USER", "DEVELOPER"]);
  if (!auth.user || auth.status !== 200) {
    return Response.json(
      { error: auth.status === 401 ? "Sign in is required." : "A Developer application or account is required.", code: auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleDeveloperProfile(request, auth.user, getPrisma);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
