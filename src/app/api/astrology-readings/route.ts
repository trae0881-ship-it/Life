import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";
import { parseAstrologyReadingService, validateAstrologyReadingInput } from "@/server/astrology-readings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const service = parseAstrologyReadingService(request.nextUrl.searchParams.get("service"));
    if (!service) return jsonError("Choose a supported astrology service.", 400, "INVALID_SERVICE");
    const readings = await getPrisma().savedAstrologyReading.findMany({
      where: { userId: user.id, service },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: { id: true, service: true, title: true, payload: true, createdAt: true },
    });
    return NextResponse.json({ readings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load user astrology reading history.", error);
    return jsonError("Astrology reading storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const body = await readJson(request, 5_000_000);
    const input = validateAstrologyReadingInput(body);
    if (!input) return jsonError("A valid service, title and bounded reading payload are required.", 422, "INVALID_READING");
    const reading = await getPrisma().savedAstrologyReading.create({
      data: { userId: user.id, service: input.service, title: input.title, payload: input.payload as object },
      select: { id: true, service: true, title: true, payload: true, createdAt: true },
    });
    return NextResponse.json({ reading }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON");
    console.error("Could not save user astrology reading.", error);
    return jsonError("Astrology reading storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
