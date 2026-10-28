import { NextRequest, NextResponse } from "next/server";
import { answerKundliQuestion, isAssistantChart } from "@/presentation/kundli-assistant";
import { assistantQuestionCatalog } from "@/presentation/assistant-questions";
import { languages } from "@/presentation/language";
import { CURRENT_TERMS_VERSION } from "@/legal/terms";
import { getUserFromRequest } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { hasCurrentTermsAcceptance } from "@/server/legal-acceptance";
import { ownedRecordWhere } from "@/server/ownership";
import { chartMatchesBirthProfile } from "@/server/assistant-question-validation";
import { checkRateLimit } from "@/server/rate-limit";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const questionTopics = [...new Set(assistantQuestionCatalog.map((item) => item.topic))];
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function questionResponse(record: {
  id: string;
  profileId: string | null;
  question: string;
  questionId: string | null;
  topic: string | null;
  answer: unknown;
  answerStatus: string;
  createdAt: Date;
  answeredAt: Date;
  profile: { label: string } | null;
}) {
  return {
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
  };
}

function validDateFilter(value: string | null) {
  if (value === null) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

async function requireAcceptedUser(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAcceptedUser(request);
    if (auth.response) return auth.response;
    const user = auth.user!;
    const params = request.nextUrl.searchParams;
    const search = params.get("search")?.trim() ?? "";
    const topic = params.get("topic") ?? "";
    const cursor = params.get("cursor");
    const from = params.get("from");
    const to = params.get("to");
    if (search.length > 100) return jsonError("Search text must be at most 100 characters.", 422, "INVALID_SEARCH");
    if (topic && !questionTopics.includes(topic as typeof questionTopics[number])) return jsonError("Unsupported topic filter.", 422, "INVALID_TOPIC");
    if (!validDateFilter(from) || !validDateFilter(to) || (from && to && from > to)) {
      return jsonError("Enter a valid date range.", 422, "INVALID_DATE_RANGE");
    }
    const prisma = getPrisma();
    if (cursor) {
      const ownedCursor = await prisma.kundliQuestion.findFirst({
        where: ownedRecordWhere(user.id, cursor),
        select: { id: true },
      });
      if (!ownedCursor) return jsonError("History cursor is invalid.", 400, "INVALID_CURSOR");
    }
    const records = await prisma.kundliQuestion.findMany({
      where: {
        userId: user.id,
        ...(topic ? { topic } : {}),
        ...(search ? { question: { contains: search, mode: "insensitive" } } : {}),
        ...((from || to) ? { createdAt: {
          ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
          ...(to ? { lt: new Date(Date.parse(`${to}T00:00:00.000Z`) + 86_400_000) } : {}),
        } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: PAGE_SIZE + 1,
      select: {
        id: true, profileId: true, question: true, questionId: true, topic: true,
        answer: true, answerStatus: true, createdAt: true,
        answeredAt: true,
        profile: { select: { label: true } },
      },
    });
    const hasMore = records.length > PAGE_SIZE;
    const page = records.slice(0, PAGE_SIZE);
    return NextResponse.json({
      questions: page.map(questionResponse),
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Question history is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  let currentRequestId = "";
  let submitted: { profileId: string; savedChartId: string; question: string; questionId: string | null } | null = null;
  try {
    const auth = await requireAcceptedUser(request);
    if (auth.response) return auth.response;
    const user = auth.user!;
    const limit = checkRateLimit(`assistant:${user.id}`, 10, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many questions. Try again shortly.", code: "RATE_LIMITED" }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }
    const body = await readJson(request, 8_000);
    if (!body
      || typeof body.profileId !== "string" || body.profileId.length > 100
      || typeof body.savedChartId !== "string" || body.savedChartId.length > 100
      || typeof body.requestId !== "string" || !requestIdPattern.test(body.requestId)
      || typeof body.question !== "string" || body.question.trim().length < 1 || body.question.trim().length > 500
      || typeof body.language !== "string" || !languages.includes(body.language as typeof languages[number])
      || (body.questionId !== undefined && (typeof body.questionId !== "string" || !assistantQuestionCatalog.some((item) => item.id === body.questionId)))) {
      return jsonError("Choose an owned birth profile and saved chart, and enter a question up to 500 characters.", 422, "INVALID_QUESTION");
    }
    currentRequestId = body.requestId;
    submitted = {
      profileId: body.profileId,
      savedChartId: body.savedChartId,
      question: body.question.trim(),
      questionId: typeof body.questionId === "string" ? body.questionId : null,
    };
    const prisma = getPrisma();
    const previous = await prisma.kundliQuestion.findFirst({
      where: { userId: user.id, requestId: body.requestId },
      select: {
        id: true, profileId: true, savedChartId: true, question: true, questionId: true, topic: true,
        answer: true, answerStatus: true, createdAt: true,
        answeredAt: true,
        profile: { select: { label: true } },
      },
    });
    if (previous) {
      if (previous.profileId !== submitted.profileId || previous.savedChartId !== submitted.savedChartId
        || previous.question !== submitted.question || previous.questionId !== submitted.questionId) {
        return jsonError("This request identifier was already used for a different question.", 409, "REQUEST_ID_CONFLICT");
      }
      return NextResponse.json({ question: questionResponse(previous) }, { headers: { "Cache-Control": "no-store" } });
    }

    const profile = await prisma.birthProfile.findFirst({
      where: ownedRecordWhere(user.id, body.profileId),
      select: { id: true, label: true, localDate: true, localTime: true, timeZone: true, latitude: true, longitude: true },
    });
    if (!profile) return jsonError("Birth profile not found.", 404, "PROFILE_NOT_FOUND");
    const savedChart = await prisma.savedChart.findFirst({
      where: { id: body.savedChartId, userId: user.id, profileId: profile.id },
      select: { id: true, result: true, resultHash: true },
    });
    if (!savedChart) return jsonError("Select a saved chart belonging to this birth profile.", 404, "CHART_NOT_FOUND");
    if (!isAssistantChart(savedChart.result)) return jsonError("The saved chart is incomplete and cannot support an answer.", 422, "CHART_UNAVAILABLE");
    if (!chartMatchesBirthProfile(savedChart.result.input, profile)) {
      return jsonError("The saved chart birth details do not match this profile.", 409, "PROFILE_CHART_MISMATCH");
    }

    const query = typeof body.questionId === "string" ? body.questionId : body.question.trim();
    const answer = answerKundliQuestion(savedChart.result, query, body.language as typeof languages[number]);
    const safeAnswer = { ...answer, provenance: null };
    const record = await prisma.kundliQuestion.create({
      data: {
        userId: user.id,
        profileId: profile.id,
        savedChartId: savedChart.id,
        requestId: body.requestId,
        question: body.question.trim(),
        questionId: typeof body.questionId === "string" ? body.questionId : null,
        topic: answer.topic,
        answer: JSON.parse(JSON.stringify(safeAnswer)),
        answerStatus: answer.status,
        chartResultHash: savedChart.resultHash,
        answeredAt: new Date(),
      },
      select: {
        id: true, profileId: true, question: true, questionId: true, topic: true,
        answer: true, answerStatus: true, createdAt: true,
        answeredAt: true,
        profile: { select: { label: true } },
      },
    });
    return NextResponse.json({ question: questionResponse(record) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      try {
        const auth = await requireAcceptedUser(request);
        if (auth.response) return auth.response;
        if (!currentRequestId) return jsonError("Question could not be saved.", 503, "DATABASE_UNAVAILABLE");
        const record = await getPrisma().kundliQuestion.findFirst({
          where: { userId: auth.user!.id, requestId: currentRequestId },
          select: {
            id: true, profileId: true, savedChartId: true, question: true, questionId: true, topic: true,
            answer: true, answerStatus: true, createdAt: true,
            answeredAt: true,
            profile: { select: { label: true } },
          },
        });
        if (record && submitted && record.profileId === submitted.profileId
          && record.savedChartId === submitted.savedChartId
          && record.question === submitted.question && record.questionId === submitted.questionId) {
          return NextResponse.json({ question: questionResponse(record) }, { headers: { "Cache-Control": "no-store" } });
        }
        if (record) return jsonError("This request identifier was already used for a different question.", 409, "REQUEST_ID_CONFLICT");
      } catch {
        return jsonError("Question could not be saved. Retry with the same request.", 503, "DATABASE_UNAVAILABLE");
      }
    }
    return jsonError("Question could not be saved. Retry with the same request.", 503, "DATABASE_UNAVAILABLE");
  }
}
