import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPublicSiteOrigin } from "../src/server/seo-management.ts";

const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
const railway = JSON.parse(readFileSync(new URL("../railway.json", import.meta.url), "utf8"));
const dockerCi = readFileSync(new URL("../.github/workflows/docker-ci.yml", import.meta.url), "utf8");
const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
const deploymentDocs = readFileSync(new URL("../docs/DEPLOYMENT_RAILWAY.md", import.meta.url), "utf8");
const authHttp = readFileSync(new URL("../src/server/http.ts", import.meta.url), "utf8");
const passwordEmail = readFileSync(new URL("../src/server/password-reset-email.ts", import.meta.url), "utf8");
const developerPortal = readFileSync(new URL("../src/app/developers/page.tsx", import.meta.url), "utf8");
const apiDashboard = readFileSync(new URL("../src/app/ApiPlatformDashboard.tsx", import.meta.url), "utf8");

test("Railway container binds the standalone server to all interfaces and uses the readiness check", () => {
  assert.match(dockerfile, /^ENV HOSTNAME=0\.0\.0\.0$/m);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
  assert.equal(railway.build.builder, "DOCKERFILE");
  assert.equal(railway.deploy.healthcheckPath, "/api/health");
});

test("Docker CI verifies the isolated container without deployment credentials or deploy steps", () => {
  assert.match(dockerCi, /pull_request:/);
  assert.match(dockerCi, /branches:\s*\n\s+- main/);
  assert.match(dockerCi, /npm test/);
  assert.match(dockerCi, /npx tsc --noEmit/);
  assert.match(dockerCi, /docker build/);
  assert.match(dockerCi, /127\.0\.0\.1:1\/ci/);
  assert.match(dockerCi, /api\/health/);
  assert.match(dockerCi, /api\/locations/);
  assert.match(dockerCi, /shards\.length !== 620/);
  assert.doesNotMatch(dockerCi, /railway up|railway deploy|DATABASE_URL:\s*\$\{\{\s*secrets\./i);
});

test("Git ignore excludes local database files and secret env files but preserves examples", () => {
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(gitignore, /^!\.env\.test\.example$/m);
  assert.match(gitignore, /^\*\.db$/m);
  assert.match(gitignore, /^\*\.sqlite$/m);
  assert.match(gitignore, /^\*\.sqlite3$/m);
  assert.match(gitignore, /^\.next\/$/m);
  assert.match(gitignore, /^node_modules\/$/m);
});

test("production public origins and password-reset links reject localhost and require HTTPS", () => {
  assert.equal(getPublicSiteOrigin({ LIFE_PUBLIC_APP_URL: "https://life.example", NODE_ENV: "production" }), "https://life.example");
  assert.equal(getPublicSiteOrigin({ LIFE_PUBLIC_APP_URL: "http://life.example", NODE_ENV: "production" }), null);
  assert.equal(getPublicSiteOrigin({ LIFE_PUBLIC_APP_URL: "http://localhost:3000", NODE_ENV: "production" }), null);
  assert.equal(getPublicSiteOrigin({ LIFE_PUBLIC_APP_URL: "http://localhost:3000", NODE_ENV: "development" }), "http://localhost:3000");
  assert.match(passwordEmail, /environment\.NODE_ENV === "production"/);
  assert.match(authHttp, /__Host-life_session/);
  assert.match(authHttp, /HttpOnly; SameSite=Lax/);
  assert.match(authHttp, /; Secure/);
});

test("deployment docs list variable names and application-facing Developer examples do not use localhost", () => {
  for (const name of ["DATABASE_URL", "LIFE_PUBLIC_APP_URL", "API_KEY_PEPPER", "RESEND_API_KEY", "LIFE_EMAIL_FROM", "PORT", "LIFE_TRUST_PROXY_HEADERS"]) {
    assert.ok(deploymentDocs.includes(`\`${name}\``), `deployment checklist documents ${name}`);
  }
  assert.doesNotMatch(developerPortal, /localhost|127\.0\.0\.1/);
  assert.doesNotMatch(apiDashboard, /localhost|127\.0\.0\.1/);
  assert.match(deploymentDocs, /internal local audit target is not used for public links/);
  assert.match(deploymentDocs, /No real Developer session, provider configuration, Linux container run/);
});
