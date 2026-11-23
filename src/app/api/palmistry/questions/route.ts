import { NextRequest, NextResponse } from "next/server";
import { assistantQuestionCatalog, type AssistantQuestionId } from "@/presentation/assistant-questions";
import { answerPalmistryQuestion } from "@/presentation/palmistry-assistant";
import { languages } from "@/presentation/language";
import { getUserFromRequest } from "@/server/auth";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { withUserScopedDatabase } from "@/server/kundali-storage";
import { parsePalmistryObservations } from "@/server/palmistry-observations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`palmistry-question:${user.id}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many questions. Try again shortly.", code: "RATE_LIMITED" }, {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }
    const body = await readJson(request, 1_000);
    if (!body || Object.keys(body).length !== 2
      || typeof body.questionId !== "string"
      || !assistantQuestionCatalog.some((question) => question.id === body.questionId)
      || typeof body.language !== "string"
      || !languages.includes(body.language as typeof languages[number])) {
      return jsonError("Choose a supported Palmistry question.", 422, "INVALID_QUESTION");
    }
    const storedRecord = await withUserScopedDatabase(user.id, async (transaction) => {
      return transaction.palmistryRecord.findUnique({
        where: { userId: user.id },
        select: { observations: true },
      });
    });
    if (!storedRecord) return jsonError("Upload a hand image before asking questions.", 404, "PALMISTRY_NOT_FOUND");
    const observations = parsePalmistryObservations(storedRecord.observations);
    if (!observations) {
      console.error("Palmistry observations could not be read.", { errorType: "InvalidStoredData" });
      return jsonError("Palmistry information is temporarily unavailable.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
    }
    const answer = answerPalmistryQuestion(observations, body.questionId as AssistantQuestionId);
    return NextResponse.json({ answer }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, "INVALID_QUESTION");
    console.error("Palmistry question could not be answered.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry question could not be answered.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}
