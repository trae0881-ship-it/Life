import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { handleManagedScriptsCollection } from "@/server/admin-scripts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleManagedScriptsCollection(request, {
    authorize: requireRole,
    repository: getPrisma,
  });
}

export async function POST(request: NextRequest) {
  return handleManagedScriptsCollection(request, {
    authorize: requireRole,
    repository: getPrisma,
  });
}
