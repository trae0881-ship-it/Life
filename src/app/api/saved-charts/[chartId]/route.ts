import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
import { ownedRecordWhere } from "@/server/ownership";
import { isRestorableSavedChartResult } from "@/presentation/saved-chart-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ chartId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 120;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const { chartId } = await context.params;
    const chart = await getPrisma().savedChart.findFirst({
      where: ownedRecordWhere(user.id, chartId),
      select: { id: true, profileId: true, title: true, engineVersion: true, ephemerisManifest: true, ruleSetVersion: true, settings: true, inputSnapshot: true, result: true, resultHash: true, createdAt: true },
    });
    if (!chart) return jsonError("Saved chart not found.", 404, "NOT_FOUND");
    if (!isRestorableSavedChartResult(chart.result)) {
      return jsonError("This saved chart uses an unsupported or incomplete result format.", 422, "UNSUPPORTED_SAVED_CHART");
    }
    return NextResponse.json({ chart }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Saved-chart storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const { chartId } = await context.params;
    const body = await readJson(request);
    if (!body || !Object.keys(body).length || Object.keys(body).some((key) => !["title", "profileId"].includes(key))) return jsonError("Only title and profile association can be changed.", 422, "INVALID_CHART_UPDATE");
    if (body.title !== undefined && !validTitle(body.title)) return jsonError("Enter a chart title up to 120 characters.", 422, "INVALID_CHART_TITLE");
    if (body.profileId !== undefined && body.profileId !== null && typeof body.profileId !== "string") return jsonError("Invalid profile reference.", 422, "INVALID_PROFILE");
    const prisma = getPrisma();
    const existingChart = await prisma.savedChart.findFirst({
      where: ownedRecordWhere(user.id, chartId),
      select: { id: true, result: true },
    });
    if (!existingChart) return jsonError("Saved chart not found.", 404, "NOT_FOUND");
    if (typeof body.profileId === "string") {
      const ownedProfile = await prisma.birthProfile.findFirst({
        where: ownedRecordWhere(user.id, body.profileId),
        select: { id: true, localDate: true, localTime: true, timeZone: true, latitude: true, longitude: true },
      });
      if (!ownedProfile) return jsonError("Profile not found.", 404, "NOT_FOUND");
      if (!isRestorableSavedChartResult(existingChart.result) || !isRecord(existingChart.result.input)
        || ownedProfile.localTime === null || ownedProfile.timeZone === null
        || ownedProfile.latitude === null || ownedProfile.longitude === null
        || existingChart.result.input.localDate !== ownedProfile.localDate
        || existingChart.result.input.localTime !== ownedProfile.localTime
        || existingChart.result.input.timeZone !== ownedProfile.timeZone
        || existingChart.result.input.latitude !== ownedProfile.latitude
        || existingChart.result.input.longitude !== ownedProfile.longitude) {
        return jsonError("The saved chart details do not match the selected birth profile.", 422, "PROFILE_CHART_MISMATCH");
      }
    }
    const data = {
      ...(body.title !== undefined ? { title: (body.title as string).trim() } : {}),
      ...(body.profileId !== undefined ? { profileId: body.profileId as string | null } : {}),
    };
    const updated = await prisma.savedChart.updateMany({ where: ownedRecordWhere(user.id, chartId), data });
    if (!updated.count) return jsonError("Saved chart not found.", 404, "NOT_FOUND");
    const chart = await prisma.savedChart.findFirst({
      where: ownedRecordWhere(user.id, chartId),
      select: { id: true, profileId: true, title: true, engineVersion: true, ephemerisManifest: true, ruleSetVersion: true, resultHash: true, createdAt: true },
    });
    return NextResponse.json({ chart }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    return jsonError("Saved-chart storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const { chartId } = await context.params;
    const deleted = await getPrisma().savedChart.deleteMany({ where: ownedRecordWhere(user.id, chartId) });
    if (!deleted.count) return jsonError("Saved chart not found.", 404, "NOT_FOUND");
    return NextResponse.json({ deleted: true });
  } catch {
    return jsonError("Saved-chart storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
