import { NextRequest, NextResponse } from "next/server";
import { authenticateCredentials, createSession } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { isSameOriginMutation, jsonError, logAuthServiceError, readJson, RequestBodyError, sessionCookie } from "@/server/http";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  const limit = checkRateLimit(`login:${requestRateLimitKey(request)}`, 5, 15 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many sign-in attempts. Try again later.", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } });
  try {
    const body = await readJson(request);
    if (!body) return jsonError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    const user = await authenticateCredentials({ email: body.email, password: body.password }, getPrisma());
    if (!user) return jsonError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    if (body.portal === "developer" && user.role !== "DEVELOPER") {
      return jsonError("Developer account access is required.", 403, "DEVELOPER_REQUIRED");
    }
    if (body.portal === "super-admin" && user.role !== "SUPER_ADMIN") {
      return jsonError("This sign-in route is for Super Admin accounts.", 403, "SUPER_ADMIN_REQUIRED");
    }
    const { token, expiresAt } = await createSession(user.id, getPrisma());
    return NextResponse.json({ user }, { headers: { "Set-Cookie": sessionCookie(token, expiresAt), "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    logAuthServiceError("login", error);
    return jsonError("Account service is temporarily unavailable.", 503, "AUTH_UNAVAILABLE");
  }
}
