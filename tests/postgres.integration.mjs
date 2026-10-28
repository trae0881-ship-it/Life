import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const dedicatedTestUrl = process.env.LIFE_TEST_DATABASE_URL;
assert.ok(databaseUrl, "Run this suite only through npm run test:postgres.");
assert.ok(dedicatedTestUrl, "LIFE_TEST_DATABASE_URL must identify the dedicated disposable database.");
const parsedDatabaseUrl = new URL(databaseUrl);
const parsedDedicatedTestUrl = new URL(dedicatedTestUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\/+/, ""));
const dedicatedDatabaseName = decodeURIComponent(parsedDedicatedTestUrl.pathname.replace(/^\/+/, ""));
assert.equal(databaseName, dedicatedDatabaseName, "The application URL must point at the explicitly configured test database.");
assert.equal(parsedDatabaseUrl.hostname, parsedDedicatedTestUrl.hostname);
assert.equal(parsedDatabaseUrl.port, parsedDedicatedTestUrl.port);
assert.match(databaseName, /(?:^|[_-])test$/i);
assert.doesNotMatch(databaseName, /(?:^|[_-])(?:prod|production|stage|staging)(?:[_-]|$)/i);

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5_000 });
const runId = randomUUID();
const emailPrefix = `life-it-${runId}-`;
const productSlug = `integration-${runId}`;
const createdUserIds = new Set();
const createdTables = new Set();
const createdFunctions = new Set();
const password = `Life-it-${randomUUID()}-A!9`;
const apiKeyPepper = createHash("sha256").update(`life-integration-${runId}`).digest("hex");
const birthInput = {
  fullName: "Integration Test",
  birthPlace: "Rajpura, Punjab, India",
  localDate: "1997-04-27",
  localTime: "05:45",
  timeZone: "Asia/Kolkata",
  latitude: 30.483997,
  longitude: 76.593948,
  coordinateSource: "manual-unknown",
  birthTimeAccuracy: "exact",
  ayanamsa: "Lahiri",
  houseSystem: "WholeSign",
  nodeMode: "both",
};
const profileInput = {
  localDate: birthInput.localDate,
  localTime: birthInput.localTime,
  timeZone: birthInput.timeZone,
  latitude: birthInput.latitude,
  longitude: birthInput.longitude,
};

const servers = [];
let baseUrl;

async function findAvailablePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(child, url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("The local production server exited before becoming ready.");
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill();
  throw new Error("Timed out waiting for the local production server.");
}

async function startServer(databaseConnectionString, nodeEnv = "production", importEnabled = false) {
  const port = await findAvailablePort();
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(process.cwd(), ".next", "standalone", "server.js")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseConnectionString,
      API_KEY_PEPPER: apiKeyPepper,
      LIFE_DATABASE_TRANSFER_IMPORT_ENABLED: importEnabled ? "true" : "false",
      NODE_ENV: nodeEnv,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    stdio: "ignore",
    windowsHide: true,
  });
  servers.push(child);
  await waitForServer(child, url);
  return url;
}

function cookieFrom(response) {
  const setCookie = response.headers.getSetCookie?.()[0] ?? response.headers.get("set-cookie");
  assert.ok(setCookie, "Authentication response must set a session cookie.");
  return setCookie.split(";", 1)[0];
}

async function api(pathname, { method = "GET", cookie, body, authorization } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      Origin: baseUrl,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(authorization ? { Authorization: authorization } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : null;
  return { response, json };
}

async function apiForm(pathname, { cookie, form } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { Origin: baseUrl, ...(cookie ? { Cookie: cookie } : {}) },
    body: form,
  });
  return { response, json: await response.json() };
}

