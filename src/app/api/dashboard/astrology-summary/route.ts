import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const RECENT_LIMIT = 5;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");

    const prisma = getPrisma();
    const where = { userId: user.id };
    const [totalReports, questions, reportGroups, divisionalCharts, recentlyGenerated, recentlyViewed] = await Promise.all([
      prisma.savedChart.count({ where }),
      prisma.kundliQuestion.count({ where }),
      prisma.savedChart.groupBy({ by: ["reportType"], where, _count: { _all: true } }),
      prisma.savedChart.aggregate({ where, _sum: { divisionalChartCount: true } }),
      prisma.savedChart.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: RECENT_LIMIT,
        select: { id: true, title: true, reportType: true, createdAt: true },
      }),
      prisma.savedChart.findMany({
        where: { ...where, lastViewedAt: { not: null } },
        orderBy: [{ lastViewedAt: "desc" }, { id: "desc" }],
        take: RECENT_LIMIT,
        select: { id: true, title: true, reportType: true, lastViewedAt: true },
      }),
    ]);

    const counts = { VEDIC: 0, KP: 0, COMBINED: 0 };
    for (const group of reportGroups) counts[group.reportType] = group._count._all;

    return NextResponse.json({
      totalReports,
      vedicReports: counts.VEDIC + counts.COMBINED,
      kpReports: counts.KP + counts.COMBINED,
      divisionalCharts: divisionalCharts._sum.divisionalChartCount ?? 0,
      totalQuestions: questions,
      recentlyGenerated,
      recentlyViewed,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return jsonError("Personal astrology data is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
