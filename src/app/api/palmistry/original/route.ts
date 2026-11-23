import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/server/auth";
import { jsonError } from "@/server/http";
import { palmistryDownloadName } from "@/server/palmistry-files";
import { checkRateLimit } from "@/server/rate-limit";
import { withUserScopedDatabase } from "@/server/kundali-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return jsonError("Sign in is required.", 401, "UNAUTHENTICATED");
    const rate = checkRateLimit(`palmistry-download:${user.id}`, 30, 60_000);
    if (!rate.allowed) return jsonError("Too many downloads. Try again shortly.", 429, "RATE_LIMITED");
    const record = await withUserScopedDatabase(user.id, (transaction) => transaction.palmistryRecord.findUnique({
      where: { userId: user.id },
      select: { id: true, contentType: true, fileExtension: true, originalFile: true, uploadedAt: true },
    }));
    if (!record) return jsonError("Palmistry image not found.", 404, "NOT_FOUND");
    const filename = palmistryDownloadName(record.id, record.uploadedAt, record.fileExtension);
    return new Response(new Uint8Array(record.originalFile), {
      headers: {
        "Content-Type": record.contentType,
        "Content-Length": String(record.originalFile.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("Palmistry original could not be downloaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry storage is temporarily unavailable.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}
