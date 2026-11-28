import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  API_ENDPOINTS,
  authenticateApiKey,
  executeApiPlatformRoute,
  handleApiAdminPermissions,
  handleApiKey,
  handleApiKeyTest,
  handleApiKeys,
  handleApiProduct,
  handleApiProducts,
  handleApiUsageExport,
} from "../src/server/api-platform.ts";

const pepper = "unit-test-api-pepper-that-is-at-least-32-bytes-long";
const secret = `life_live_Key000000001_${"x".repeat(43)}`;
const digest = (value) => createHmac("sha256", pepper).update(value).digest("hex");
const scope = "GET /api/developer/test";

function makeRepository(overrides = {}) {
  const key = {
    id: "key-row-1", keyId: "Key000000001", digest: digest(secret), prefix: "life_live_Key000000001_",
    label: "Local test", ownerUserId: "developer-1", createdByUserId: "developer-1",
    productId: "product-1", accountGrantId: "grant-1", scopes: [scope],
    requestsPerMinute: 4, dailyQuota: 10, monthlyQuota: 30, status: "ACTIVE",
    expiresAt: null, lastUsedAt: null,
    owner: { role: "DEVELOPER" },
    product: { enabled: true, endpoints: [...API_ENDPOINTS] },
    accountGrant: { id: "grant-1", enabled: true, scopes: [scope], requestsPerMinute: 8, dailyQuota: 20, monthlyQuota: 60 },
  };
  const keyWindows = new Map();
  const accountWindows = new Map();
  const state = { key, keyWindows, accountWindows, lastKeyQuery: null, storedKeys: [], audit: [] };
  const increment = (map, where, create) => {
    const mapKey = Object.values(where).map((value) => value instanceof Date ? value.toISOString() : value).join("|");
    const previous = map.get(mapKey);
    if (previous) previous.requestCount += 1;
    else map.set(mapKey, { ...create });
    const current = map.get(mapKey);
    return { requestCount: current.requestCount };
  };
  const repository = {
    apiKey: {
      async findUnique({ where }) { return where.keyId === state.key.keyId ? state.key : null; },
      async update({ where, data }) { Object.assign(state.key, data); return state.key; },
      async findMany(args) { state.lastKeyQuery = args; return state.storedKeys; },
      async create({ data, select }) {
        const created = { ...data, id: `key-${state.storedKeys.length + 1}`, status: "ACTIVE", createdAt: new Date() };
        state.storedKeys.push(created);
        return select ? Object.fromEntries(Object.keys(select).filter((field) => select[field]).map((field) => [field, created[field]])) : created;
      },
    },
    apiKeyUsageWindow: {
      async upsert({ where, create }) { return increment(state.keyWindows, where.apiKeyId_windowType_windowStart, create); },
      async updateMany() { return { count: 0 }; },
      async findMany() { return []; },
    },
    apiAccountUsageWindow: {
      async upsert({ where, create }) { return increment(state.accountWindows, where.accountUserId_productId_windowType_windowStart, create); },
      async updateMany() { return { count: 0 }; },
      async findMany() { return []; },
    },
    apiKeyAuditLog: {
      async create({ data }) { state.audit.push(data); return data; },
      async findMany() { return []; },
    },
    apiPlatformAuditLog: { async create({ data }) { state.audit.push(data); return data; } },
    user: {
      async findUnique({ where }) {
        return { id: where.id, email: `${where.id}@example.test`, role: where.id === "admin-1" ? "ADMIN" : "DEVELOPER" };
      },
      async findMany() { return []; },
    },
    apiProduct: {
      async findUnique() { return { id: "product-1", slug: "local", name: "Local", enabled: true, endpoints: [...API_ENDPOINTS], defaultRequestsPerMinute: 30, defaultDailyQuota: 1000, defaultMonthlyQuota: 30000 }; },
      async findMany() { return []; },
    },
    apiAccountGrant: {
      async findUnique() { return { id: "grant-1", enabled: true, scopes: [...API_ENDPOINTS], requestsPerMinute: 8, dailyQuota: 20, monthlyQuota: 60 }; },
      async findMany() { return []; },
    },
    apiAdminPermission: {
      async findUnique() { return { enabled: true, canManageAccess: true, scopes: [scope], maxRequestsPerMinute: 1, maxDailyQuota: 2, maxMonthlyQuota: 3 }; },
      async findMany() { return []; },
    },
    async $transaction(callback) {
      const keySnapshot = structuredClone(state.key);
      const keyWindowsSnapshot = structuredClone(state.keyWindows);
      const accountWindowsSnapshot = structuredClone(state.accountWindows);
      try { return await callback(repository); }
      catch (error) {
        Object.assign(state.key, keySnapshot);
        state.keyWindows.clear(); for (const [k, v] of keyWindowsSnapshot) state.keyWindows.set(k, v);
        state.accountWindows.clear(); for (const [k, v] of accountWindowsSnapshot) state.accountWindows.set(k, v);
        throw error;
      }
    },
  };
  Object.assign(state, overrides);
  return { repository, state };
}

