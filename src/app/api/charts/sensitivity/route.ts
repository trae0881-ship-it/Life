import { NextRequest, NextResponse } from "next/server";
import { calculateBirthTimeSensitivity, UnsupportedEphemerisDateError, UnsupportedHouseCalculationError } from "@/calculation/chart";
import { engineHealth } from "@/calculation/health";
import { InputError } from "@/calculation/time";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";
import { validateChartInput } from "@/server/birth-validation";
import { requireRole } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const auth = await requireRole(request, ["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"]);
    if (auth.status !== 200) return jsonError(auth.status === 401 ? "Sign in is required." : "Chart access is not allowed.", auth.status, auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
    const rate = checkRateLimit(`chart-sensitivity:${requestRateLimitKey(request)}`, 5, 60_000);
    if (!rate.allowed) return NextResponse.json({ error: "Sensitivity runs are limited to five per minute.", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" } });
    const payload = await readJson(request);
    if (!payload) return jsonError("Birth details are required.", 422, "INVALID_INPUT");
    if ((payload.fullName !== undefined && (typeof payload.fullName !== "string" || payload.fullName.trim().length > 120)) || typeof payload.birthPlace !== "string" || !payload.birthPlace.trim() || payload.birthPlace.trim().length > 160) return NextResponse.json({ error: "Enter an optional chart name of up to 120 characters and a birthplace label of up to 160 characters." }, { status: 422 });
    if (typeof payload.coordinateSource !== "string" || !["birth-record", "gazetteer", "manual-unknown"].includes(payload.coordinateSource)) return jsonError("Choose where the coordinates came from.", 422, "INVALID_COORDINATE_SOURCE");
    const windowMinutes = payload.windowMinutes;
    if (windowMinutes !== 2 && windowMinutes !== 5 && windowMinutes !== 15) return NextResponse.json({ error: "Choose a 2, 5, or 15 minute sensitivity window." }, { status: 422 });
    const health = await engineHealth();
    if (!health.ready) return NextResponse.json({ error: "Local engine or ephemeris files are unavailable." }, { status: 503 });
    const result = calculateBirthTimeSensitivity(validateChartInput(payload), windowMinutes);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (error instanceof InputError) return jsonError(error.message, 422, error.code, error.details);
    if (error instanceof UnsupportedEphemerisDateError) return jsonError(error.message, 422, "UNSUPPORTED_EPHEMERIS_DATE");
    if (error instanceof UnsupportedHouseCalculationError) return jsonError(error.message, 422, "UNSUPPORTED_HOUSE_SYSTEM");
    return jsonError("The local sensitivity calculation could not complete.", 503, "SENSITIVITY_CALCULATION_FAILED");
  }
}
