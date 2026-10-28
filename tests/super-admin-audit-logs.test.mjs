import test from "node:test";
import assert from "node:assert/strict";
import { auditLogWhere, parseSuperAdminAuditFilters } from "../src/server/super-admin-audit-logs.ts";
import { handleSuperAdminAuditLogs } from "../src/server/super-admin-audit-handler.ts";

const event = {
  id: "audit-1",
  actorUserId: "super-admin-id",
  actorLabel: null,
  action: "USER_FILTERED_READ",
  page: 2,
  resultCount: 25,
  targetUserId: null,
  fromRole: null,
  toRole: null,
  createdAt: new Date("2026-10-19T12:30:00.000Z"),
};

test("audit filters validate action, pagination, date-only values and inclusive date ranges", () => {
  assert.deepEqual(parseSuperAdminAuditFilters(new URLSearchParams("page=2&action=USER_LIST_READ&startDate=2026-10-01&endDate=2026-10-31")), {
    ok: true,
    value: {
      page: 2,
      action: "USER_LIST_READ",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    },
  });

  const where = auditLogWhere({
    page: 1,
    action: null,
    startDate: "2026-10-01",
    endDate: "2026-10-31",
  });
  assert.equal(where.createdAt.gte.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(where.createdAt.lt.toISOString(), "2026-11-01T00:00:00.000Z");
  for (const query of [
    "page=0",
    "page=100001",
    "action=UNKNOWN",
    "startDate=",
    "startDate=2026-02-30",
    "endDate=2026-10-01&startDate=2026-10-02",
    "page=1&page=2",
    "unexpected=1",
  ]) {
    assert.deepEqual(parseSuperAdminAuditFilters(new URLSearchParams(query)), { ok: false }, query);
  }
});

function request(query = "", role = "") {
  return new Request(`https://life.example/api/super-admin/audit-logs${query ? `?${query}` : ""}`, {
    headers: { Cookie: `session=${role}`, "X-Role": "SUPER_ADMIN" },
  });
}

function mockedDependencies({ roleForToken, events = [event], total = events.length, fail = false }) {
  let repositoryCalls = 0;
  let countArgs;
  let findArgs;
  return {
    get repositoryCalls() { return repositoryCalls; },
    get countArgs() { return countArgs; },
    get findArgs() { return findArgs; },
    dependencies: {
      async authorize(req, allowedRoles) {
        assert.deepEqual(allowedRoles, ["SUPER_ADMIN"]);
        const token = req.headers.get("cookie")?.replace("session=", "");
        if (!token || roleForToken[token] === "EXPIRED") return { status: 401, user: null };
        if (roleForToken[token] !== "SUPER_ADMIN") return { status: 403, user: { id: "admin-id" } };
        return { status: 200, user: { id: "super-admin-id" } };
      },
      repository() {
        repositoryCalls += 1;
        return {
          async $transaction(callback) {
            if (fail) throw new Error("database connection URL and SQL must not leak");
            return callback({
              superAdminAccessLog: {
                async count(args) {
                  countArgs = args;
                  return total;
                },
                async findMany(args) {
                  findArgs = args;
                  return events;
                },
              },
            });
          },
        };
      },
    },
  };
}

test("mocked audit API rejects anonymous, expired, ordinary, and ADMIN sessions before querying", async () => {
  const mocks = mockedDependencies({ roleForToken: { user: "USER", admin: "ADMIN", root: "SUPER_ADMIN", expired: "EXPIRED" } });
  for (const [token, status, code] of [
    ["", 401, "UNAUTHENTICATED"],
    ["expired", 401, "UNAUTHENTICATED"],
    ["user", 403, "FORBIDDEN"],
    ["admin", 403, "FORBIDDEN"],
  ]) {
    const response = await handleSuperAdminAuditLogs(request("", token), mocks.dependencies);
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
  }
  assert.equal(mocks.repositoryCalls, 0);

  const authorized = await handleSuperAdminAuditLogs(request("", "root"), mocks.dependencies);
  assert.equal(authorized.status, 200);
  assert.equal(mocks.repositoryCalls, 1);
});

test("mocked audit API returns empty pages, stable ordering, and only approved event fields", async () => {
  const overcompleteEvent = {
    ...event,
    passwordHash: "must-not-be-returned",
    token: "must-not-be-returned",
    searchText: "must-not-be-returned",
    connectionString: "must-not-be-returned",
  };
  const mocks = mockedDependencies({ roleForToken: { root: "SUPER_ADMIN" }, events: [overcompleteEvent] });
  const response = await handleSuperAdminAuditLogs(request("page=2&action=USER_FILTERED_READ&startDate=2026-10-19&endDate=2026-10-19", "root"), mocks.dependencies);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(mocks.findArgs.skip, 25);
  assert.equal(mocks.findArgs.take, 25);
  assert.deepEqual(mocks.findArgs.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.equal(mocks.countArgs.where.action, "USER_FILTERED_READ");
  assert.equal(mocks.countArgs.where.createdAt.lt.toISOString(), "2026-10-20T00:00:00.000Z");
  assert.deepEqual(Object.keys(body.events[0]).sort(), ["action", "actorLabel", "actorUserId", "createdAt", "fromRole", "id", "page", "resultCount", "targetUserId", "toRole"]);
  assert.doesNotMatch(JSON.stringify(body), /must-not-be-returned/);
  assert.equal(body.page, 2);

  const empty = mockedDependencies({ roleForToken: { root: "SUPER_ADMIN" }, events: [], total: 0 });
  const emptyResponse = await handleSuperAdminAuditLogs(request("", "root"), empty.dependencies);
  assert.deepEqual((await emptyResponse.json()).events, []);
});

test("mocked audit API returns a generic service error without database details", async () => {
  const mocks = mockedDependencies({ roleForToken: { root: "SUPER_ADMIN" }, fail: true });
  const response = await handleSuperAdminAuditLogs(request("", "root"), mocks.dependencies);
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, "DATABASE_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(body), /connection URL|SQL/);
});
