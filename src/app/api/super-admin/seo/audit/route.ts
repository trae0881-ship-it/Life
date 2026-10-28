import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { handleSeoAudit } from "@/server/seo-management-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleSeoAudit(request, { authorize: requireRole });
}