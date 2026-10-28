import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db";
import { handlePublicRuntimeScripts } from "@/server/admin-scripts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handlePublicRuntimeScripts(request, getPrisma());
}
