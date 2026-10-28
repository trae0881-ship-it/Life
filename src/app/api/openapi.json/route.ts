import { LIFE_OPENAPI } from "@/server/openapi";

export const dynamic = "force-static";

export function GET() {
  return Response.json(LIFE_OPENAPI, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
