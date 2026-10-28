import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import type { AuthUser, UserRole } from "./auth-core.ts";
import { readJson, RequestBodyError } from "./request-body.ts";
import { isSameOriginMutation } from "./same-origin.ts";

export const API_ENDPOINTS = [
  "GET /api/health",
  "GET /api/locations",
  "POST /api/charts",
  "POST /api/transits",
  "GET /api/developer/test",
] as const;

type ApiEndpoint = (typeof API_ENDPOINTS)[number];
type PlatformDependencies = { repository: () => PrismaClient; pepper?: string };
type KeyRecord = {
  id: string;
  keyId: string;
  digest: string;
  ownerUserId: string;
  productId: string;
  accountGrantId: string;
  scopes: string[];
  requestsPerMinute: number;
  dailyQuota: number;
  monthlyQuota: number;
  status: "ACTIVE" | "DISABLED" | "REVOKED";
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  owner: { role: UserRole };
  product: { enabled: boolean; endpoints: string[] };
  accountGrant: { enabled: boolean; scopes: string[]; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number };
};
type KeyAuthResult =
  | { kind: "key"; key: Pick<KeyRecord, "id" | "keyId" | "ownerUserId" | "productId" | "scopes" | "requestsPerMinute" | "dailyQuota" | "monthlyQuota">; remaining: { key: { minute: number; day: number; month: number }; account: { minute: number; day: number; month: number } }; limits: { account: { minute: number; day: number; month: number } }; windows: ReturnType<typeof windowStarts> }
  | { kind: "session" }
  | { kind: "denied"; response: Response };

const noStore = { "Cache-Control": "no-store" };
const jsonError = (error: string, code: string, status: number) => Response.json({ error, code }, { status, headers: noStore });
const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const isSubset = (requested: string[], allowed: string[]) => requested.length > 0 && requested.every((scope) => allowed.includes(scope));
const within = (value: unknown, min: number, max: number): value is number =>
  Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;

function digestApiKey(secret: string, pepper: string) {
  return createHmac("sha256", pepper).update(secret).digest("hex");
}

function validPepper(pepper: string | undefined): pepper is string {
  return typeof pepper === "string" && Buffer.byteLength(pepper, "utf8") >= 32;
}

function constantTimeDigestMatch(expected: string, received: string) {
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(received, "hex");
  return left.length === 32 && right.length === left.length && timingSafeEqual(left, right);
}

function generateApiKey(pepper: string) {
  const keyId = randomBytes(9).toString("base64url");
  const secret = `life_live_${keyId}_${randomBytes(32).toString("base64url")}`;
  return { keyId, secret, prefix: `life_live_${keyId}_`, digest: digestApiKey(secret, pepper) };
}

function validKeySecret(value: string) {
  return /^life_live_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{40,50}$/.test(value);
}

function parseEndpointScope(value: unknown): value is ApiEndpoint {
  return typeof value === "string" && (API_ENDPOINTS as readonly string[]).includes(value);
}

function windowStarts(now: Date) {
  const minute = new Date(now);
  minute.setUTCSeconds(0, 0);
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { minute, day, month };
}

async function reserveUsage(repository: PrismaClient, key: KeyRecord, now: Date) {
  const windows = windowStarts(now);
  const keyLimits = [
    ["MINUTE", windows.minute, key.requestsPerMinute, "minute"],
    ["DAY", windows.day, key.dailyQuota, "day"],
    ["MONTH", windows.month, key.monthlyQuota, "month"],
  ] as const;
  const accountLimits = [
    ["MINUTE", windows.minute, key.accountGrant.requestsPerMinute, "minute"],
    ["DAY", windows.day, key.accountGrant.dailyQuota, "day"],
    ["MONTH", windows.month, key.accountGrant.monthlyQuota, "month"],
  ] as const;
  const counts: Record<string, number> = {};

  try {
    await repository.$transaction(async (transaction) => {
      for (const [windowType, windowStart, limit, label] of keyLimits) {
        const usage = await transaction.apiKeyUsageWindow.upsert({
          where: { apiKeyId_windowType_windowStart: { apiKeyId: key.id, windowType, windowStart } },
          create: { apiKeyId: key.id, windowType, windowStart, requestCount: 1 },
          update: { requestCount: { increment: 1 } },
          select: { requestCount: true },
        });
        if (usage.requestCount > limit) throw new Error(`API_QUOTA_KEY_${label.toUpperCase()}`);
        counts[`key_${label}`] = usage.requestCount;
      }
      for (const [windowType, windowStart, limit, label] of accountLimits) {
        const usage = await transaction.apiAccountUsageWindow.upsert({
          where: { accountUserId_productId_windowType_windowStart: { accountUserId: key.ownerUserId, productId: key.productId, windowType, windowStart } },
          create: { accountUserId: key.ownerUserId, productId: key.productId, windowType, windowStart, requestCount: 1 },
          update: { requestCount: { increment: 1 } },
          select: { requestCount: true },
        });
        if (usage.requestCount > limit) throw new Error(`API_QUOTA_ACCOUNT_${label.toUpperCase()}`);
        counts[`account_${label}`] = usage.requestCount;
      }
      await transaction.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: now } });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("API_QUOTA_")) {
      return { error: error.message.slice("API_QUOTA_".length).toLowerCase() };
    }
    throw error;
  }
  return {
    remaining: {
      key: { minute: key.requestsPerMinute - counts.key_minute, day: key.dailyQuota - counts.key_day, month: key.monthlyQuota - counts.key_month },
      account: { minute: key.accountGrant.requestsPerMinute - counts.account_minute, day: key.accountGrant.dailyQuota - counts.account_day, month: key.accountGrant.monthlyQuota - counts.account_month },
    },
  };
}

