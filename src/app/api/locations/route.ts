import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { locationSearchPrefix, readLocationLines, searchLocations } from "@/server/location-search";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";
import { getUserFromRequest } from "@/server/auth";
import { withApiKeyAccess } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  return withApiKeyAccess(request, "GET /api/locations", { repository: getPrisma, pepper: process.env.API_KEY_PEPPER }, async (apiAccess) => {
    if (apiAccess.kind === "session") {
      try {
        if (!await getUserFromRequest(request)) return errorResponse("Sign in is required.", "UNAUTHENTICATED", 401);
      } catch {
        return errorResponse("Account service is temporarily unavailable.", "AUTH_UNAVAILABLE", 503);
      }
    }
    const rate = checkRateLimit(`locations:${apiAccess.kind === "key" ? apiAccess.key.keyId : requestRateLimitKey(request)}`, apiAccess.kind === "key" ? apiAccess.key.requestsPerMinute : 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Place searches are temporarily rate limited.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" } },
      );
    }

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const prefix = locationSearchPrefix(query);
    if (!prefix) return errorResponse("Search with between 2 and 80 characters.", "INVALID_SEARCH_QUERY", 422);

    const indexPath = path.join(process.cwd(), "data", "locations", "city-index");
    try {
      const prefixes = JSON.parse(await readFile(path.join(indexPath, "manifest.json"), "utf8")) as unknown;
      if (!Array.isArray(prefixes) || !prefixes.every((value) => typeof value === "string")) throw new Error("Place search index manifest is invalid.");
      if (!prefixes.includes(prefix)) return NextResponse.json({ matches: [], totalMatches: 0, ambiguous: false }, { headers: { "Cache-Control": "private, max-age=60" } });
      const shardName = `${Buffer.from(prefix, "utf8").toString("hex")}.tsv.gz`;
      const result = await searchLocations(readLocationLines(path.join(indexPath, shardName)), query);
      return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=60" } });
    } catch {
      console.error("Offline place gazetteer could not be read.");
      return errorResponse("Place search is temporarily unavailable. Enter verified location details manually.", "LOCATION_DATA_UNAVAILABLE", 503);
    }
  });
}
