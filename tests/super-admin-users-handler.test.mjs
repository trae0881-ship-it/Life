import test from "node:test";
import assert from "node:assert/strict";
import { handleSuperAdminUsers } from "../src/server/super-admin-users-handler.ts";

const user = {
  id: "account-1",
  email: "person@example.com",
  fullName: "Person Example",
  role: "USER",
  createdAt: new Date("2026-10-19T12:00:00.000Z"),
  _count: { profiles: 2 },
};

function request(query = "", token = "") {
  return new Request(`https://life.example/api/super-admin/users${query ? `?${query}` : ""}`, {
    headers: {
      Cookie: `session=${token}`,
      "X-Role": "SUPER_ADMIN",
    },
  });
}

function mockedDependencies({ roleForToken, users = [user], total = users.length, failAudit = false }) {
  let repositoryCalls = 0;
  let countArgs;
  let findArgs;
  let auditArgs;
  return {
    get repositoryCalls() { return repositoryCalls; },
    get countArgs() { return countArgs; },
    get findArgs() { return findArgs; },
    get auditArgs() { return auditArgs; },
    dependencies: {
      async authorize(req, allowedRoles) {
        assert.deepEqual(allowedRoles, ["SUPER_ADMIN"]);
        const token = req.headers.get("cookie")?.replace("session=", "");
        if (!token || roleForToken[token] === "EXPIRED") return { status: 401, user: null };
        if (roleForToken[token] !== "SUPER_ADMIN") return { status: 403, user: { id: "other-role" } };
        return { status: 200, user: { id: "super-admin-id" } };
      },
      repository() {
        repositoryCalls += 1;
        return {
          async $transaction(callback) {
            return callback({
              user: {
                async count(args) {
                  countArgs = args;
                  return total;
                },
                async findMany(args) {
                  findArgs = args;
                  return users;
                },
              },
              superAdminAccessLog: {
                async create(args) {
                  auditArgs = args;
                  if (failAudit) throw new Error("database URL and query text must not leak");
                  return { id: "event-1" };
                },
              },
            });
          },
        };
      },
    },
  };
}

test("mocked user-inspection API denies missing, expired, USER, DEVELOPER, and ADMIN sessions before querying", async () => {
  const mocks = mockedDependencies({
    roleForToken: { expired: "EXPIRED", user: "USER", developer: "DEVELOPER", admin: "ADMIN", root: "SUPER_ADMIN" },
  });
  for (const [token, status, code] of [
    ["", 401, "UNAUTHENTICATED"],
    ["expired", 401, "UNAUTHENTICATED"],
    ["user", 403, "FORBIDDEN"],
    ["developer", 403, "FORBIDDEN"],
    ["admin", 403, "FORBIDDEN"],
  ]) {
    const response = await handleSuperAdminUsers(request("", token), mocks.dependencies);
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
  }
  assert.equal(mocks.repositoryCalls, 0);

  const authorized = await handleSuperAdminUsers(request("", "root"), mocks.dependencies);
  assert.equal(authorized.status, 200);
  assert.equal(mocks.repositoryCalls, 1);
});

test("mocked user-inspection API validates filters before querying and ignores client role headers", async () => {
  const mocks = mockedDependencies({ roleForToken: { root: "SUPER_ADMIN" } });
  const invalid = await handleSuperAdminUsers(request("page=1&page=2", "root"), mocks.dependencies);
  assert.equal(invalid.status, 400);
  assert.equal(mocks.repositoryCalls, 0);

  const response = await handleSuperAdminUsers(request("page=3&role=USER&q=person%40example.com", "root"), mocks.dependencies);
  assert.equal(response.status, 200);
  assert.deepEqual(mocks.countArgs.where, {
    role: "USER",
    OR: [
      { id: { startsWith: "person@example.com" } },
      { email: { startsWith: "person@example.com", mode: "insensitive" } },
      { fullName: { contains: "person@example.com", mode: "insensitive" } },
    ],
  });
});

test("mocked user-inspection API uses bounded stable pagination, minimizes records, and audits transactionally", async () => {
  const overcompleteUser = {
    ...user,
    passwordHash: "must-not-be-returned",
    sessionToken: "must-not-be-returned",
    birthDate: "must-not-be-returned",
    _count: { profiles: 2 },
  };
  const mocks = mockedDependencies({ roleForToken: { root: "SUPER_ADMIN" }, users: [overcompleteUser], total: 51 });
  const response = await handleSuperAdminUsers(request("page=2&q=cm123", "root"), mocks.dependencies);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(mocks.findArgs.skip, 25);
  assert.equal(mocks.findArgs.take, 25);
  assert.deepEqual(mocks.findArgs.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.equal(mocks.auditArgs.data.actorUserId, "super-admin-id");
  assert.equal(mocks.auditArgs.data.action, "USER_FILTERED_READ");
  assert.equal(mocks.auditArgs.data.page, 2);
  assert.equal(mocks.auditArgs.data.resultCount, 1);
  assert.deepEqual(Object.keys(body.users[0]).sort(), ["createdAt", "email", "fullName", "id", "profileCount", "role"]);
  assert.doesNotMatch(JSON.stringify(body), /must-not-be-returned/);
  assert.equal(body.pageCount, 3);
});

test("mocked user-inspection API fails closed and sanitizes audit persistence errors", async () => {
  const mocks = mockedDependencies({ roleForToken: { root: "SUPER_ADMIN" }, failAudit: true });
  const response = await handleSuperAdminUsers(request("", "root"), mocks.dependencies);
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, "DATABASE_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(body), /database URL|query text/);
});
