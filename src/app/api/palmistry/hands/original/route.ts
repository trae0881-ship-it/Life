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
    const handValue = request.nextUrl.searchParams.get("hand");
    if (handValue !== "left" && handValue !== "right") return jsonError("Choose a left or right hand.", 422, "INVALID_HAND");
    const handSide = handValue === "left" ? "LEFT" as const : "RIGHT" as const;
    const rate = checkRateLimit(`palmistry-hand-download:${user.id}`, 60, 60_000);
    if (!rate.allowed) return jsonError("Too many downloads. Try again shortly.", 429, "RATE_LIMITED");
    const image = await withUserScopedDatabase(user.id, (transaction) => transaction.palmistryHandImage.findUnique({
      where: { userId_handSide: { userId: user.id, handSide } },
      select: {
        id: true,
        handSide: true,
        contentType: true,
        fileExtension: true,
        fileSizeBytes: true,
        originalFile: true,
        uploadedAt: true,
      },
    }));
    if (!image) return jsonError("Palmistry image not found.", 404, "NOT_FOUND");
    const filename = palmistryDownloadName(image.id, image.uploadedAt, image.fileExtension, handValue);
    return new Response(new Uint8Array(image.originalFile), {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(image.fileSizeBytes),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("Palmistry hand image could not be downloaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Palmistry storage is temporarily unavailable.", 503, "PALMISTRY_STORAGE_UNAVAILABLE");
  }
}
