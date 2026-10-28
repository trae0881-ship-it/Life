import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { safeDeveloperReturnTo, safeDeveloperSignupReturnTo } from "../src/server/developer-auth-redirect.ts";

const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Developer redirects use the Developer dashboard by default and reject unsafe or auth-loop destinations", () => {
  assert.equal(safeDeveloperReturnTo(undefined), "/developers/dashboard");
  assert.equal(safeDeveloperReturnTo("/developers/dashboard?tab=keys"), "/developers/dashboard?tab=keys");
  assert.equal(safeDeveloperReturnTo("/dashboard"), "/dashboard");
  for (const destination of [
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "/%2f%2fattacker.example",
    "/developer/login",
    "/developer/signup",
    "/signup",
  ]) {
    assert.equal(safeDeveloperReturnTo(destination), "/developers/dashboard", destination);
  }
});

test("Developer signup preserves safe internal destinations but never redirects new USER accounts to protected Developer pages", () => {
  assert.equal(safeDeveloperSignupReturnTo(undefined), "/developers?access=approval-required");
  assert.equal(safeDeveloperSignupReturnTo("/developers?tab=docs"), "/developers?tab=docs");
  for (const destination of [
    "/developers/dashboard",
    "/developers/dashboard?tab=keys",
    "/developers/dashboard/keys",
    "/developer/login",
    "/developer/signup",
    "https://attacker.example",
    "//attacker.example",
  ]) {
    assert.equal(safeDeveloperSignupReturnTo(destination), "/developers?access=approval-required", destination);
  }
});

test("Developer login and signup routes remain separate from ordinary auth routes", () => {
  const login = source("src/app/developer/login/page.tsx");
  const signup = source("src/app/developer/signup/page.tsx");
  const ordinaryLogin = source("src/app/login/page.tsx");
  const ordinarySignup = source("src/app/signup/page.tsx");
  const experience = source("src/app/login/LoginExperience.tsx");

  assert.match(login, /safeDeveloperReturnTo/);
  assert.match(login, /portal="developer"/);
  assert.match(login, /user\?\.role === "DEVELOPER"/);
  assert.match(signup, /initialMode="register"/);
  assert.match(signup, /approval-required/);
  assert.match(signup, /safeDeveloperSignupReturnTo/);
  assert.match(signup, /user\?\.role === "DEVELOPER"[\s\S]*safeDeveloperReturnTo/);
  assert.match(ordinaryLogin, /return <LoginExperience returnTo=\{destination\} \/>/);
  assert.match(ordinarySignup, /initialMode="register"/);
  assert.match(experience, /\/developer\/signup/);
  assert.match(experience, /\/developer\/login/);
  assert.match(experience, /\/developer\/login\?next=%2Fdevelopers%2Fdashboard/);
  assert.match(experience, /`\/developer\/signup\?next=\$\{encodeURIComponent\(returnTo\)\}`/);
  assert.match(experience, /Developer permissions and API product access are assigned separately/);
});

test("Developer login authorization is checked before a session is issued; registration remains USER-only", () => {
  const loginApi = source("src/app/api/auth/login/route.ts");
  const authCore = source("src/server/auth-core.ts");
  const dashboard = source("src/app/developers/dashboard/page.tsx");
  const accountPanel = source("src/app/AccountPanel.tsx");
  const registrationApi = source("src/app/api/auth/register/route.ts");
  const logoutApi = source("src/app/api/auth/logout/route.ts");
  const sessionApi = source("src/app/api/auth/me/route.ts");

  assert.match(loginApi, /body\.portal === "developer" && user\.role !== "DEVELOPER"/);
  assert.ok(loginApi.indexOf("body.portal === \"developer\"") < loginApi.indexOf("createSession(user.id"), "role authorization precedes session creation");
  assert.match(loginApi, /"DEVELOPER_REQUIRED"/);
  assert.match(dashboard, /\/developer\/login\?next=%2Fdevelopers%2Fdashboard/);
  assert.match(dashboard, /user\.role !== "DEVELOPER"/);
  assert.match(accountPanel, /authPortal === "developer"/);
  assert.match(accountPanel, /portal: mode === "login"/);
  assert.match(registrationApi, /registerAccountWithSession/);
  assert.doesNotMatch(registrationApi, /DEVELOPER_REQUIRED|role:\s*"DEVELOPER"/);
  assert.match(authCore, /role: "USER"/);
  for (const route of [loginApi, registrationApi, logoutApi, sessionApi]) {
    assert.match(route, /logAuthServiceError/);
  }
});

test("Developer portal explains approval and links to the dedicated auth routes", () => {
  const portal = source("src/app/developers/page.tsx");
  const footer = source("src/app/DeveloperFooterSection.tsx");
  assert.match(portal, /developer\/login\?next=%2Fdevelopers%2Fdashboard/);
  assert.match(portal, /developer\/signup/);
  assert.match(portal, /Developer role and product access require separate approval/);
  assert.match(footer, /href="\/developer\/login/);
  assert.match(footer, /href="\/developer\/signup"/);
});
