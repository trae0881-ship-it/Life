import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { jsonError, isSameOriginMutation, readJson, RequestBodyError } from "@/server/http";
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
  readPalmistryObservationsInput,
} from "@/server/palmistry-observations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseObservations(value: unknown) {
  const observations = parsePalmistryObservations(value);
  if (!observations) throw new Error("Stored Palmistry observations are invalid.");
  return observations;
}

function legacyImageMetadata(record: {
  id: string;
  contentType: string | null;
  fileExtension: string | null;
  fileSizeBytes: number | null;
  uploadedAt: Date;
}) {
  if (!record.contentType || !record.fileExtension || !record.fileSizeBytes) return null;
  return {
    contentType: record.contentType,
    fileExtension: record.fileExtension,
    fileSizeBytes: record.fileSizeBytes,
    uploadedAt: record.uploadedAt,
    downloadName: palmistryDownloadName(record.id, record.uploadedAt, record.fileExtension),
  };
}

function handImageMetadata(image: {
  id: string;
  handSide: "LEFT" | "RIGHT";
  contentType: string;
  fileExtension: string;
  fileSizeBytes: number;
  uploadedAt: Date;
}) {
  const hand = image.handSide === "LEFT" ? "left" : "right";
  return {
    contentType: image.contentType,
    fileExtension: image.fileExtension,
    fileSizeBytes: image.fileSizeBytes,
    uploadedAt: image.uploadedAt,
    downloadName: palmistryDownloadName(image.id, image.uploadedAt, image.fileExtension, hand),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const result = await withUserScopedDatabase(user.id, async (transaction) => {
      const [record, images] = await Promise.all([
        transaction.palmistryRecord.findUnique({
          where: { userId: user.id },
          select: {
            id: true, contentType: true, fileExtension: true, fileSizeBytes: true,
            observations: true, uploadedAt: true, updatedAt: true,
          },
        }),
        transaction.palmistryHandImage.findMany({
          where: { userId: user.id },
          select: {
            id: true, handSide: true, contentType: true, fileExtension: true,
            fileSizeBytes: true, uploadedAt: true,
          },
        }),
      ]);
      const hands = { left: null as ReturnType<typeof handImageMetadata> | null, right: null as ReturnType<typeof handImageMetadata> | null };
      for (const image of images) {
        const hand = image.handSide === "LEFT" ? "left" : "right";
        hands[hand] = handImageMetadata(image);
      }
      return {
        palmistry: record ? { observations: parseObservations(record.observations), updatedAt: record.updatedAt } : null,
        images: {
          left: hands.left,
          right: hands.right,
          legacy: record ? legacyImageMetadata(record) : null,
        },
      };
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Palmistry record could not be loaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry storage is temporarily unavailable.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`palmistry-upload:${user.id}`, 5, 60 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many uploads. Try again later.", code: "RATE_LIMITED" }, {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }
    const declaredLength = request.headers.get("content-length");
    if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_PALMISTRY_REQUEST_BYTES)) {
      return jsonError("Choose an image smaller than 10 MB.", 413, "PAYLOAD_TOO_LARGE");
    }
    const form = await readPalmistryUploadForm(request);
    const entries = Array.from(form.entries());
    if (entries.length !== 1 || entries[0][0] !== "file" || typeof entries[0][1] === "string" || !(entries[0][1] instanceof File)) {
      return jsonError("Choose one JPG, JPEG, PNG, or WEBP hand image.", 422, "INVALID_UPLOAD");
    }
    const file = entries[0][1];
    if (file.size > MAX_PALMISTRY_FILE_BYTES) return jsonError("Choose an image smaller than 10 MB.", 413, "FILE_TOO_LARGE");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { contentType, extension } = validatePalmistryUpload(file.name, file.type, bytes);
    const record = await withUserScopedDatabase(user.id, async (transaction) => transaction.palmistryRecord.upsert({
      where: { userId: user.id },
      create: {
        id: randomBytes(24).toString("base64url"),
        userId: user.id,
        contentType,
        fileExtension: extension,
        fileSizeBytes: bytes.byteLength,
        originalFile: bytes,
        observations: emptyPalmistryObservations,
      },
      update: {
        contentType,
        fileExtension: extension,
        fileSizeBytes: bytes.byteLength,
        originalFile: bytes,
        uploadedAt: new Date(),
      },
      select: {
        id: true, contentType: true, fileExtension: true, fileSizeBytes: true,
        observations: true, uploadedAt: true, updatedAt: true,
      },
    }));
    return NextResponse.json({
      palmistry: { observations: parseObservations(record.observations), updatedAt: record.updatedAt },
      images: { legacy: legacyImageMetadata(record) },
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_UPLOAD");
    if (error instanceof KundaliFileError) return jsonError(error.message, error.status, error.code);
    console.error("Palmistry image could not be uploaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry upload is temporarily unavailable.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`palmistry-observations:${user.id}`, 30, 60_000);
    if (!rate.allowed) return jsonError("Too many updates. Try again shortly.", 429, "RATE_LIMITED");
    const body = await readJson(request, 20_000);
    const observations = body && Object.keys(body).length === 1
      ? readPalmistryObservationsInput(body.observations)
      : null;
    if (!observations) return jsonError("Review each detail using one of the listed options.", 422, "INVALID_OBSERVATIONS");
    const record = await withUserScopedDatabase(user.id, async (transaction) => {
      const existing = await transaction.palmistryRecord.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!existing) return null;
      return transaction.palmistryRecord.update({
        where: { userId: user.id },
        data: { observations },
        select: { observations: true, updatedAt: true },
      });
    });
    if (!record) return jsonError("Upload a hand image before saving observations.", 404, "PALMISTRY_NOT_FOUND");
    return NextResponse.json({
      palmistry: { observations: parseObservations(record.observations), updatedAt: record.updatedAt },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, "INVALID_OBSERVATIONS");
    console.error("Palmistry observations could not be saved.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry information could not be saved.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`palmistry-delete:${user.id}`, 10, 60_000);
    if (!rate.allowed) return jsonError("Too many delete requests. Try again shortly.", 429, "RATE_LIMITED");
    const deleted = await withUserScopedDatabase(user.id, async (transaction) => {
      const images = await transaction.palmistryHandImage.deleteMany({ where: { userId: user.id } });
      const readings = await transaction.palmistryReading.deleteMany({ where: { userId: user.id } });
      const record = await transaction.palmistryRecord.deleteMany({ where: { userId: user.id } });
      return images.count + readings.count + record.count > 0;
    });
    return NextResponse.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Palmistry record could not be deleted.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry information could not be deleted.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}
