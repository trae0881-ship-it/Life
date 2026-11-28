import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

try {
  process.loadEnvFile();
} catch {}

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for API platform maintenance.");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5_000 }),
  });
  try {
    const now = new Date();
    const eventCutoff = new Date(now.getTime() - 90 * DAY_MS);
    const minuteCutoff = new Date(now.getTime() - 2 * DAY_MS);
    const dayCutoff = new Date(now.getTime() - 90 * DAY_MS);
    const [events, keyMinutes, accountMinutes, keyDays, accountDays, canceled, expired] = await Promise.all([
      prisma.apiUsageEvent.deleteMany({ where: { occurredAt: { lt: eventCutoff } } }),
      prisma.apiKeyUsageWindow.deleteMany({ where: { windowType: "MINUTE", windowStart: { lt: minuteCutoff } } }),
      prisma.apiAccountUsageWindow.deleteMany({ where: { windowType: "MINUTE", windowStart: { lt: minuteCutoff } } }),
      prisma.apiKeyUsageWindow.deleteMany({ where: { windowType: "DAY", windowStart: { lt: dayCutoff } } }),
      prisma.apiAccountUsageWindow.deleteMany({ where: { windowType: "DAY", windowStart: { lt: dayCutoff } } }),
      prisma.apiSubscription.updateMany({
        where: { status: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: { lte: now } },
        data: { status: "CANCELED" },
      }),
      prisma.apiSubscription.updateMany({
        where: { status: "ACTIVE", cancelAtPeriodEnd: false, currentPeriodEnd: { lte: now } },
        data: { status: "EXPIRED" },
      }),
    ]);

    const freePlan = await prisma.apiPlan.findFirst({
      where: { status: "ACTIVE", priceMinorUnits: 0n, periodDays: { not: null } },
      include: { products: { include: { product: true } } },
      orderBy: { name: "asc" },
    });
    let freeFallbacks = 0;
    if (freePlan?.periodDays && freePlan.products.length
      && freePlan.products.every((entry) => entry.product.enabled && entry.product.status === "ACTIVE")) {
      const candidates = await prisma.apiDeveloperProfile.findMany({
        where: { status: "VERIFIED", grandfathered: false, user: { is: { role: "DEVELOPER" } } },
        select: {
          userId: true,
          user: { select: { apiSubscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } },
        },
      });
      for (const candidate of candidates) {
        const latest = candidate.user.apiSubscriptions[0];
        if (!latest || !["EXPIRED", "CANCELED"].includes(latest.status)) continue;
        const result = await prisma.$transaction(async (transaction) => {
          const current = await transaction.apiSubscription.findFirst({
            where: { developerUserId: candidate.userId },
            orderBy: { createdAt: "desc" },
          });
          if (!current || !["EXPIRED", "CANCELED"].includes(current.status)) return false;
          const idempotencyKey = `fallback:${candidate.userId}:${freePlan.id}:${now.toISOString().slice(0, 10)}`;
          const duplicate = await transaction.apiSubscription.findUnique({ where: { idempotencyKey } });
          if (duplicate) return false;
          const periodEnd = new Date(now.getTime() + freePlan.periodDays! * DAY_MS);
          const subscription = await transaction.apiSubscription.create({
            data: {
              idempotencyKey,
              developerUserId: candidate.userId,
              planId: freePlan.id,
              status: "ACTIVE",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              priceMinorUnits: 0n,
              currency: freePlan.currency,
              taxRateBasisPoints: freePlan.taxRateBasisPoints,
              periodDays: freePlan.periodDays,
            },
          });
          for (const entitlement of freePlan.products) {
            await transaction.apiAccountGrant.upsert({
              where: { accountUserId_productId: { accountUserId: candidate.userId, productId: entitlement.productId } },
              create: {
                accountUserId: candidate.userId,
                productId: entitlement.productId,
                scopes: entitlement.product.endpoints,
                requestsPerMinute: entitlement.requestsPerMinute,
                dailyQuota: entitlement.dailyQuota,
                monthlyQuota: entitlement.monthlyQuota,
                enabled: true,
                grantedByUserId: candidate.userId,
              },
              update: {
                scopes: entitlement.product.endpoints,
                requestsPerMinute: entitlement.requestsPerMinute,
                dailyQuota: entitlement.dailyQuota,
                monthlyQuota: entitlement.monthlyQuota,
                enabled: true,
              },
            });
          }
          await transaction.apiPlatformAuditLog.create({
            data: {
              actorUserId: candidate.userId,
              action: "FREE_PLAN_FALLBACK_APPLIED",
              targetType: "API_SUBSCRIPTION",
              targetId: subscription.id,
              details: { actorType: "SYSTEM", previousStatus: current.status, planId: freePlan.id },
            },
          });
          return true;
        }, { isolationLevel: "Serializable" });
        if (result) freeFallbacks += 1;
      }
    }

    process.stdout.write(JSON.stringify({
      retainedUsageDays: 90,
      deletedUsageEvents: events.count,
      deletedMinuteWindows: keyMinutes.count + accountMinutes.count,
      deletedDailyWindows: keyDays.count + accountDays.count,
      expiredSubscriptions: expired.count,
      canceledSubscriptions: canceled.count,
      freeFallbacks,
    }) + "\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "API platform maintenance failed."}\n`);
  process.exitCode = 1;
});