const bearer = (value = secret) => new Request("http://localhost/api/developer/test", { headers: { authorization: `Bearer ${value}` } });
const dependencies = (repository, apiPepper = pepper) => ({ repository: () => repository, pepper: apiPepper });
const responseBody = async (result) => result instanceof Response ? result.json() : null;

test("valid API keys are digest-verified and return only scopes and per-key/per-account quota information", async () => {
  const { repository } = makeRepository();
  const result = await authenticateApiKey(bearer(), scope, dependencies(repository), new Date("2026-10-27T06:00:00Z"));
  assert.equal(result.kind, "key");
  assert.equal(result.key.keyId, "Key000000001");
  assert.deepEqual(result.key.scopes, [scope]);
  assert.equal(result.remaining.key.day, 9);
  assert.equal(result.remaining.account.day, 19);
});

test("authenticated test endpoint returns scopes and quota without exposing credentials", async () => {
  const { repository } = makeRepository();
  const response = await handleApiKeyTest(bearer(), dependencies(repository));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authenticated, true);
  assert.deepEqual(body.scopes, [scope]);
  assert.equal(body.quota.remaining.key.day, 9);
  assert.equal(JSON.stringify(body).includes(secret), false);
  assert.equal(JSON.stringify(body).includes(digest(secret)), false);
});

test("missing and invalid API keys are rejected with consistent authentication errors", async () => {
  const { repository } = makeRepository();
  const missing = await handleApiKeyTest(new Request("http://localhost/api/developer/test"), dependencies(repository));
  assert.equal(missing.status, 401);
  assert.equal((await responseBody(missing)).code, "API_KEY_REQUIRED");
  const invalid = await authenticateApiKey(bearer(`${secret.slice(0, -1)}y`), scope, dependencies(repository));
  assert.equal(invalid.kind, "denied");
  assert.equal(invalid.response.status, 401);
  assert.equal((await responseBody(invalid.response)).code, "INVALID_API_KEY");
});

test("revoked, expired and grant-disabled keys are denied before quota consumption", async () => {
  const revokedRepo = makeRepository({ key: { ...makeRepository().state.key, status: "REVOKED" } });
  const revoked = await authenticateApiKey(bearer(), scope, dependencies(revokedRepo.repository));
  assert.equal((await responseBody(revoked.response)).code, "API_KEY_INACTIVE");

  const expiredState = makeRepository().state;
  const expiredRepo = makeRepository({ key: { ...expiredState.key, expiresAt: new Date("2026-01-01T00:00:00Z") } });
  const expired = await authenticateApiKey(bearer(), scope, dependencies(expiredRepo.repository), new Date("2026-10-27T06:00:00Z"));
  assert.equal((await responseBody(expired.response)).code, "API_KEY_EXPIRED");

  const disabledState = makeRepository().state;
  const disabledRepo = makeRepository({ key: { ...disabledState.key, accountGrant: { ...disabledState.key.accountGrant, enabled: false } } });
  const disabled = await authenticateApiKey(bearer(), scope, dependencies(disabledRepo.repository));
  assert.equal((await responseBody(disabled.response)).code, "API_ACCESS_DISABLED");
});

test("insufficient scopes and account-role changes are denied", async () => {
  const base = makeRepository().state;
  const scopeRepo = makeRepository({ key: { ...base.key, scopes: ["GET /api/health"], accountGrant: { ...base.key.accountGrant, scopes: [...API_ENDPOINTS] } } });
  const insufficient = await authenticateApiKey(bearer(), scope, dependencies(scopeRepo.repository));
  assert.equal((await responseBody(insufficient.response)).code, "INSUFFICIENT_SCOPE");

  const roleRepo = makeRepository({ key: { ...base.key, owner: { role: "USER" } } });
  const unauthorized = await authenticateApiKey(bearer(), scope, dependencies(roleRepo.repository));
  assert.equal((await responseBody(unauthorized.response)).code, "API_ACCOUNT_UNAUTHORIZED");
});

