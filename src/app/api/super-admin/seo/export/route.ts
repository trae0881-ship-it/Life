import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { handleSeoExport } from "@/server/seo-management-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSeoExport(request, { authorize: requireRole });
}