import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_COOKIE_NAME,
  SESSION_LIFETIME_MS,
  authenticateCredentials,
  createSession,
  findSession,
  requireRole,
  hashPassword,
  registerAccount,
  revokeSession,
  roleAllowed,
  validateFullName,
  validatePassword,
  verifyPassword,
} from "../src/server/auth-core.ts";
import { ownedRecordData, ownedRecordWhere } from "../src/server/ownership.ts";
import { checkRateLimit, clearRateLimitsForTests } from "../src/server/rate-limit.ts";
import { CURRENT_TERMS_VERSION } from "../src/legal/terms.ts";

function makeRepository() {
  const users = new Map();
  const sessions = new Map();
  const createCalls = [];
  return {
    users,
    sessions,
    createCalls,
    user: {
      async findUnique({ where }) {
        return users.get(where.email) ?? null;
      },
      async create({ data }) {
        createCalls.push(data);
        if (users.has(data.email)) {
          const error = new Error("Unique constraint");
          error.code = "P2002";
          throw error;
        }
        const user = { id: `user-${users.size + 1}`, ...data };
        users.set(data.email, user);
        return { id: user.id, email: user.email, role: user.role };
      },
    },
    session: {
      async create({ data }) {
        sessions.set(data.tokenHash, data);
        return { id: `session-${sessions.size}` };
      },
      async findFirst({ where }) {
        const session = sessions.get(where.tokenHash);
        if (!session || session.expiresAt <= where.expiresAt.gt) return null;
        const user = [...users.values()].find((entry) => entry.id === session.userId);
        return user ? { expiresAt: session.expiresAt, user: { id: user.id, email: user.email, role: user.role } } : null;
      },
      async deleteMany({ where }) {
        const found = sessions.delete(where.tokenHash);
        return { count: Number(found) };
      },
    },
  };
}

test("registration stores an Argon2id hash and never a plaintext password", async () => {
  const repository = makeRepository();
  const password = "correct-horse-battery-staple";
  const user = await registerAccount({ fullName: "  Person Example  ", email: " Person@Example.COM ", password, confirmPassword: password, role: "ADMIN", acceptedTerms: true, termsVersion: CURRENT_TERMS_VERSION }, repository);
  const stored = repository.users.get("person@example.com");
  assert.equal(user.role, "USER");
  assert.equal(stored.fullName, "Person Example");
  assert.equal(Object.hasOwn(repository.createCalls[0], "id"), false, "Prisma's @default(cuid()) generates the User ID when the create operation is executed");
  assert.match(stored.passwordHash, /^\$argon2id\$/);
  assert.notEqual(stored.passwordHash, password);
  assert.equal(Object.values(stored).includes(password), false);
  assert.equal(await verifyPassword(stored.passwordHash, password), true);
  assert.equal(await verifyPassword(stored.passwordHash, "another-password"), false);
});

test("registration validates a required full name and rejects malformed account fields", async () => {
  assert.equal(validateFullName("  Ada Example "), "Ada Example");
  for (const invalid of [undefined, "", "  ", "a".repeat(101), "Name\nInjected"]) {
    assert.throws(() => validateFullName(invalid));
  }
  assert.throws(() => validatePassword("short"), /12 and 128 characters/);
  assert.throws(() => validatePassword(" padded-password "), /leading or trailing spaces/);
  await assert.rejects(registerAccount({
    fullName: "Person Example",
    email: "person@example.com",
    password: "correct-horse-battery-staple",
    confirmPassword: "different-correct-horse-battery-staple",
    acceptedTerms: true,
    termsVersion: CURRENT_TERMS_VERSION,
  }, makeRepository()), /confirmation does not match/);
});

