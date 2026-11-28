import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import type { AuthUser } from "./auth-core.ts";
import { constantTimeSecretMatch } from "./auth-core.ts";
import { isSameOriginMutation } from "./same-origin.ts";
import { readJson, RequestBodyError } from "./request-body.ts";

const noStore = { "Cache-Control": "no-store" };
const maxRpm = 600;
const maxDaily = 1_000_000;
const maxMonthly = 10_000_000;

type BillingDependencies = { repository: () => PrismaClient };
type ProductEntitlement = { productId: string; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number };
type PlanInput = {
  slug?: string;
  name?: string;
  description?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  priceMinorUnits?: bigint | null;
  currency?: string | null;
  taxRateBasisPoints?: number | null;
  periodDays?: number | null;
  products?: ProductEntitlement[];
};

function jsonError(message: string, status: number, code: string) {
  return Response.json({ error: message, code }, { status, headers: noStore });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isCode(error: unknown, code: string) {
  return isObject(error) && error.code === code;
}

function parseInteger(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function parseMinorUnits(value: unknown) {
  if (value === null) return null;
  const raw = typeof value === "number" && Number.isSafeInteger(value) ? String(value)
    : typeof value === "string" ? value : "";
  if (!/^(0|[1-9]\d{0,13})$/.test(raw)) return undefined;
  return BigInt(raw);
}

function parseNullableString(value: unknown, maxLength: number, pattern?: RegExp) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || (pattern && !pattern.test(trimmed))) return undefined;
  return trimmed;
}

