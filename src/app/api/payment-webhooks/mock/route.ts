import { handleMockPaymentWebhook } from "@/server/api-billing";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleMockPaymentWebhook(request, { repository: getPrisma });
}
