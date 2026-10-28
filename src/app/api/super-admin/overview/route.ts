import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["SUPER_ADMIN"]);
    if (auth.status !== 200) {
      return jsonError(
        auth.status === 401 ? "Sign in is required." : "Super Admin access is required.",
        auth.status,
        auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
      );
    }

    const prisma = getPrisma();
    const [accounts, profiles, savedCharts, questions] = await Promise.all([
      prisma.user.count(),
      prisma.birthProfile.count(),
      prisma.savedChart.count(),
      prisma.kundliQuestion.count(),
    ]);

    return NextResponse.json(
      { accounts, profiles, savedCharts, questions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return jsonError("Platform metrics are temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