function parsePlanInput(body: Record<string, unknown>, partial: boolean): PlanInput | null {
  const allowed = new Set(["slug", "name", "description", "status", "priceMinorUnits", "currency", "taxRateBasisPoints", "periodDays", "products"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return null;
  const data: PlanInput = {};
  if (!partial || body.slug !== undefined) {
    const slug = parseNullableString(body.slug, 60, /^[a-z0-9-]{2,60}$/);
    if (!slug) return null;
    data.slug = slug;
  }
  if (!partial || body.name !== undefined) {
    const name = parseNullableString(body.name, 100);
    if (!name) return null;
    data.name = name;
  }
  if (!partial || body.description !== undefined) {
    const description = parseNullableString(body.description, 1000);
    if (!description) return null;
    data.description = description;
  }
  if (body.status !== undefined) {
    if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(String(body.status))) return null;
    data.status = body.status as PlanInput["status"];
  }
  if (body.priceMinorUnits !== undefined) {
    const price = parseMinorUnits(body.priceMinorUnits);
    if (price === undefined) return null;
    data.priceMinorUnits = price;
  } else if (!partial) data.priceMinorUnits = null;
  if (body.currency !== undefined) {
    const currency = parseNullableString(body.currency, 3, /^[A-Z]{3}$/);
    if (currency === undefined) return null;
    data.currency = currency;
  } else if (!partial) data.currency = null;
  if (body.taxRateBasisPoints !== undefined) {
    if (body.taxRateBasisPoints === null) data.taxRateBasisPoints = null;
    else {
      const taxRate = parseInteger(body.taxRateBasisPoints, 0, 10_000);
      if (taxRate === null) return null;
      data.taxRateBasisPoints = taxRate;
    }
  } else if (!partial) data.taxRateBasisPoints = null;
  if (body.periodDays !== undefined) {
    if (body.periodDays === null) data.periodDays = null;
    else {
      const periodDays = parseInteger(body.periodDays, 1, 365);
      if (periodDays === null) return null;
      data.periodDays = periodDays;
    }
  } else if (!partial) data.periodDays = null;
  if (body.products !== undefined) {
    if (!Array.isArray(body.products) || body.products.length > 100) return null;
    const products: ProductEntitlement[] = [];
    for (const item of body.products) {
      if (!isObject(item)
        || Object.keys(item).some((key) => !["productId", "requestsPerMinute", "dailyQuota", "monthlyQuota"].includes(key))
        || typeof item.productId !== "string" || !item.productId.trim() || item.productId.length > 64) return null;
      const requestsPerMinute = parseInteger(item.requestsPerMinute, 1, maxRpm);
      const dailyQuota = parseInteger(item.dailyQuota, 1, maxDaily);
      const monthlyQuota = parseInteger(item.monthlyQuota, 1, maxMonthly);
      if (requestsPerMinute === null || dailyQuota === null || monthlyQuota === null) return null;
      products.push({ productId: item.productId.trim(), requestsPerMinute, dailyQuota, monthlyQuota });
    }
    if (new Set(products.map((item) => item.productId)).size !== products.length) return null;
    data.products = products;
  }
  if (!partial && !data.products) data.products = [];
  if (partial && !Object.keys(data).length) return null;
  return data;
}

function planReady(plan: {
  status: string;
  priceMinorUnits: bigint | null;
  currency: string | null;
  taxRateBasisPoints: number | null;
  periodDays: number | null;
  products: { requestsPerMinute: number; dailyQuota: number; monthlyQuota: number; product: { enabled: boolean; status: string } }[];
}) {
  if (plan.status !== "ACTIVE" || plan.priceMinorUnits === null || plan.periodDays === null || plan.products.length === 0) return false;
  if (plan.priceMinorUnits > 0n && (!plan.currency || plan.taxRateBasisPoints === null)) return false;
  return plan.products.every((entry) => entry.product.enabled && entry.product.status === "ACTIVE"
    && entry.requestsPerMinute > 0 && entry.dailyQuota > 0 && entry.monthlyQuota > 0);
}

function publicPlan(plan: {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: string;
  priceMinorUnits: bigint | null;
  currency: string | null;
  taxRateBasisPoints: number | null;
  periodDays: number | null;
  createdAt: Date;
  updatedAt: Date;
  products: { productId: string; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number; product: { id: string; slug: string; name: string; status: string; enabled: boolean } }[];
}) {
  return {
    ...plan,
    priceMinorUnits: plan.priceMinorUnits?.toString() ?? null,
    checkoutEnabled: planReady(plan) && plan.priceMinorUnits !== null && plan.priceMinorUnits > 0n && process.env.API_PAYMENT_MODE === "mock",
    free: plan.priceMinorUnits === 0n,
  };
}

async function validateProducts(transaction: Prisma.TransactionClient, products: ProductEntitlement[]) {
  if (!products.length) return false;
  const eligible = await transaction.apiProduct.findMany({
    where: { id: { in: products.map((entry) => entry.productId) }, enabled: true, status: "ACTIVE" },
    select: { id: true },
  });
  return eligible.length === products.length;
}

function planIsConfigured(input: {
  status: string;
  priceMinorUnits: bigint | null;
  currency: string | null;
  taxRateBasisPoints: number | null;
  periodDays: number | null;
  products: ProductEntitlement[];
}) {
  if (input.status !== "ACTIVE") return true;
  if (input.priceMinorUnits === null || input.periodDays === null || input.products.length === 0) return false;
  return input.priceMinorUnits === 0n || Boolean(input.currency && input.taxRateBasisPoints !== null);
}

async function audit(
  transaction: Prisma.TransactionClient,
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Prisma.InputJsonObject,
) {
  await transaction.apiPlatformAuditLog.create({
    data: { actorUserId, action, targetType, targetId, details },
  });
}

export async function handleApiPlans(
  request: Request,
  actor: AuthUser,
  dependencies: BillingDependencies,
  planId?: string,
) {
  if (request.method !== "GET" && !isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "DEVELOPER") return jsonError("Developer or Super Admin access is required.", 403, "FORBIDDEN");
  const repository = dependencies.repository();
  try {
    if (actor.role === "DEVELOPER" && !(await verifiedDeveloper(repository, actor.id))) {
      return jsonError("Verified Developer access is required.", 403, "DEVELOPER_NOT_VERIFIED");
    }
    if (request.method === "GET") {
      const plans = await repository.apiPlan.findMany({
        where: actor.role === "SUPER_ADMIN" ? undefined : { status: "ACTIVE" },
        include: {
          products: { include: { product: { select: { id: true, slug: true, name: true, status: true, enabled: true } } } },
        },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      });
      return Response.json({ plans: plans.map(publicPlan) }, { headers: noStore });
    }
    if (actor.role !== "SUPER_ADMIN") return jsonError("Super Admin access is required to manage plans.", 403, "FORBIDDEN");
    const body = await readJson(request, 24_000);
    if (!body) return jsonError("Plan details are required.", 422, "INVALID_PLAN");
    const partial = request.method === "PATCH";
    const input = parsePlanInput(body, partial);
    if (!input) return jsonError("Plan details or product quotas are invalid.", 422, "INVALID_PLAN");

    return await repository.$transaction(async (transaction) => {
      const existing = planId
        ? await transaction.apiPlan.findUnique({
            where: { id: planId },
            include: { products: { include: { product: { select: { enabled: true, status: true } } } } },
          })
        : null;
      if (planId && !existing) return jsonError("API plan was not found.", 404, "PLAN_NOT_FOUND");
      if (partial && !existing) return jsonError("API plan was not found.", 404, "PLAN_NOT_FOUND");
      const productInput = input.products ?? existing?.products.map((entry) => ({
        productId: entry.productId,
        requestsPerMinute: entry.requestsPerMinute,
        dailyQuota: entry.dailyQuota,
        monthlyQuota: entry.monthlyQuota,
      })) ?? [];
      const merged = {
        status: input.status ?? existing?.status ?? "DRAFT",
        priceMinorUnits: input.priceMinorUnits !== undefined ? input.priceMinorUnits : existing?.priceMinorUnits ?? null,
        currency: input.currency !== undefined ? input.currency : existing?.currency ?? null,
        taxRateBasisPoints: input.taxRateBasisPoints !== undefined ? input.taxRateBasisPoints : existing?.taxRateBasisPoints ?? null,
        periodDays: input.periodDays !== undefined ? input.periodDays : existing?.periodDays ?? null,
        products: productInput,
      };
      if (!planIsConfigured(merged)) return jsonError("Active plans need a price, renewal period and at least one allowed active product. Paid plans also require currency and tax configuration.", 422, "PLAN_CONFIGURATION_REQUIRED");
      if (merged.status === "ACTIVE" && !(await validateProducts(transaction, productInput))) {
        return jsonError("Only active, approved products may be included in an active plan.", 422, "PLAN_PRODUCT_UNAVAILABLE");
      }

      const planData = {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        status: merged.status as "DRAFT" | "ACTIVE" | "ARCHIVED",
        priceMinorUnits: merged.priceMinorUnits,
        currency: merged.currency,
        taxRateBasisPoints: merged.taxRateBasisPoints,
        periodDays: merged.periodDays,
        updatedByUserId: actor.id,
      };
      const saved = existing
        ? await transaction.apiPlan.update({ where: { id: existing.id }, data: planData })
        : await transaction.apiPlan.create({
            data: {
              slug: input.slug!,
              name: input.name!,
              description: input.description!,
              ...planData,
              createdByUserId: actor.id,
            },
          });
      if (input.products !== undefined || !existing) {
        await transaction.apiPlanProduct.deleteMany({ where: { planId: saved.id } });
        for (const entry of productInput) {
          await transaction.apiPlanProduct.create({ data: { planId: saved.id, ...entry } });
        }
      }
      await audit(transaction, actor.id, existing ? "API_PLAN_UPDATED" : "API_PLAN_CREATED", "API_PLAN", saved.id, {
        status: saved.status,
        priceConfigured: saved.priceMinorUnits !== null,
        productCount: productInput.length,
      });
      const result = await transaction.apiPlan.findUniqueOrThrow({
        where: { id: saved.id },
        include: { products: { include: { product: { select: { id: true, slug: true, name: true, status: true, enabled: true } } } } },
      });
      return Response.json({ plan: publicPlan(result) }, { status: existing ? 200 : 201, headers: noStore });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (isCode(error, "P2002")) return jsonError("That plan slug or identifier is already in use.", 409, "PLAN_CONFLICT");
    console.error("API plan request could not complete.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("API plan service is temporarily unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}

async function verifiedDeveloper(repository: PrismaClient, userId: string) {
  const profile = await repository.apiDeveloperProfile.findUnique({
    where: { userId },
    select: { status: true, grandfathered: true },
  });
  return profile?.status === "VERIFIED" ? profile : null;
}

async function grantPlanProducts(
  transaction: Prisma.TransactionClient,
  developerUserId: string,
  plan: {
    id: string;
    products: {
      productId: string;
      requestsPerMinute: number;
      dailyQuota: number;
      monthlyQuota: number;
      product: { status: string; enabled: boolean; endpoints: string[] };
    }[];
  },
) {
  for (const entitlement of plan.products) {
    if (!entitlement.product.enabled || entitlement.product.status !== "ACTIVE") {
      throw new Error("An API plan product is no longer active.");
    }
    await transaction.apiAccountGrant.upsert({
      where: { accountUserId_productId: { accountUserId: developerUserId, productId: entitlement.productId } },
      create: {
        accountUserId: developerUserId,
        productId: entitlement.productId,
        scopes: entitlement.product.endpoints,
        requestsPerMinute: entitlement.requestsPerMinute,
        dailyQuota: entitlement.dailyQuota,
        monthlyQuota: entitlement.monthlyQuota,
        enabled: true,
        grantedByUserId: developerUserId,
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
}

function periodEnd(start: Date, days: number) {
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

function taxAmount(subtotal: bigint, taxRateBasisPoints: number) {
  return (subtotal * BigInt(taxRateBasisPoints) + 5_000n) / 10_000n;
}

export async function handleDeveloperSubscription(
  request: Request,
  actor: AuthUser,
  dependencies: BillingDependencies,
  now = new Date(),
) {
  if (request.method !== "GET" && !isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  if (actor.role !== "DEVELOPER") return jsonError("Verified Developer access is required.", 403, "FORBIDDEN");
  const repository = dependencies.repository();
  try {
    const profile = await verifiedDeveloper(repository, actor.id);
    if (!profile) return jsonError("Verified Developer access is required.", 403, "DEVELOPER_NOT_VERIFIED");
    if (request.method === "GET") {
      const [plans, currentSubscription, recentSubscriptions] = await Promise.all([
        repository.apiPlan.findMany({
          where: { status: "ACTIVE" },
          include: { products: { include: { product: { select: { id: true, slug: true, name: true, status: true, enabled: true } } } } },
          orderBy: { name: "asc" },
        }),
        repository.apiSubscription.findFirst({
          where: { developerUserId: actor.id, status: "ACTIVE", OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }] },
          include: { plan: { include: { products: { include: { product: { select: { id: true, slug: true, name: true, status: true, enabled: true } } } } } } },
          orderBy: { createdAt: "desc" },
        }),
        repository.apiSubscription.findMany({
          where: { developerUserId: actor.id },
          include: {
            plan: { select: { name: true, slug: true } },
            payments: { orderBy: { createdAt: "desc" }, take: 3, select: { id: true, status: true, amountMinorUnits: true, currency: true, isSandbox: true, createdAt: true } },
            invoices: { orderBy: { issuedAt: "desc" }, take: 3, select: { id: true, invoiceNumber: true, status: true, totalMinorUnits: true, currency: true, issuedAt: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);
      return Response.json({
        grandfathered: profile.grandfathered,
        currentSubscription: currentSubscription ? {
          ...currentSubscription,
          priceMinorUnits: currentSubscription.priceMinorUnits?.toString() ?? null,
          plan: publicPlan(currentSubscription.plan),
        } : null,
        subscriptions: recentSubscriptions.map((subscription) => ({
          ...subscription,
          priceMinorUnits: subscription.priceMinorUnits?.toString() ?? null,
          payments: subscription.payments.map((payment) => ({ ...payment, amountMinorUnits: payment.amountMinorUnits.toString() })),
          invoices: subscription.invoices.map((invoice) => ({ ...invoice, totalMinorUnits: invoice.totalMinorUnits.toString() })),
        })),
        plans: plans.map(publicPlan),
        paymentMode: process.env.API_PAYMENT_MODE === "mock" ? "mock-sandbox" : "disabled",
      }, { headers: noStore });
    }
    if (request.method !== "POST") return jsonError("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
    const body = await readJson(request, 4_000);
    if (!body || Object.keys(body).some((key) => !["action", "planId", "idempotencyKey"].includes(key))
      || !["enroll", "renew", "cancel"].includes(String(body.action))) {
      return jsonError("Subscription action is invalid.", 422, "INVALID_SUBSCRIPTION_ACTION");
    }
    if (body.action === "cancel") {
      if (Object.keys(body).some((key) => key !== "action")) return jsonError("Cancellation does not accept additional fields.", 422, "INVALID_SUBSCRIPTION_ACTION");
      const result = await repository.$transaction(async (transaction) => {
        const subscription = await transaction.apiSubscription.findFirst({
          where: { developerUserId: actor.id, status: "ACTIVE", OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }] },
          orderBy: { createdAt: "desc" },
        });
        if (!subscription) return null;
        if (subscription.cancelAtPeriodEnd) return subscription;
        const updated = await transaction.apiSubscription.update({
          where: { id: subscription.id },
          data: { cancelAtPeriodEnd: true },
        });
        await audit(transaction, actor.id, "SUBSCRIPTION_CANCELLATION_SCHEDULED", "API_SUBSCRIPTION", subscription.id, {
          periodEnd: updated.currentPeriodEnd?.toISOString() ?? null,
        });
        return updated;
      }, { isolationLevel: "Serializable" });
      if (!result) return jsonError("No active subscription was found.", 404, "SUBSCRIPTION_NOT_FOUND");
      return Response.json({
        subscription: { ...result, priceMinorUnits: result.priceMinorUnits?.toString() ?? null },
      }, { headers: noStore });
    }

    if (typeof body.planId !== "string" || !body.planId || body.planId.length > 64
      || typeof body.idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{16,110}$/.test(body.idempotencyKey)) {
      return jsonError("A valid plan and idempotency key are required.", 422, "INVALID_SUBSCRIPTION");
    }
    const outcome = await repository.$transaction(async (transaction) => {
      const existingRequest = await transaction.apiSubscription.findUnique({
        where: { idempotencyKey: body.idempotencyKey as string },
        include: { payments: true },
      });
      if (existingRequest) {
        if (existingRequest.developerUserId !== actor.id) return { kind: "idempotency-conflict" as const };
        return { kind: "existing" as const, subscription: existingRequest };
      }
      const active = await transaction.apiSubscription.findFirst({
        where: { developerUserId: actor.id, status: "ACTIVE", OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }] },
      });
      if (active) return { kind: "active-subscription" as const };
      const plan = await transaction.apiPlan.findUnique({
        where: { id: body.planId as string },
        include: { products: { include: { product: true } } },
      });
      if (!plan || !planReady(plan)) return { kind: "plan-unavailable" as const };
      if (plan.products.some((entry) => !entry.product.enabled || entry.product.status !== "ACTIVE")) {
        return { kind: "plan-products-unavailable" as const };
      }
      if (plan.priceMinorUnits === null || plan.periodDays === null) return { kind: "plan-unavailable" as const };
      const free = plan.priceMinorUnits === 0n;
      if (!free && (process.env.API_PAYMENT_MODE !== "mock" || !plan.currency || plan.taxRateBasisPoints === null)) {
        return { kind: "checkout-disabled" as const };
      }
      const subscription = await transaction.apiSubscription.create({
        data: {
          idempotencyKey: body.idempotencyKey as string,
          developerUserId: actor.id,
          planId: plan.id,
          status: free ? "ACTIVE" : "PENDING",
          currentPeriodStart: free ? now : null,
          currentPeriodEnd: free ? periodEnd(now, plan.periodDays) : null,
          priceMinorUnits: plan.priceMinorUnits,
          currency: plan.currency,
          taxRateBasisPoints: plan.taxRateBasisPoints,
          periodDays: plan.periodDays,
        },
      });
      let payment = null;
      if (free) {
        await grantPlanProducts(transaction, actor.id, plan);
      } else {
        const tax = taxAmount(plan.priceMinorUnits, plan.taxRateBasisPoints!);
        payment = await transaction.apiPayment.create({
          data: {
            subscriptionId: subscription.id,
            provider: "MOCK",
            status: "PENDING",
            amountMinorUnits: plan.priceMinorUnits + tax,
            currency: plan.currency!,
            isSandbox: true,
            idempotencyKey: `checkout:${body.idempotencyKey as string}`,
          },
        });
      }
      await audit(transaction, actor.id, free ? "FREE_SUBSCRIPTION_ACTIVATED" : "SANDBOX_CHECKOUT_CREATED", "API_SUBSCRIPTION", subscription.id, {
        planId: plan.id,
        paymentId: payment?.id ?? null,
        sandboxOnly: !free,
      });
      return { kind: "created" as const, subscription, payment, free };
    }, { isolationLevel: "Serializable" });

    if (outcome.kind === "idempotency-conflict") return jsonError("This idempotency key belongs to another account.", 409, "IDEMPOTENCY_CONFLICT");
    if (outcome.kind === "existing") return Response.json({
      subscription: { ...outcome.subscription, priceMinorUnits: outcome.subscription.priceMinorUnits?.toString() ?? null },
      payment: outcome.subscription.payments[0] ? { ...outcome.subscription.payments[0], amountMinorUnits: outcome.subscription.payments[0].amountMinorUnits.toString() } : null,
      duplicate: true,
    }, { headers: noStore });
    if (outcome.kind === "active-subscription") return jsonError("An active subscription already exists. Cancel it or wait for its period to end before renewing.", 409, "ACTIVE_SUBSCRIPTION_EXISTS");
    if (outcome.kind === "plan-unavailable") return jsonError("The selected API plan is not currently available.", 409, "PLAN_UNAVAILABLE");
    if (outcome.kind === "plan-products-unavailable") return jsonError("One or more products in this plan are no longer active.", 409, "PLAN_PRODUCT_UNAVAILABLE");
    if (outcome.kind === "checkout-disabled") return jsonError("Paid sandbox checkout requires explicit currency, tax and mock-payment configuration.", 409, "CHECKOUT_DISABLED");
    return Response.json({
      subscription: { ...outcome.subscription, priceMinorUnits: outcome.subscription.priceMinorUnits?.toString() ?? null },
      payment: outcome.payment ? {
        id: outcome.payment.id,
        status: outcome.payment.status,
        amountMinorUnits: outcome.payment.amountMinorUnits.toString(),
        currency: outcome.payment.currency,
        provider: outcome.payment.provider,
        isSandbox: true,
        note: "Sandbox payment only; no real charge or revenue is recorded.",
      } : null,
      active: outcome.free,
    }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (isCode(error, "P2002")) return jsonError("This subscription request has already been processed.", 409, "IDEMPOTENCY_CONFLICT");
    console.error("Developer subscription request could not complete.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Subscription service is temporarily unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}

type MockPaymentEvent = { eventId: string; paymentId: string; outcome: "succeeded" | "failed" };

function parseMockEvent(body: Record<string, unknown>): MockPaymentEvent | null {
  if (Object.keys(body).some((key) => !["eventId", "paymentId", "outcome"].includes(key))
    || typeof body.eventId !== "string" || !/^[A-Za-z0-9._:-]{8,200}$/.test(body.eventId)
    || typeof body.paymentId !== "string" || body.paymentId.length < 1 || body.paymentId.length > 64
    || (body.outcome !== "succeeded" && body.outcome !== "failed")) return null;
  return { eventId: body.eventId, paymentId: body.paymentId, outcome: body.outcome };
}

export async function handleMockPaymentWebhook(
  request: Request,
  dependencies: BillingDependencies,
  webhookSecret = process.env.API_PAYMENT_WEBHOOK_SECRET,
  paymentMode = process.env.API_PAYMENT_MODE,
  now = new Date(),
) {
  if (request.method !== "POST") return jsonError("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
  if (paymentMode !== "mock" || !webhookSecret || Buffer.byteLength(webhookSecret, "utf8") < 32) {
    return jsonError("Mock payment processing is not configured.", 503, "PAYMENT_PROVIDER_UNAVAILABLE");
  }
  const received = request.headers.get("x-life-mock-secret");
  if (!received || !constantTimeSecretMatch(webhookSecret, received)) return jsonError("Webhook authentication failed.", 401, "INVALID_WEBHOOK_SECRET");
  let webhookEventId: string | null = null;
  let webhookPayloadHash: string | null = null;
  try {
    const body = await readJson(request, 2_000);
    const event = body ? parseMockEvent(body) : null;
    if (!event) return jsonError("Mock payment event is invalid.", 422, "INVALID_PAYMENT_EVENT");
    const payloadHash = createHash("sha256").update(`${event.paymentId}:${event.outcome}`).digest("hex");
    webhookEventId = event.eventId;
    webhookPayloadHash = payloadHash;
    const repository = dependencies.repository();
    const existing = await repository.apiProviderEvent.findUnique({
      where: { provider_providerEventId: { provider: "MOCK", providerEventId: event.eventId } },
    });
    if (existing) {
      if (existing.payloadHash !== payloadHash) return jsonError("Webhook event identifier was reused with different content.", 409, "WEBHOOK_EVENT_CONFLICT");
      return Response.json({ accepted: true, duplicate: true, outcome: existing.outcome }, { headers: noStore });
    }

    const result = await repository.$transaction(async (transaction) => {
      const existingEvent = await transaction.apiProviderEvent.findUnique({
        where: { provider_providerEventId: { provider: "MOCK", providerEventId: event.eventId } },
      });
      if (existingEvent) {
        return existingEvent.payloadHash === payloadHash
          ? { kind: "duplicate" as const, outcome: existingEvent.outcome }
          : { kind: "event-conflict" as const };
      }
      const payment = await transaction.apiPayment.findUnique({
        where: { id: event.paymentId },
        include: {
          subscription: {
            include: {
              plan: { include: { products: { include: { product: true } } } },
              developer: { select: { id: true, fullName: true, email: true, apiDeveloperProfile: { select: { status: true, organizationName: true, supportEmail: true } } } },
            },
          },
        },
      });
      if (!payment || payment.provider !== "MOCK" || !payment.isSandbox) return { kind: "payment-not-found" as const };
      if (payment.status !== "PENDING") return { kind: "payment-not-pending" as const, status: payment.status };
      const plan = payment.subscription.plan;
      if (event.outcome === "succeeded"
        && (payment.subscription.developer.apiDeveloperProfile?.status !== "VERIFIED"
          || plan.status !== "ACTIVE"
          || plan.priceMinorUnits === null
          || plan.periodDays === null
          || payment.subscription.periodDays === null
          || payment.subscription.priceMinorUnits === null
          || payment.subscription.taxRateBasisPoints === null
          || payment.subscription.currency !== payment.currency
          || payment.subscription.priceMinorUnits !== plan.priceMinorUnits
          || payment.subscription.taxRateBasisPoints !== plan.taxRateBasisPoints
          || plan.currency !== payment.currency
          || payment.subscription.priceMinorUnits + taxAmount(payment.subscription.priceMinorUnits, payment.subscription.taxRateBasisPoints) !== payment.amountMinorUnits
          || !plan.products.length
          || plan.products.some((entry) => !entry.product.enabled || entry.product.status !== "ACTIVE"))) {
        return { kind: "plan-changed" as const };
      }
      await transaction.apiProviderEvent.create({
        data: {
          provider: "MOCK",
          providerEventId: event.eventId,
          eventType: `PAYMENT_${event.outcome.toUpperCase()}`,
          payloadHash,
          outcome: "PROCESSING",
        },
      });
      if (event.outcome === "failed") {
        await transaction.apiPayment.update({ where: { id: payment.id }, data: { status: "FAILED", failureCode: "MOCK_PAYMENT_FAILED" } });
        await transaction.apiSubscription.update({ where: { id: payment.subscriptionId }, data: { status: "EXPIRED" } });
        await transaction.apiProviderEvent.update({
          where: { provider_providerEventId: { provider: "MOCK", providerEventId: event.eventId } },
          data: { outcome: "FAILED" },
        });
        await audit(transaction, payment.subscription.developer.id, "SANDBOX_PAYMENT_FAILED", "API_PAYMENT", payment.id, {
          subscriptionId: payment.subscriptionId,
          providerEventId: event.eventId,
          sandboxOnly: true,
        });
        return { kind: "failed" as const };
      }

      await grantPlanProducts(transaction, payment.subscription.developer.id, plan);
      const subscriptionPeriodDays = payment.subscription.periodDays;
      if (subscriptionPeriodDays === null) return { kind: "plan-changed" as const };
      const end = periodEnd(now, subscriptionPeriodDays);
      await transaction.apiPayment.update({
        where: { id: payment.id },
        data: { status: "SUCCEEDED", providerReference: `mock_${event.eventId}` },
      });
      await transaction.apiSubscription.update({
        where: { id: payment.subscriptionId },
        data: { status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end },
      });
      const subtotal = payment.subscription.priceMinorUnits!;
      const tax = taxAmount(subtotal, payment.subscription.taxRateBasisPoints!);
      const invoice = await transaction.apiInvoice.create({
        data: {
          invoiceNumber: `LIFE-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
          subscriptionId: payment.subscriptionId,
          paymentId: payment.id,
          status: "PAID",
          subtotalMinorUnits: subtotal,
          taxMinorUnits: tax,
          totalMinorUnits: subtotal + tax,
          currency: payment.currency,
          billingSnapshot: {
            name: payment.subscription.developer.fullName ?? payment.subscription.developer.email,
            email: payment.subscription.developer.email,
            organizationName: payment.subscription.developer.apiDeveloperProfile?.organizationName ?? null,
            supportEmail: payment.subscription.developer.apiDeveloperProfile?.supportEmail ?? null,
            provider: "MOCK",
            sandbox: true,
          },
        },
      });
      await transaction.apiProviderEvent.update({
        where: { provider_providerEventId: { provider: "MOCK", providerEventId: event.eventId } },
        data: { outcome: "SUCCEEDED" },
      });
      await audit(transaction, payment.subscription.developer.id, "SANDBOX_PAYMENT_CONFIRMED", "API_PAYMENT", payment.id, {
        subscriptionId: payment.subscriptionId,
        invoiceId: invoice.id,
        providerEventId: event.eventId,
        sandboxOnly: true,
      });
      return { kind: "succeeded" as const, invoiceId: invoice.id };
    }, { isolationLevel: "Serializable" });

    if (result.kind === "duplicate") return Response.json({ accepted: true, duplicate: true, outcome: result.outcome }, { headers: noStore });
    if (result.kind === "event-conflict") return jsonError("Webhook event identifier was reused with different content.", 409, "WEBHOOK_EVENT_CONFLICT");
    if (result.kind === "payment-not-found") return jsonError("Sandbox payment was not found.", 404, "PAYMENT_NOT_FOUND");
    if (result.kind === "payment-not-pending") return jsonError(`Sandbox payment is already ${result.status}.`, 409, "PAYMENT_NOT_PENDING");
    if (result.kind === "plan-changed") return jsonError("Plan configuration changed before payment confirmation.", 409, "PLAN_CONFIGURATION_CHANGED");
    return Response.json({ accepted: true, outcome: result.kind, ...("invoiceId" in result ? { invoiceId: result.invoiceId } : {}) }, { headers: noStore });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    if (isCode(error, "P2002")) {
      const event = webhookEventId ? await dependencies.repository().apiProviderEvent.findUnique({
        where: { provider_providerEventId: { provider: "MOCK", providerEventId: webhookEventId } },
      }) : null;
      if (event && event.payloadHash === webhookPayloadHash) return Response.json({ accepted: true, duplicate: true, outcome: event.outcome }, { headers: noStore });
      return jsonError("Mock payment event conflicts with an existing transaction.", 409, "WEBHOOK_EVENT_CONFLICT");
    }
    console.error("Mock payment webhook could not be processed.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Mock payment service is temporarily unavailable.", 503, "PAYMENT_PROVIDER_UNAVAILABLE");
  }
}

export async function handleDeveloperInvoices(
  request: Request,
  actor: AuthUser,
  dependencies: BillingDependencies,
) {
  if (request.method !== "GET") return jsonError("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
  if (actor.role !== "DEVELOPER") return jsonError("Verified Developer access is required.", 403, "FORBIDDEN");
  const profile = await verifiedDeveloper(dependencies.repository(), actor.id);
  if (!profile) return jsonError("Verified Developer access is required.", 403, "DEVELOPER_NOT_VERIFIED");
  const invoices = await dependencies.repository().apiInvoice.findMany({
    where: { subscription: { developerUserId: actor.id } },
    include: { payment: { select: { status: true, provider: true, isSandbox: true } }, subscription: { select: { plan: { select: { name: true } } } } },
    orderBy: { issuedAt: "desc" },
    take: 100,
  });
  return Response.json({
    invoices: invoices.map((invoice) => ({
      ...invoice,
      subtotalMinorUnits: invoice.subtotalMinorUnits.toString(),
      taxMinorUnits: invoice.taxMinorUnits.toString(),
      totalMinorUnits: invoice.totalMinorUnits.toString(),
    })),
  }, { headers: noStore });
}

export async function handleSuperAdminBilling(
  request: Request,
  actor: AuthUser,
  dependencies: BillingDependencies,
) {
  if (request.method !== "GET") return jsonError("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
  if (actor.role !== "SUPER_ADMIN") return jsonError("Super Admin access is required.", 403, "FORBIDDEN");
  const repository = dependencies.repository();
  try {
    const [paymentGroups, pendingPayments, recentPayments, subscriptionGroups, providerEvents] = await Promise.all([
      repository.apiPayment.groupBy({
        by: ["currency", "isSandbox", "status"],
        _sum: { amountMinorUnits: true, refundedAmountMinorUnits: true },
        _count: { _all: true },
      }),
      repository.apiPayment.count({ where: { status: "PENDING" } }),
      repository.apiPayment.findMany({
        include: {
          subscription: {
            select: { id: true, developerUserId: true, plan: { select: { id: true, name: true } }, developer: { select: { email: true, fullName: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      repository.apiSubscription.groupBy({ by: ["status"], _count: { _all: true } }),
      repository.apiProviderEvent.findMany({ orderBy: { processedAt: "desc" }, take: 100 }),
    ]);
    const revenueByCurrency = new Map<string, { realCollectedMinorUnits: bigint; sandboxSuccessfulMinorUnits: bigint; sandboxRefundedMinorUnits: bigint; sandboxPayments: number }>();
    for (const group of paymentGroups) {
      const metrics = revenueByCurrency.get(group.currency) ?? {
        realCollectedMinorUnits: 0n,
        sandboxSuccessfulMinorUnits: 0n,
        sandboxRefundedMinorUnits: 0n,
        sandboxPayments: 0,
      };
      if (group.status === "SUCCEEDED" && !group.isSandbox) {
        metrics.realCollectedMinorUnits += group._sum.amountMinorUnits ?? 0n;
      }
      if (group.isSandbox) {
        metrics.sandboxPayments += group._count._all;
        if (group.status === "SUCCEEDED") metrics.sandboxSuccessfulMinorUnits += group._sum.amountMinorUnits ?? 0n;
        metrics.sandboxRefundedMinorUnits += group._sum.refundedAmountMinorUnits ?? 0n;
      }
      revenueByCurrency.set(group.currency, metrics);
    }
    return Response.json({
      revenueByCurrency: [...revenueByCurrency.entries()].map(([currency, metrics]) => ({
        currency,
        realCollectedMinorUnits: metrics.realCollectedMinorUnits.toString(),
        sandboxSuccessfulMinorUnits: metrics.sandboxSuccessfulMinorUnits.toString(),
        sandboxRefundedMinorUnits: metrics.sandboxRefundedMinorUnits.toString(),
        sandboxPayments: metrics.sandboxPayments,
      })),
      pendingPayments,
      subscriptions: Object.fromEntries(subscriptionGroups.map((group) => [group.status, group._count._all])),
      payments: recentPayments.map((payment) => ({
        ...payment,
        amountMinorUnits: payment.amountMinorUnits.toString(),
        refundedAmountMinorUnits: payment.refundedAmountMinorUnits.toString(),
      })),
      providerEvents,
      paymentMode: process.env.API_PAYMENT_MODE === "mock" ? "mock-sandbox" : "disabled",
    }, { headers: noStore });
  } catch (error) {
    console.error("Super Admin billing overview could not be loaded.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Billing overview is temporarily unavailable.", 503, "BILLING_UNAVAILABLE");
  }
}

export async function handleSuperAdminRefund(
  request: Request,
  paymentId: string,
  actor: AuthUser,
  dependencies: BillingDependencies,
) {
  if (request.method !== "POST" || !isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  if (actor.role !== "SUPER_ADMIN") return jsonError("Super Admin access is required.", 403, "FORBIDDEN");
  try {
    const body = await readJson(request, 2_000);
    if (!body || Object.keys(body).some((key) => key !== "reason")
      || typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 1000) {
      return jsonError("A refund reason is required.", 422, "REFUND_REASON_REQUIRED");
    }
    const reason = body.reason.trim();
    if (process.env.API_PAYMENT_MODE !== "mock") return jsonError("Refund processing is unavailable until a payment provider is configured.", 503, "PAYMENT_PROVIDER_UNAVAILABLE");
    const result = await dependencies.repository().$transaction(async (transaction) => {
      const payment = await transaction.apiPayment.findUnique({
        where: { id: paymentId },
        include: { subscription: true },
      });
      if (!payment) return { kind: "missing" as const };
      if (payment.provider !== "MOCK" || !payment.isSandbox) return { kind: "provider-unavailable" as const };
      if (payment.status !== "SUCCEEDED") return { kind: "invalid-status" as const, status: payment.status };
      const confirmedAt = new Date();
      const updated = await transaction.apiPayment.update({
        where: { id: payment.id },
        data: {
          status: "REFUNDED",
          refundedAmountMinorUnits: payment.amountMinorUnits,
          refundReason: reason,
          refundRequestedByUserId: actor.id,
          refundConfirmedAt: confirmedAt,
        },
      });
      await transaction.apiInvoice.updateMany({
        where: { paymentId: payment.id },
        data: { status: "REFUNDED" },
      });
      if (payment.subscription.status === "ACTIVE") {
        await transaction.apiSubscription.update({
          where: { id: payment.subscriptionId },
          data: { status: "SUSPENDED", cancelAtPeriodEnd: false },
        });
      }
      await audit(transaction, actor.id, "API_PAYMENT_REFUNDED", "API_PAYMENT", payment.id, {
        reason,
        amountMinorUnits: payment.amountMinorUnits.toString(),
        provider: "MOCK",
        providerConfirmed: true,
      });
      return { kind: "refunded" as const, payment: updated };
    }, { isolationLevel: "Serializable" });
    if (result.kind === "missing") return jsonError("Payment was not found.", 404, "PAYMENT_NOT_FOUND");
    if (result.kind === "provider-unavailable") return jsonError("The configured provider cannot process this refund.", 503, "PAYMENT_PROVIDER_UNAVAILABLE");
    if (result.kind === "invalid-status") return jsonError(`Only successful sandbox payments can be refunded; current status is ${result.status}.`, 409, "PAYMENT_NOT_REFUNDABLE");
    return Response.json({
      payment: { ...result.payment, amountMinorUnits: result.payment.amountMinorUnits.toString(), refundedAmountMinorUnits: result.payment.refundedAmountMinorUnits.toString() },
      providerConfirmed: true,
    }, { headers: noStore });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    console.error("Super Admin refund could not complete.", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Refund could not be completed.", 503, "REFUND_UNAVAILABLE");
  }
}
