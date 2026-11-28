import test from "node:test";
import assert from "node:assert/strict";
import {
  handleDeveloperSubscription,
  handleMockPaymentWebhook,
  handleSuperAdminRefund,
} from "../src/server/api-billing.ts";

const actor = { id: "developer-1", role: "DEVELOPER" };
const plan = {
  id: "plan-paid",
  status: "ACTIVE",
  priceMinorUnits: 1234n,
  currency: "USD",
  taxRateBasisPoints: 500,
  periodDays: 30,
  products: [{
    productId: "product-1",
    requestsPerMinute: 10,
    dailyQuota: 100,
    monthlyQuota: 1000,
    product: {
      id: "product-1",
      status: "ACTIVE",
      enabled: true,
      endpoints: ["GET /api/health"],
    },
  }],
};

function subscriptionRequest(body) {
  return new Request("http://localhost/api/developer/subscription", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function billingRepository({ existingSubscription = null } = {}) {
  const state = { subscriptions: [], payments: [], audits: [] };
  const repository = {
    apiDeveloperProfile: {
      async findUnique() { return { status: "VERIFIED", grandfathered: false }; },
    },
    apiSubscription: {
      async findUnique() { return existingSubscription; },
      async findFirst() { return null; },
      async create({ data }) {
        const created = { id: `subscription-${state.subscriptions.length + 1}`, ...data };
        state.subscriptions.push(created);
        return created;
      },
    },
    apiPlan: {
      async findUnique() { return plan; },
    },
    apiPayment: {
      async create({ data }) {
        const created = { id: `payment-${state.payments.length + 1}`, ...data };
        state.payments.push(created);
        return created;
      },
    },
    apiPlatformAuditLog: {
      async create({ data }) { state.audits.push(data); return data; },
    },
    async $transaction(callback) { return callback(repository); },
  };
  return { repository, state };
}

test("paid subscription checkout is disabled by default and mock checkout is explicitly sandbox-only", async () => {
  const previousMode = process.env.API_PAYMENT_MODE;
  const { repository, state } = billingRepository();
  try {
    process.env.API_PAYMENT_MODE = "disabled";
    const disabled = await handleDeveloperSubscription(subscriptionRequest({
      action: "enroll",
      planId: plan.id,
      idempotencyKey: "subscription-request-0001",
    }), actor, { repository: () => repository });
    assert.equal(disabled.status, 409);
    assert.equal((await disabled.json()).code, "CHECKOUT_DISABLED");
    assert.equal(state.subscriptions.length, 0);

    process.env.API_PAYMENT_MODE = "mock";
    const checkout = await handleDeveloperSubscription(subscriptionRequest({
      action: "enroll",
      planId: plan.id,
      idempotencyKey: "subscription-request-0001",
    }), actor, { repository: () => repository });
    assert.equal(checkout.status, 201);
    const result = await checkout.json();
    assert.equal(result.subscription.status, "PENDING");
    assert.equal(result.payment.status, "PENDING");
    assert.equal(result.payment.amountMinorUnits, "1296");
    assert.equal(result.payment.isSandbox, true);
    assert.match(result.payment.note, /Sandbox payment only/);
    assert.equal(state.audits[0].action, "SANDBOX_CHECKOUT_CREATED");
  } finally {
    if (previousMode === undefined) delete process.env.API_PAYMENT_MODE;
    else process.env.API_PAYMENT_MODE = previousMode;
  }
});

test("subscription idempotency keys cannot be replayed across Developer accounts", async () => {
  const previousMode = process.env.API_PAYMENT_MODE;
  const existingSubscription = {
    id: "existing-subscription",
    idempotencyKey: "subscription-request-foreign",
    developerUserId: "another-developer",
    priceMinorUnits: 1000n,
    payments: [],
  };
  const { repository, state } = billingRepository({ existingSubscription });
  try {
    process.env.API_PAYMENT_MODE = "mock";
    const response = await handleDeveloperSubscription(subscriptionRequest({
      action: "enroll",
      planId: plan.id,
      idempotencyKey: "subscription-request-foreign",
    }), actor, { repository: () => repository });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "IDEMPOTENCY_CONFLICT");
    assert.equal(state.subscriptions.length, 0);
    assert.equal(state.payments.length, 0);
  } finally {
    if (previousMode === undefined) delete process.env.API_PAYMENT_MODE;
    else process.env.API_PAYMENT_MODE = previousMode;
  }
});

test("mock payment webhook requires its independent secret before repository access", async () => {
  let repositoryCalls = 0;
  const dependencies = { repository() { repositoryCalls += 1; throw new Error("should not be called"); } };
  const request = new Request("http://localhost/api/payment-webhooks/mock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: "event-0001", paymentId: "payment-1", outcome: "succeeded" }),
  });
  const unauthorized = await handleMockPaymentWebhook(request, dependencies, "a".repeat(32), "mock");
  assert.equal(unauthorized.status, 401);
  assert.equal(repositoryCalls, 0);
});

test("refunds require Super Admin authorization and a non-empty audit reason", async () => {
  const request = (body) => new Request("http://localhost/api/super-admin/api-payments/payment-1/refund", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let repositoryCalls = 0;
  const dependencies = { repository() { repositoryCalls += 1; throw new Error("should not be called"); } };
  const regularAdmin = await handleSuperAdminRefund(request({ reason: "Requested." }), "payment-1", {
    id: "admin-1",
    role: "ADMIN",
  }, dependencies);
  assert.equal(regularAdmin.status, 403);
  assert.equal(repositoryCalls, 0);

  const superAdmin = await handleSuperAdminRefund(request({ reason: "   " }), "payment-1", {
    id: "root-1",
    role: "SUPER_ADMIN",
  }, dependencies);
  assert.equal(superAdmin.status, 422);
  assert.equal((await superAdmin.json()).code, "REFUND_REASON_REQUIRED");
  assert.equal(repositoryCalls, 0);
});
