import { NextRequest, NextResponse } from "next/server";
import { AuthInputError, registerAccountWithSession } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { isSameOriginMutation, jsonError, logAuthServiceError, readJson, RequestBodyError, sessionCookie } from "@/server/http";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";
import { CURRENT_TERMS_VERSION } from "@/legal/terms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  const limit = checkRateLimit(`register:${requestRateLimitKey(request)}`, 3, 15 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many account attempts. Try again later.", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } });
  try {
    const body = await readJson(request);
    if (!body) return jsonError("Account details are required.", 422, "INVALID_INPUT");
    if (body.termsVersion !== CURRENT_TERMS_VERSION || body.acceptedTerms !== true) {
      return jsonError("Accept the current Terms & Conditions to create an account.", 422, "TERMS_ACCEPTANCE_REQUIRED");
    }
    const { user, token, expiresAt } = await registerAccountWithSession({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      confirmPassword: body.confirmPassword,
      termsVersion: CURRENT_TERMS_VERSION,
      acceptedTerms: true,
    }, getPrisma());
    return NextResponse.json({ user }, { status: 201, headers: { "Set-Cookie": sessionCookie(token, expiresAt), "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthInputError) return jsonError(error.message, 422, error.code);
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return jsonError("An account with that email already exists. Sign in instead.", 409, "EMAIL_ALREADY_REGISTERED");
    logAuthServiceError("registration", error);
    return jsonError("Account service is temporarily unavailable.", 503, "AUTH_UNAVAILABLE");
  }
}
