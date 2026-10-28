import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import {
  commitDatabaseImport,
  DatabaseTransferInputError,
  isDatabaseImportCommitEnabled,
  logDatabaseImportPreview,
  MAX_IMPORT_BYTES,
  previewDatabaseImport,
} from "@/server/database-transfer";
import { isSameOriginMutation, jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MULTIPART_BYTES = MAX_IMPORT_BYTES + 64 * 1024;

async function readBoundedBody(request: Request, maximumBytes: number) {
  const declaredBytes = request.headers.get("content-length");
  if (declaredBytes !== null && Number(declaredBytes) > maximumBytes) {
    await request.body?.cancel();
    throw new Error("UPLOAD_TOO_LARGE");
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maximumBytes) {
          await reader.cancel();
          throw new Error("UPLOAD_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function POST(request: NextRequest) {
  const authorization = await requireRole(request, ["SUPER_ADMIN"]);
  if (authorization.status !== 200) {
    return jsonError(authorization.status === 401 ? "Sign in is required." : "Super Admin access is required.",
      authorization.status === 401 ? 401 : 403,
      authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  }
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const body = await readBoundedBody(request, MAX_MULTIPART_BYTES);
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    const boundedRequest = new Request(request.url, {
      method: "POST",
      headers,
      body,
    });
    const form = await boundedRequest.formData();
    const upload = form.get("file");
    if (!(upload instanceof File) || upload.size === 0 || upload.size > MAX_IMPORT_BYTES
      || !upload.name.toLowerCase().endsWith(".jsonl")) {
      return jsonError("Upload a non-empty LIFE JSONL file no larger than 10 MiB.", 422, "INVALID_IMPORT_FILE");
    }
    const action = form.get("action");
    if (action !== "preview" && action !== "commit") return jsonError("Import action is invalid.", 422, "INVALID_IMPORT_ACTION");
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const repository = getPrisma();

    if (action === "preview") {
      const { preview } = await previewDatabaseImport(repository, bytes);
      await logDatabaseImportPreview(repository, authorization.user.id, preview);
      return Response.json({ preview }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!isDatabaseImportCommitEnabled(process.env.NODE_ENV, process.env.LIFE_DATABASE_TRANSFER_IMPORT_ENABLED)) {
      return jsonError("Database import commits are disabled unless explicitly enabled in a non-production environment.", 403, "IMPORT_COMMIT_DISABLED");
    }
    const confirmedDatabase = form.get("confirmTarget");
    if (typeof confirmedDatabase !== "string" || form.get("confirmImport") !== "IMPORT") {
      return jsonError("Confirm the exact target database and import operation.", 422, "IMPORT_CONFIRMATION_REQUIRED");
    }
    const result = await commitDatabaseImport(repository, authorization.user.id, bytes, confirmedDatabase);
    if (!result.committed) {
      return Response.json({ result }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ result }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UPLOAD_TOO_LARGE") {
      return jsonError("Import upload exceeds the 10 MiB size limit.", 413, "PAYLOAD_TOO_LARGE");
    }
    if (error instanceof DatabaseTransferInputError) return jsonError(error.message, 422, "INVALID_IMPORT_DATA");
    console.error("Super Admin database import request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Import could not be validated or completed.", 503, "IMPORT_UNAVAILABLE");
  }
}
