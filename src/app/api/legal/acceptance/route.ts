import { NextRequest, NextResponse } from "next/server";
import { CURRENT_TERMS_VERSION } from "@/legal/terms";
import { getUserFromRequest } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { hasCurrentTermsAcceptance } from "@/server/legal-acceptance";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const record = await getPrisma().user.findUnique({
      where: { id: user.id },
      select: { termsVersion: true, termsAcceptedAt: true },
    });
    if (!record) return jsonError("Account not found.", 404, "NOT_FOUND");
    return NextResponse.json({
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedVersion: record.termsVersion,
      acceptedAt: record.termsAcceptedAt,
      requiresAcceptance: !await hasCurrentTermsAcceptance(user.id),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Legal acceptance status is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const body = await readJson(request, 2_000);
    if (body?.accepted !== true || body.version !== CURRENT_TERMS_VERSION) {
      return jsonError("Accept the current Terms & Conditions to continue.", 422, "INVALID_ACCEPTANCE");
    }
    const acceptedAt = new Date();
    await getPrisma().user.update({
      where: { id: user.id },
      data: { termsVersion: CURRENT_TERMS_VERSION, termsAcceptedAt: acceptedAt },
      select: { id: true },
    });
    return NextResponse.json({
      acceptedVersion: CURRENT_TERMS_VERSION,
      acceptedAt,
      requiresAcceptance: false,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    return jsonError("Legal acceptance could not be saved.", 503, "DATABASE_UNAVAILABLE");
  }
}
