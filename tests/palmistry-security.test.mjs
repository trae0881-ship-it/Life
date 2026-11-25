import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Palmistry data has owner-only RLS policies and is registered as sensitive", () => {
  const migration = source("../prisma/migrations/20261124140000_palmistry_records/migration.sql");
  const initialization = source("../src/server/database-initialization.ts");
  const transfer = source("../src/server/database-transfer.ts");
  for (const command of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.match(migration, new RegExp(`FOR ${command}`));
  }
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /FORCE ROW LEVEL SECURITY/);
  assert.equal((migration.match(/current_setting\('life\.user_id', true\)/g) ?? []).length, 5);
  assert.match(initialization, /"20261124140000_palmistry_records"/);
  assert.match(initialization, /"PalmistryRecord"/);
  assert.match(transfer, /"PalmistryRecord"/);
});

test("Palmistry APIs authenticate, scope every query to the session owner, and protect mutations", () => {
  const routes = [
    "../src/app/api/palmistry/route.ts",
    "../src/app/api/palmistry/original/route.ts",
    "../src/app/api/palmistry/questions/route.ts",
  ].map(source);
  for (const route of routes) assert.match(route, /getUserFromRequest\(request\)/);
  for (const route of [routes[0], routes[2]]) assert.match(route, /isSameOriginMutation\(request\)/);
  for (const route of routes) assert.match(route, /withUserScopedDatabase\(user\.id/);
  assert.match(routes[0], /where: \{ userId: user\.id \}/);
  assert.match(routes[0], /deleteMany\(\{\s*where: \{ userId: user\.id \}/);
  assert.match(routes[1], /Content-Disposition.*attachment/);
  assert.match(routes[1], /Cache-Control.*private, no-store/);
  assert.match(routes[1], /X-Content-Type-Options.*nosniff/);
  assert.match(routes[2], /answerPalmistryQuestion\(observations, body\.questionId/);
  assert.doesNotMatch(routes[2], /savedChart|kundliQuestion|fetch\(/i);
});

test("Palmistry does not send images or question data to external AI services or create temporary files", () => {
  const files = [
    "../src/app/api/palmistry/route.ts",
    "../src/app/api/palmistry/original/route.ts",
    "../src/app/api/palmistry/questions/route.ts",
    "../src/presentation/palmistry-assistant.ts",
  ].map(source);
  for (const file of files) {
    assert.doesNotMatch(file, /openai|anthropic|gemini|axios|fetch\(["']https?:|writeFile|mkdtemp|tmpdir|createWriteStream/i);
  }
});
