import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { isSameOriginMutation, jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReadingRouteContext = { params: Promise<{ readingId: string }> };

export async function DELETE(request: NextRequest, context: ReadingRouteContext) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const { readingId } = await context.params;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(readingId)) return jsonError("Invalid reading ID.", 400, "INVALID_READING_ID");
    const result = await getPrisma().savedAstrologyReading.deleteMany({ where: { id: readingId, userId: user.id } });
    if (result.count === 0) return jsonError("Reading not found.", 404, "NOT_FOUND");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Could not delete user astrology reading.", error);
    return jsonError("Astrology reading storage is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
