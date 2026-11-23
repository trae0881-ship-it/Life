import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { jsonError, isSameOriginMutation } from "@/server/http";
import { isValidKundaliId } from "@/server/kundali-files";
import { ownedRecordWhere } from "@/server/ownership";
import { withKundaliDatabaseUser } from "@/server/kundali-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ kundaliId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const { kundaliId } = await context.params;
    if (!isValidKundaliId(kundaliId)) return jsonError("Kundali document not found.", 404, "NOT_FOUND");
    const deleted = await withKundaliDatabaseUser(user.id, (transaction) => transaction.kundaliDocument.deleteMany({
      where: ownedRecordWhere(user.id, kundaliId),
    }));
    if (!deleted.count) return jsonError("Kundali document not found.", 404, "NOT_FOUND");
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Kundali document could not be deleted.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Kundali storage is temporarily unavailable.", 503, "KUNDALI_STORAGE_UNAVAILABLE");
  }
}
