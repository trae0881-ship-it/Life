import { NextRequest, NextResponse } from "next/server";
import { calculateTransits } from "@/calculation/events";
import { InputError } from "@/calculation/time";
import { resolveTransitRequest } from "@/calculation/transit-input";
import { engineHealth } from "@/calculation/health";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";
import { requireRole } from "@/server/auth";
import { withApiKeyAccess } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiKeyAccess(request, "POST /api/transits", { repository: getPrisma, pepper: process.env.API_KEY_PEPPER }, async (apiAccess) => {
    if (apiAccess.kind === "session" && !isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
    try {
      if (apiAccess.kind === "session") {
        const auth = await requireRole(request, ["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"]);
        if (auth.status !== 200) return jsonError(auth.status === 401 ? "Sign in is required." : "Chart access is not allowed.", auth.status, auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
      }
      const rate = checkRateLimit(`transits:${apiAccess.kind === "key" ? apiAccess.key.keyId : requestRateLimitKey(request)}`, apiAccess.kind === "key" ? apiAccess.key.requestsPerMinute : 12, 60_000);
      if (!rate.allowed) return NextResponse.json({ error: "Too many transit calculations. Try again later.", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" } });
      const body = await readJson(request);
      if (!body) return jsonError("Transit date, IANA timezone, coordinates, and supported ayanamsa are required.", 422, "INVALID_TRANSIT_INPUT");
      const { instant, ayanamsa } = resolveTransitRequest(body);
      const health = await engineHealth();
      if (!health.ready) return jsonError("Local ephemeris or native engine is unavailable; no fallback was used.", 503, "ENGINE_UNAVAILABLE");
      return NextResponse.json(calculateTransits(instant, { ayanamsa }), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
      if (error instanceof InputError) return jsonError(error.message, 422, error.code);
      return jsonError("The local transit calculation could not complete.", 503, "TRANSIT_CALCULATION_FAILED");
    }
  });
}
