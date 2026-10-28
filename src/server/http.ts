import { NextResponse } from "next/server";
export { readJson, RequestBodyError } from "@/server/request-body";
export { isSameOriginMutation } from "./same-origin";

export function jsonError(error: string, status: number, code?: string, details?: unknown) {
  return NextResponse.json({ error, ...(code ? { code } : {}), ...(details === undefined ? {} : { details }) }, { status, headers: { "Cache-Control": "no-store" } });
}

export function logAuthServiceError(operation: string, error: unknown) {
  console.error("Authentication service operation failed.", {
    operation,
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
}

export function sessionCookie(token: string, expiresAt: Date) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${process.env.NODE_ENV === "production" ? "__Host-life_session" : "life_session"}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${process.env.NODE_ENV === "production" ? "__Host-life_session" : "life_session"}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
