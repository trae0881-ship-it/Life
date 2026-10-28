import { NextRequest, NextResponse } from "next/server";
import { calculateBirthChart, UnsupportedEphemerisDateError, UnsupportedHouseCalculationError } from "@/calculation/chart";
import { engineHealth } from "@/calculation/health";
import { InputError } from "@/calculation/time";
import { isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";
import { validateChartInput } from "@/server/birth-validation";
import { requireRole } from "@/server/auth";
import { withApiKeyAccess } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, code: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, code, details }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  return withApiKeyAccess(request, "POST /api/charts", { repository: getPrisma, pepper: process.env.API_KEY_PEPPER }, async (apiAccess) => {
    if (apiAccess.kind === "session" && !isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", "INVALID_ORIGIN", 403);
    try {
      if (apiAccess.kind === "session") {
        const auth = await requireRole(request, ["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"]);
        if (auth.status !== 200) return jsonError(auth.status === 401 ? "Sign in is required." : "Chart access is not allowed.", auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", auth.status);
      }
      const rate = checkRateLimit(`charts:${apiAccess.kind === "key" ? apiAccess.key.keyId : requestRateLimitKey(request)}`, apiAccess.kind === "key" ? apiAccess.key.requestsPerMinute : 20, 60_000);
      if (!rate.allowed) return NextResponse.json({ error: "Too many calculations. Try again in a minute.", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" } });
      const payload = await readJson(request);
      if (!payload) return jsonError("Birth details are required.", "INVALID_INPUT", 422);
      if (payload.fullName !== undefined && (typeof payload.fullName !== "string" || payload.fullName.trim().length > 120)) return jsonError("Enter a chart name of up to 120 characters.", "INVALID_NAME", 422);
      if (payload.birthPlace !== undefined && payload.birthPlace !== null && (typeof payload.birthPlace !== "string" || payload.birthPlace.trim().length > 160)) return jsonError("Enter a birthplace label up to 160 characters.", "INVALID_BIRTHPLACE", 422);
      if (payload.coordinateSource !== undefined && payload.coordinateSource !== null && (typeof payload.coordinateSource !== "string" || !["birth-record", "gazetteer", "manual-unknown"].includes(payload.coordinateSource))) return jsonError("Choose a supported coordinate source.", "INVALID_COORDINATE_SOURCE", 422);
      const input = validateChartInput(payload);
      const health = await engineHealth();
      if (!health.ready) return jsonError("Local ephemeris or native engine is unavailable; no fallback was used.", "ENGINE_UNAVAILABLE", 503, health);
      const chart = calculateBirthChart(input);
      return NextResponse.json(chart, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof RequestBodyError) return jsonError(error.message, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE", error.status);
      if (error instanceof InputError) return jsonError(error.message, error.code, 422, error.details);
      if (error instanceof UnsupportedEphemerisDateError) return jsonError(error.message, "UNSUPPORTED_EPHEMERIS_DATE", 422);
      if (error instanceof UnsupportedHouseCalculationError) return jsonError(error.message, "UNSUPPORTED_HOUSE_SYSTEM", 422);
      return jsonError("The local calculation engine could not complete this chart. Check engine health and supported inputs.", "CALCULATION_FAILED", 503);
    }
  });
}