test("per-key and aggregate per-account quotas are reserved atomically", async () => {
  const shared = makeRepository();
  const first = await authenticateApiKey(bearer(), scope, dependencies(shared.repository), new Date("2026-10-27T06:00:00Z"));
  assert.equal(first.kind, "key");
  shared.state.key.dailyQuota = 1;
  shared.state.key.accountGrant.dailyQuota = 1;
  const secondKey = { ...shared.state.key, id: "key-row-2", keyId: "Key000000002", digest: digest("life_live_Key000000002_" + "z".repeat(43)) };
  const previousFind = shared.repository.apiKey.findUnique;
  shared.repository.apiKey.findUnique = async ({ where }) => where.keyId === secondKey.keyId ? secondKey : previousFind({ where });
  const secondSecret = `life_live_Key000000002_${"z".repeat(43)}`;
  const second = await authenticateApiKey(bearer(secondSecret), scope, dependencies(shared.repository), new Date("2026-10-27T06:00:00Z"));
  assert.equal(second.kind, "denied");
  assert.equal(second.response.status, 429);
  assert.equal((await responseBody(second.response)).quota, "account_day");

  const keyQuotaRepo = makeRepository({ key: { ...makeRepository().state.key, dailyQuota: 1 } });
  const allowed = await authenticateApiKey(bearer(), scope, dependencies(keyQuotaRepo.repository), new Date("2026-10-27T06:00:00Z"));
  assert.equal(allowed.kind, "key");
  keyQuotaRepo.state.keyWindows.set(`key-row-1|DAY|2026-10-27T00:00:00.000Z`, { requestCount: 1 });
  const exceeded = await authenticateApiKey(bearer(), scope, dependencies(keyQuotaRepo.repository), new Date("2026-10-27T06:00:00Z"));
  assert.equal(exceeded.kind, "denied");
  assert.equal((await responseBody(exceeded.response)).quota, "key_day");
});

test("developers cannot list another account's keys by changing query filters", async () => {
  const { repository, state } = makeRepository();
  const response = await handleApiKeys(new Request("http://localhost/api/platform/keys?account=another-account"), {
    id: "developer-1", email: "developer@example.test", role: "DEVELOPER",
  }, dependencies(repository));
  assert.equal(response.status, 200);
  assert.equal(state.lastKeyQuery.where.ownerUserId, "developer-1");
});

test("viewers cannot list API keys and admins can read only their own delegated permissions", async () => {
  const { repository } = makeRepository();
  const viewer = await handleApiKeys(new Request("http://localhost/api/platform/keys"), {
    id: "viewer-1", email: "viewer@example.test", role: "USER",
  }, dependencies(repository));
  assert.equal(viewer.status, 403);

  let permissionQuery;
  repository.apiAdminPermission.findMany = async (args) => { permissionQuery = args; return []; };
  const response = await handleApiAdminPermissions(new Request("http://localhost/api/platform/permissions"), {
    id: "admin-1", email: "admin@example.test", role: "ADMIN",
  }, dependencies(repository));
  assert.equal(response.status, 200);
  assert.deepEqual(permissionQuery.where, { adminUserId: "admin-1" });
});

test("API management mutations reject missing Origin and storage failures return explicit JSON errors", async () => {
  const missingOrigin = await executeApiPlatformRoute(new Request("http://localhost/api/platform/keys", { method: "POST" }), async () => {
    throw new Error("Authorization should not run before origin validation.");
  }, async () => new Response());
  assert.equal(missingOrigin.status, 403);
  assert.equal((await responseBody(missingOrigin)).code, "INVALID_ORIGIN");

  const unavailable = await executeApiPlatformRoute(new Request("http://localhost/api/platform/keys"), async () => ({
    status: 200,
    user: { id: "super-1", email: "super@example.test", role: "SUPER_ADMIN" },
  }), async () => {
    throw new Error("Database unavailable.");
  });
  assert.equal(unavailable.status, 503);
  assert.equal((await responseBody(unavailable)).code, "API_PLATFORM_UNAVAILABLE");
});

test("Admins cannot create keys above Super Admin granted scopes or limits", async () => {
  const { repository } = makeRepository();
  const request = new Request("http://localhost/api/platform/keys", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({
      ownerUserId: "developer-2", productId: "product-1", label: "Too broad",
      scopes: [scope], requestsPerMinute: 2, dailyQuota: 2, monthlyQuota: 3,
    }),
  });
  const response = await handleApiKeys(request, { id: "admin-1", email: "admin@example.test", role: "ADMIN" }, dependencies(repository));
  assert.equal(response.status, 403);
  assert.equal((await responseBody(response)).code, "ADMIN_API_PERMISSION_EXCEEDED");
});

