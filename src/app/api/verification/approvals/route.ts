import { NextRequest, NextResponse } from "next/server";
import { VERIFICATION_SECTIONS } from "@/verification/definitions";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const REVIEWER_ROLES = ["DEVELOPER", "ADMIN", "SUPER_ADMIN"] as const;

async function reviewer(request: NextRequest) {
  const auth = await requireRole(request, REVIEWER_ROLES);
  if (auth.status !== 200) return { user: null, response: jsonError(auth.status === 401 ? "Sign in is required." : "Authorized reviewer access is required.", auth.status, auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN") };
  return { user: auth.user, response: null };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await reviewer(request);
    if (auth.response || !auth.user) return auth.response;
    const approvals = await getPrisma().verificationApproval.findMany({
      where: { userId: auth.user.id },
      orderBy: { approvedAt: "desc" },
      select: { id: true, requirementId: true, approvedAt: true },
    });
    return NextResponse.json({ approvals }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Review records are temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const auth = await reviewer(request);
    if (auth.response || !auth.user) return auth.response;
    const body = await readJson(request, 5_000);
    if (!body || typeof body.requirementId !== "string" || !VERIFICATION_SECTIONS.some((item) => item.id === body.requirementId)) {
      return jsonError("A valid requirement ID is required.", 422, "INVALID_REQUIREMENT");
    }
    if (body.reviewer !== undefined || body.userId !== undefined || body.role !== undefined) return jsonError("Reviewer identity and role are derived from the authenticated session.", 422, "CLIENT_IDENTITY_NOT_ALLOWED");
    if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 1000)) return jsonError("Review note must be at most 1000 characters.", 422, "INVALID_NOTE");
    const approval = await getPrisma().verificationApproval.upsert({
      where: { requirementId_userId: { requirementId: body.requirementId, userId: auth.user.id } },
      create: { requirementId: body.requirementId, userId: auth.user.id, note: typeof body.note === "string" ? body.note.trim() || null : null },
      update: { note: typeof body.note === "string" ? body.note.trim() || null : null, approvedAt: new Date() },
      select: { id: true, requirementId: true, approvedAt: true },
    });
    return NextResponse.json({ approval }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    return jsonError("Review records are temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const auth = await reviewer(request);
    if (auth.response || !auth.user) return auth.response;
    const body = await readJson(request, 5_000);
    if (!body || typeof body.requirementId !== "string" || !VERIFICATION_SECTIONS.some((item) => item.id === body.requirementId)) {
      return jsonError("A valid requirement ID is required.", 422, "INVALID_REQUIREMENT");
    }
    const result = await getPrisma().verificationApproval.deleteMany({ where: { requirementId: body.requirementId, userId: auth.user.id } });
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    return jsonError("Review records are temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
