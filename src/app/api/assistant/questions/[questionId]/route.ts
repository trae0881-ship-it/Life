import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { hasCurrentTermsAcceptance } from "@/server/legal-acceptance";
import { ownedRecordWhere } from "@/server/ownership";
import { jsonError, isSameOriginMutation } from "@/server/http";
import { CURRENT_TERMS_VERSION } from "@/legal/terms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ questionId: string }> };

async function authorize(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return { user: null, response: jsonError("Sign in is required.", 401, "UNAUTHENTICATED") };
  if (!await hasCurrentTermsAcceptance(user.id)) {
    return {
      user: null,
      response: NextResponse.json({
        error: "Accept the current Terms & Conditions before using saved question history.",
        code: "TERMS_ACCEPTANCE_REQUIRED",
        currentVersion: CURRENT_TERMS_VERSION,
      }, { status: 428, headers: { "Cache-Control": "no-store" } }),
    };
  }
  return { user, response: null };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authorize(request);
    if (auth.response) return auth.response;
    const { questionId } = await context.params;
    const record = await getPrisma().kundliQuestion.findFirst({
      where: ownedRecordWhere(auth.user!.id, questionId),
      select: {
        id: true, profileId: true, question: true, questionId: true, topic: true,
        answer: true, answerStatus: true, createdAt: true,
        answeredAt: true,
        profile: { select: { label: true } },
      },
    });
    if (!record) return jsonError("Question history entry not found.", 404, "NOT_FOUND");
    return NextResponse.json({ question: {
      id: record.id,
      profileId: record.profileId,
      profileLabel: record.profile?.label ?? null,
      question: record.question,
      questionId: record.questionId,
      topic: record.topic,
      answer: record.answer,
      answerStatus: record.answerStatus,
      createdAt: record.createdAt,
      answeredAt: record.answeredAt,
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Question history is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const auth = await authorize(request);
    if (auth.response) return auth.response;
    const { questionId } = await context.params;
    const deleted = await getPrisma().kundliQuestion.deleteMany({
      where: ownedRecordWhere(auth.user!.id, questionId),
    });
    if (!deleted.count) return jsonError("Question history entry not found.", 404, "NOT_FOUND");
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Question could not be deleted.", 503, "DATABASE_UNAVAILABLE");
  }
}