test("Admin and Super Admin can issue keys only within developer grants and delegated ceilings", async () => {
  const { repository } = makeRepository();
  const makeRequest = (ownerUserId) => new Request("http://localhost/api/platform/keys", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({
      ownerUserId, productId: "product-1", label: `Key for ${ownerUserId}`,
      scopes: [scope], requestsPerMinute: 1, dailyQuota: 2, monthlyQuota: 3,
    }),
  });
  const admin = await handleApiKeys(makeRequest("developer-2"), {
    id: "admin-1", email: "admin@example.test", role: "ADMIN",
  }, dependencies(repository));
  assert.equal(admin.status, 201);

  const superAdmin = await handleApiKeys(makeRequest("developer-1"), {
    id: "super-1", email: "super@example.test", role: "SUPER_ADMIN",
  }, dependencies(repository));
  assert.equal(superAdmin.status, 201);
});

test("API key creation returns a one-time secret while persisting only the digest", async () => {
  const { repository, state } = makeRepository();
  const request = new Request("http://localhost/api/platform/keys", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({
      ownerUserId: "developer-1", productId: "product-1", label: "First key",
      scopes: [scope], requestsPerMinute: 4, dailyQuota: 10, monthlyQuota: 30,
    }),
  });
  const response = await handleApiKeys(request, { id: "developer-1", email: "developer@example.test", role: "DEVELOPER" }, dependencies(repository));
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.match(result.secret, /^life_live_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{40,50}$/);
  assert.equal(state.storedKeys[0].digest.length, 64);
  assert.equal(JSON.stringify(result.key).includes(state.storedKeys[0].digest), false);
  assert.equal(state.audit[0].action, "CREATED");
});

test("duplicate key labels return a conflict without exposing key material", async () => {
  const { repository } = makeRepository();
  repository.apiKey.create = async () => { throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" }); };
  const request = new Request("http://localhost/api/platform/keys", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({
      ownerUserId: "developer-1", productId: "product-1", label: "Local test",
      scopes: [scope], requestsPerMinute: 4, dailyQuota: 10, monthlyQuota: 30,
    }),
  });
  const response = await handleApiKeys(request, { id: "developer-1", email: "developer@example.test", role: "DEVELOPER" }, dependencies(repository));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "API_KEY_LABEL_EXISTS");
});

test("rotation revokes the old key, creates a uniquely labelled replacement and returns the secret once", async () => {
  const { repository, state } = makeRepository();
  const response = await handleApiKey(new Request("http://localhost/api/platform/keys/Key000000001", {
    method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: "{}",
  }), "Key000000001", { id: "developer-1", email: "developer@example.test", role: "DEVELOPER" }, dependencies(repository));
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.match(result.key.label, /^Local test \(rotated [A-Za-z0-9_-]{12}\)$/);
  assert.notEqual(result.key.label, state.key.label);
  assert.equal(state.key.status, "REVOKED");
  assert.equal(state.audit.some((entry) => entry.action === "ROTATED"), true);
  assert.equal(JSON.stringify(result.key).includes(state.storedKeys[0].digest), false);
  assert.match(result.secret, /^life_live_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{40,50}$/);
});

test("key enable, disable and revoke actions persist status and audit each mutation", async () => {
  const { repository, state } = makeRepository();
  const actor = { id: "developer-1", email: "developer@example.test", role: "DEVELOPER" };
  const request = (method, body) => new Request("http://localhost/api/platform/keys/Key000000001", {
    method, headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body ?? {}),
  });
  const disabled = await handleApiKey(request("PATCH", { status: "DISABLED" }), "Key000000001", actor, dependencies(repository));
  assert.equal(disabled.status, 200);
  assert.equal(state.key.status, "DISABLED");
  const enabled = await handleApiKey(request("PATCH", { status: "ACTIVE" }), "Key000000001", actor, dependencies(repository));
  assert.equal(enabled.status, 200);
  assert.equal(state.key.status, "ACTIVE");
  const revoked = await handleApiKey(request("DELETE"), "Key000000001", actor, dependencies(repository));
  assert.equal(revoked.status, 200);
  assert.equal(state.key.status, "REVOKED");
  assert.deepEqual(state.audit.map((entry) => entry.action), ["DISABLED", "ENABLED", "REVOKED"]);
});

test("usage export includes non-secret usage fields and excludes digests and raw API keys", async () => {
  const { repository } = makeRepository();
  repository.apiKey.findMany = async () => [{
    id: "key-row-1", keyId: "Key000000001", digest: digest(secret), prefix: "life_live_Key000000001_",
    label: "Local test", ownerUserId: "developer-1", owner: { email: "developer@example.test" },
    product: { slug: "local" }, productId: "product-1", status: "ACTIVE", lastUsedAt: null, scopes: [scope],
  }];
  const response = await handleApiUsageExport(new Request("http://localhost/api/platform/usage"), {
    id: "super-1", email: "super@example.test", role: "SUPER_ADMIN",
  }, dependencies(repository));
  const report = await response.text();
  assert.equal(response.status, 200);
  assert.match(report, /key_id/);
  assert.match(report, /life_live_Key000000001_/);
  assert.equal(report.includes(digest(secret)), false);
  assert.equal(report.includes(secret), false);
});

