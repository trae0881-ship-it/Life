import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { jsonError } from "@/server/http";
import { parseAdminReportFilters, SUPER_ADMIN_REPORT_PAGE_SIZE } from "@/server/super-admin-report-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["SUPER_ADMIN"]);
  if (auth.status !== 200 || !auth.user) {
    return jsonError(
      auth.status === 401 ? "Sign in is required." : "Super Admin access is required.",
      auth.status,
      auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
    );
  }

  const filters = parseAdminReportFilters(request.nextUrl.searchParams);
  if (!filters.ok) return jsonError("Report filters or page are invalid.", 400, "INVALID_QUERY");

  try {
    const { page, query, reportType } = filters.value;
    const where = {
      ...(reportType ? { reportType } : {}),
      ...(query ? {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { user: { is: { email: { contains: query, mode: "insensitive" as const } } } },
        ],
      } : {}),
    };
    const skip = (page - 1) * SUPER_ADMIN_REPORT_PAGE_SIZE;
    const result = await getPrisma().$transaction(async (transaction) => {
      const [total, reports] = await Promise.all([
        transaction.savedChart.count({ where }),
        transaction.savedChart.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip,
          take: SUPER_ADMIN_REPORT_PAGE_SIZE,
          select: {
            id: true,
            userId: true,
            profileId: true,
            title: true,
            reportType: true,
            availableChartCount: true,
            createdAt: true,
            inputSnapshot: true,
            user: { select: { id: true, email: true, fullName: true } },
            profile: { select: { label: true } },
          },
        }),
      ]);
      await transaction.superAdminAccessLog.create({
        data: {
          actorUserId: auth.user!.id,
          action: "KUNDALI_REPORT_LIST_READ",
          page,
          resultCount: reports.length,
        },
        select: { id: true },
      });
      return { total, reports };
    });

    return NextResponse.json({
      reports: result.reports.map(({ inputSnapshot, user, profile, ...report }) => {
        const snapshot = isRecord(inputSnapshot) ? inputSnapshot : {};
        return {
          ...report,
          user,
          profileLabel: profile?.label ?? null,
          birthDate: typeof snapshot.localDate === "string" ? snapshot.localDate : null,
          birthPlace: typeof snapshot.birthPlace === "string" ? snapshot.birthPlace : null,
        };
      }),
      page,
      pageSize: SUPER_ADMIN_REPORT_PAGE_SIZE,
      total: result.total,
      pageCount: Math.ceil(result.total / SUPER_ADMIN_REPORT_PAGE_SIZE),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Kundali report monitoring is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
