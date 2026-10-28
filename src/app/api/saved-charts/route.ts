import { NextRequest, NextResponse } from "next/server";
import { calculateBirthChart, UnsupportedEphemerisDateError, UnsupportedHouseCalculationError } from "@/calculation/chart";
import { engineHealth } from "@/calculation/health";
import { InputError, type BirthInput } from "@/calculation/time";
import { getUserFromRequest } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
import { ownedRecordData, ownedRecordWhere } from "@/server/ownership";
import { savedReportSummary } from "@/server/saved-report-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 120;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const records = await getPrisma().savedChart.findMany({
      where: ownedRecordWhere(user.id),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true, profileId: true, title: true, createdAt: true,
        inputSnapshot: true, result: true,
        profile: { select: { label: true, localDate: true, localTime: true, timeZone: true, latitude: true, longitude: true } },
      },
    });
    const charts = records.map(({ inputSnapshot, result, profile, ...record }) => ({
      ...record,
      ...savedReportSummary({ inputSnapshot, result, profile }),
    }));
    return NextResponse.json({ charts }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Saved-chart storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const body = await readJson(request, 16_000);
    if (!body || !validTitle(body.title) || !body.input || typeof body.input !== "object" || Array.isArray(body.input)) return jsonError("A chart title and complete birth input are required.", 422, "INVALID_SAVED_CHART");
    if (body.profileId !== undefined && body.profileId !== null && typeof body.profileId !== "string") return jsonError("Invalid profile reference.", 422, "INVALID_PROFILE");
    const prisma = getPrisma();
    const linkedProfile = typeof body.profileId === "string"
      ? await prisma.birthProfile.findFirst({
        where: ownedRecordWhere(user.id, body.profileId),
        select: { id: true, label: true, localDate: true, localTime: true, timeZone: true, latitude: true, longitude: true },
      })
      : null;
    if (typeof body.profileId === "string") {
      const ownedProfile = linkedProfile;
      if (!ownedProfile) return jsonError("Profile not found.", 404, "NOT_FOUND");
    }
    const health = await engineHealth();
    if (!health.ready) return jsonError("Local calculation engine is unavailable.", 503, "ENGINE_UNAVAILABLE");
    const chart = calculateBirthChart(body.input as BirthInput);
    if (linkedProfile && (
      chart.input.localDate !== linkedProfile.localDate
      || chart.input.localTime !== linkedProfile.localTime
      || chart.input.timeZone !== linkedProfile.timeZone
      || chart.input.latitude !== linkedProfile.latitude
      || chart.input.longitude !== linkedProfile.longitude
    )) {
      return jsonError("The saved chart birth details must match the selected birth profile.", 422, "PROFILE_CHART_MISMATCH");
    }
    const result = JSON.parse(JSON.stringify(chart));
    const saved = await prisma.savedChart.create({
      data: ownedRecordData(user.id, {
        profileId: typeof body.profileId === "string" ? body.profileId : null,
        title: body.title.trim(),
        engineVersion: chart.settings.engine,
        ephemerisManifest: JSON.stringify(chart.settings.ephemerisAssets),
        ruleSetVersion: chart.settings.ruleSetVersion,
        settings: JSON.parse(JSON.stringify(chart.settings)),
        inputSnapshot: JSON.parse(JSON.stringify(chart.input)),
        result,
        resultHash: chart.provenance.resultHash,
      }),
      select: { id: true, profileId: true, title: true, createdAt: true },
    });
    return NextResponse.json({
      chart: {
        ...saved,
        ...savedReportSummary({ inputSnapshot: chart.input, result: chart, profile: linkedProfile }),
      },
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (error instanceof InputError) return jsonError(error.message, 422, error.code);
    if (error instanceof UnsupportedEphemerisDateError) return jsonError(error.message, 422, "UNSUPPORTED_EPHEMERIS_DATE");
    if (error instanceof UnsupportedHouseCalculationError) return jsonError(error.message, 422, "UNSUPPORTED_HOUSE_SYSTEM");
    return jsonError("Saved-chart storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