function makeProductRepository(initialProducts = []) {
  const state = { products: structuredClone(initialProducts), audit: [], queries: [], uniqueSlug: false };
  const repository = {
    apiProduct: {
      async create({ data }) {
        if (state.uniqueSlug || state.products.some((product) => product.slug === data.slug)) {
          throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
        }
        const product = {
          id: "product-new",
          defaultRequestsPerMinute: 30,
          defaultDailyQuota: 1000,
          defaultMonthlyQuota: 30000,
          rejectionReason: null,
          createdAt: new Date("2026-11-28T12:00:00.000Z"),
          updatedAt: new Date("2026-11-28T12:00:00.000Z"),
          ...data,
        };
        state.products.push(product);
        return product;
      },
      async findUnique({ where }) {
        const product = state.products.find((item) => item.id === where.id);
        return product ? structuredClone(product) : null;
      },
      async findMany(args = {}) {
        state.queries.push(args);
        if (args.select) return state.products.map(({ id, name, createdAt }) => ({ id, name, createdAt }));
        const ids = args.where?.id?.in;
        if (ids) return ids.flatMap((id) => state.products.filter((product) => product.id === id));
        return state.products.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? state.products.length));
      },
      async update({ where, data }) {
        const product = state.products.find((item) => item.id === where.id);
        if (!product) throw new Error("Missing product");
        Object.assign(product, data, { updatedAt: new Date("2026-11-28T13:00:00.000Z") });
        return product;
      },
      async updateMany({ where, data }) {
        const product = state.products.find((item) => item.id === where.id && item.status === where.status);
        if (!product) return { count: 0 };
        Object.assign(product, data, { updatedAt: new Date("2026-11-28T13:00:00.000Z") });
        return { count: 1 };
      },
      async count({ where } = {}) {
        if (where?.OR || where?.category || where?.developerUserId || where?.createdAt) {
          state.queries.push({ countWhere: where });
          return 28;
        }
        if (where?.status === "ACTIVE") return 5;
        if (where?.status === "PENDING_APPROVAL") return 3;
        if (where?.status === "REJECTED") return 1;
        if (where?.status === "INACTIVE") return 2;
        return 12;
      },
    },
    apiPlatformAuditLog: {
      async create({ data }) { state.audit.push(data); return data; },
      async findMany() { return state.audit.map((event, index) => ({ id: `audit-${index + 1}`, ...event, actor: { id: event.actorUserId, email: `${event.actorUserId}@example.test` } })); },
    },
    apiAccountUsageWindow: {
      async groupBy({ by, where }) {
        state.queries.push({ groupBy: by, usageWhere: where });
        return state.products.map((product, index) => ({ productId: product.id, _sum: { requestCount: (index + 1) * 10 } }));
      },
      async aggregate() { return { _sum: { requestCount: 123 } }; },
    },
    user: {
      async count() { return 4; },
    },
    async $transaction(callback) { return callback(repository); },
  };
  return { repository, state };
}

