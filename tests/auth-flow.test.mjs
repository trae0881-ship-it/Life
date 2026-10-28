import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { safeReturnTo } from "../src/server/auth-redirect.ts";
import { handleSuperAdminRoleChange } from "../src/server/super-admin-role-handler.ts";
import { INTENDED_SUPER_ADMIN_EMAIL, parseBootstrapArguments, provisionExistingSuperAdmin } from "../scripts/provision-admin-core.mjs";

const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("return destinations preserve valid local paths and reject redirect escapes", () => {
  assert.equal(safeReturnTo("/studio?tab=d1#birth-form"), "/studio?tab=d1#birth-form");
  for (const value of [
    undefined, "", "https://attacker.example", "//attacker.example", "/\\attacker.example", "/\r\nheader",
    "/%2f%2fattacker.example", "/%5c%5cattacker.example", "/bad%escape", "/login", "/signup?next=%2Flogin",
  ]) {
    assert.equal(safeReturnTo(value), "/dashboard");
  }
  assert.equal(safeReturnTo("/dashboard?tab=profile"), "/dashboard?tab=profile");
});

test("login and signup routes render distinct forms and preserve a safe return destination", () => {
  const login = source("src/app/login/page.tsx");
  const signup = source("src/app/signup/page.tsx");
  const experience = source("src/app/login/LoginExperience.tsx");
  const accountPanel = source("src/app/AccountPanel.tsx");

  assert.match(login, /title: "Sign In \| LIFE"/);
  assert.match(login, /return <LoginExperience returnTo=\{destination\} \/>/);
  assert.match(signup, /title: "Create an Account \| LIFE"/);
  assert.match(signup, /initialMode="register"/);
  assert.match(signup, /safeReturnTo/);
  assert.match(experience, /key=\{initialMode\}/);
  assert.match(experience, /Create Account \/ Sign Up/);
  assert.match(experience, /Login \/ Sign In/);
  assert.match(accountPanel, /useState<"login" \| "register">\s*\(initialMode\)/);
  assert.match(accountPanel, /name="fullName"/);
  assert.match(accountPanel, /name="confirmPassword"/);
});

test("successful login and signup verify the issued session before redirecting to the default dashboard or safe next", () => {
  const accountPanel = source("src/app/AccountPanel.tsx");
  const registrationApi = source("src/app/api/auth/register/route.ts");
  const loginApi = source("src/app/api/auth/login/route.ts");

  assert.match(accountPanel, /fetch\("\/api\/auth\/me", \{ cache: "no-store" \}\)/);
  assert.match(accountPanel, /sessionResult\.user\.id !== result\.user\.id/);
  assert.match(accountPanel, /account\.registrationSessionUnverified/);
  assert.match(accountPanel, /Sign in to continue/);
  assert.match(accountPanel, /window\.location\.assign\(returnTo\)/);
  assert.match(loginApi, /createSession\(user\.id, getPrisma\(\)\)/);
  assert.match(registrationApi, /registerAccountWithSession/);
  assert.match(registrationApi, /sessionCookie\(token, expiresAt\)/);
  assert.match(source("src/server/auth-redirect.ts"), /DEFAULT_RETURN_TO = "\/dashboard"/);
});

