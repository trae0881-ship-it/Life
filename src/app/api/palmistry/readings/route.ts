import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildPalmistryReport } from "@/presentation/palmistry-knowledge-base";
import { getUserFromRequest } from "@/server/auth";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { withUserScopedDatabase } from "@/server/kundali-storage";
import {
  hasPalmistryObservations,
  parsePalmistryObservations,
  readPalmistryObservationsInput,
} from "@/server/palmistry-observations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const readings = await withUserScopedDatabase(user.id, (transaction) => transaction.palmistryReading.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, observations: true, createdAt: true },
    }));
    const result = readings.map((reading) => {
      const observations = parsePalmistryObservations(reading.observations);
      if (!observations) throw new Error("Stored Palmistry reading is invalid.");
      return {
        id: reading.id,
        title: reading.title,
        createdAt: reading.createdAt,
        observations,
        report: buildPalmistryReport(observations),
      };
    });
    return NextResponse.json({ readings: result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Palmistry readings could not be loaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry history is temporarily unavailable.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`palmistry-reading-save:${user.id}`, 20, 60_000);
    if (!rate.allowed) return jsonError("Too many saved readings. Try again shortly.", 429, "RATE_LIMITED");
    const body = await readJson(request, 24_000);
    if (!body || Object.keys(body).length !== 2 || typeof body.title !== "string"
      || body.title.trim().length < 1 || body.title.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(body.title)) {
      return jsonError("Enter a reading title of up to 120 characters.", 422, "INVALID_READING");
    }
    const observations = readPalmistryObservationsInput(body.observations);
    if (!observations || !hasPalmistryObservations(observations)) {
      return jsonError("Add at least one verified observation before saving a report.", 422, "INVALID_READING");
    }
    const report = buildPalmistryReport(observations);
    const reading = await withUserScopedDatabase(user.id, (transaction) => transaction.palmistryReading.create({
      data: {
        id: randomBytes(24).toString("base64url"),
        userId: user.id,
        title: body.title.trim(),
        observations,
        report,
      },
      select: { id: true, title: true, createdAt: true },
    }));
    return NextResponse.json({
      reading: { ...reading, observations, report },
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, "INVALID_READING");
    console.error("Palmistry report could not be saved.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry report could not be saved.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !/^[A-Za-z0-9_-]{32}$/.test(id)) return jsonError("Choose a saved reading.", 422, "INVALID_READING");
    const rate = checkRateLimit(`palmistry-reading-delete:${user.id}`, 30, 60_000);
    if (!rate.allowed) return jsonError("Too many delete requests. Try again shortly.", 429, "RATE_LIMITED");
    const deleted = await withUserScopedDatabase(user.id, (transaction) => transaction.palmistryReading.deleteMany({
      where: { id, userId: user.id },
    }));
    if (!deleted.count) return jsonError("Saved reading not found.", 404, "PALMISTRY_READING_NOT_FOUND");
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Palmistry reading could not be deleted.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry reading could not be deleted.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}