async function register(email) {
  const { response, json } = await api("/api/auth/register", {
    method: "POST",
    body: { email, password, role: "ADMIN" },
  });
  assert.equal(response.status, 201, JSON.stringify(json));
  createdUserIds.add(json.user.id);
  return { user: json.user, cookie: cookieFrom(response) };
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

before(async () => {
  baseUrl = await startServer(databaseUrl);
});

after(async () => {
  try {
    for (const child of servers) {
      await stopServer(child);
    }
    if (createdUserIds.size) {
      await pool.query('DELETE FROM "ApiPlatformAuditLog" WHERE "actorUserId" = ANY($1::text[]) OR "targetId" LIKE $2', [
        [...createdUserIds], `${runId}%`,
      ]);
      await pool.query('DELETE FROM "ApiKeyAuditLog" WHERE "actorUserId" = ANY($1::text[])', [[...createdUserIds]]);
      await pool.query('DELETE FROM "ApiKey" WHERE "ownerUserId" = ANY($1::text[]) OR "createdByUserId" = ANY($1::text[])', [[...createdUserIds]]);
      await pool.query('DELETE FROM "ApiAdminPermission" WHERE "adminUserId" = ANY($1::text[]) OR "grantedByUserId" = ANY($1::text[])', [[...createdUserIds]]);
      await pool.query('DELETE FROM "ApiAccountGrant" WHERE "accountUserId" = ANY($1::text[]) OR "grantedByUserId" = ANY($1::text[])', [[...createdUserIds]]);
      if (productSlug) await pool.query('DELETE FROM "ApiProduct" WHERE slug = $1', [productSlug]);
      await pool.query(
        'DELETE FROM "User" WHERE "id" = ANY($1::text[]) OR "email" LIKE $2',
        [[...createdUserIds], `${emailPrefix}%`],
      );
    } else {
      await pool.query('DELETE FROM "User" WHERE "email" LIKE $1', [`${emailPrefix}%`]);
    }
    for (const table of createdTables) {
      await pool.query(`DROP TABLE IF EXISTS public."${table}"`);
    }
    for (const functionName of createdFunctions) {
      await pool.query(`DROP FUNCTION IF EXISTS public."${functionName}"()`);
    }
  } finally {
    await pool.end();
  }
});

async function countRows(sql, values) {
  const { rows } = await pool.query(sql, values);
  return Number(rows[0].count);
}

test("PostgreSQL-backed registration, authentication, sessions, record CRUD, ownership, validation, and rollback", async () => {
  const emailA = `${emailPrefix}a@example.test`;
  const emailB = `${emailPrefix}b@example.test`;
  const accountA = await register(emailA);
  const accountB = await register(emailB);

  const { rows: storedUsers } = await pool.query('SELECT "passwordHash", "role" FROM "User" WHERE "id" = $1', [accountA.user.id]);
  const storedA = storedUsers[0];
  assert.ok(storedA.passwordHash.startsWith("$argon2id$"));
  assert.notEqual(storedA.passwordHash, password);
  assert.equal(accountA.user.role, "USER");
  assert.equal(await countRows('SELECT count(*) AS count FROM "Session" WHERE "userId" = $1', [accountA.user.id]), 1);

  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email: emailA, password },
  });
  assert.equal(login.response.status, 200);
  const loginCookie = cookieFrom(login.response);
  assert.equal(login.json.user.id, accountA.user.id);

  const badPassword = await api("/api/auth/login", {
    method: "POST",
    body: { email: emailA, password: "wrong-password-value" },
  });
  const unknownUser = await api("/api/auth/login", {
    method: "POST",
    body: { email: `${emailPrefix}missing@example.test`, password },
  });
  assert.equal(badPassword.response.status, 401);
  assert.equal(unknownUser.response.status, 401);
  assert.deepEqual(badPassword.json, unknownUser.json);

  const currentUser = await api("/api/auth/me", { cookie: accountA.cookie });
  assert.equal(currentUser.response.status, 200);
  assert.equal(currentUser.json.user.id, accountA.user.id);
  assert.equal((await api("/api/profiles")).response.status, 401);
  assert.equal((await api("/api/saved-charts")).response.status, 401);

  const profileA = await api("/api/profiles", {
    method: "POST",
    cookie: accountA.cookie,
    body: { label: "A profile", ...profileInput },
  });
  assert.equal(profileA.response.status, 201);
  const profileB = await api("/api/profiles", {
    method: "POST",
    cookie: accountB.cookie,
    body: { label: "B profile", ...profileInput },
  });
  assert.equal(profileB.response.status, 201);

  const profileList = await api("/api/profiles", { cookie: accountA.cookie });
  assert.deepEqual(profileList.json.profiles.map((item) => item.id), [profileA.json.profile.id]);
  assert.equal((await api(`/api/profiles/${profileA.json.profile.id}`, { cookie: accountA.cookie })).response.status, 200);
  assert.equal((await api(`/api/profiles/${profileB.json.profile.id}`, { cookie: accountA.cookie })).response.status, 404);
  assert.equal((await api(`/api/profiles/${profileB.json.profile.id}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { label: "tampered by A" },
  })).response.status, 404);
  assert.equal((await api(`/api/profiles/${profileB.json.profile.id}`, { method: "DELETE", cookie: accountA.cookie })).response.status, 404);
  assert.equal((await api(`/api/profiles/missing-${runId}`, { method: "PATCH", cookie: accountA.cookie, body: { label: "missing" } })).response.status, 404);
  assert.equal((await api(`/api/profiles/missing-${runId}`, { method: "DELETE", cookie: accountA.cookie })).response.status, 404);
  assert.equal((await api(`/api/profiles/${profileB.json.profile.id}`, { cookie: accountB.cookie })).json.profile.label, "B profile");

  const dateOnlyProfile = await api("/api/profiles", {
    method: "POST",
    cookie: accountA.cookie,
    body: { label: "Date-only profile", localDate: "1997-04-27" },
  });
  assert.equal(dateOnlyProfile.response.status, 201);
  assert.deepEqual({
    birthPlace: dateOnlyProfile.json.profile.birthPlace,
    localDate: dateOnlyProfile.json.profile.localDate,
    localTime: dateOnlyProfile.json.profile.localTime,
    timeZone: dateOnlyProfile.json.profile.timeZone,
    latitude: dateOnlyProfile.json.profile.latitude,
    longitude: dateOnlyProfile.json.profile.longitude,
    birthTimeAccuracy: dateOnlyProfile.json.profile.birthTimeAccuracy,
  }, {
    birthPlace: null,
    localDate: "1997-04-27",
    localTime: null,
    timeZone: null,
    latitude: null,
    longitude: null,
    birthTimeAccuracy: null,
  });
  const partialDateOnlyProfile = await api(`/api/profiles/${dateOnlyProfile.json.profile.id}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { birthPlace: "Rajpura", localTime: "05:45", birthTimeAccuracy: "exact" },
  });
  assert.equal(partialDateOnlyProfile.response.status, 200);
  assert.equal(partialDateOnlyProfile.json.profile.localTime, "05:45");
  assert.equal(partialDateOnlyProfile.json.profile.birthPlace, "Rajpura");
  assert.equal(partialDateOnlyProfile.json.profile.timeZone, null);
  assert.equal(partialDateOnlyProfile.json.profile.birthTimeAccuracy, "exact");

  const updatedProfile = await api(`/api/profiles/${profileA.json.profile.id}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { label: "A updated profile", localTime: "06:00" },
  });
  assert.equal(updatedProfile.response.status, 200);
  assert.equal(updatedProfile.json.profile.label, "A updated profile");
  assert.equal(updatedProfile.json.profile.localTime, "06:00");
  const labelOnlyUpdate = await api(`/api/profiles/${profileA.json.profile.id}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { label: "A label-only update" },
  });
  assert.equal(labelOnlyUpdate.response.status, 200);
  assert.equal(labelOnlyUpdate.json.profile.localDate, profileInput.localDate);
  assert.equal(labelOnlyUpdate.json.profile.localTime, "06:00");
  assert.equal(labelOnlyUpdate.json.profile.timeZone, profileInput.timeZone);
  assert.equal(labelOnlyUpdate.json.profile.latitude, profileInput.latitude);
  assert.equal(labelOnlyUpdate.json.profile.longitude, profileInput.longitude);
  assert.equal(labelOnlyUpdate.json.profile.label, "A label-only update");
  assert.equal((await api("/api/profiles", { method: "POST", cookie: accountA.cookie, body: { label: "Invalid", ...profileInput, latitude: 91 } })).response.status, 422);
  assert.equal((await api(`/api/profiles/missing-${runId}`, { cookie: accountA.cookie })).response.status, 404);
  const missingChartDetails = await api("/api/charts", { method: "POST", body: { localDate: "1997-04-27" } });
  assert.equal(missingChartDetails.response.status, 422);
  assert.equal(missingChartDetails.json.code, "MISSING_CHART_DETAILS");

  const savedA = await api("/api/saved-charts", {
    method: "POST",
    cookie: accountA.cookie,
    body: { title: "A integration chart", profileId: profileA.json.profile.id, input: birthInput },
  });
  assert.equal(savedA.response.status, 201);
  const mismatchLink = await api(`/api/saved-charts/${savedA.json.chart.id}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { profileId: dateOnlyProfile.json.profile.id },
  });
  assert.equal(mismatchLink.response.status, 422);
  assert.equal(mismatchLink.json.code, "PROFILE_CHART_MISMATCH");
  assert.equal((await api("/api/saved-charts", {
    method: "POST",
    cookie: accountA.cookie,
    body: { title: "", input: birthInput },
  })).response.status, 422);
  const savedB = await api("/api/saved-charts", {
    method: "POST",
    cookie: accountB.cookie,
    body: { title: "B integration chart", profileId: profileB.json.profile.id, input: birthInput },
  });
  assert.equal(savedB.response.status, 201);
  const chartIdA = savedA.json.chart.id;
  const chartIdB = savedB.json.chart.id;

  const chartList = await api("/api/saved-charts", { cookie: accountA.cookie });
  assert.deepEqual(chartList.json.charts.map((item) => item.id), [chartIdA]);
  const chartGet = await api(`/api/saved-charts/${chartIdA}`, { cookie: accountA.cookie });
  assert.equal(chartGet.response.status, 200);
  assert.equal(chartGet.json.chart.result.provenance.resultHash, savedA.json.chart.resultHash);
  assert.equal((await api(`/api/saved-charts/${chartIdB}`, { cookie: accountA.cookie })).response.status, 404);
  assert.equal((await api(`/api/saved-charts/${chartIdB}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { title: "tampered by A" },
  })).response.status, 404);
  assert.equal((await api(`/api/saved-charts/${chartIdB}`, { method: "DELETE", cookie: accountA.cookie })).response.status, 404);
  assert.equal((await api(`/api/saved-charts/${chartIdB}`, { cookie: accountB.cookie })).json.chart.title, "B integration chart");
  assert.equal((await api(`/api/saved-charts/missing-${runId}`, { cookie: accountA.cookie })).response.status, 404);
  assert.equal((await api(`/api/saved-charts/missing-${runId}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { title: "missing" },
  })).response.status, 404);
  assert.equal((await api(`/api/saved-charts/missing-${runId}`, { method: "DELETE", cookie: accountA.cookie })).response.status, 404);
  assert.equal((await api(`/api/saved-charts/${chartIdA}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { profileId: profileB.json.profile.id },
  })).response.status, 404);

  const updatedChart = await api(`/api/saved-charts/${chartIdA}`, {
    method: "PATCH",
    cookie: accountA.cookie,
    body: { title: "A updated chart" },
  });
  assert.equal(updatedChart.response.status, 200);
  assert.equal(updatedChart.json.chart.title, "A updated chart");
  assert.equal((await api(`/api/saved-charts/${chartIdA}`, { method: "DELETE", cookie: accountA.cookie })).response.status, 200);
});