test("dashboard protects anonymous visitors and exposes authenticated dashboard/account navigation and logout", () => {
  const dashboardPage = source("src/app/dashboard/page.tsx");
  const dashboard = source("src/app/Dashboard.tsx");
  const logoutApi = source("src/app/api/auth/logout/route.ts");

  assert.match(dashboardPage, /if \(!user\) redirect\("\/login\?next=%2Fdashboard"\)/);
  assert.match(dashboardPage, /return <Dashboard user=\{user\} \/>/);
  assert.match(dashboard, /dashboard-sidebar.*aria-label/);
  assert.match(dashboard, /dashboard-user-chip/);
  assert.match(dashboard, /fetch\("\/api\/auth\/logout"/);
  assert.match(logoutApi, /revokeSession\(token, getPrisma\(\)\)/);
  assert.match(logoutApi, /clearSessionCookie\(\)/);
});

test("homepage header switches public and authenticated navigation and logout returns to the public page", () => {
  const homepage = source("src/app/HomepageSections.tsx");
  const styles = source("src/app/homepage.css");

  assert.match(homepage, /Login \/ Sign In/);
  assert.match(homepage, /Create Account \/ Sign Up/);
  assert.match(homepage, /Dashboard \/ Account/);
  assert.match(homepage, /className="site-nav-signout"/);
  assert.match(homepage, /fetch\("\/api\/auth\/me", \{ cache: "no-store" \}\)/);
  assert.match(homepage, /fetch\("\/api\/auth\/logout"/);
  assert.match(homepage, /window\.location\.assign\("\/"\)/);
  assert.match(styles, /\.site-nav-signout/);
});

test("Chart Studio and its calculation API require the server-side session", () => {
  const studio = source("src/app/studio/page.tsx");
  const loginPage = source("src/app/login/page.tsx");
  const accountPanel = source("src/app/AccountPanel.tsx");
  const chartApi = source("src/app/api/charts/route.ts");
  assert.match(studio, /getCurrentUser\(\)/);
  assert.match(studio, /redirect\(`\/login\?next=/);
  assert.match(studio, /searchParams/);
  assert.match(loginPage, /safeReturnTo/);
  assert.match(loginPage, /redirect\(destination\)/);
  assert.match(accountPanel, /window\.location\.assign\(returnTo\)/);
  assert.match(chartApi, /requireRole\(request, \["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"\]\)/);
  assert.ok(chartApi.indexOf("requireRole(request") < chartApi.indexOf("readJson(request"), "authentication must precede chart payload processing");
  assert.match(chartApi, /"UNAUTHENTICATED"[\s\S]*?auth\.status/);
});

test("sign-up route provides required identity fields without collecting Kundli birth details", () => {
  const signup = source("src/app/signup/page.tsx");
  const experience = source("src/app/login/LoginExperience.tsx");
  const accountPanel = source("src/app/AccountPanel.tsx");
  const registrationApi = source("src/app/api/auth/register/route.ts");
  const userModel = source("prisma/schema.prisma").match(/model User \{[\s\S]*?\n\}/)?.[0] ?? "";
  const initialMigration = source("prisma/migrations/20261016000000_init/migration.sql");
  const userNameMigration = source("prisma/migrations/20261026130000_user_full_name/migration.sql");

  assert.match(signup, /initialMode="register"/);
  assert.match(signup, /safeReturnTo/);
  assert.match(experience, /lockAuthMode/);
  assert.match(accountPanel, /name="fullName"[^>]*required/);
  assert.match(accountPanel, /name="email"[^>]*required/);
  assert.match(accountPanel, /name="password"[^>]*required/);
  assert.match(accountPanel, /name="confirmPassword"[^>]*required/);
  assert.match(accountPanel, /password !== String\(form\.get\("confirmPassword"\)/);
  assert.match(accountPanel, /aria-pressed=\{showPasswords\}/);
  assert.match(accountPanel, /confirmPassword: mode === "register"/);
  assert.match(registrationApi, /fullName: body\.fullName/);
  assert.match(registrationApi, /confirmPassword: body\.confirmPassword/);
  assert.match(registrationApi, /EMAIL_ALREADY_REGISTERED/);
  assert.match(registrationApi, /P2002/);
  assert.match(registrationApi, /An account with that email already exists/);
  assert.match(userModel, /fullName\s+String\?/);
  assert.match(userModel, /id\s+String\s+@id\s+@default\(cuid\(\)\)/);
  assert.match(initialMigration, /"id" TEXT NOT NULL/);
  assert.doesNotMatch(initialMigration.match(/CREATE TABLE "User" \([\s\S]*?\n\);/)?.[0] ?? "", /"id"[^,\n]*DEFAULT/);
  assert.match(source("src/server/auth-core.ts"), /repository\.user\.create\(\{\s*data: \{ fullName, email, passwordHash, role: "USER"/);
  assert.doesNotMatch(source("scripts/provision-admin-core.mjs"), /transaction\.user\.create/);
  assert.match(userNameMigration, /ADD COLUMN "fullName" TEXT/);
  const registrationForm = accountPanel.match(/<form className="account-auth-form"[\s\S]*?<\/form>/)?.[0] ?? "";
  assert.ok(registrationForm);
  assert.doesNotMatch(registrationForm, /name="(?:localDate|localTime|birthPlace|timeZone|latitude|longitude)"/);
});

test("logout revokes the current token and the client returns to the public homepage", () => {
  const logoutApi = source("src/app/api/auth/logout/route.ts");
  const accountPanel = source("src/app/AccountPanel.tsx");
  assert.match(logoutApi, /revokeSession\(token, getPrisma\(\)\)/);
  assert.match(logoutApi, /clearSessionCookie\(\)/);
  assert.match(accountPanel, /fetch\("\/api\/auth\/logout"/);
  assert.match(accountPanel, /window\.location\.replace\("\/"\)/);
});

test("Super Admin role changes reject self-escalation and audit the constrained transaction", () => {
  const endpoint = source("src/app/api/super-admin/users/[userId]/role/route.ts");
  const roleHandler = source("src/server/super-admin-role-handler.ts");
  const migration = source("prisma/migrations/20261026120000_super_admin_role_audit/migration.sql");
  const bootstrap = source("scripts/provision-admin.mjs");
  const bootstrapCore = source("scripts/provision-admin-core.mjs");
  assert.match(endpoint, /authorize: requireRole/);
  assert.match(roleHandler, /dependencies\.authorize\(request, \["SUPER_ADMIN"\]\)/);
  assert.match(roleHandler, /ASSIGNABLE_ROLES = \["USER", "DEVELOPER", "ADMIN"\]/);
  assert.match(roleHandler, /userId === actorUserId/);
  assert.match(roleHandler, /target\.role === "SUPER_ADMIN"/);
  assert.match(roleHandler, /updateMany\([\s\S]*?where: \{ id: target\.id, role: target\.role \}/);
  assert.match(roleHandler, /superAdminAccessLog\.create/);
  assert.match(bootstrapCore, /findUnique\([\s\S]*?where: \{ email \}/);
  assert.match(bootstrapCore, /account does not exist/);
  assert.match(bootstrapCore, /--email/);
  assert.match(bootstrapCore, /--confirm/);
  assert.match(bootstrapCore, /--operator/);
  assert.match(bootstrap, /--database-name/);
  assert.match(bootstrap, /current_database\(\)/);
  assert.match(bootstrap, /20261026120000_super_admin_role_audit/);
  assert.match(bootstrap, /20261026130000_user_full_name/);
  assert.match(bootstrapCore, /BOOTSTRAP_SUPER_ADMIN/);
  assert.doesNotMatch(bootstrap, /user\.create|passwordHash|argon2|--password/);
  assert.match(migration, /USER_ROLE_CHANGED/);
  assert.match(migration, /BOOTSTRAP_SUPER_ADMIN/);
  assert.equal(existsSync(new URL("../src/app/api/auth/bootstrap-super-admin/route.ts", import.meta.url)), false);
});

function roleRequest(body = { role: "ADMIN" }, origin = "https://life.example") {
  return new Request("https://life.example/api/super-admin/users/target-id/role", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function roleDependencies({ status = 200, actorId = "root-id", target = { id: "target-id", role: "USER" }, changedCount = 1 } = {}) {
  const state = { transactions: 0, updates: [], audits: [], isolation: null };
  const dependencies = {
    async authorize(_request, roles) {
      assert.deepEqual(roles, ["SUPER_ADMIN"]);
      return { status, user: status === 401 ? null : { id: actorId } };
    },
    repository() {
      return {
        async $transaction(callback, options) {
          state.transactions += 1;
          state.isolation = options.isolationLevel;
          return callback({
            user: {
              async findUnique() { return target; },
              async updateMany(args) {
                state.updates.push(args);
                return { count: changedCount };
              },
            },
            superAdminAccessLog: {
              async create(args) {
                state.audits.push(args.data);
                return { id: "audit-id" };
              },
            },
          });
        },
      };
    },
  };
  return { dependencies, state };
}

test("role-change handler rejects unauthenticated, non-Super-Admin, cross-origin, self and Super Admin targets", async () => {
  for (const [status, expected, code] of [
    [401, 401, "UNAUTHENTICATED"],
    [403, 403, "FORBIDDEN"],
  ]) {
    const { dependencies, state } = roleDependencies({ status });
    const response = await handleSuperAdminRoleChange(roleRequest(), "target-id", dependencies);
    assert.equal(response.status, expected);
    assert.equal((await response.json()).code, code);
    assert.equal(state.transactions, 0);
  }

  const crossOrigin = roleDependencies();
  const crossOriginResponse = await handleSuperAdminRoleChange(roleRequest({ role: "ADMIN" }, "https://attacker.example"), "target-id", crossOrigin.dependencies);
  assert.equal(crossOriginResponse.status, 403);
  assert.equal((await crossOriginResponse.json()).code, "INVALID_ORIGIN");
  assert.equal(crossOrigin.state.transactions, 0);

  for (const { actorId, target } of [
    { actorId: "target-id", target: { id: "target-id", role: "USER" } },
    { actorId: "root-id", target: { id: "target-id", role: "SUPER_ADMIN" } },
  ]) {
    const { dependencies, state } = roleDependencies({ actorId, target });
    const response = await handleSuperAdminRoleChange(roleRequest(), "target-id", dependencies);
    assert.equal(response.status, 403);
    assert.equal(state.updates.length, 0);
    assert.equal(state.audits.length, 0);
  }
});

test("role-change handler rejects privilege escalation and audits allowed changes transactionally", async () => {
  const { dependencies, state } = roleDependencies();
  const forbidden = await handleSuperAdminRoleChange(roleRequest({ role: "SUPER_ADMIN" }), "target-id", dependencies);
  assert.equal(forbidden.status, 422);
  assert.equal((await forbidden.json()).code, "INVALID_ROLE");
  assert.equal(state.transactions, 0);

  const response = await handleSuperAdminRoleChange(roleRequest({ role: "ADMIN" }), "target-id", dependencies);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { userId: "target-id", role: "ADMIN" });
  assert.deepEqual(state.updates, [{ where: { id: "target-id", role: "USER" }, data: { role: "ADMIN" } }]);
  assert.deepEqual(state.audits, [{
    actorUserId: "root-id",
    action: "USER_ROLE_CHANGED",
    page: 0,
    resultCount: 1,
    targetUserId: "target-id",
    fromRole: "USER",
    toRole: "ADMIN",
  }]);
  assert.equal(state.isolation, "Serializable");
});

function bootstrapRepository({ target = { id: "user-id", role: "USER" }, superAdmins = 0 } = {}) {
  const state = { transactions: 0, updates: [], audits: [], isolation: null };
  return {
    state,
    repository: {
      async $transaction(callback, options) {
        state.transactions += 1;
        state.isolation = options.isolationLevel;
        return callback({
          user: {
            async findUnique() { return target; },
            async count() { return superAdmins; },
            async update(args) { state.updates.push(args); return { id: target.id }; },
          },
          superAdminAccessLog: {
            async create(args) { state.audits.push(args.data); return { id: "audit-id" }; },
          },
        });
      },
    },
  };
}

test("bootstrap service requires an existing explicit target, refuses duplicates, and audits only initial promotion", async () => {
  const missing = bootstrapRepository({ target: null });
  await assert.rejects(provisionExistingSuperAdmin(missing.repository, INTENDED_SUPER_ADMIN_EMAIL, "change-123"), /account does not exist/);
  assert.equal(missing.state.updates.length, 0);
  assert.equal(missing.state.audits.length, 0);

  const already = bootstrapRepository({ target: { id: "user-id", role: "SUPER_ADMIN" }, superAdmins: 1 });
  assert.equal(await provisionExistingSuperAdmin(already.repository, INTENDED_SUPER_ADMIN_EMAIL, "change-123"), "already-provisioned");
  assert.equal(already.state.updates.length, 0);
  assert.equal(already.state.audits.length, 0);

  const multipleRoots = bootstrapRepository({ target: { id: "user-id", role: "SUPER_ADMIN" }, superAdmins: 2 });
  await assert.rejects(provisionExistingSuperAdmin(multipleRoots.repository, INTENDED_SUPER_ADMIN_EMAIL, "change-123"), /Multiple SUPER_ADMIN accounts/);
  assert.equal(multipleRoots.state.updates.length, 0);

  await assert.rejects(provisionExistingSuperAdmin(bootstrapRepository().repository, "other@example.com", "change-123"), /explicit target/);
  await assert.rejects(provisionExistingSuperAdmin(bootstrapRepository().repository, INTENDED_SUPER_ADMIN_EMAIL, ""), /operator identity/);

  const duplicate = bootstrapRepository({ superAdmins: 1 });
  await assert.rejects(provisionExistingSuperAdmin(duplicate.repository, INTENDED_SUPER_ADMIN_EMAIL, "change-123"), /refusing to promote another account/);
  assert.equal(duplicate.state.updates.length, 0);
  assert.equal(duplicate.state.audits.length, 0);

  const initial = bootstrapRepository();
  assert.equal(await provisionExistingSuperAdmin(initial.repository, INTENDED_SUPER_ADMIN_EMAIL, "ticket-456"), "provisioned");
  assert.deepEqual(initial.state.updates, [{ where: { id: "user-id" }, data: { role: "SUPER_ADMIN" }, select: { id: true } }]);
  assert.deepEqual(initial.state.audits, [{
    actorLabel: "ticket-456",
    action: "BOOTSTRAP_SUPER_ADMIN",
    page: 0,
    resultCount: 1,
    targetUserId: "user-id",
    fromRole: "USER",
    toRole: "SUPER_ADMIN",
  }]);
  assert.equal(initial.state.isolation, "Serializable");
});

test("bootstrap arguments require an explicit target, matching database name, operator identity and confirmation", () => {
  assert.deepEqual(parseBootstrapArguments([
    "--email", "AM123ALLINDIAFREE@gmail.com",
    "--database-name", "life_production",
    "--operator", "approved-change-123",
    "--confirm",
  ]), {
    email: "am123allindiafree@gmail.com",
    databaseName: "life_production",
    operator: "approved-change-123",
  });
  for (const args of [
    [],
    ["--email", "person@example.com", "--database-name", "life_test", "--operator", "ops"],
    ["--email", "person@example.com", "--database-name", "life_test", "--operator", "ops", "--confirm", "--confirm"],
    ["--email", "person@example.com", "--email", "other@example.com", "--database-name", "life_test", "--operator", "ops", "--confirm"],
    ["--email", "person@example.com", "--database-name", "life/test", "--operator", "ops", "--confirm"],
    ["--email", "person@example.com", "--database-name", "life_test", "--operator", " ", "--confirm"],
  ]) assert.throws(() => parseBootstrapArguments(args), /Usage:/);
  assert.throws(() => parseBootstrapArguments([
    "--email", "other@example.com",
    "--database-name", "life_test",
    "--operator", "approved-change-123",
    "--confirm",
  ]), /Usage:/);
});
