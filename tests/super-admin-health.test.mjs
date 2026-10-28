import test from "node:test";
import assert from "node:assert/strict";
import { handleSuperAdminHealth } from "../src/server/super-admin-health-handler.ts";

function request(token = "") {
  return new Request("https://life.example/api/super-admin/health", {
    headers: { Cookie: `session=${token}`, "X-Role": "SUPER_ADMIN" },
  });
}

function dependencies(role = "SUPER_ADMIN", result = { engine: "ready", database: "connected" }) {
  let healthCalls = 0;
  return {
    get healthCalls() { return healthCalls; },
    authorize: async (_request, roles) => {
      assert.deepEqual(roles, ["SUPER_ADMIN"]);
      if (!role) return { status: 401, user: null };
      if (role !== "SUPER_ADMIN") return { status: 403, user: { id: "non-super-admin" } };
      return { status: 200, user: { id: "root" } };
    },
    health: async () => {
      healthCalls += 1;
      return result;
    },
  };
}

test("Super Admin health endpoint rejects unauthenticated and non-Super-Admin callers before checking services", async () => {
  for (const [role, expectedStatus] of [[null, 401], ["USER", 403], ["ADMIN", 403]]) {
    const deps = dependencies(role);
    const response = await handleSuperAdminHealth(request(), deps);
    assert.equal(response.status, expectedStatus);
    assert.equal(deps.healthCalls, 0);
  }
});

test("Super Admin health response returns only sanitized engine and database states", async () => {
  const deps = dependencies("SUPER_ADMIN", {
    engine: "unavailable",
    database: "not-configured",
    connectionString: "postgres://secret",
  });
  const response = await handleSuperAdminHealth(request("valid"), deps);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body, { engine: "unavailable", database: "not-configured" });
  assert.doesNotMatch(JSON.stringify(body), /postgres|secret|DATABASE_URL/);
});

test("health inspection failure degrades safely without returning exception details", async () => {
  const deps = dependencies();
  deps.health = async () => { throw new Error("secret database URL"); };
  const response = await handleSuperAdminHealth(request("valid"), deps);
  assert.deepEqual(await response.json(), { engine: "unavailable", database: "unreachable" });
});
