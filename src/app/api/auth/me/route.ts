import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { logAuthServiceError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logAuthServiceError("session lookup", error);
    return NextResponse.json({ error: "Account service is temporarily unavailable.", code: "AUTH_UNAVAILABLE" }, { status: 503 });
  }
}
