import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { handleSeoManagement } from "@/server/seo-management-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSeoManagement(request, { authorize: requireRole });
}

export async function PATCH(request: NextRequest) {
  return handleSeoManagement(request, { authorize: requireRole });
}