test("registration normalizes email and rejects duplicate addresses without replacing the existing account", async () => {
  const repository = makeRepository();
  const registration = {
    fullName: "First Account",
    email: " Person@Example.COM ",
    password: "correct-horse-battery-staple",
    confirmPassword: "correct-horse-battery-staple",
    acceptedTerms: true,
    termsVersion: CURRENT_TERMS_VERSION,
  };
  await registerAccount(registration, repository);
  await assert.rejects(registerAccount({ ...registration, fullName: "Duplicate Account", email: "person@example.com" }, repository), (error) => error.code === "P2002");
  assert.equal(repository.users.size, 1);
  assert.equal(repository.users.get("person@example.com").fullName, "First Account");
});

test("password and login validation reject invalid values without revealing account state", async () => {
  const repository = makeRepository();
  assert.throws(() => validatePassword("short"));
  assert.throws(() => validatePassword(" padded-password "));
  assert.equal(await authenticateCredentials({ email: "not-an-email", password: "correct-horse-battery-staple" }, repository), null);
  const registered = await registerAccount({ fullName: "Person Example", email: "person@example.com", password: "correct-horse-battery-staple", confirmPassword: "correct-horse-battery-staple", acceptedTerms: true, termsVersion: CURRENT_TERMS_VERSION }, repository);
  assert.deepEqual(await authenticateCredentials({ email: "person@example.com", password: "correct-horse-battery-staple" }, repository), registered);
  assert.equal(await authenticateCredentials({ email: "person@example.com", password: "incorrect-password" }, repository), null);
  assert.equal(await authenticateCredentials({ email: "missing@example.com", password: "correct-horse-battery-staple" }, repository), null);
  assert.ok(AUTH_COOKIE_NAME.includes("life_session"));
});

test("sessions store opaque-token hashes, expire, and are invalidated on logout", async () => {
  const repository = makeRepository();
  const user = await registerAccount({ fullName: "Person Example", email: "person@example.com", password: "correct-horse-battery-staple", confirmPassword: "correct-horse-battery-staple", acceptedTerms: true, termsVersion: CURRENT_TERMS_VERSION }, repository);
  const now = new Date("2026-01-01T00:00:00.000Z");
  const { token, expiresAt } = await createSession(user.id, repository, now);
  assert.match(token, /^[A-Za-z0-9_-]{40,50}$/);
  assert.equal(expiresAt.getTime() - now.getTime(), SESSION_LIFETIME_MS);
  assert.equal(repository.sessions.has(token), false);
  assert.equal(repository.sessions.size, 1);
  assert.equal((await findSession(token, repository, now)).user.id, user.id);
  assert.equal(await findSession(token, repository, expiresAt), null);
  assert.equal(await revokeSession(token, repository), 1);
  assert.equal(await findSession(token, repository, now), null);
  assert.equal(await revokeSession(token, repository), 0);
});

test("role authorization allows only explicit server-side roles", () => {
  const ordinary = { id: "u1", email: "user@example.com", role: "USER" };
  const admin = { id: "a1", email: "admin@example.com", role: "ADMIN" };
  assert.equal(roleAllowed(ordinary, ["ADMIN", "SUPER_ADMIN"]), false);
  assert.equal(roleAllowed(admin, ["ADMIN", "SUPER_ADMIN"]), true);
  assert.equal(roleAllowed(null, ["ADMIN"]), false);
});

test("server session guard rejects anonymous users and denies ordinary users admin access", async () => {
  const repository = makeRepository();
  const user = await registerAccount({ fullName: "Person Example", email: "person@example.com", password: "correct-horse-battery-staple", confirmPassword: "correct-horse-battery-staple", acceptedTerms: true, termsVersion: CURRENT_TERMS_VERSION }, repository);
  const { token } = await createSession(user.id, repository);
  const request = new Request("https://life.example/api/admin/users", {
    headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
  });
  assert.equal((await requireRole(new Request("https://life.example/api/admin/users"), ["ADMIN"], repository)).status, 401);
  assert.equal((await requireRole(request, ["ADMIN", "SUPER_ADMIN"], repository)).status, 403);
});

