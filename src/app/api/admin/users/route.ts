import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
    if (auth.status !== 200) return jsonError(auth.status === 401 ? "Sign in is required." : "Administrator access is required.", auth.status, auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
    const users = await getPrisma().user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Administrator data is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
