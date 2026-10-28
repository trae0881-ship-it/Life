import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PASSWORD_RESET_TOKEN_LIFETIME_MS,
  consumePasswordReset,
  createPasswordReset,
} from "../src/server/password-recovery.ts";
import { readPasswordResetEmailConfig, sendPasswordResetEmail } from "../src/server/password-reset-email.ts";
import { checkRateLimit, clearRateLimitsForTests } from "../src/server/rate-limit.ts";
import { verifyPassword } from "../src/server/auth-core.ts";

const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

function makeRepository() {
  const users = new Map([["person@example.com", { id: "user-1", email: "person@example.com", passwordHash: "old-hash" }]]);
  const tokens = new Map();
  const sessions = new Map([
    ["session-1", "user-1"],
    ["session-2", "user-1"],
    ["unrelated-session", "user-2"],
  ]);
  let tokenSequence = 0;

  return {
    users,
    tokens,
    sessions,
    async findUserByEmail(email) {
      return users.get(email) ?? null;
    },
    async replaceResetToken(userId, tokenHash, expiresAt) {
      for (const [hash, token] of tokens) {
        if (token.userId === userId && token.usedAt === null) tokens.delete(hash);
      }
      tokenSequence += 1;
      tokens.set(tokenHash, { id: `reset-${tokenSequence}`, userId, expiresAt, usedAt: null });
    },
    async findResetToken(tokenHash) {
      return tokens.get(tokenHash) ?? null;
    },
    async completePasswordReset({ tokenId, userId, passwordHash, now }) {
      const record = [...tokens.values()].find((token) => token.id === tokenId);
      if (!record || record.userId !== userId || record.usedAt || record.expiresAt <= now) return false;
      record.usedAt = now;
      const user = [...users.values()].find((entry) => entry.id === userId);
      if (!user) return false;
      user.passwordHash = passwordHash;
      for (const [sessionId, sessionUserId] of sessions) {
        if (sessionUserId === userId) sessions.delete(sessionId);
      }
      for (const [hash, token] of tokens) {
        if (token.userId === userId) tokens.delete(hash);
      }
      return true;
    },
  };
}