test("Super Admin guard uses the session role and rejects role tampering and expired sessions", async () => {
  const repository = makeRepository();
  const user = await registerAccount({ fullName: "Person Example", email: "person@example.com", password: "correct-horse-battery-staple", confirmPassword: "correct-horse-battery-staple", acceptedTerms: true, termsVersion: CURRENT_TERMS_VERSION }, repository);
  const storedUser = repository.users.get(user.email);
  const { token } = await createSession(user.id, repository);
  const tamperedRequest = new Request("https://life.example/api/super-admin/overview?role=SUPER_ADMIN", {
    headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}`, "X-Role": "SUPER_ADMIN" },
  });
  assert.equal((await requireRole(tamperedRequest, ["SUPER_ADMIN"], repository)).status, 403);

  storedUser.role = "ADMIN";
  assert.equal((await requireRole(tamperedRequest, ["SUPER_ADMIN"], repository)).status, 403);
  storedUser.role = "SUPER_ADMIN";
  assert.equal((await requireRole(tamperedRequest, ["SUPER_ADMIN"], repository)).status, 200);

  const session = [...repository.sessions.values()][0];
  session.expiresAt = new Date(Date.now() - 1);
  assert.equal((await requireRole(tamperedRequest, ["SUPER_ADMIN"], repository)).status, 401);
});

test("profile and saved-chart query scopes include the authenticated owner for every operation", () => {
  function fakeTable(rows) {
    return {
      rows,
      findMany({ where }) { return rows.filter((row) => Object.entries(where).every(([key, value]) => row[key] === value)); },
      findFirst({ where }) { return rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null; },
      updateMany({ where, data }) {
        const matches = rows.filter((row) => Object.entries(where).every(([key, value]) => row[key] === value));
        for (const row of matches) Object.assign(row, data);
        return { count: matches.length };
      },
      deleteMany({ where }) {
        const matches = rows.filter((row) => Object.entries(where).every(([key, value]) => row[key] === value));
        for (const row of matches) rows.splice(rows.indexOf(row), 1);
        return { count: matches.length };
      },
    };
  }

  for (const kind of ["profile", "chart"]) {
    const table = fakeTable([
      { id: `${kind}-a`, userId: "user-a", title: "A private record" },
      { id: `${kind}-b`, userId: "user-b", title: "B private record" },
    ]);
    const created = { id: `${kind}-new`, ...ownedRecordData("user-a", { userId: "user-b", title: "created by A" }) };
    table.rows.push(created);
    assert.equal(created.userId, "user-a", "creation must assign the authenticated owner");
    assert.deepEqual(table.findMany({ where: ownedRecordWhere("user-a") }).map((row) => row.id), [`${kind}-a`, `${kind}-new`]);
    assert.equal(table.findFirst({ where: ownedRecordWhere("user-a", `${kind}-b`) }), null);
    assert.equal(table.updateMany({ where: ownedRecordWhere("user-a", `${kind}-b`), data: { title: "tampered" } }).count, 0);
    assert.equal(table.rows.find((row) => row.id === `${kind}-b`).title, "B private record");
    assert.equal(table.updateMany({ where: ownedRecordWhere("user-a", `${kind}-a`), data: { title: "updated by A" } }).count, 1);
    assert.equal(table.deleteMany({ where: ownedRecordWhere("user-a", `${kind}-b`) }).count, 0);
    assert.equal(table.deleteMany({ where: ownedRecordWhere("user-a", `${kind}-a`) }).count, 1);
  }
});

test("rate limiting rejects requests beyond the configured window and permits them after expiry", () => {
  clearRateLimitsForTests();
  assert.equal(checkRateLimit("login:test", 2, 1_000, 10_000).allowed, true);
  assert.equal(checkRateLimit("login:test", 2, 1_000, 10_100).allowed, true);
  const limited = checkRateLimit("login:test", 2, 1_000, 10_200);
  assert.equal(limited.allowed, false);
  assert.equal(limited.retryAfterSeconds, 1);
  assert.equal(checkRateLimit("login:test", 2, 1_000, 11_100).allowed, true);
  clearRateLimitsForTests();
});