const productActor = (id, role = "DEVELOPER") => ({ id, email: `${id}@example.test`, role });
const productRequest = (url, method, body) => new Request(url, {
  method,
  headers: { origin: "http://localhost", "content-type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test("developer product creation binds ownership to the session and begins pending without activation", async () => {
  const { repository, state } = makeProductRepository();
  const response = await handleApiProducts(productRequest("http://localhost/api/platform/products", "POST", {
    slug: "vedic-insights",
    name: "Vedic Insights",
    description: "Existing supported LIFE chart endpoints.",
    category: "Astrology",
    pricingModel: "Free",
    endpoints: ["GET /api/health"],
    status: "PENDING_APPROVAL",
  }), productActor("developer-1"), dependencies(repository));
  assert.equal(response.status, 201);
  const { product } = await response.json();
  assert.equal(product.developerUserId, "developer-1");
  assert.equal(product.status, "PENDING_APPROVAL");
  assert.equal(product.enabled, false);
  assert.equal(product.approvalStatus, "PENDING");
  assert.equal(state.audit[0].action, "PRODUCT_SUBMITTED");
  assert.equal(state.audit[0].actorUserId, "developer-1");

  const spoofedOwner = await handleApiProducts(productRequest("http://localhost/api/platform/products", "POST", {
    slug: "forged-owner",
    name: "Forged owner",
    description: "Should not accept caller-supplied ownership.",
    category: "Astrology",
    pricingModel: "Free",
    endpoints: ["GET /api/health"],
    developerUserId: "developer-2",
  }), productActor("developer-1"), dependencies(repository));
  assert.equal(spoofedOwner.status, 422);
});

test("repeated product submissions with the same slug do not create duplicate products or audit events", async () => {
  const { repository, state } = makeProductRepository();
  const body = {
    slug: "vedic-insights",
    name: "Vedic Insights",
    description: "Existing supported LIFE chart endpoints.",
    category: "Astrology",
    pricingModel: "Free",
    endpoints: ["GET /api/health"],
  };
  const actor = productActor("developer-1");
  const first = await handleApiProducts(productRequest("http://localhost/api/platform/products", "POST", body), actor, dependencies(repository));
  const retry = await handleApiProducts(productRequest("http://localhost/api/platform/products", "POST", body), actor, dependencies(repository));
  assert.equal(first.status, 201);
  assert.equal(retry.status, 409);
  assert.equal(state.products.length, 1);
  assert.equal(state.audit.length, 1);
});

test("developers can edit only their own unapproved products and rejected edits resubmit for review", async () => {
  const product = {
    id: "product-1", slug: "vedic", name: "Vedic", description: "Old text", category: "Astrology",
    pricingModel: "Free", endpoints: ["GET /api/health"], developerUserId: "developer-1",
    enabled: false, status: "REJECTED", rejectionReason: "Clarify the scope.", defaultRequestsPerMinute: 30,
    defaultDailyQuota: 1000, defaultMonthlyQuota: 30000,
  };
  const { repository, state } = makeProductRepository([product]);
  const otherDeveloper = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { name: "Changed" }), "product-1", productActor("developer-2"), dependencies(repository));
  assert.equal(otherDeveloper.status, 404);

  const ownerUpdate = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { name: "Updated Vedic" }), "product-1", productActor("developer-1"), dependencies(repository));
  assert.equal(ownerUpdate.status, 200);
  const { product: updated } = await ownerUpdate.json();
  assert.equal(updated.name, "Updated Vedic");
  assert.equal(updated.status, "PENDING_APPROVAL");
  assert.equal(updated.rejectionReason, null);
  assert.equal(state.audit[0].action, "PRODUCT_RESUBMITTED");

  const activated = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { enabled: true }), "product-1", productActor("developer-1"), dependencies(repository));
  assert.equal(activated.status, 422);
});

test("developer drafts can be submitted without allowing the developer to activate them", async () => {
  const { repository, state } = makeProductRepository([{
    id: "product-draft", slug: "draft-api", name: "Draft API", description: "Draft",
    category: "Astrology", pricingModel: "Free", endpoints: ["GET /api/health"],
    developerUserId: "developer-1", enabled: false, status: "DRAFT", rejectionReason: null,
    defaultRequestsPerMinute: 30, defaultDailyQuota: 1000, defaultMonthlyQuota: 30000,
  }]);
  const response = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-draft", "PATCH", {
    status: "PENDING_APPROVAL",
  }), "product-draft", productActor("developer-1"), dependencies(repository));
  assert.equal(response.status, 200);
  assert.equal(state.products[0].status, "PENDING_APPROVAL");
  assert.equal(state.products[0].enabled, false);
  assert.equal(state.audit[0].action, "PRODUCT_RESUBMITTED");
});

test("rejection requires a reason and rejected or suspended products need Super Admin review before activation", async () => {
  const { repository, state } = makeProductRepository([{
    id: "product-1", slug: "vedic", name: "Vedic", description: "Submitted", category: "Astrology",
    pricingModel: "Free", endpoints: ["GET /api/health"], developerUserId: "developer-1",
    enabled: false, status: "PENDING_APPROVAL", rejectionReason: null,
    defaultRequestsPerMinute: 30, defaultDailyQuota: 1000, defaultMonthlyQuota: 30000,
  }]);
  const superAdmin = productActor("super-1", "SUPER_ADMIN");
  const missingReason = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "REJECT" }), "product-1", superAdmin, dependencies(repository));
  assert.equal(missingReason.status, 422);
  assert.equal((await missingReason.json()).code, "REJECTION_REASON_REQUIRED");

  const rejected = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "REJECT", reason: "Endpoint scope needs review." }), "product-1", superAdmin, dependencies(repository));
  assert.equal(rejected.status, 200);
  assert.equal(state.products[0].status, "REJECTED");
  assert.equal(state.products[0].enabled, false);
  assert.equal(state.audit[0].actorUserId, "super-1");

  const directActivation = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "ACTIVATE" }), "product-1", superAdmin, dependencies(repository));
  assert.equal(directActivation.status, 409);

  const approval = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "APPROVE" }), "product-1", superAdmin, dependencies(repository));
  assert.equal(approval.status, 200);
  assert.equal(state.products[0].status, "APPROVED");
  assert.equal(state.products[0].enabled, false);
  const activation = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "ACTIVATE" }), "product-1", superAdmin, dependencies(repository));
  assert.equal(activation.status, 200);
  assert.equal(state.products[0].status, "ACTIVE");
  assert.equal(state.products[0].enabled, true);
  assert.deepEqual(state.audit.map((event) => event.action), ["PRODUCT_REJECT", "PRODUCT_APPROVE", "PRODUCT_ACTIVATE"]);
});

