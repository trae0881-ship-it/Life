import { NextResponse } from "next/server";
export { readJson, RequestBodyError } from "@/server/request-body";
export { isSameOriginMutation } from "./same-origin";
export { clearSessionCookie, sessionCookie } from "./session-cookie";

export function jsonError(error: string, status: number, code?: string, details?: unknown) {
  return NextResponse.json({ error, ...(code ? { code } : {}), ...(details === undefined ? {} : { details }) }, { status, headers: { "Cache-Control": "no-store" } });
}

export function logAuthServiceError(operation: string, error: unknown) {
  console.error("Authentication service operation failed.", {
    operation,
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
}
