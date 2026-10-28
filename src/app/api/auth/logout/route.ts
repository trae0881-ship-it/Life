import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, revokeSession } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { clearSessionCookie, isSameOriginMutation, jsonError, logAuthServiceError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ loggedOut: true }, { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
  try {
    await revokeSession(token, getPrisma());
    return NextResponse.json({ loggedOut: true }, { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
  } catch (error) {
    logAuthServiceError("logout", error);
    return jsonError("Account service is temporarily unavailable.", 503, "AUTH_UNAVAILABLE");
  }
}
