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
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [accounts, profiles, savedCharts, questions, reportGroups, chartAggregate, reportsThisMonth, questionsThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.birthProfile.count(),
      prisma.savedChart.count(),
      prisma.kundliQuestion.count(),
      prisma.savedChart.groupBy({ by: ["reportType"], _count: { _all: true } }),
      prisma.savedChart.aggregate({ _sum: { availableChartCount: true } }),
      prisma.savedChart.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.kundliQuestion.count({ where: { createdAt: { gte: monthStart } } }),
    ]);
    const reportTypes = { VEDIC: 0, KP: 0, COMBINED: 0 };
    for (const group of reportGroups) reportTypes[group.reportType] = group._count._all;

    return NextResponse.json(
      {
        accounts,
        profiles,
        savedCharts,
        questions,
        reportTypes,
        reportsThisMonth,
        availableCharts: chartAggregate._sum.availableChartCount ?? 0,
        questionsThisMonth,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return jsonError("Platform metrics are temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
