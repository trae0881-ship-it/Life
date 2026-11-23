import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { jsonError } from "@/server/http";
import { isValidKundaliId, kundaliDownloadName } from "@/server/kundali-files";
import { ownedRecordWhere } from "@/server/ownership";
import { checkRateLimit } from "@/server/rate-limit";
import { withKundaliDatabaseUser } from "@/server/kundali-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ kundaliId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`kundali-download:${user.id}`, 30, 60_000);
    if (!rate.allowed) return jsonError("Too many downloads. Try again shortly.", 429, "RATE_LIMITED");
    const { kundaliId } = await context.params;
    if (!isValidKundaliId(kundaliId)) return jsonError("Kundali document not found.", 404, "NOT_FOUND");
    const document = await withKundaliDatabaseUser(user.id, (transaction) => transaction.kundaliDocument.findFirst({
      where: ownedRecordWhere(user.id, kundaliId),
      select: { id: true, contentType: true, fileExtension: true, originalFile: true, uploadedAt: true },
    }));
    if (!document) return jsonError("Kundali document not found.", 404, "NOT_FOUND");
    const filename = kundaliDownloadName(document.id, document.uploadedAt, document.fileExtension);
    return new Response(new Uint8Array(document.originalFile), {
      headers: {
        "Content-Type": document.contentType,
        "Content-Length": String(document.originalFile.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("Kundali original could not be downloaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Kundali storage is temporarily unavailable.", 503, "KUNDALI_STORAGE_UNAVAILABLE");
  }
}