test("concurrent review retries have one state transition and one audit event", async () => {
  const { repository, state } = makeProductRepository([{
    id: "product-1", slug: "vedic", name: "Vedic", description: "Submitted", category: "Astrology",
    pricingModel: "Free", endpoints: ["GET /api/health"], developerUserId: "developer-1",
    enabled: false, status: "PENDING_APPROVAL", rejectionReason: null,
    defaultRequestsPerMinute: 30, defaultDailyQuota: 1000, defaultMonthlyQuota: 30000,
  }]);
  const request = () => productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "APPROVE" });
  const adminAttempt = await handleApiProduct(request(), "product-1", productActor("admin-1", "ADMIN"), dependencies(repository));
  assert.equal(adminAttempt.status, 403);
  const results = await Promise.all([
    handleApiProduct(request(), "product-1", productActor("super-1", "SUPER_ADMIN"), dependencies(repository)),
    handleApiProduct(request(), "product-1", productActor("super-1", "SUPER_ADMIN"), dependencies(repository)),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  assert.equal(state.products[0].status, "APPROVED");
  assert.deepEqual(state.audit.map((event) => event.action), ["PRODUCT_APPROVE"]);
});

test("suspended products require Super Admin review before returning to active", async () => {
  const { repository, state } = makeProductRepository([{
    id: "product-1", slug: "vedic", name: "Vedic", description: "Approved", category: "Astrology",
    pricingModel: "Free", endpoints: ["GET /api/health"], developerUserId: "developer-1",
    enabled: true, status: "ACTIVE", rejectionReason: null,
    defaultRequestsPerMinute: 30, defaultDailyQuota: 1000, defaultMonthlyQuota: 30000,
  }]);
  const superAdmin = productActor("super-1", "SUPER_ADMIN");
  const suspended = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "SUSPEND" }), "product-1", superAdmin, dependencies(repository));
  assert.equal(suspended.status, 200);
  assert.equal(state.products[0].enabled, false);
  const directActivation = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "ACTIVATE" }), "product-1", superAdmin, dependencies(repository));
  assert.equal(directActivation.status, 409);
  const reviewed = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "APPROVE" }), "product-1", superAdmin, dependencies(repository));
  assert.equal(reviewed.status, 200);
  const activated = await handleApiProduct(productRequest("http://localhost/api/platform/products/product-1", "PATCH", { action: "ACTIVATE" }), "product-1", superAdmin, dependencies(repository));
  assert.equal(activated.status, 200);
  assert.equal(state.products[0].status, "ACTIVE");
  assert.deepEqual(state.audit.map((event) => event.action), ["PRODUCT_SUSPEND", "PRODUCT_APPROVE", "PRODUCT_ACTIVATE"]);
});

