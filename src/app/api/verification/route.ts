import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CHECKLIST_VERSION } from "@/verification/definitions";
import { makeChecklist, publicVerificationRun, type VerificationRun } from "@/verification/status";
import { engineHealth } from "@/calculation/health";
import { jsonError, isSameOriginMutation } from "@/server/http";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readRun(): Promise<VerificationRun | undefined> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "data/verification/latest.json"), "utf8")) as VerificationRun;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const [run, health] = await Promise.all([readRun(), engineHealth().catch(() => ({ ready: false, engine: "unknown" }))]);
  return NextResponse.json({
    ...makeChecklist(run),
    lastRun: publicVerificationRun(run),
    checklistVersion: CHECKLIST_VERSION,
    health,
    database: { acknowledgementsPersistent: false, acknowledgements: [] },
    reviewPolicy: {
      ordinaryAcknowledgements: "Stored only in this browser; labels are not authenticated sign-offs and do not affect technical status.",
      authenticatedApprovals: "Stored separately at /api/verification/approvals and visible only to the signed-in reviewer who created them.",
    },
    lastRunAvailable: Boolean(run),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  const rate = checkRateLimit(`ordinary-review:${requestRateLimitKey(request)}`, 20, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many checklist acknowledgements. Try again later.", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" } });
  return jsonError("Ordinary acknowledgements are stored only in this browser.", 410, "ACKNOWLEDGEMENTS_LOCAL_ONLY");
}
