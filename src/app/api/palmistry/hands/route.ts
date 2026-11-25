import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { jsonError, isSameOriginMutation, RequestBodyError } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { withUserScopedDatabase } from "@/server/kundali-storage";
import { KundaliFileError } from "@/server/kundali-files";
import {
  MAX_PALMISTRY_FILE_BYTES,
  MAX_PALMISTRY_REQUEST_BYTES,
  palmistryDownloadName,
  validatePalmistryUpload,
} from "@/server/palmistry-files";
import { readPalmistryUploadForm } from "@/server/palmistry-request";
import {
  emptyPalmistryObservations,
  parsePalmistryObservations,
  resetPalmistryHand,
  type PalmistryHand,
  type PalmistryObservations,
} from "@/server/palmistry-observations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handFromValue(value: unknown): PalmistryHand | null {
  return value === "left" || value === "right" ? value : null;
}

function dbHand(hand: PalmistryHand) {
  return hand === "left" ? "LEFT" as const : "RIGHT" as const;
}

function imageMetadata(image: {
  id: string;
  contentType: string;
  fileExtension: string;
  fileSizeBytes: number;
  uploadedAt: Date;
}) {
  return {
    contentType: image.contentType,
    fileExtension: image.fileExtension,
    fileSizeBytes: image.fileSizeBytes,
    uploadedAt: image.uploadedAt,
    downloadName: palmistryDownloadName(image.id, image.uploadedAt, image.fileExtension),
  };
}

function parseStoredObservations(value: unknown): PalmistryObservations {
  const observations = parsePalmistryObservations(value);
  if (!observations) throw new Error("Stored Palmistry observations are invalid.");
  return observations;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`palmistry-hand-upload:${user.id}`, 10, 60 * 60_000);
    if (!rate.allowed) return jsonError("Too many uploads. Try again later.", 429, "RATE_LIMITED");
    const declaredLength = request.headers.get("content-length");
    if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_PALMISTRY_REQUEST_BYTES)) {
      return jsonError("Choose an image smaller than 10 MB.", 413, "PAYLOAD_TOO_LARGE");
    }
    const form = await readPalmistryUploadForm(request);
    const entries = Array.from(form.entries());
    if (entries.length !== 2) return jsonError("Choose one hand and one image.", 422, "INVALID_UPLOAD");
    const handEntry = entries.find(([key]) => key === "hand");
    const fileEntry = entries.find(([key]) => key === "file");
    const hand = handFromValue(handEntry?.[1]);
    if (!hand || !fileEntry || typeof fileEntry[1] === "string" || !(fileEntry[1] instanceof File)) {
      return jsonError("Choose a left or right hand and one supported image.", 422, "INVALID_UPLOAD");
    }
    const file = fileEntry[1];
    if (file.size > MAX_PALMISTRY_FILE_BYTES) return jsonError("Choose an image smaller than 10 MB.", 413, "FILE_TOO_LARGE");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { contentType, extension } = validatePalmistryUpload(file.name, file.type, bytes);
    const result = await withUserScopedDatabase(user.id, async (transaction) => {
      const existing = await transaction.palmistryRecord.findUnique({
        where: { userId: user.id },
        select: { observations: true },
      });
      const currentObservations = existing ? parseStoredObservations(existing.observations) : emptyPalmistryObservations;
      const observations = resetPalmistryHand(currentObservations, hand);
      const record = await transaction.palmistryRecord.upsert({
        where: { userId: user.id },
        create: {
          id: randomBytes(24).toString("base64url"),
          userId: user.id,
          contentType: null,
          fileExtension: null,
          fileSizeBytes: null,
          originalFile: null,
          observations,
        },
        update: { observations },
        select: { updatedAt: true },
      });
      const image = await transaction.palmistryHandImage.upsert({
        where: { userId_handSide: { userId: user.id, handSide: dbHand(hand) } },
        create: {
          id: randomBytes(24).toString("base64url"),
          userId: user.id,
          handSide: dbHand(hand),
          contentType,
          fileExtension: extension,
          fileSizeBytes: bytes.byteLength,
          originalFile: bytes,
        },
        update: {
          id: randomBytes(24).toString("base64url"),
          contentType,
          fileExtension: extension,
          fileSizeBytes: bytes.byteLength,
          originalFile: bytes,
          uploadedAt: new Date(),
        },
        select: { id: true, contentType: true, fileExtension: true, fileSizeBytes: true, uploadedAt: true },
      });
      return { observations, updatedAt: record.updatedAt, image };
    });
    return NextResponse.json({
      hand,
      image: imageMetadata(result.image),
      palmistry: { observations: result.observations, updatedAt: result.updatedAt },
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_UPLOAD");
    if (error instanceof KundaliFileError) return jsonError(error.message, error.status, error.code);
    console.error("Palmistry hand image could not be uploaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry upload is temporarily unavailable.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const hand = handFromValue(request.nextUrl.searchParams.get("hand"));
    if (!hand) return jsonError("Choose a left or right hand.", 422, "INVALID_HAND");
    const rate = checkRateLimit(`palmistry-hand-delete:${user.id}`, 20, 60_000);
    if (!rate.allowed) return jsonError("Too many delete requests. Try again shortly.", 429, "RATE_LIMITED");
    const deleted = await withUserScopedDatabase(user.id, async (transaction) => {
      const image = await transaction.palmistryHandImage.deleteMany({
        where: { userId: user.id, handSide: dbHand(hand) },
      });
      const record = await transaction.palmistryRecord.findUnique({
        where: { userId: user.id },
        select: { observations: true },
      });
      if (record) {
        const observations = resetPalmistryHand(parseStoredObservations(record.observations), hand);
        await transaction.palmistryRecord.update({
          where: { userId: user.id },
          data: { observations },
        });
      }
      return image.count > 0;
    });
    return NextResponse.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Palmistry hand image could not be deleted.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry image could not be deleted.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}