test("PostgreSQL-backed roles, API key lifecycle, quotas, transfer preview, and setup authorization", async () => {
  const superAdmin = await register(`${emailPrefix}root@example.test`);
  const admin = await register(`${emailPrefix}admin@example.test`);
  const developerA = await register(`${emailPrefix}developer-a@example.test`);
  const developerB = await register(`${emailPrefix}developer-b@example.test`);
  const viewer = await register(`${emailPrefix}viewer@example.test`);
  const roleUsers = [
    [superAdmin.user.id, "SUPER_ADMIN"],
    [admin.user.id, "ADMIN"],
    [developerA.user.id, "DEVELOPER"],
    [developerB.user.id, "DEVELOPER"],
    [viewer.user.id, "USER"],
  ];
  for (const [userId, role] of roleUsers) {
    await pool.query('UPDATE "User" SET role = $1::"UserRole" WHERE id = $2', [role, userId]);
  }

  assert.equal((await api("/api/super-admin/database", { cookie: admin.cookie })).response.status, 403);
  assert.equal((await api("/api/super-admin/database", { cookie: viewer.cookie })).response.status, 403);
  assert.equal((await api("/api/super-admin/database")).response.status, 401);
  const initializedStatus = await api("/api/super-admin/database", { cookie: superAdmin.cookie });
  assert.equal(initializedStatus.response.status, 200);
  assert.equal(initializedStatus.json.state, "initialized");
  assert.equal((await api("/api/platform/keys", { cookie: viewer.cookie })).response.status, 403);
  assert.equal((await api("/api/platform/products", { cookie: developerA.cookie, method: "POST", body: {} })).response.status, 403);

  const productResult = await api("/api/platform/products", {
    method: "POST",
    cookie: superAdmin.cookie,
    body: {
      slug: productSlug,
      name: "Integration test product",
      description: "Disposable PostgreSQL integration test product.",
      endpoints: ["GET /api/developer/test"],
      defaultRequestsPerMinute: 20,
      defaultDailyQuota: 100,
      defaultMonthlyQuota: 1000,
    },
  });
  assert.equal(productResult.response.status, 201, JSON.stringify(productResult.json));
  const productId = productResult.json.product.id;

  for (const developer of [developerA, developerB]) {
    const grantResult = await api("/api/platform/grants", {
      method: "POST",
      cookie: superAdmin.cookie,
      body: {
        accountUserId: developer.user.id,
        productId,
        scopes: ["GET /api/developer/test"],
        requestsPerMinute: 20,
        dailyQuota: 10,
        monthlyQuota: 100,
        enabled: true,
      },
    });
    assert.equal(grantResult.response.status, 201, JSON.stringify(grantResult.json));
  }

  const permissionResult = await api("/api/platform/permissions", {
    method: "POST",
    cookie: superAdmin.cookie,
    body: {
      adminUserId: admin.user.id,
      productId,
      scopes: ["GET /api/developer/test"],
      maxRequestsPerMinute: 5,
      maxDailyQuota: 1,
      maxMonthlyQuota: 10,
      canManageAccess: true,
      enabled: true,
    },
  });
  assert.equal(permissionResult.response.status, 201, JSON.stringify(permissionResult.json));

  const attemptedAdminKey = await api("/api/platform/keys", {
    method: "POST",
    cookie: admin.cookie,
    body: {
      ownerUserId: developerA.user.id,
      productId,
      label: "admin-over-limit",
      scopes: ["GET /api/developer/test"],
      requestsPerMinute: 2,
      dailyQuota: 2,
      monthlyQuota: 10,
    },
  });
  assert.equal(attemptedAdminKey.response.status, 403);

  const adminKey = await api("/api/platform/keys", {
    method: "POST",
    cookie: admin.cookie,
    body: {
      ownerUserId: developerA.user.id,
      productId,
      label: "admin-within-ceiling",
      scopes: ["GET /api/developer/test"],
      requestsPerMinute: 1,
      dailyQuota: 1,
      monthlyQuota: 10,
    },
  });
  assert.equal(adminKey.response.status, 201, JSON.stringify(adminKey.json));
  assert.equal((await api(`/api/platform/keys/${adminKey.json.key.keyId}`, { cookie: developerB.cookie })).response.status, 404);

  const ownershipAttempt = await api("/api/platform/keys", {
    method: "POST",
    cookie: developerA.cookie,
    body: {
      ownerUserId: developerB.user.id,
      productId,
      label: "other-account",
      scopes: ["GET /api/developer/test"],
      requestsPerMinute: 1,
      dailyQuota: 1,
      monthlyQuota: 1,
    },
  });
  assert.equal(ownershipAttempt.response.status, 403);

  const keyResult = await api("/api/platform/keys", {
    method: "POST",
    cookie: developerA.cookie,
    body: {
      ownerUserId: developerA.user.id,
      productId,
      label: "lifecycle",
      scopes: ["GET /api/developer/test"],
      requestsPerMinute: 10,
      dailyQuota: 10,
      monthlyQuota: 100,
    },
  });
  assert.equal(keyResult.response.status, 201, JSON.stringify(keyResult.json));
  const originalSecret = keyResult.json.secret;
  const keyId = keyResult.json.key.keyId;
  assert.ok(originalSecret);
  const { rows: keyRows } = await pool.query('SELECT digest FROM "ApiKey" WHERE "keyId" = $1', [keyId]);
  assert.equal(keyRows.length, 1);
  assert.notEqual(keyRows[0].digest, originalSecret);
  assert.equal((await api(`/api/platform/keys/${keyId}`, { cookie: developerB.cookie })).response.status, 404);
  const developerKeys = await api("/api/platform/keys", { cookie: developerA.cookie });
  assert.deepEqual(
    new Set(developerKeys.json.keys.map((key) => key.keyId)),
    new Set([keyId, adminKey.json.key.keyId]),
  );
  assert.ok(developerKeys.json.keys.every((key) => !Object.hasOwn(key, "secret")));

  await stopServer(servers.at(-1));
  baseUrl = await startServer(databaseUrl);
  const firstAuth = await api("/api/developer/test", { authorization: `Bearer ${originalSecret}` });
  assert.equal(firstAuth.response.status, 200, JSON.stringify(firstAuth.json));
  assert.equal(firstAuth.json.authenticated, true);
  assert.equal((await api("/api/developer/test", { authorization: "Bearer life_live_invalid_invalidsecretvalue" })).response.status, 401);
  assert.equal((await api("/api/health", { authorization: `Bearer ${originalSecret}` })).response.status, 403);

  const rotated = await api(`/api/platform/keys/${keyId}`, {
    method: "POST",
    cookie: developerA.cookie,
    body: {},
  });
  assert.equal(rotated.response.status, 201, JSON.stringify(rotated.json));
  assert.equal((await api("/api/developer/test", { authorization: `Bearer ${originalSecret}` })).response.status, 401);
  const rotatedSecret = rotated.json.secret;
  const rotatedKeyId = rotated.json.key.keyId;
  assert.equal((await api("/api/developer/test", { authorization: `Bearer ${rotatedSecret}` })).response.status, 200);

  const expiring = await api("/api/platform/keys", {
    method: "POST",
    cookie: developerA.cookie,
    body: {
      ownerUserId: developerA.user.id,
      productId,
      label: "expires",
      scopes: ["GET /api/developer/test"],
      requestsPerMinute: 10,
      dailyQuota: 10,
      monthlyQuota: 100,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  assert.equal(expiring.response.status, 201);
  await pool.query('UPDATE "ApiKey" SET "expiresAt" = NOW() - INTERVAL \'1 second\' WHERE "keyId" = $1', [expiring.json.key.keyId]);
  assert.equal((await api("/api/developer/test", { authorization: `Bearer ${expiring.json.secret}` })).response.status, 401);

  const quotaKeyA = await api("/api/platform/keys", {
    method: "POST",
    cookie: developerB.cookie,
    body: {
      ownerUserId: developerB.user.id,
      productId,
      label: "quota-a",
      scopes: ["GET /api/developer/test"],
      requestsPerMinute: 10,
      dailyQuota: 1,
      monthlyQuota: 10,
    },
  });
  const quotaKeyB = await api("/api/platform/keys", {
    method: "POST",
    cookie: developerB.cookie,
    body: {
      ownerUserId: developerB.user.id,
      productId,
      label: "quota-b",
      scopes: ["GET /api/developer/test"],
      requestsPerMinute: 10,
      dailyQuota: 1,
      monthlyQuota: 10,
    },
  });
  assert.equal(quotaKeyA.response.status, 201);
  assert.equal(quotaKeyB.response.status, 201);
  await pool.query(
    'UPDATE "ApiAccountGrant" SET "dailyQuota" = 1 WHERE "accountUserId" = $1 AND "productId" = $2',
    [developerB.user.id, productId],
  );
  assert.equal((await api("/api/developer/test", { authorization: `Bearer ${quotaKeyA.json.secret}` })).response.status, 200);
  assert.equal((await api("/api/developer/test", { authorization: `Bearer ${quotaKeyA.json.secret}` })).response.status, 429);
  assert.equal((await api("/api/developer/test", { authorization: `Bearer ${quotaKeyB.json.secret}` })).response.status, 429);

  const revoke = await api(`/api/platform/keys/${rotatedKeyId}`, { method: "DELETE", cookie: developerA.cookie });
  assert.equal(revoke.response.status, 200);
  assert.equal((await api("/api/developer/test", { authorization: `Bearer ${rotatedSecret}` })).response.status, 401);

  const exportDenied = await api("/api/super-admin/database/export", {
    method: "POST",
    cookie: admin.cookie,
    body: { tables: ["ApiProduct"], format: "jsonl", includeSensitive: false },
  });
  assert.equal(exportDenied.response.status, 403);
  const sensitiveExport = await api("/api/super-admin/database/export", {
    method: "POST",
    cookie: superAdmin.cookie,
    body: {
      tables: ["User"],
      format: "jsonl",
      includeSensitive: true,
      confirmSensitive: "EXPORT SENSITIVE DATA",
    },
  });
  assert.equal(sensitiveExport.response.status, 200);
  const userJsonl = await sensitiveExport.response.text();
  assert.match(userJsonl, new RegExp(emailPrefix));
  assert.doesNotMatch(userJsonl, /passwordHash|resetToken|sessionToken/);
  assert.doesNotMatch(userJsonl, new RegExp(password));

  const formulaTable = `LifeFormulaIT_${runId.replaceAll("-", "")}`;
  createdTables.add(formulaTable);
  await pool.query(`CREATE TABLE public."${formulaTable}" ("id" text PRIMARY KEY, "value" text NOT NULL)`);
  await pool.query(`INSERT INTO public."${formulaTable}" ("id", "value") VALUES ($1, $2)`, [
    "formula",
    "=HYPERLINK(\"https://example.test\",\"open\")",
  ]);
  const formulaExport = await api("/api/super-admin/database/export", {
    method: "POST",
    cookie: superAdmin.cookie,
    body: { tables: [formulaTable], format: "csv", includeSensitive: false },
  });
  assert.equal(formulaExport.response.status, 200);
  assert.match(await formulaExport.response.text(), /"'=HYPERLINK/);

  const exported = await api("/api/super-admin/database/export", {
    method: "POST",
    cookie: superAdmin.cookie,
    body: { tables: ["ApiProduct"], format: "csv", includeSensitive: false },
  });
  assert.equal(exported.response.status, 200);
  assert.match(exported.response.headers.get("content-disposition"), /attachment/);
  assert.match(exported.response.headers.get("cache-control"), /no-store/);
  assert.ok(Date.parse(exported.response.headers.get("x-transfer-expires-at")) > Date.now());
  const csv = await exported.response.text();
  assert.match(csv, /slug/);
  assert.match(csv, new RegExp(productSlug));

  const transferTable = `LifeTransferIT_${runId.replaceAll("-", "")}`;
  createdTables.add(transferTable);
  await pool.query(`CREATE TABLE public."${transferTable}" ("id" text PRIMARY KEY, "value" text NOT NULL)`);
  const serializeImport = (table, columns, rows) => [
    JSON.stringify({ _lifeExport: { format: "life-jsonl-v1", tables: [{ name: table, columns }] } }),
    ...rows.map((row) => JSON.stringify({ _table: table, row })),
    "",
  ].join("\n");
  const importColumns = [
    { name: "id", type: "text", nullable: false },
    { name: "value", type: "text", nullable: false },
  ];
  const importJsonl = serializeImport(transferTable, importColumns, [{ id: "one", value: "integration import" }]);
  const importDenied = await apiForm("/api/super-admin/database/import", {
    cookie: admin.cookie,
    form: (() => {
      const form = new FormData();
      form.append("action", "preview");
      form.append("file", new File([importJsonl], "integration.jsonl", { type: "application/x-ndjson" }));
      return form;
    })(),
  });
  assert.equal(importDenied.response.status, 403);
  const previewForm = new FormData();
  previewForm.append("action", "preview");
  previewForm.append("file", new File([importJsonl], "integration.jsonl", { type: "application/x-ndjson" }));
  const importPreview = await apiForm("/api/super-admin/database/import", { cookie: superAdmin.cookie, form: previewForm });
  assert.equal(importPreview.response.status, 200, JSON.stringify(importPreview.json));
  assert.equal(importPreview.json.preview.compatible, true);
  assert.equal(await countRows(`SELECT count(*) AS count FROM public."${transferTable}"`, []), 0);

  const duplicateJsonl = serializeImport(transferTable, importColumns, [
    { id: "duplicate", value: "first" },
    { id: "duplicate", value: "second" },
  ]);
  const duplicateForm = new FormData();
  duplicateForm.append("action", "preview");
  duplicateForm.append("file", new File([duplicateJsonl], "duplicate.jsonl", { type: "application/x-ndjson" }));
  const duplicatePreview = await apiForm("/api/super-admin/database/import", { cookie: superAdmin.cookie, form: duplicateForm });
  assert.equal(duplicatePreview.response.status, 200);
  assert.equal(duplicatePreview.json.preview.compatible, false);
  assert.match(duplicatePreview.json.preview.issues.join(" "), /Duplicate primary key/);

  const referenceTable = `LifeTransferRef_${runId.replaceAll("-", "")}`;
  const referencingTable = `LifeTransferFk_${runId.replaceAll("-", "")}`;
  createdTables.add(referencingTable);
  createdTables.add(referenceTable);
  await pool.query(`CREATE TABLE public."${referenceTable}" ("id" text PRIMARY KEY)`);
  await pool.query(`CREATE TABLE public."${referencingTable}" ("id" text PRIMARY KEY, "referenceId" text NOT NULL REFERENCES public."${referenceTable}"("id"))`);
  const foreignKeyJsonl = serializeImport(referencingTable, [
    { name: "id", type: "text", nullable: false },
    { name: "referenceId", type: "text", nullable: false },
  ], [{ id: "child", referenceId: "missing-parent" }]);
  const foreignKeyForm = new FormData();
  foreignKeyForm.append("action", "preview");
  foreignKeyForm.append("file", new File([foreignKeyJsonl], "foreign-key.jsonl", { type: "application/x-ndjson" }));
  const foreignKeyPreview = await apiForm("/api/super-admin/database/import", { cookie: superAdmin.cookie, form: foreignKeyForm });
  assert.equal(foreignKeyPreview.response.status, 200);
  assert.equal(foreignKeyPreview.json.preview.compatible, false);
  assert.match(foreignKeyPreview.json.preview.issues.join(" "), /references missing target rows/);

  const disabledCommitForm = new FormData();
  disabledCommitForm.append("action", "commit");
  disabledCommitForm.append("confirmTarget", databaseName);
  disabledCommitForm.append("confirmImport", "IMPORT");
  disabledCommitForm.append("file", new File([importJsonl], "integration.jsonl", { type: "application/x-ndjson" }));
  const disabledCommit = await apiForm("/api/super-admin/database/import", {
    cookie: superAdmin.cookie,
    form: disabledCommitForm,
  });
  assert.equal(disabledCommit.response.status, 403);
  assert.equal(disabledCommit.json.code, "IMPORT_COMMIT_DISABLED");
  assert.equal(await countRows(`SELECT count(*) AS count FROM public."${transferTable}"`, []), 0);

  const triggerFunction = `LifeTransferFail_${runId.replaceAll("-", "")}`;
  createdFunctions.add(triggerFunction);
  const triggerName = `${triggerFunction}_trigger`;
  await pool.query(`
    CREATE FUNCTION public."${triggerFunction}"() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW."value" = 'force-failure' THEN RAISE EXCEPTION 'synthetic integration failure'; END IF;
      RETURN NEW;
    END
    $$
  `);
  await pool.query(`CREATE TRIGGER "${triggerName}" BEFORE INSERT ON public."${transferTable}" FOR EACH ROW EXECUTE FUNCTION public."${triggerFunction}"()`);
  await stopServer(servers.at(-1));
  baseUrl = await startServer(databaseUrl, "test", true);
  const failureJsonl = serializeImport(transferTable, importColumns, [{ id: "rollback", value: "force-failure" }]);
  const failureForm = new FormData();
  failureForm.append("action", "commit");
  failureForm.append("confirmTarget", databaseName);
  failureForm.append("confirmImport", "IMPORT");
  failureForm.append("file", new File([failureJsonl], "rollback.jsonl", { type: "application/x-ndjson" }));
  const failedImport = await apiForm("/api/super-admin/database/import", { cookie: superAdmin.cookie, form: failureForm });
  assert.equal(failedImport.response.status, 409);
  assert.equal(failedImport.json.result.committed, false);
  assert.equal(await countRows(`SELECT count(*) AS count FROM public."${transferTable}"`, []), 0);
  await pool.query(`DROP TRIGGER "${triggerName}" ON public."${transferTable}"`);

  const successfulCommitForm = new FormData();
  successfulCommitForm.append("action", "commit");
  successfulCommitForm.append("confirmTarget", databaseName);
  successfulCommitForm.append("confirmImport", "IMPORT");
  successfulCommitForm.append("file", new File([importJsonl], "success.jsonl", { type: "application/x-ndjson" }));
  const successfulImport = await apiForm("/api/super-admin/database/import", {
    cookie: superAdmin.cookie,
    form: successfulCommitForm,
  });
  assert.equal(successfulImport.response.status, 200, JSON.stringify(successfulImport.json));
  assert.equal(successfulImport.json.result.committed, true);
  assert.equal(await countRows(`SELECT count(*) AS count FROM public."${transferTable}"`, []), 1);
  const conflictingCommitForm = new FormData();
  conflictingCommitForm.append("action", "commit");
  conflictingCommitForm.append("confirmTarget", databaseName);
  conflictingCommitForm.append("confirmImport", "IMPORT");
  conflictingCommitForm.append("file", new File([importJsonl], "conflict.jsonl", { type: "application/x-ndjson" }));
  const conflictingCommit = await apiForm("/api/super-admin/database/import", {
    cookie: superAdmin.cookie,
    form: conflictingCommitForm,
  });
  assert.equal(conflictingCommit.response.status, 409);
  assert.equal(conflictingCommit.json.result.committed, false);
  assert.equal(await countRows(`SELECT count(*) AS count FROM public."${transferTable}"`, []), 1);

  const { rows: auditRows } = await pool.query(
    'SELECT action FROM "ApiKeyAuditLog" WHERE "actorUserId" = ANY($1::text[])',
    [[superAdmin.user.id, admin.user.id, developerA.user.id, developerB.user.id]],
  );
  const auditActions = new Set(auditRows.map((row) => row.action));
  for (const action of ["CREATED", "ROTATED", "REVOKED"]) assert.ok(auditActions.has(action), `missing ${action} API-key audit`);
  const { rows: transferAudits } = await pool.query(
    'SELECT action FROM "ApiPlatformAuditLog" WHERE "actorUserId" = $1 AND "action" LIKE \'DATABASE_%\'',
    [superAdmin.user.id],
  );
  assert.ok(transferAudits.some((row) => row.action === "DATABASE_EXPORT_COMPLETED"));
  assert.ok(transferAudits.some((row) => row.action === "DATABASE_IMPORT_PREVIEW"));
  assert.ok(transferAudits.some((row) => row.action === "DATABASE_IMPORT_FAILED"));
  assert.ok(transferAudits.some((row) => row.action === "DATABASE_IMPORT_COMPLETED"));
  assert.equal((await api(`/api/saved-charts/${chartIdA}`, { cookie: accountA.cookie })).response.status, 404);
  assert.equal((await api(`/api/profiles/${profileA.json.profile.id}`, { method: "DELETE", cookie: accountA.cookie })).response.status, 200);
  assert.equal((await api(`/api/profiles/${profileA.json.profile.id}`, { cookie: accountA.cookie })).response.status, 404);

  const expiredToken = accountA.cookie.split("=", 2)[1];
  await pool.query('UPDATE "Session" SET "expiresAt" = $1 WHERE "tokenHash" = $2', [
    new Date(0),
    createHash("sha256").update(expiredToken).digest("hex"),
  ]);
  assert.equal((await api("/api/auth/me", { cookie: accountA.cookie })).json.user, null);

  const logout = await api("/api/auth/logout", { method: "POST", cookie: loginCookie });
  assert.equal(logout.response.status, 200);
  assert.equal((await api("/api/auth/me", { cookie: loginCookie })).json.user, null);

  const rejectedRegistration = await api("/api/auth/register", {
    method: "POST",
    body: { email: emailA, password },
  });
  assert.equal(rejectedRegistration.response.status, 409);
  assert.equal(await countRows('SELECT count(*) AS count FROM "User" WHERE "email" = $1', [emailA]), 1);
  assert.equal(await countRows('SELECT count(*) AS count FROM "Session" WHERE "userId" = $1', [accountA.user.id]), 1);

  const rollbackEmail = `${emailPrefix}rollback@example.test`;
  const rollbackId = `rollback-${runId}`;
  const transaction = await pool.connect();
  try {
    await transaction.query("BEGIN");
    await transaction.query(
      'INSERT INTO "User" ("id", "email", "passwordHash", "updatedAt") VALUES ($1, $2, $3, NOW())',
      [rollbackId, rollbackEmail, "test-only-hash"],
    );
    await transaction.query("ROLLBACK");
  } catch (error) {
    await transaction.query("ROLLBACK");
    throw error;
  } finally {
    transaction.release();
  }
  assert.equal(await countRows('SELECT count(*) AS count FROM "User" WHERE "email" = $1', [rollbackEmail]), 0);
});

test("database connection failures return a generic service error without exposing connection details", async () => {
  const unavailableUrl = new URL(databaseUrl);
  unavailableUrl.hostname = "127.0.0.1";
  unavailableUrl.port = String(await findAvailablePort());
  const primaryUrl = baseUrl;
  baseUrl = await startServer(unavailableUrl.toString());
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: { email: "valid@example.test", password },
    });
    assert.equal(result.response.status, 503);
    assert.equal(result.json.code, "AUTH_UNAVAILABLE");
    assert.doesNotMatch(JSON.stringify(result.json), /postgres(?:ql)?:\/\/|password|127\.0\.0\.1/i);
  } finally {
    baseUrl = primaryUrl;
  }
});