export async function authenticateApiKey(request: Request, scope: ApiEndpoint, dependencies: PlatformDependencies, now = new Date()): Promise<KeyAuthResult> {
  const authorization = request.headers.get("authorization");
  if (!authorization) return { kind: "session" };
  const match = /^Bearer (.+)$/.exec(authorization);
  if (!match || !validKeySecret(match[1])) return { kind: "denied", response: jsonError("API key is invalid.", "INVALID_API_KEY", 401) };
  if (!validPepper(dependencies.pepper)) return { kind: "denied", response: jsonError("API authentication is unavailable.", "API_AUTH_UNAVAILABLE", 503) };

  try {
    const secret = match[1];
    const keyId = secret.split("_")[2];
    const repository = dependencies.repository();
    const key = await repository.apiKey.findUnique({
      where: { keyId },
      include: {
        owner: { select: { role: true } },
        product: { select: { enabled: true, endpoints: true } },
        accountGrant: { select: { enabled: true, scopes: true, requestsPerMinute: true, dailyQuota: true, monthlyQuota: true } },
      },
    }) as KeyRecord | null;
    if (!key || !constantTimeDigestMatch(key.digest, digestApiKey(secret, dependencies.pepper))) {
      return { kind: "denied", response: jsonError("API key is invalid.", "INVALID_API_KEY", 401) };
    }
    if (key.status !== "ACTIVE") return { kind: "denied", response: jsonError("API key is not active.", "API_KEY_INACTIVE", 401) };
    if (key.owner.role !== "DEVELOPER") return { kind: "denied", response: jsonError("The API account is no longer authorized.", "API_ACCOUNT_UNAUTHORIZED", 403) };
    if (key.expiresAt && key.expiresAt <= now) return { kind: "denied", response: jsonError("API key has expired.", "API_KEY_EXPIRED", 401) };
    if (!key.product.enabled || !key.accountGrant.enabled) return { kind: "denied", response: jsonError("API access has been disabled.", "API_ACCESS_DISABLED", 403) };
    if (!isSubset(key.scopes, key.accountGrant.scopes)
      || key.requestsPerMinute > key.accountGrant.requestsPerMinute
      || key.dailyQuota > key.accountGrant.dailyQuota || key.monthlyQuota > key.accountGrant.monthlyQuota) {
      return { kind: "denied", response: jsonError("API key exceeds the current account grant.", "API_GRANT_CHANGED", 403) };
    }
    if (!key.scopes.includes(scope) || !key.product.endpoints.includes(scope)) {
      return { kind: "denied", response: jsonError("This API key does not have permission for the endpoint.", "INSUFFICIENT_SCOPE", 403) };
    }
    const quota = await reserveUsage(repository, key, now);
    if ("error" in quota && typeof quota.error === "string") {
      return { kind: "denied", response: Response.json({ error: "API quota exceeded.", code: "QUOTA_EXCEEDED", quota: quota.error }, { status: 429, headers: { ...noStore, "Retry-After": quota.error.endsWith("minute") ? "60" : "3600" } }) };
    }
    if (!("remaining" in quota) || !quota.remaining) throw new Error("API quota reservation did not return remaining quota.");
    return {
      kind: "key",
      key: {
        id: key.id,
        keyId: key.keyId,
        ownerUserId: key.ownerUserId,
        productId: key.productId,
        scopes: key.scopes,
        requestsPerMinute: key.requestsPerMinute,
        dailyQuota: key.dailyQuota,
        monthlyQuota: key.monthlyQuota,
      },
      remaining: quota.remaining,
      limits: { account: { minute: key.accountGrant.requestsPerMinute, day: key.accountGrant.dailyQuota, month: key.accountGrant.monthlyQuota } },
      windows: windowStarts(now),
    };
  } catch (error) {
    console.error("API key verification could not complete.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return { kind: "denied", response: jsonError("API key service is temporarily unavailable.", "API_AUTH_UNAVAILABLE", 503) };
  }
}

export async function withApiKeyAccess(
  request: Request,
  scope: ApiEndpoint,
  dependencies: PlatformDependencies,
  handler: (authentication: Exclude<KeyAuthResult, { kind: "denied" }>) => Promise<Response>,
) {
  const authentication = await authenticateApiKey(request, scope, dependencies);
  if (authentication.kind === "denied") return authentication.response;
  try {
    const response = await handler(authentication);
    if (authentication.kind === "key") {
      await dependencies.repository().apiKeyUsageWindow.updateMany({
        where: { apiKeyId: authentication.key.id, windowStart: { in: Object.values(authentication.windows) } },
        data: { errorCount: { increment: response.status >= 400 ? 1 : 0 } },
      });
      await dependencies.repository().apiAccountUsageWindow.updateMany({
        where: { accountUserId: authentication.key.ownerUserId, productId: authentication.key.productId, windowStart: { in: Object.values(authentication.windows) } },
        data: { errorCount: { increment: response.status >= 400 ? 1 : 0 } },
      });
    }
    return response;
  } catch (error) {
    console.error("API-key-protected request could not complete.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("API request could not be completed.", "API_REQUEST_FAILED", 500);
  }
}

async function parseBody(request: Request) {
  try {
    return asObject(await readJson(request, 32_000));
  } catch (error) {
    if (error instanceof RequestBodyError) return null;
    throw error;
  }
}

function safeKey(key: Record<string, unknown>) {
  const { digest: _digest, ...publicKey } = key;
  return publicKey;
}

function keyStillAuthorized(key: {
  owner: { role: string };
  product: { enabled: boolean; endpoints: string[] };
  accountGrant: { enabled: boolean; scopes: string[]; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number };
  scopes: string[];
  requestsPerMinute: number;
  dailyQuota: number;
  monthlyQuota: number;
}) {
  return key.owner.role === "DEVELOPER"
    && key.product.enabled
    && key.accountGrant.enabled
    && isSubset(key.scopes, key.accountGrant.scopes)
    && isSubset(key.scopes, key.product.endpoints)
    && key.requestsPerMinute <= key.accountGrant.requestsPerMinute
    && key.dailyQuota <= key.accountGrant.dailyQuota
    && key.monthlyQuota <= key.accountGrant.monthlyQuota;
}

async function auditKey(repository: PrismaClient, apiKeyId: string, actorUserId: string, action: string, details: Prisma.InputJsonObject = {}) {
  await repository.apiKeyAuditLog.create({ data: { apiKeyId, actorUserId, action, details } });
}

async function actorCanManageProduct(repository: PrismaClient, actor: AuthUser, productId: string) {
  if (actor.role === "SUPER_ADMIN") return { allowed: true, scopes: [...API_ENDPOINTS], rpm: 600, daily: 1_000_000, monthly: 10_000_000 };
  if (actor.role !== "ADMIN") return { allowed: false, scopes: [], rpm: 0, daily: 0, monthly: 0 };
  const permission = await repository.apiAdminPermission.findUnique({
    where: { adminUserId_productId: { adminUserId: actor.id, productId } },
  });
  return permission?.enabled && permission.canManageAccess
    ? { allowed: true, scopes: permission.scopes, rpm: permission.maxRequestsPerMinute, daily: permission.maxDailyQuota, monthly: permission.maxMonthlyQuota }
    : { allowed: false, scopes: [], rpm: 0, daily: 0, monthly: 0 };
}

export async function handleApiProducts(request: Request, actor: AuthUser, dependencies: PlatformDependencies) {
  const repository = dependencies.repository();
  if (request.method === "GET") {
    if (!["DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) return jsonError("Developer or administrator access is required.", "FORBIDDEN", 403);
    const products = await repository.apiProduct.findMany({
      where: actor.role === "SUPER_ADMIN" ? undefined : { enabled: true },
      orderBy: { name: "asc" },
    });
    return Response.json({ products }, { headers: noStore });
  }
  if (actor.role !== "SUPER_ADMIN") return jsonError("Super Admin access is required.", "FORBIDDEN", 403);
  const body = await parseBody(request);
  if (!body || typeof body.slug !== "string" || !/^[a-z0-9-]{2,60}$/.test(body.slug)
    || typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100
    || typeof body.description !== "string" || body.description.length > 500
    || !Array.isArray(body.endpoints) || body.endpoints.length === 0 || !body.endpoints.every(parseEndpointScope)
    || !within(body.defaultRequestsPerMinute, 1, 600) || !within(body.defaultDailyQuota, 1, 1_000_000)
    || !within(body.defaultMonthlyQuota, 1, 10_000_000)) return jsonError("Product fields or limits are invalid.", "INVALID_PRODUCT", 422);
  try {
    const product = await repository.$transaction(async (transaction) => {
      const created = await transaction.apiProduct.create({ data: {
        slug: body.slug as string, name: (body.name as string).trim(), description: (body.description as string).trim(),
        endpoints: [...new Set(body.endpoints as string[])],
        defaultRequestsPerMinute: body.defaultRequestsPerMinute as number,
        defaultDailyQuota: body.defaultDailyQuota as number,
        defaultMonthlyQuota: body.defaultMonthlyQuota as number,
      } });
      await transaction.apiPlatformAuditLog.create({ data: { actorUserId: actor.id, action: "PRODUCT_CREATED", targetType: "PRODUCT", targetId: created.id, details: { slug: created.slug } } });
      return created;
    });
    return Response.json({ product }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("API product could not be created.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Product could not be created; verify its unique slug and schema.", "PRODUCT_CREATE_FAILED", 409);
  }
}

export async function handleApiProduct(request: Request, productId: string, actor: AuthUser, dependencies: PlatformDependencies) {
  const repository = dependencies.repository();
  if (actor.role !== "SUPER_ADMIN") return jsonError("Super Admin access is required.", "FORBIDDEN", 403);
  if (request.method === "GET") {
    const product = await repository.apiProduct.findUnique({ where: { id: productId } });
    return product ? Response.json({ product }, { headers: noStore }) : jsonError("API product was not found.", "PRODUCT_NOT_FOUND", 404);
  }
  const body = await parseBody(request);
  if (!body) return jsonError("Product update body is invalid.", "INVALID_PRODUCT", 422);
  const current = await repository.apiProduct.findUnique({ where: { id: productId } });
  if (!current) return jsonError("API product was not found.", "PRODUCT_NOT_FOUND", 404);
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) return jsonError("Product name is invalid.", "INVALID_PRODUCT", 422);
    update.name = body.name.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > 500) return jsonError("Product description is invalid.", "INVALID_PRODUCT", 422);
    update.description = body.description.trim();
  }
  if (body.endpoints !== undefined) {
    if (!Array.isArray(body.endpoints) || body.endpoints.length === 0 || !body.endpoints.every(parseEndpointScope)) return jsonError("Product endpoints are invalid.", "INVALID_PRODUCT", 422);
    update.endpoints = [...new Set(body.endpoints as string[])];
  }
  if (body.defaultRequestsPerMinute !== undefined) {
    if (!within(body.defaultRequestsPerMinute, 1, 600)) return jsonError("Product request limit is invalid.", "INVALID_PRODUCT", 422);
    update.defaultRequestsPerMinute = body.defaultRequestsPerMinute;
  }
  if (body.defaultDailyQuota !== undefined) {
    if (!within(body.defaultDailyQuota, 1, 1_000_000)) return jsonError("Product daily quota is invalid.", "INVALID_PRODUCT", 422);
    update.defaultDailyQuota = body.defaultDailyQuota;
  }
  if (body.defaultMonthlyQuota !== undefined) {
    if (!within(body.defaultMonthlyQuota, 1, 10_000_000)) return jsonError("Product monthly quota is invalid.", "INVALID_PRODUCT", 422);
    update.defaultMonthlyQuota = body.defaultMonthlyQuota;
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") return jsonError("Product status is invalid.", "INVALID_PRODUCT", 422);
    update.enabled = body.enabled;
  }
  const next = { ...current, ...update } as typeof current;
  const [grants, adminPermissions, keys] = await Promise.all([
    repository.apiAccountGrant.findMany({ where: { productId } }),
    repository.apiAdminPermission.findMany({ where: { productId } }),
    repository.apiKey.findMany({ where: { productId, status: "ACTIVE" }, select: { scopes: true, requestsPerMinute: true, dailyQuota: true, monthlyQuota: true } }),
  ]);
  if (grants.some((grant) => grant.requestsPerMinute > next.defaultRequestsPerMinute || grant.dailyQuota > next.defaultDailyQuota
    || grant.monthlyQuota > next.defaultMonthlyQuota || grant.scopes.some((scope) => !next.endpoints.includes(scope)))
    || adminPermissions.some((permission) => permission.maxRequestsPerMinute > next.defaultRequestsPerMinute
      || permission.maxDailyQuota > next.defaultDailyQuota || permission.maxMonthlyQuota > next.defaultMonthlyQuota
      || permission.scopes.some((scope) => !next.endpoints.includes(scope)))
    || keys.some((key) => key.requestsPerMinute > next.defaultRequestsPerMinute || key.dailyQuota > next.defaultDailyQuota
      || key.monthlyQuota > next.defaultMonthlyQuota || key.scopes.some((scope) => !next.endpoints.includes(scope)))) {
    return jsonError("Product limits or endpoints cannot be reduced below current grants, permissions or active keys. Revoke or lower those first.", "PRODUCT_IN_USE", 409);
  }
  const product = await repository.$transaction(async (transaction) => {
    const updated = await transaction.apiProduct.update({ where: { id: productId }, data: update });
    await transaction.apiPlatformAuditLog.create({ data: { actorUserId: actor.id, action: "PRODUCT_UPDATED", targetType: "PRODUCT", targetId: productId, details: { changedFields: Object.keys(update) } } });
    return updated;
  });
  return Response.json({ product }, { headers: noStore });
}

export async function handleApiAccounts(request: Request, actor: AuthUser, dependencies: PlatformDependencies) {
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) return jsonError("Administrator access is required.", "FORBIDDEN", 403);
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 100) return jsonError("Account search is too long.", "INVALID_QUERY", 422);
  const repository = dependencies.repository();
  const requestedRole = new URL(request.url).searchParams.get("role");
  const targetRole = actor.role === "SUPER_ADMIN" && requestedRole === "ADMIN" ? "ADMIN" : "DEVELOPER";
  const where: Record<string, unknown> = { role: targetRole };
  if (query) where.OR = [{ email: { contains: query, mode: "insensitive" } }, { fullName: { contains: query, mode: "insensitive" } }];
  if (actor.role === "ADMIN" && targetRole === "DEVELOPER") {
    where.apiAccessGrants = { some: { enabled: true, product: { adminPermissions: { some: { adminUserId: actor.id, enabled: true, canManageAccess: true } } } } };
  }
  const accounts = await repository.user.findMany({
    where, select: { id: true, email: true, fullName: true }, orderBy: { email: "asc" }, take: 50,
  });
  return Response.json({ accounts }, { headers: noStore });
}

