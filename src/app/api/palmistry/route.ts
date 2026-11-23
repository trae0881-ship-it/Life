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
import {
  emptyPalmistryObservations,
  parsePalmistryObservations,
  readPalmistryObservationsInput,
} from "@/server/palmistry-observations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readUploadForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError("Choose a hand image to upload.", 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PALMISTRY_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestBodyError("Choose an image smaller than 10 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Request(request.url, { method: "POST", headers: request.headers, body }).formData();
  } catch {
    throw new RequestBodyError("Choose one image using a supported upload form.", 400);
  }
}

function responseRecord(record: {
  id: string;
  contentType: string;
  fileExtension: string;
  fileSizeBytes: number;
  observations: unknown;
  uploadedAt: Date;
  updatedAt: Date;
}) {
  const observations = parsePalmistryObservations(record.observations);
  if (!observations) throw new Error("Stored Palmistry observations are invalid.");
  return {
    contentType: record.contentType,
    fileExtension: record.fileExtension,
    fileSizeBytes: record.fileSizeBytes,
    observations,
    uploadedAt: record.uploadedAt,
    updatedAt: record.updatedAt,
    downloadName: palmistryDownloadName(record.id, record.uploadedAt, record.fileExtension),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const record = await withUserScopedDatabase(user.id, (transaction) => transaction.palmistryRecord.findUnique({
      where: { userId: user.id },
      select: {
        id: true, contentType: true, fileExtension: true, fileSizeBytes: true,
        observations: true, uploadedAt: true, updatedAt: true,
      },
    }));
    return NextResponse.json({ palmistry: record ? responseRecord(record) : null }, {
      headers: { "Cache-Control": "private, no-store" },
    });
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
    const form = await readUploadForm(request);
    const entries = Array.from(form.entries());
    if (entries.length !== 1 || entries[0][0] !== "file" || typeof entries[0][1] === "string" || !(entries[0][1] instanceof File)) {
      return jsonError("Choose one JPG, JPEG, or PNG hand image.", 422, "INVALID_UPLOAD");
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
        observations: emptyPalmistryObservations,
        uploadedAt: new Date(),
      },
      select: {
        id: true, contentType: true, fileExtension: true, fileSizeBytes: true,
        observations: true, uploadedAt: true, updatedAt: true,
      },
    }));
    return NextResponse.json({ palmistry: responseRecord(record) }, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
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
    const body = await readJson(request, 4_000);
    const observations = body && Object.keys(body).length === 1
      ? readPalmistryObservationsInput(body.observations)
      : null;
    if (!observations) return jsonError("Review each line using one of the listed options.", 422, "INVALID_OBSERVATIONS");
    const record = await withUserScopedDatabase(user.id, async (transaction) => {
      const existing = await transaction.palmistryRecord.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!existing) return null;
      return transaction.palmistryRecord.update({
        where: { userId: user.id },
        data: { observations },
        select: {
          id: true, contentType: true, fileExtension: true, fileSizeBytes: true,
          observations: true, uploadedAt: true, updatedAt: true,
        },
      });
    });
    if (!record) return jsonError("Upload a hand image before saving observations.", 404, "PALMISTRY_NOT_FOUND");
    return NextResponse.json({ palmistry: responseRecord(record) }, { headers: { "Cache-Control": "private, no-store" } });
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
    const deleted = await withUserScopedDatabase(user.id, (transaction) => transaction.palmistryRecord.deleteMany({
      where: { userId: user.id },
    }));
    return NextResponse.json({ deleted: deleted.count > 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Palmistry record could not be deleted.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry information could not be deleted.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}