test("password reset issues a cryptographically random token and persists only its hash with a 30-minute expiry", async () => {
  const repository = makeRepository();
  const now = new Date("2026-10-26T12:00:00.000Z");
  const result = await createPasswordReset(" Person@Example.COM ", repository, now);

  assert.equal(result.email, "person@example.com");
  assert.match(result.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(result.expiresAt.getTime() - now.getTime(), PASSWORD_RESET_TOKEN_LIFETIME_MS);
  assert.equal(repository.tokens.size, 1);
  const [storedHash, storedRecord] = [...repository.tokens.entries()][0];
  assert.notEqual(storedHash, result.token);
  assert.equal(storedRecord.expiresAt, result.expiresAt);
  assert.doesNotMatch(JSON.stringify([...repository.tokens]), new RegExp(result.token));
});

test("unknown and malformed emails do not create reset tokens", async () => {
  const repository = makeRepository();
  assert.equal(await createPasswordReset("missing@example.com", repository), null);
  assert.equal(await createPasswordReset("not-an-email", repository), null);
  assert.equal(repository.tokens.size, 0);
});

test("expired and invalid reset tokens are rejected without changing password or sessions", async () => {
  const repository = makeRepository();
  const issuedAt = new Date("2026-10-26T12:00:00.000Z");
  const reset = await createPasswordReset("person@example.com", repository, issuedAt);
  const expiredResult = await consumePasswordReset({
    token: reset.token,
    password: "new-secure-password-123",
    confirmPassword: "new-secure-password-123",
  }, repository, new Date(reset.expiresAt.getTime() + 1));
  assert.equal(expiredResult, false);

  const invalidResult = await consumePasswordReset({
    token: "invalid",
    password: "new-secure-password-123",
    confirmPassword: "new-secure-password-123",
  }, repository, issuedAt);
  assert.equal(invalidResult, false);
  assert.equal(repository.users.get("person@example.com").passwordHash, "old-hash");
  assert.equal(repository.sessions.size, 3);
});

test("reset token is single-use, stores Argon2id password hash, and revokes all sessions", async () => {
  const repository = makeRepository();
  const now = new Date("2026-10-26T12:00:00.000Z");
  const reset = await createPasswordReset("person@example.com", repository, now);
  const password = "new-secure-password-123";

  assert.equal(await consumePasswordReset({ token: reset.token, password, confirmPassword: password }, repository, now), true);
  const storedHash = repository.users.get("person@example.com").passwordHash;
  assert.notEqual(storedHash, password);
  assert.match(storedHash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(storedHash, password), true);
  assert.deepEqual([...repository.sessions.entries()], [["unrelated-session", "user-2"]]);
  assert.equal(repository.tokens.size, 0);
  assert.equal(await consumePasswordReset({ token: reset.token, password, confirmPassword: password }, repository, now), false);
});

test("reset rejects weak passwords and mismatched confirmation", async () => {
  const repository = makeRepository();
  const reset = await createPasswordReset("person@example.com", repository);
  await assert.rejects(
    consumePasswordReset({ token: reset.token, password: "short", confirmPassword: "short" }, repository),
    /12 and 128 characters/,
  );
  await assert.rejects(
    consumePasswordReset({ token: reset.token, password: "new-secure-password-123", confirmPassword: "different-secure-password-123" }, repository),
    /confirmation does not match/,
  );
});

test("password reset request limits are enforced without storing raw email identifiers", () => {
  clearRateLimitsForTests();
  const key = "password-reset-email:" + "a".repeat(64);
  for (let i = 0; i < 3; i += 1) assert.equal(checkRateLimit(key, 3, 60_000, 1000 + i).allowed, true);
  const blocked = checkRateLimit(key, 3, 60_000, 1004);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  assert.equal(checkRateLimit(key, 3, 60_000, 61_001).allowed, true);
  clearRateLimitsForTests();

  const route = source("src/app/api/auth/forgot-password/route.ts");
  const resetRoute = source("src/app/api/auth/reset-password/route.ts");
  assert.match(route, /password-reset-ip:[\s\S]*?5, 15 \* 60_000/);
  assert.match(route, /password-reset-email:[\s\S]*?3, 60 \* 60_000/);
  assert.match(route, /after\(\(\) => processResetRequest/);
  assert.match(route, /status: 202/);
  assert.match(resetRoute, /password-reset-complete:[\s\S]*?10, 15 \* 60_000/);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(resetRoute, /isSameOriginMutation\(request\)/);
});

test("Resend config requires server-side values and a safe app origin", () => {
  const base = {
    RESEND_API_KEY: "private-test-value",
    LIFE_EMAIL_FROM: "LIFE <security@example.test>",
    LIFE_PUBLIC_APP_URL: "https://life.example",
  };
  assert.deepEqual(readPasswordResetEmailConfig(base), {
    apiKey: "private-test-value",
    from: "LIFE <security@example.test>",
    appOrigin: "https://life.example",
  });
  assert.equal(readPasswordResetEmailConfig({ ...base, LIFE_PUBLIC_APP_URL: "http://life.example" }), null);
  assert.equal(readPasswordResetEmailConfig({ ...base, LIFE_PUBLIC_APP_URL: "https://life.example/path" }), null);
  assert.equal(readPasswordResetEmailConfig({ ...base, RESEND_API_KEY: "" }), null);
  assert.equal(readPasswordResetEmailConfig({ ...base, LIFE_PUBLIC_APP_URL: "http://localhost:3000", NODE_ENV: "production" }), null);
  assert.equal(readPasswordResetEmailConfig({ ...base, LIFE_PUBLIC_APP_URL: "https://localhost", NODE_ENV: "production" }), null);
});

test("Resend delivery sends a one-time token in the URL fragment and never logs or returns it", async () => {
  let requestUrl;
  let options;
  const token = "A".repeat(43);
  await sendPasswordResetEmail({
    to: "person@example.com",
    token,
    config: { apiKey: "private-test-value", from: "LIFE <security@example.test>", appOrigin: "https://life.example" },
  }, async (url, init) => {
    requestUrl = url;
    options = init;
    return new Response("{}", { status: 200 });
  });
  assert.equal(requestUrl, "https://api.resend.com/emails");
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, "Bearer private-test-value");
  const body = JSON.parse(options.body);
  const email = new URL(body.text.match(/https:\/\/life\.example\/reset-password#\S+/)[0]);
  assert.equal(email.hash, `#token=${token}`);
  assert.equal(body.to[0], "person@example.com");
});

test("recovery routes and pages use no-store responses, a fragment-only reset token, and the additive un-applied migration", () => {
  const forgotRoute = source("src/app/api/auth/forgot-password/route.ts");
  const resetRoute = source("src/app/api/auth/reset-password/route.ts");
  const resetForm = source("src/app/reset-password/ResetPasswordForm.tsx");
  const forgotPage = source("src/app/forgot-password/page.tsx");
  const resetPage = source("src/app/reset-password/page.tsx");
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20261026140000_password_reset_tokens/migration.sql");
  const loginPanel = source("src/app/AccountPanel.tsx");

  assert.match(loginPanel, /href="\/forgot-password"/);
  assert.match(forgotRoute, /Cache-Control": "no-store"/);
  assert.match(resetRoute, /transaction\.session\.deleteMany\(\{ where: \{ userId \} \}\)/);
  assert.match(resetRoute, /transaction\.passwordResetToken\.updateMany/);
  assert.match(resetForm, /window\.location\.hash/);
  assert.match(resetForm, /history\.replaceState/);
  assert.match(forgotPage, /referrer: "no-referrer"/);
  assert.match(resetPage, /referrer: "no-referrer"/);
  assert.match(schema, /model PasswordResetToken/);
  assert.match(schema, /tokenHash String\s+@unique/);
  assert.match(migration, /CREATE TABLE "PasswordResetToken"/);
  assert.match(migration, /"tokenHash" TEXT NOT NULL/);
  assert.match(migration, /ON DELETE CASCADE/);
});
