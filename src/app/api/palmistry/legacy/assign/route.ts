import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { withUserScopedDatabase } from "@/server/kundali-storage";
import { palmistryDownloadName } from "@/server/palmistry-files";
import {
  assignLegacyObservations,
  parsePalmistryObservations,
  type PalmistryHand,
} from "@/server/palmistry-observations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHand(value: unknown): value is PalmistryHand {
  return value === "left" || value === "right";
}

function dbHand(hand: PalmistryHand) {
  return hand === "left" ? "LEFT" as const : "RIGHT" as const;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`palmistry-legacy-assign:${user.id}`, 10, 60_000);
    if (!rate.allowed) return jsonError("Too many updates. Try again shortly.", 429, "RATE_LIMITED");
    const body = await readJson(request, 200);
    if (!body || Object.keys(body).length !== 1 || !isHand(body.hand)) {
      return jsonError("Choose a left or right hand.", 422, "INVALID_HAND");
    }
    const hand = body.hand;
    const outcome = await withUserScopedDatabase(user.id, async (transaction) => {
      const record = await transaction.palmistryRecord.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          contentType: true,
          fileExtension: true,
          fileSizeBytes: true,
          originalFile: true,
          observations: true,
          uploadedAt: true,
        },
      });
      if (!record?.originalFile || !record.contentType || !record.fileExtension || !record.fileSizeBytes) return { kind: "missing" as const };
      const target = await transaction.palmistryHandImage.findUnique({
        where: { userId_handSide: { userId: user.id, handSide: dbHand(hand) } },
        select: { id: true },
      });
      if (target) return { kind: "conflict" as const };
      const observations = parsePalmistryObservations(record.observations);
      if (!observations) return { kind: "invalid" as const };
      const assigned = assignLegacyObservations(observations, hand);
      const image = await transaction.palmistryHandImage.create({
        data: {
          id: randomBytes(24).toString("base64url"),
          userId: user.id,
          handSide: dbHand(hand),
          contentType: record.contentType,
          fileExtension: record.fileExtension,
          fileSizeBytes: record.fileSizeBytes,
          originalFile: record.originalFile,
          uploadedAt: record.uploadedAt,
        },
        select: { id: true, fileExtension: true, uploadedAt: true },
      });
      const updatedRecord = await transaction.palmistryRecord.update({
        where: { userId: user.id },
        data: {
          contentType: null,
          fileExtension: null,
          fileSizeBytes: null,
          originalFile: null,
          observations: assigned,
        },
        select: { updatedAt: true },
      });
      return {
        kind: "assigned" as const,
        updatedAt: updatedRecord.updatedAt,
        image: {
          fileExtension: image.fileExtension,
          uploadedAt: image.uploadedAt,
          downloadName: palmistryDownloadName(image.id, image.uploadedAt, image.fileExtension, hand),
        },
        observations: assigned,
      };
    });
    if (outcome.kind === "missing") return jsonError("No unassigned Palmistry image is available.", 404, "PALMISTRY_NOT_FOUND");
    if (outcome.kind === "conflict") return jsonError("Delete or replace the selected hand image before assigning this one.", 409, "HAND_ALREADY_HAS_IMAGE");
    if (outcome.kind === "invalid") {
      console.error("Legacy Palmistry observations could not be migrated.", { errorType: "InvalidStoredData" });
      return jsonError("Palmistry information is temporarily unavailable.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
    }
    return NextResponse.json({
      hand,
      image: outcome.image,
      palmistry: { observations: outcome.observations, updatedAt: outcome.updatedAt },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, "INVALID_HAND");
    console.error("Legacy Palmistry image could not be assigned.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry information could not be updated.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}
