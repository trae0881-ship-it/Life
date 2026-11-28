import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { savedReportSummary } from "@/server/saved-report-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ reportId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireRole(request, ["SUPER_ADMIN"]);
  if (auth.status !== 200 || !auth.user) {
    return jsonError(
      auth.status === 401 ? "Sign in is required." : "Super Admin access is required.",
      auth.status,
      auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
    );
  }

  try {
    const { reportId } = await context.params;
    if (!reportId || reportId.length > 100) return jsonError("Report ID is invalid.", 400, "INVALID_REPORT");
    const saved = await getPrisma().$transaction(async (transaction) => {
      const report = await transaction.savedChart.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          userId: true,
          profileId: true,
          title: true,
          reportType: true,
          availableChartCount: true,
          createdAt: true,
          inputSnapshot: true,
          result: true,
          user: { select: { id: true, email: true, fullName: true } },
          profile: { select: { label: true } },
        },
      });
      await transaction.superAdminAccessLog.create({
        data: {
          actorUserId: auth.user!.id,
          action: "KUNDALI_REPORT_DETAIL_READ",
          page: 1,
          resultCount: report ? 1 : 0,
          targetUserId: report?.userId ?? null,
        },
        select: { id: true },
      });
      return report;
    });
    if (!saved) return jsonError("Kundali report was not found.", 404, "NOT_FOUND");

    const snapshot = isRecord(saved.inputSnapshot) ? saved.inputSnapshot : {};
    const result = isRecord(saved.result) ? saved.result : {};
    const planets: { name: string | null; sign: string | null; house: number | null; nakshatra: string | null; pada: number | null }[] = [];
    if (Array.isArray(result.planets)) {
      for (const item of result.planets) {
        if (!isRecord(item)) continue;
        planets.push({
          name: stringOrNull(item.name),
          sign: stringOrNull(item.sign),
          house: typeof item.house === "number" && Number.isSafeInteger(item.house) ? item.house : null,
          nakshatra: stringOrNull(item.nakshatra),
          pada: typeof item.pada === "number" && Number.isSafeInteger(item.pada) ? item.pada : null,
        });
      }
    }
    const moon = planets.find((planet) => planet.name === "Moon");
    const houses: { house: number; sign: string }[] = [];
    if (Array.isArray(result.houses)) {
      for (const item of result.houses) {
        if (!isRecord(item)) continue;
        if (typeof item.house !== "number" || !Number.isSafeInteger(item.house) || typeof item.sign !== "string") continue;
        houses.push({ house: item.house, sign: item.sign });
      }
    }
    const summary = savedReportSummary({
      inputSnapshot: snapshot,
      result,
      profile: null,
    });

    return NextResponse.json({
      report: {
        id: saved.id,
        title: saved.title,
        reportType: saved.reportType,
        availableChartCount: saved.availableChartCount,
        createdAt: saved.createdAt,
        user: saved.user,
        profileId: saved.profileId,
        profileLabel: saved.profile?.label ?? null,
        birthDetails: {
          fullName: stringOrNull(snapshot.fullName),
          birthPlace: stringOrNull(snapshot.birthPlace),
          localDate: stringOrNull(snapshot.localDate),
          localTime: stringOrNull(snapshot.localTime),
        },
        overview: {
          lagna: isRecord(result.ascendant) ? stringOrNull(result.ascendant.sign) : null,
          rashi: moon?.sign ?? null,
          nakshatra: moon?.nakshatra ?? null,
          pada: moon?.pada ?? null,
        },
        planets,
        houses,
        hasKpChart: isRecord(result.kp),
        availableSections: summary.availableSections,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Kundali report details are temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
