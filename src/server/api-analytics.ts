import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import type { AuthUser } from "./auth-core.ts";
import { API_ENDPOINTS } from "./api-platform.ts";

const noStore = { "Cache-Control": "no-store" };
const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

type AnalyticsDependencies = { repository: () => PrismaClient };
type CountRow = { count: bigint | number; errors: bigint | number; averageResponseTimeMs: number | null };
type TrendRow = { bucket: Date; count: bigint | number; errors: bigint | number; averageResponseTimeMs: number | null };
type EndpointRow = { endpoint: string; count: bigint | number; errors: bigint | number };
type StatusRow = { statusCode: number; count: bigint | number };
type ProductRow = { id: string; name: string; count: bigint | number; errors: bigint | number };
type DeveloperRow = { id: string; name: string | null; email: string; count: bigint | number; errors: bigint | number };

function jsonError(message: string, status: number, code: string) {
  return Response.json({ error: message, code }, { status, headers: noStore });
}

function dateParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? parsed : null;
}

function count(value: bigint | number) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export async function handleApiAnalytics(
  request: Request,
  actor: AuthUser,
  dependencies: AnalyticsDependencies,
  now = new Date(),
) {
  if (request.method !== "GET") return jsonError("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
  if (actor.role !== "DEVELOPER" && actor.role !== "SUPER_ADMIN") {
    return jsonError("Developer or Super Admin access is required.", 403, "FORBIDDEN");
  }
  const params = new URL(request.url).searchParams;
  const allowed = new Set(["from", "to", "granularity", "developerId", "productId", "endpoint", "statusCode", "planId"]);
  if ([...params.keys()].some((key) => !allowed.has(key)) || [...allowed].some((key) => params.getAll(key).length > 1)) {
    return jsonError("Analytics filters are invalid.", 400, "INVALID_FILTERS");
  }
  const rawFrom = params.get("from");
  const rawTo = params.get("to");
  const from = rawFrom ? dateParam(rawFrom) : new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const to = rawTo ? dateParam(rawTo) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!from || !to || from > to) return jsonError("Choose a valid UTC date range.", 400, "INVALID_DATE_RANGE");
  const endExclusive = new Date(to.getTime() + 24 * 60 * 60 * 1000);
  if (endExclusive.getTime() - from.getTime() > MAX_RANGE_MS) {
    return jsonError("Detailed API analytics are available for up to 90 days.", 422, "DATE_RANGE_TOO_LARGE");
  }
  const granularity = params.get("granularity") ?? "daily";
  if (!["daily", "weekly", "monthly"].includes(granularity)) return jsonError("Analytics interval is invalid.", 400, "INVALID_FILTERS");
  const developerId = params.get("developerId");
  if (actor.role === "DEVELOPER" && developerId && developerId !== actor.id) {
    return jsonError("Developers may view only their own API usage.", 403, "ACCOUNT_ISOLATION");
  }
  const productId = params.get("productId");
  const planId = params.get("planId");
  const endpoint = params.get("endpoint");
  const rawStatusCode = params.get("statusCode");
  if (endpoint && !(API_ENDPOINTS as readonly string[]).includes(endpoint)) {
    return jsonError("Endpoint filter is invalid.", 400, "INVALID_FILTERS");
  }
  const statusCode = rawStatusCode === null ? null : Number(rawStatusCode);
  if (rawStatusCode !== null && (!/^\d{3}$/.test(rawStatusCode) || statusCode! < 100 || statusCode! > 599)) {
    return jsonError("HTTP status filter is invalid.", 400, "INVALID_FILTERS");
  }
  if (actor.role === "DEVELOPER" && (await dependencies.repository().apiDeveloperProfile.findUnique({
    where: { userId: actor.id },
    select: { status: true },
  }))?.status !== "VERIFIED") {
    return jsonError("Verified Developer access is required.", 403, "DEVELOPER_NOT_VERIFIED");
  }

  const filters: Prisma.Sql[] = [
    Prisma.sql`"occurredAt" >= ${from}`,
    Prisma.sql`"occurredAt" < ${endExclusive}`,
  ];
  if (actor.role === "DEVELOPER") filters.push(Prisma.sql`"developerUserId" = ${actor.id}`);
  else if (developerId) filters.push(Prisma.sql`"developerUserId" = ${developerId}`);
  if (productId) filters.push(Prisma.sql`"productId" = ${productId}`);
  if (planId) filters.push(Prisma.sql`"planId" = ${planId}`);
  if (endpoint) filters.push(Prisma.sql`"endpoint" = ${endpoint}`);
  if (statusCode !== null) filters.push(Prisma.sql`"statusCode" = ${statusCode}`);
  const whereSql = Prisma.join(filters, " AND ");
  const intervalSql = granularity === "weekly" ? "week" : granularity === "monthly" ? "month" : "day";
  const repository = dependencies.repository();

  try {
    const [summaryRows, trend, endpoints, statuses, products, developers, lifetime] = await Promise.all([
      repository.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "count",
          COUNT(*) FILTER (WHERE "statusCode" >= 400)::bigint AS "errors",
          AVG("responseTimeMs")::float8 AS "averageResponseTimeMs"
        FROM "ApiUsageEvent" WHERE ${whereSql}
      `),
      repository.$queryRaw<TrendRow[]>(Prisma.sql`
        SELECT date_trunc(${intervalSql}, "occurredAt") AS "bucket",
          COUNT(*)::bigint AS "count",
          COUNT(*) FILTER (WHERE "statusCode" >= 400)::bigint AS "errors",
          AVG("responseTimeMs")::float8 AS "averageResponseTimeMs"
        FROM "ApiUsageEvent" WHERE ${whereSql}
        GROUP BY "bucket" ORDER BY "bucket" ASC
      `),
      repository.$queryRaw<EndpointRow[]>(Prisma.sql`
        SELECT "endpoint", COUNT(*)::bigint AS "count",
          COUNT(*) FILTER (WHERE "statusCode" >= 400)::bigint AS "errors"
        FROM "ApiUsageEvent" WHERE ${whereSql}
        GROUP BY "endpoint" ORDER BY COUNT(*) DESC, "endpoint" ASC LIMIT 20
      `),
      repository.$queryRaw<StatusRow[]>(Prisma.sql`
        SELECT "statusCode", COUNT(*)::bigint AS "count"
        FROM "ApiUsageEvent" WHERE ${whereSql}
        GROUP BY "statusCode" ORDER BY "statusCode" ASC
      `),
      repository.$queryRaw<ProductRow[]>(Prisma.sql`
        SELECT p."id", p."name", COUNT(e.*)::bigint AS "count",
          COUNT(*) FILTER (WHERE e."statusCode" >= 400)::bigint AS "errors"
        FROM "ApiUsageEvent" e JOIN "ApiProduct" p ON p."id" = e."productId"
        WHERE ${whereSql} GROUP BY p."id", p."name"
        ORDER BY COUNT(e.*) DESC, p."name" ASC LIMIT 10
      `),
      actor.role === "SUPER_ADMIN" ? repository.$queryRaw<DeveloperRow[]>(Prisma.sql`
        SELECT u."id", u."fullName" AS "name", u."email", COUNT(e.*)::bigint AS "count",
          COUNT(*) FILTER (WHERE e."statusCode" >= 400)::bigint AS "errors"
        FROM "ApiUsageEvent" e JOIN "User" u ON u."id" = e."developerUserId"
        WHERE ${whereSql} GROUP BY u."id", u."fullName", u."email"
        ORDER BY COUNT(e.*) DESC, u."email" ASC LIMIT 10
      `) : Promise.resolve([] as DeveloperRow[]),
      repository.apiAccountUsageWindow.aggregate({
        where: {
          windowType: "MONTH",
          ...(actor.role === "DEVELOPER" ? { accountUserId: actor.id } : developerId ? { accountUserId: developerId } : {}),
          ...(productId ? { productId } : {}),
        },
        _sum: { requestCount: true, errorCount: true },
      }),
    ]);

    const summary = summaryRows[0] ?? { count: 0, errors: 0, averageResponseTimeMs: null };
    const totalRequests = count(summary.count);
    const errorRequests = count(summary.errors);
    if (totalRequests === null || errorRequests === null) return jsonError("API usage totals exceeded supported numeric limits.", 503, "ANALYTICS_UNAVAILABLE");
    const successfulRequests = totalRequests - errorRequests;
    return Response.json({
      range: { from: from.toISOString(), to: new Date(endExclusive.getTime() - 1).toISOString(), granularity, retainedDetailDays: 90 },
      summary: {
        totalRequests,
        successfulRequests,
        errorRequests,
        successRate: totalRequests ? Math.round((successfulRequests / totalRequests) * 10_000) / 100 : 0,
        averageResponseTimeMs: summary.averageResponseTimeMs === null ? null : Math.round(summary.averageResponseTimeMs * 100) / 100,
      },
      trend: trend.map((row) => ({
        bucket: row.bucket.toISOString(),
        requests: count(row.count) ?? 0,
        errors: count(row.errors) ?? 0,
        averageResponseTimeMs: row.averageResponseTimeMs === null ? null : Math.round(row.averageResponseTimeMs * 100) / 100,
      })),
      endpoints: endpoints.map((row) => ({ endpoint: row.endpoint, requests: count(row.count) ?? 0, errors: count(row.errors) ?? 0 })),
      statuses: statuses.map((row) => ({ statusCode: row.statusCode, requests: count(row.count) ?? 0 })),
      products: products.map((row) => ({ id: row.id, name: row.name, requests: count(row.count) ?? 0, errors: count(row.errors) ?? 0 })),
      developers: developers.map((row) => ({ id: row.id, name: row.name, email: row.email, requests: count(row.count) ?? 0, errors: count(row.errors) ?? 0 })),
      lifetimeMonthlyCounters: {
        requests: lifetime._sum.requestCount ?? 0,
        errors: lifetime._sum.errorCount ?? 0,
      },
    }, { headers: noStore });
  } catch (error) {
    console.error("API usage analytics could not be calculated.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("API analytics are temporarily unavailable.", 503, "ANALYTICS_UNAVAILABLE");
  }
}