export async function handleApiGrants(request: Request, actor: AuthUser, dependencies: PlatformDependencies) {
  const repository = dependencies.repository();
  if (request.method === "GET") {
    if (!["DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) return jsonError("Developer or administrator access is required.", "FORBIDDEN", 403);
    const where = actor.role === "SUPER_ADMIN"
      ? undefined
      : actor.role === "DEVELOPER"
        ? { accountUserId: actor.id }
        : { product: { adminPermissions: { some: { adminUserId: actor.id, enabled: true, canManageAccess: true } } } };
    const grants = await repository.apiAccountGrant.findMany({
      where, include: { account: { select: { id: true, email: true, role: true } }, product: { select: { id: true, slug: true, name: true, enabled: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return Response.json({ grants }, { headers: noStore });
  }
  if (actor.role !== "SUPER_ADMIN") return jsonError("Only Super Admin can assign API product access.", "FORBIDDEN", 403);
  const body = await parseBody(request);
  if (!body || typeof body.accountUserId !== "string" || typeof body.productId !== "string"
    || !Array.isArray(body.scopes) || body.scopes.length === 0 || !body.scopes.every(parseEndpointScope)
    || !within(body.requestsPerMinute, 1, 600) || !within(body.dailyQuota, 1, 1_000_000)
    || !within(body.monthlyQuota, 1, 10_000_000) || typeof body.enabled !== "boolean") {
    return jsonError("Account access fields are invalid.", "INVALID_API_GRANT", 422);
  }
  const [account, product] = await Promise.all([
    repository.user.findUnique({ where: { id: body.accountUserId }, select: { id: true, role: true } }),
    repository.apiProduct.findUnique({ where: { id: body.productId } }),
  ]);
  if (account?.role !== "DEVELOPER" || !product?.enabled
    || !(body.scopes as string[]).every((scope) => product.endpoints.includes(scope))
    || (body.requestsPerMinute as number) > product.defaultRequestsPerMinute
    || (body.dailyQuota as number) > product.defaultDailyQuota
    || (body.monthlyQuota as number) > product.defaultMonthlyQuota) {
    return jsonError("Developer account, enabled product, scopes, and limits must be valid and within product defaults.", "API_GRANT_OUT_OF_BOUNDS", 422);
  }
  const grant = await repository.$transaction(async (transaction) => {
    const saved = await transaction.apiAccountGrant.upsert({
      where: { accountUserId_productId: { accountUserId: body.accountUserId as string, productId: body.productId as string } },
      create: {
        accountUserId: body.accountUserId as string, productId: body.productId as string, scopes: [...new Set(body.scopes as string[])],
        requestsPerMinute: body.requestsPerMinute as number, dailyQuota: body.dailyQuota as number,
        monthlyQuota: body.monthlyQuota as number, enabled: body.enabled as boolean, grantedByUserId: actor.id,
      },
      update: {
        scopes: [...new Set(body.scopes as string[])], requestsPerMinute: body.requestsPerMinute as number,
        dailyQuota: body.dailyQuota as number, monthlyQuota: body.monthlyQuota as number,
        enabled: body.enabled as boolean, grantedByUserId: actor.id,
      },
      include: { account: { select: { id: true, email: true } }, product: { select: { id: true, name: true, slug: true } } },
    });
    await transaction.apiPlatformAuditLog.create({ data: { actorUserId: actor.id, action: "ACCOUNT_ACCESS_ASSIGNED", targetType: "ACCOUNT_GRANT", targetId: saved.id, details: { accountUserId: saved.accountUserId, productId: saved.productId, enabled: saved.enabled, scopes: saved.scopes } } });
    return saved;
  });
  return Response.json({ grant }, { status: 201, headers: noStore });
}

export async function handleApiAdminPermissions(request: Request, actor: AuthUser, dependencies: PlatformDependencies) {
  const repository = dependencies.repository();
  if (request.method === "GET") {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") return jsonError("Administrator access is required.", "FORBIDDEN", 403);
    const permissions = await repository.apiAdminPermission.findMany({
      where: actor.role === "SUPER_ADMIN" ? undefined : { adminUserId: actor.id },
      include: { admin: { select: { id: true, email: true } }, product: { select: { id: true, name: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return Response.json({ permissions }, { headers: noStore });
  }
  if (actor.role !== "SUPER_ADMIN") return jsonError("Super Admin access is required.", "FORBIDDEN", 403);
  const body = await parseBody(request);
  if (!body || typeof body.adminUserId !== "string" || typeof body.productId !== "string"
    || !Array.isArray(body.scopes) || body.scopes.length === 0 || !body.scopes.every(parseEndpointScope)
    || !within(body.maxRequestsPerMinute, 1, 600) || !within(body.maxDailyQuota, 1, 1_000_000)
    || !within(body.maxMonthlyQuota, 1, 10_000_000) || typeof body.canManageAccess !== "boolean"
    || typeof body.enabled !== "boolean") return jsonError("Admin permission fields are invalid.", "INVALID_API_ADMIN_PERMISSION", 422);
  const [admin, product] = await Promise.all([
    repository.user.findUnique({ where: { id: body.adminUserId }, select: { id: true, role: true } }),
    repository.apiProduct.findUnique({ where: { id: body.productId } }),
  ]);
  if (admin?.role !== "ADMIN" || !product?.enabled
    || !(body.scopes as string[]).every((scope) => product.endpoints.includes(scope))
    || (body.maxRequestsPerMinute as number) > product.defaultRequestsPerMinute
    || (body.maxDailyQuota as number) > product.defaultDailyQuota
    || (body.maxMonthlyQuota as number) > product.defaultMonthlyQuota) {
    return jsonError("Admin and permission limits must be within the enabled product.", "API_ADMIN_PERMISSION_OUT_OF_BOUNDS", 422);
  }
  const permission = await repository.$transaction(async (transaction) => {
    const saved = await transaction.apiAdminPermission.upsert({
      where: { adminUserId_productId: { adminUserId: body.adminUserId as string, productId: body.productId as string } },
      create: {
        adminUserId: body.adminUserId as string, productId: body.productId as string, scopes: [...new Set(body.scopes as string[])],
        maxRequestsPerMinute: body.maxRequestsPerMinute as number, maxDailyQuota: body.maxDailyQuota as number,
        maxMonthlyQuota: body.maxMonthlyQuota as number, canManageAccess: body.canManageAccess as boolean,
        enabled: body.enabled as boolean, grantedByUserId: actor.id,
      },
      update: {
        scopes: [...new Set(body.scopes as string[])], maxRequestsPerMinute: body.maxRequestsPerMinute as number,
        maxDailyQuota: body.maxDailyQuota as number, maxMonthlyQuota: body.maxMonthlyQuota as number,
        canManageAccess: body.canManageAccess as boolean, enabled: body.enabled as boolean, grantedByUserId: actor.id,
      },
    });
    await transaction.apiPlatformAuditLog.create({ data: { actorUserId: actor.id, action: "ADMIN_PERMISSION_ASSIGNED", targetType: "ADMIN_PERMISSION", targetId: saved.id, details: { adminUserId: saved.adminUserId, productId: saved.productId, enabled: saved.enabled, canManageAccess: saved.canManageAccess, scopes: saved.scopes } } });
    return saved;
  });
  return Response.json({ permission }, { status: 201, headers: noStore });
}

async function keyVisibleToActor(repository: PrismaClient, actor: AuthUser, keyId: string) {
  const key = await repository.apiKey.findUnique({ where: { keyId }, include: { owner: { select: { role: true } }, product: true, accountGrant: true } });
  if (!key) return null;
  if (actor.role === "SUPER_ADMIN") return key;
  if (actor.role === "DEVELOPER" && key.ownerUserId === actor.id) return key;
  if (actor.role === "ADMIN") {
    const permission = await actorCanManageProduct(repository, actor, key.productId);
    if (permission.allowed && key.ownerUserId && key.scopes.every((scope) => permission.scopes.includes(scope))) return key;
  }
  return null;
}

export async function handleApiKeys(request: Request, actor: AuthUser, dependencies: PlatformDependencies) {
  const repository = dependencies.repository();
  if (request.method === "GET") {
    if (!["DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) return jsonError("Developer or administrator access is required.", "FORBIDDEN", 403);
    const params = new URL(request.url).searchParams;
    const where: Record<string, unknown> = {};
    if (actor.role === "DEVELOPER") where.ownerUserId = actor.id;
    if (actor.role === "ADMIN") where.product = { adminPermissions: { some: { adminUserId: actor.id, enabled: true, canManageAccess: true } } };
    if (actor.role !== "DEVELOPER" && params.get("account")) where.ownerUserId = params.get("account");
    if (params.get("status") && ["ACTIVE", "DISABLED", "REVOKED"].includes(params.get("status")!)) where.status = params.get("status");
    if (params.get("product")) where.productId = params.get("product");
    let keys = await repository.apiKey.findMany({
      where,
      select: {
        id: true, keyId: true, prefix: true, label: true, ownerUserId: true, productId: true, scopes: true,
        requestsPerMinute: true, dailyQuota: true, monthlyQuota: true, status: true, expiresAt: true,
        lastUsedAt: true, createdAt: true, product: { select: { id: true, name: true, slug: true } },
        owner: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (actor.role === "ADMIN") {
      const permissions = await repository.apiAdminPermission.findMany({
        where: { adminUserId: actor.id, enabled: true, canManageAccess: true },
        select: { productId: true, scopes: true },
      });
      keys = keys.filter((key) => {
        const permission = permissions.find((item) => item.productId === key.productId);
        return permission && key.scopes.every((scope) => permission.scopes.includes(scope));
      });
    }
    const keyIds = keys.map((key) => key.id);
    const usage = keyIds.length ? await repository.apiKeyUsageWindow.findMany({
      where: { apiKeyId: { in: keyIds }, windowType: "MONTH", windowStart: windowStarts(new Date()).month },
      select: { apiKeyId: true, requestCount: true, errorCount: true },
    }) : [];
    const accountUsage = keys.length ? await repository.apiAccountUsageWindow.findMany({
      where: {
        accountUserId: { in: [...new Set(keys.map((key) => key.ownerUserId))] },
        productId: { in: [...new Set(keys.map((key) => key.productId))] },
        windowType: "MONTH",
        windowStart: windowStarts(new Date()).month,
      },
      select: { accountUserId: true, productId: true, requestCount: true, errorCount: true },
    }) : [];
    return Response.json({ keys: keys.map((key) => ({
      ...key,
      usage: usage.find((item) => item.apiKeyId === key.id) ?? { requestCount: 0, errorCount: 0 },
      accountUsage: accountUsage.find((item) => item.accountUserId === key.ownerUserId && item.productId === key.productId) ?? { requestCount: 0, errorCount: 0 },
    })) }, { headers: noStore });
  }

  if (!["DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) return jsonError("Developer or administrator access is required.", "FORBIDDEN", 403);
  const body = await parseBody(request);
  if (!body || typeof body.ownerUserId !== "string" || typeof body.productId !== "string"
    || typeof body.label !== "string" || !body.label.trim() || body.label.trim().length > 100
    || !Array.isArray(body.scopes) || body.scopes.length === 0 || !body.scopes.every(parseEndpointScope)
    || !within(body.requestsPerMinute, 1, 600) || !within(body.dailyQuota, 1, 1_000_000)
    || !within(body.monthlyQuota, 1, 10_000_000)
    || (body.expiresAt !== undefined && body.expiresAt !== null && (typeof body.expiresAt !== "string" || !Number.isFinite(Date.parse(body.expiresAt)) || Date.parse(body.expiresAt) <= Date.now()))) {
    return jsonError("API key fields or limits are invalid.", "INVALID_API_KEY_REQUEST", 422);
  }
  if (actor.role === "DEVELOPER" && body.ownerUserId !== actor.id) return jsonError("You can only create keys for your own account.", "ACCOUNT_ISOLATION", 403);
  const [account, product, grant, adminPermission] = await Promise.all([
    repository.user.findUnique({ where: { id: body.ownerUserId }, select: { id: true, role: true } }),
    repository.apiProduct.findUnique({ where: { id: body.productId } }),
    repository.apiAccountGrant.findUnique({ where: { accountUserId_productId: { accountUserId: body.ownerUserId, productId: body.productId } } }),
    actor.role === "ADMIN" ? repository.apiAdminPermission.findUnique({ where: { adminUserId_productId: { adminUserId: actor.id, productId: body.productId } } }) : Promise.resolve(null),
  ]);
  if (account?.role !== "DEVELOPER" || !product?.enabled || !grant?.enabled
    || !isSubset(body.scopes as string[], grant.scopes) || !isSubset(body.scopes as string[], product.endpoints)
    || (body.requestsPerMinute as number) > grant.requestsPerMinute || (body.dailyQuota as number) > grant.dailyQuota
    || (body.monthlyQuota as number) > grant.monthlyQuota) {
    return jsonError("Account must have an active grant and requested key limits/scopes cannot exceed it.", "API_KEY_OUT_OF_BOUNDS", 403);
  }
  if (actor.role === "ADMIN" && (!adminPermission?.enabled || !adminPermission.canManageAccess
    || !isSubset(body.scopes as string[], adminPermission.scopes)
    || (body.requestsPerMinute as number) > adminPermission.maxRequestsPerMinute
    || (body.dailyQuota as number) > adminPermission.maxDailyQuota
    || (body.monthlyQuota as number) > adminPermission.maxMonthlyQuota)) {
    return jsonError("Admin API permissions do not authorize the requested account, scopes or limits.", "ADMIN_API_PERMISSION_EXCEEDED", 403);
  }
  if (!validPepper(dependencies.pepper)) return jsonError("API key creation is not configured.", "API_KEY_CREATION_UNAVAILABLE", 503);
  const generated = generateApiKey(dependencies.pepper);
  const label = body.label.trim();
  try {
    const key = await repository.$transaction(async (transaction) => {
      const created: { id: string; keyId: string; prefix: string; label: string; ownerUserId: string; productId: string; scopes: string[]; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number; status: "ACTIVE" | "DISABLED" | "REVOKED"; expiresAt: Date | null; createdAt: Date } = await transaction.apiKey.create({
        data: {
          ...generated, keyId: generated.keyId, label, ownerUserId: body.ownerUserId as string,
          createdByUserId: actor.id, productId: body.productId as string, accountGrantId: grant.id,
          scopes: [...new Set(body.scopes as string[])], requestsPerMinute: body.requestsPerMinute as number,
          dailyQuota: body.dailyQuota as number, monthlyQuota: body.monthlyQuota as number,
          expiresAt: body.expiresAt ? new Date(body.expiresAt as string) : null,
        },
        select: { id: true, keyId: true, prefix: true, label: true, ownerUserId: true, productId: true, scopes: true, requestsPerMinute: true, dailyQuota: true, monthlyQuota: true, status: true, expiresAt: true, createdAt: true },
      });
      await transaction.apiKeyAuditLog.create({ data: { apiKeyId: created.id, actorUserId: actor.id, action: "CREATED", details: { label: created.label, ownerUserId: created.ownerUserId, productId: created.productId } } });
      return created;
    });
    return Response.json({ key: { ...key, product: { id: product.id, name: product.name, slug: product.slug } }, secret: generated.secret }, { status: 201, headers: noStore });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return jsonError("That account already has an API key with this label.", "API_KEY_LABEL_EXISTS", 409);
    }
    console.error("API key could not be created.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("API key could not be created.", "API_KEY_CREATE_FAILED", 503);
  }
}

export async function handleApiKey(request: Request, keyId: string, actor: AuthUser, dependencies: PlatformDependencies) {
  const repository = dependencies.repository();
  const key = await keyVisibleToActor(repository, actor, keyId);
  if (!key) return jsonError("API key was not found or is not accessible.", "API_KEY_NOT_FOUND", 404);
  if (request.method === "GET") {
    const [usage, accountUsage, audit] = await Promise.all([
      repository.apiKeyUsageWindow.findMany({ where: { apiKeyId: key.id }, orderBy: { windowStart: "desc" }, take: 100 }),
      repository.apiAccountUsageWindow.findMany({ where: { accountUserId: key.ownerUserId, productId: key.productId }, orderBy: { windowStart: "desc" }, take: 100 }),
      actor.role === "SUPER_ADMIN" || actor.role === "ADMIN"
        ? repository.apiKeyAuditLog.findMany({ where: { apiKeyId: key.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, action: true, details: true, createdAt: true, actor: { select: { email: true } } } })
        : Promise.resolve([]),
    ]);
    return Response.json({ key: safeKey(key as unknown as Record<string, unknown>), usage, accountUsage, audit }, { headers: noStore });
  }
  if (actor.role === "DEVELOPER" && key.ownerUserId !== actor.id) return jsonError("You can only manage your own API keys.", "ACCOUNT_ISOLATION", 403);
  if (actor.role === "ADMIN") {
    const permission = await actorCanManageProduct(repository, actor, key.productId);
    if (!permission.allowed || !key.scopes.every((scope) => permission.scopes.includes(scope))) return jsonError("Admin API permissions do not authorize this key.", "ADMIN_API_PERMISSION_EXCEEDED", 403);
  }
  if (request.method === "DELETE") {
    if (key.status === "REVOKED") return Response.json({ revoked: true }, { headers: noStore });
    await repository.$transaction(async (transaction) => {
      await transaction.apiKey.update({ where: { id: key.id }, data: { status: "REVOKED" } });
      await transaction.apiKeyAuditLog.create({ data: { apiKeyId: key.id, actorUserId: actor.id, action: "REVOKED", details: {} } });
    });
    return Response.json({ revoked: true }, { headers: noStore });
  }
  if (request.method === "PATCH") {
    const body = await parseBody(request);
    if (!body || !["ACTIVE", "DISABLED"].includes(body.status as string) || key.status === "REVOKED") return jsonError("Only active or disabled keys may be changed; revoked keys cannot be restored.", "INVALID_API_KEY_STATUS", 422);
    if (body.status === "ACTIVE" && !keyStillAuthorized(key)) return jsonError("The key's product, account grant, role, scopes or limits no longer authorize it.", "API_KEY_ACCESS_CHANGED", 409);
    if (body.status === "ACTIVE" && actor.role === "ADMIN") {
      const permission = await actorCanManageProduct(repository, actor, key.productId);
      if (key.requestsPerMinute > permission.rpm || key.dailyQuota > permission.daily || key.monthlyQuota > permission.monthly) {
        return jsonError("Current Admin permissions do not authorize re-enabling this key.", "ADMIN_API_PERMISSION_EXCEEDED", 403);
      }
    }
    const updated = await repository.$transaction(async (transaction) => {
      const result = await transaction.apiKey.update({ where: { id: key.id }, data: { status: body.status as "ACTIVE" | "DISABLED" } });
      await transaction.apiKeyAuditLog.create({ data: { apiKeyId: key.id, actorUserId: actor.id, action: body.status === "ACTIVE" ? "ENABLED" : "DISABLED", details: {} } });
      return result;
    });
    return Response.json({ key: safeKey(updated as unknown as Record<string, unknown>) }, { headers: noStore });
  }
  if (request.method === "POST") {
    if (key.status !== "ACTIVE" || !validPepper(dependencies.pepper)) return jsonError("Only active keys may be rotated and key generation must be configured.", "API_KEY_ROTATION_UNAVAILABLE", 409);
    if (!keyStillAuthorized(key)) return jsonError("The key's product, account grant, role, scopes or limits no longer authorize it.", "API_KEY_ACCESS_CHANGED", 409);
    if (actor.role === "ADMIN") {
      const permission = await actorCanManageProduct(repository, actor, key.productId);
      if (key.requestsPerMinute > permission.rpm || key.dailyQuota > permission.daily || key.monthlyQuota > permission.monthly) {
        return jsonError("Current Admin permissions do not authorize rotating this key.", "ADMIN_API_PERMISSION_EXCEEDED", 403);
      }
    }
    const generated = generateApiKey(dependencies.pepper);
    const rotatedLabel = `${key.label.slice(0, 76)} (rotated ${generated.keyId})`.slice(0, 100);
    const replacement = await repository.$transaction(async (transaction) => {
      const created = await transaction.apiKey.create({
        data: {
          ...generated, label: rotatedLabel, ownerUserId: key.ownerUserId, createdByUserId: actor.id, productId: key.productId,
          accountGrantId: key.accountGrantId, scopes: key.scopes, requestsPerMinute: key.requestsPerMinute,
          dailyQuota: key.dailyQuota, monthlyQuota: key.monthlyQuota, expiresAt: key.expiresAt,
        },
        select: { id: true, keyId: true, prefix: true, label: true, ownerUserId: true, productId: true, scopes: true, requestsPerMinute: true, dailyQuota: true, monthlyQuota: true, status: true, expiresAt: true, createdAt: true },
      });
      await transaction.apiKey.update({ where: { id: key.id }, data: { status: "REVOKED", rotatedToId: created.id } });
      await transaction.apiKeyAuditLog.create({ data: { apiKeyId: key.id, actorUserId: actor.id, action: "ROTATED", details: { replacementKeyId: created.keyId } } });
      await transaction.apiKeyAuditLog.create({ data: { apiKeyId: created.id, actorUserId: actor.id, action: "ROTATED_FROM", details: { previousKeyId: key.keyId } } });
      return created;
    });
    return Response.json({ key: replacement, secret: generated.secret }, { status: 201, headers: noStore });
  }
  return jsonError("Method not allowed.", "METHOD_NOT_ALLOWED", 405);
}

export async function handleApiUsageExport(request: Request, actor: AuthUser, dependencies: PlatformDependencies) {
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) return jsonError("Administrator access is required.", "FORBIDDEN", 403);
  const repository = dependencies.repository();
  const where: Record<string, unknown> = {};
  if (actor.role === "ADMIN") where.product = { adminPermissions: { some: { adminUserId: actor.id, enabled: true, canManageAccess: true } } };
  let keys = await repository.apiKey.findMany({
    where,
    select: { keyId: true, prefix: true, label: true, ownerUserId: true, owner: { select: { email: true } }, product: { select: { slug: true } }, status: true, lastUsedAt: true, id: true, productId: true, scopes: true },
    orderBy: { createdAt: "desc" },
  });
  if (actor.role === "ADMIN") {
    const permissions = await repository.apiAdminPermission.findMany({
      where: { adminUserId: actor.id, enabled: true, canManageAccess: true },
      select: { productId: true, scopes: true },
    });
    keys = keys.filter((key) => {
      const permission = permissions.find((item) => item.productId === key.productId);
      return permission && key.scopes.every((scope) => permission.scopes.includes(scope));
    });
  }
  const monthStart = windowStarts(new Date()).month;
  const usage = keys.length ? await repository.apiKeyUsageWindow.findMany({
    where: { apiKeyId: { in: keys.map((key) => key.id) }, windowType: "MONTH", windowStart: monthStart },
    select: { apiKeyId: true, requestCount: true, errorCount: true },
  }) : [];
  const accountUsage = keys.length ? await repository.apiAccountUsageWindow.findMany({
    where: {
      accountUserId: { in: [...new Set(keys.map((key) => key.ownerUserId))] },
      productId: { in: [...new Set(keys.map((key) => key.productId))] },
      windowType: "MONTH",
      windowStart: monthStart,
    },
    select: { accountUserId: true, productId: true, requestCount: true, errorCount: true },
  }) : [];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  const rows: unknown[][] = [["key_id", "prefix", "label", "account_email", "product", "status", "last_used_at", "month_requests", "month_errors", "account_month_requests", "account_month_errors"]];
  for (const key of keys) {
    const stats = usage.find((item) => item.apiKeyId === key.id);
    const accountStats = accountUsage.find((item) => item.accountUserId === key.ownerUserId && item.productId === key.productId);
    rows.push([key.keyId, key.prefix, key.label, key.owner.email, key.product.slug, key.status, key.lastUsedAt?.toISOString() ?? "", stats?.requestCount ?? 0, stats?.errorCount ?? 0, accountStats?.requestCount ?? 0, accountStats?.errorCount ?? 0]);
  }
  return new Response(rows.map((row) => row.map(escape).join(",")).join("\r\n"), {
    headers: { ...noStore, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"api-usage.csv\"" },
  });
}

export async function handleApiKeyTest(request: Request, dependencies: PlatformDependencies) {
  const auth = await authenticateApiKey(request, "GET /api/developer/test", dependencies);
  if (auth.kind === "denied") return auth.response;
  if (auth.kind === "session") return jsonError("A valid developer API key is required.", "API_KEY_REQUIRED", 401);
  return Response.json({
    authenticated: true,
    keyId: auth.key.keyId,
    scopes: auth.key.scopes,
    quota: {
      remaining: auth.remaining,
      limits: {
        key: { minute: auth.key.requestsPerMinute, day: auth.key.dailyQuota, month: auth.key.monthlyQuota },
        account: auth.limits.account,
      },
    },
  }, { headers: noStore });
}

export async function requireApiPlatformActor(request: Request, authorize: (request: Request, allowed: readonly UserRole[]) => Promise<{ status: number; user: AuthUser | null }>) {
  if (request.method !== "GET" && !isSameOriginMutation(request)) {
    return { user: null, response: jsonError("Request origin is not allowed.", "INVALID_ORIGIN", 403) };
  }
  const result = await authorize(request, ["DEVELOPER", "ADMIN", "SUPER_ADMIN"]);
  if (result.status !== 200 || !result.user) return { user: null, response: jsonError(result.status === 401 ? "Sign in is required." : "Developer or administrator access is required.", result.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", result.status) };
  return { user: result.user, response: null };
}

export async function executeApiPlatformRoute(
  request: Request,
  authorize: (request: Request, allowed: readonly UserRole[]) => Promise<{ status: number; user: AuthUser | null }>,
  handler: (user: AuthUser) => Promise<Response>,
) {
  try {
    const { user, response } = await requireApiPlatformActor(request, authorize);
    if (response) return response;
    return await handler(user!);
  } catch (error) {
    console.error("API platform route could not complete.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("API platform service is temporarily unavailable.", "API_PLATFORM_UNAVAILABLE", 503);
  }
}