test("only Super Admin can use the database-backed inventory and its filters are server-paginated", async () => {
  const { repository, state } = makeProductRepository([{
    id: "product-1", slug: "vedic", name: "Vedic", description: "Existing product", developerUserId: "developer-1",
    developer: { id: "developer-1", email: "developer@example.test", fullName: "Developer One" },
    category: "Astrology", pricingModel: "Free", endpoints: ["GET /api/health"], enabled: false,
    status: "PENDING_APPROVAL", rejectionReason: null, defaultRequestsPerMinute: 30,
    defaultDailyQuota: 1000, defaultMonthlyQuota: 30000,
    createdAt: new Date("2026-11-01T00:00:00.000Z"), updatedAt: new Date("2026-11-02T00:00:00.000Z"),
  }]);
  const forbidden = await handleApiProducts(new Request("http://localhost/api/platform/products?inventory=true"), productActor("admin-1", "ADMIN"), dependencies(repository));
  assert.equal(forbidden.status, 403);

  const request = new Request("http://localhost/api/platform/products?inventory=true&q=Developer%20One&category=Astrology&developerId=developer-1&approval=PENDING&createdFrom=2026-11-01&createdTo=2026-11-28&sort=name&order=asc&page=3&pageSize=10");
  const response = await handleApiProducts(request, productActor("super-1", "SUPER_ADMIN"), dependencies(repository));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.page, 3);
  assert.equal(body.pageCount, 3);
  assert.equal(body.summary.totalProducts, 12);
  assert.equal(body.summary.activeProducts, 5);
  assert.equal(body.summary.totalDevelopers, 4);
  assert.equal(body.summary.totalApiRequests, 123);
  assert.equal(body.platform.apiBasePath, "/api");
  const query = state.queries.find((entry) => entry.countWhere);
  assert.equal(query.countWhere.status, "PENDING_APPROVAL");
  assert.equal(query.countWhere.category, "Astrology");
  assert.equal(query.countWhere.developerUserId, "developer-1");
  const pageQuery = state.queries.find((entry) => entry.take === 10);
  assert.equal(pageQuery.skip, 20);
  assert.equal(pageQuery.orderBy[0].name, "asc");
});

test("usage sorting uses non-overlapping monthly request totals", async () => {
  const { repository } = makeProductRepository([
    { id: "product-1", name: "Alpha", slug: "alpha", status: "ACTIVE", createdAt: new Date(), developerUserId: null },
    { id: "product-2", name: "Beta", slug: "beta", status: "ACTIVE", createdAt: new Date(), developerUserId: null },
  ]);
  const response = await handleApiProducts(new Request("http://localhost/api/platform/products?inventory=true&sort=usage&order=desc&pageSize=10"), productActor("super-1", "SUPER_ADMIN"), dependencies(repository));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.products.map((product) => product.id), ["product-2", "product-1"]);
  assert.deepEqual(body.products.map((product) => product.totalRequests), [20, 10]);
});

test("developer product listings do not disclose another developer's identity, rejection feedback, or usage", async () => {
  const { repository, state } = makeProductRepository([{
    id: "product-foreign", slug: "active-api", name: "Active API", description: "Enabled product",
    developerUserId: "developer-2", category: "Astrology", pricingModel: "Free",
    endpoints: ["GET /api/health"], enabled: true, status: "ACTIVE", rejectionReason: "Private review note",
    defaultRequestsPerMinute: 30, defaultDailyQuota: 1000, defaultMonthlyQuota: 30000,
  }]);
  const response = await handleApiProducts(new Request("http://localhost/api/platform/products"), productActor("developer-1"), dependencies(repository));
  assert.equal(response.status, 200);
  const { products } = await response.json();
  assert.equal(products[0].developerUserId, null);
  assert.equal(products[0].rejectionReason, null);
  assert.equal(products[0].currentMonthRequests, null);
  assert.match(JSON.stringify(products), /active-api/);
  assert.equal(JSON.stringify(products).includes("developer-2"), false);
  assert.equal(JSON.stringify(products).includes("Private review note"), false);
  assert.equal(state.queries.some((entry) => entry.where?.OR?.some((filter) => filter.developerUserId === "developer-1")), true);
});

test("API product detail exposes audit and usage but never API key credentials", async () => {
  const rawApiKey = "life_live_private_secret_that_must_never_appear";
  const { repository, state } = makeProductRepository([{
    id: "product-1", slug: "vedic", name: "Vedic", description: "Product", developerUserId: "developer-1",
    developer: { id: "developer-1", email: "developer@example.test", fullName: "Developer One" },
    category: "Astrology", pricingModel: "Free", endpoints: ["GET /api/health"], enabled: false,
    status: "PENDING_APPROVAL", rejectionReason: null, defaultRequestsPerMinute: 30,
    defaultDailyQuota: 1000, defaultMonthlyQuota: 30000, createdAt: new Date(), updatedAt: new Date(),
  }]);
  state.audit.push({
    actorUserId: "super-1", action: "PRODUCT_APPROVE", targetType: "PRODUCT", targetId: "product-1",
    details: { fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED" }, createdAt: new Date(),
  });
  const response = await handleApiProduct(new Request("http://localhost/api/platform/products/product-1"), "product-1", productActor("super-1", "SUPER_ADMIN"), dependencies(repository));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.currentMonthRequests, 10);
  assert.equal(body.totalRequests, 10);
  assert.equal(body.audit.length, 1);
  assert.equal(body.audit[0].action, "PRODUCT_APPROVE");
  assert.equal(JSON.stringify(body).includes(rawApiKey), false);
  assert.equal(JSON.stringify(body).includes("digest"), false);
});
