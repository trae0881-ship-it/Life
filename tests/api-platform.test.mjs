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
