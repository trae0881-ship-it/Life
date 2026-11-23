import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { jsonError, isSameOriginMutation, RequestBodyError } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { withKundaliDatabaseUser } from "@/server/kundali-storage";
import {
  KundaliFileError,
  MAX_KUNDALI_FILE_BYTES,
  MAX_KUNDALI_REQUEST_BYTES,
  kundaliDownloadName,
  validateKundaliUpload,
} from "@/server/kundali-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readUploadForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError("Choose a Kundali file to upload.", 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_KUNDALI_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestBodyError("Choose a file smaller than 10 MB.", 413);
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
    return await new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
    }).formData();
  } catch {
    throw new RequestBodyError("Choose one file using a supported upload form.", 400);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const kundalis = await withKundaliDatabaseUser(user.id, async (transaction) => {
      const records = await transaction.kundaliDocument.findMany({
        where: { userId: user.id },
        orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
        select: { id: true, contentType: true, fileExtension: true, fileSizeBytes: true, processingStatus: true, uploadedAt: true },
      });
      return records.map((record) => ({
        ...record,
        downloadName: kundaliDownloadName(record.id, record.uploadedAt, record.fileExtension),
      }));
    });
    return NextResponse.json({ kundalis }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Kundali documents could not be listed.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Kundali storage is temporarily unavailable.", 503, "KUNDALI_STORAGE_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`kundali-upload:${user.id}`, 5, 60 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many uploads. Try again later.", code: "RATE_LIMITED" }, {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }
    const declaredLength = request.headers.get("content-length");
    if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_KUNDALI_REQUEST_BYTES)) {
      return jsonError("Choose a file smaller than 10 MB.", 413, "PAYLOAD_TOO_LARGE");
    }
    const form = await readUploadForm(request);
    const entries = Array.from(form.entries());
    if (entries.length !== 1 || entries[0][0] !== "file" || typeof entries[0][1] === "string" || !(entries[0][1] instanceof File)) {
      return jsonError("Choose one Kundali PDF or image file.", 422, "INVALID_UPLOAD");
    }
    const file = entries[0][1];
    if (file.size > MAX_KUNDALI_FILE_BYTES) return jsonError("Choose a file smaller than 10 MB.", 413, "FILE_TOO_LARGE");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { contentType, extension } = validateKundaliUpload(file.name, file.type, bytes);
    const id = randomBytes(24).toString("base64url");
    const record = await withKundaliDatabaseUser(user.id, async (transaction) => {
      await transaction.kundaliDocument.deleteMany({ where: { userId: user.id } });
      return transaction.kundaliDocument.create({
        data: {
          id,
          userId: user.id,
          contentType,
          fileExtension: extension,
          fileSizeBytes: bytes.byteLength,
          originalFile: bytes,
          processingStatus: "MANUAL_REVIEW_REQUIRED",
        },
        select: { id: true, contentType: true, fileExtension: true, fileSizeBytes: true, processingStatus: true, uploadedAt: true },
      });
    });
    return NextResponse.json({
      kundali: {
        ...record,
        downloadName: kundaliDownloadName(record.id, record.uploadedAt, record.fileExtension),
      },
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_UPLOAD");
    if (error instanceof KundaliFileError) return jsonError(error.message, error.status, error.code);
    console.error("Kundali document could not be uploaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Kundali upload is temporarily unavailable.", 503, "KUNDALI_STORAGE_UNAVAILABLE");
  }
}
