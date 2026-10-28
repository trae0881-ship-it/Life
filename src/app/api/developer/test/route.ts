import { handleApiKeyTest } from "@/server/api-platform";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleApiKeyTest(request, { repository: getPrisma, pepper: process.env.API_KEY_PEPPER });
}
