import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { createDatabaseExportResponse } from "@/server/database-transfer";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = await requireRole(request, ["SUPER_ADMIN"]);
  if (authorization.status !== 200) {
    return jsonError(authorization.status === 401 ? "Sign in is required." : "Super Admin access is required.",
      authorization.status === 401 ? 401 : 403,
      authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  }
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const body = await readJson(request, 8_000);
    if (!body || !Array.isArray(body.tables) || !body.tables.every((table) => typeof table === "string")
      || (body.format !== "csv" && body.format !== "jsonl")
      || typeof body.includeSensitive !== "boolean") {
      return jsonError("Export options are invalid.", 422, "INVALID_EXPORT");
    }
    if (body.includeSensitive && body.confirmSensitive !== "EXPORT SENSITIVE DATA") {
      return jsonError("Sensitive export requires the exact confirmation phrase.", 422, "SENSITIVE_CONFIRMATION_REQUIRED");
    }
    return await createDatabaseExportResponse(getPrisma(), authorization.user.id, {
      tables: body.tables,
      format: body.format,
      includeSensitive: body.includeSensitive,
    });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON");
    console.error("Super Admin database export request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Database export is temporarily unavailable.", 503, "EXPORT_UNAVAILABLE");
  }
}
