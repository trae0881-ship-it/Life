import test from "node:test";
import assert from "node:assert/strict";
import {
  handleManagedScript,
  handleManagedScriptsCollection,
  handlePublicRuntimeScripts,
  isValidManagedScriptTargetPath,
  runtimeScriptsForPath,
} from "../src/server/admin-scripts.ts";

function makeRepository() {
  let nextId = 0;
  const scripts = [];
  const audit = [];
  const repo = {
    managedScript: {
      async findMany({ where } = {}) {
        return scripts.filter((script) => where?.enabled === undefined || script.enabled === where.enabled).map((script) => ({ ...script }));
      },
      async findUnique({ where }) {
        const script = scripts.find((item) => item.id === where.id);
        return script ? { ...script } : null;
      },
      async create({ data }) {
        const now = new Date();
        const script = { ...data, id: `script-${++nextId}`, createdAt: now, updatedAt: now };
        scripts.push(script);
        return { ...script };
      },
      async update({ where, data }) {
        const script = scripts.find((item) => item.id === where.id);
        if (!script) throw new Error("Missing script");
        Object.assign(script, data, { updatedAt: new Date() });
        return { ...script };
      },
      async delete({ where }) {
        const index = scripts.findIndex((item) => item.id === where.id);
        if (index < 0) throw new Error("Missing script");
        return { ...scripts.splice(index, 1)[0] };
      },
    },
    managedScriptAuditLog: {
      async create({ data }) {
        audit.push({ ...data, id: `audit-${audit.length + 1}`, createdAt: new Date() });
        return {};
      },
      async findMany({ take }) {
        return audit.slice(-take).reverse().map((event) => ({ ...event }));
      },
    },
    async $transaction(callback) { return callback(repo); },
    scripts,
    audit,
  };
  return repo;
}

function dependencies(repository, role = "ADMIN") {
  let repositoryCalls = 0;
  return {
    authorize: async (_request, allowed) => ({
      status: role ? allowed.includes(role) ? 200 : 403 : 401,
      user: role ? { id: "actor-1", role } : null,
    }),
    repository: () => { repositoryCalls += 1; return repository; },
    repositoryCalls: () => repositoryCalls,
  };
}

function mutation(method, body, url = "http://localhost/api/admin/scripts") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

function input(overrides = {}) {
  return {
    name: "analytics",
    snippet: "window.lifeTest = true;",
    placement: "HEAD",
    enabled: true,
    targetPaths: null,
    ...overrides,
  };
}

test("script management is restricted to Admin and Super Admin on the server", async () => {
  const repo = makeRepository();
  for (const role of ["USER", "DEVELOPER"]) {
    const deps = dependencies(repo, role);
    const response = await handleManagedScriptsCollection(new Request("http://localhost/api/admin/scripts"), deps);
    assert.equal(response.status, 403);
    assert.equal(deps.repositoryCalls(), 0);
  }
  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    const response = await handleManagedScriptsCollection(new Request("http://localhost/api/admin/scripts"), dependencies(repo, role));
    assert.equal(response.status, 200);
  }
  const signedOut = await handleManagedScriptsCollection(new Request("http://localhost/api/admin/scripts"), dependencies(repo, null));
  assert.equal(signedOut.status, 401);
});

test("script mutations require same-origin requests and valid JavaScript input", async () => {
  const repo = makeRepository();
  const deps = dependencies(repo);
  const csrf = await handleManagedScriptsCollection(new Request("http://localhost/api/admin/scripts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input()),
  }), deps);
  assert.equal(csrf.status, 403);
  const invalid = await handleManagedScriptsCollection(mutation("POST", input({ snippet: "function {" })), deps);
  assert.equal(invalid.status, 422);
  assert.equal(repo.scripts.length, 0);
});

test("create, view, enable, disable and delete persist audit actor and timestamp", async () => {
  const repo = makeRepository();
  const deps = dependencies(repo, "SUPER_ADMIN");
  const createdResponse = await handleManagedScriptsCollection(mutation("POST", input()), deps);
  assert.equal(createdResponse.status, 201);
  const { script } = await createdResponse.json();
  assert.equal(script.enabled, true);
  assert.equal(script.createdByUserId, "actor-1");
  assert.equal(script.updatedByUserId, "actor-1");
  assert.ok(script.createdAt);
  assert.deepEqual(repo.audit.map((event) => event.action), ["CREATED", "ENABLED"]);
  assert.equal(repo.audit[0].actorUserId, "actor-1");
  assert.ok(repo.audit[0].createdAt instanceof Date);

  const view = await handleManagedScript(new Request(`http://localhost/api/admin/scripts/${script.id}`), script.id, deps);
  assert.equal(view.status, 200);
  const list = await handleManagedScriptsCollection(new Request("http://localhost/api/admin/scripts"), deps);
  assert.equal((await list.json()).auditEvents.length, 2);
  const disabled = await handleManagedScript(mutation("PATCH", { enabled: false }, `http://localhost/api/admin/scripts/${script.id}`), script.id, deps);
  assert.equal(disabled.status, 200);
  assert.equal((await disabled.json()).script.enabled, false);
  const enabled = await handleManagedScript(mutation("PATCH", { enabled: true }, `http://localhost/api/admin/scripts/${script.id}`), script.id, deps);
  assert.equal(enabled.status, 200);
  const deleted = await handleManagedScript(mutation("DELETE", undefined, `http://localhost/api/admin/scripts/${script.id}`), script.id, deps);
  assert.equal(deleted.status, 200);
  assert.deepEqual(repo.audit.map((event) => event.action), ["CREATED", "ENABLED", "DISABLED", "ENABLED", "DELETED"]);
  assert.deepEqual(repo.scripts, []);
});

test("validates page paths and restricts enabled scripts to site-wide or exact-path targets", async () => {
  assert.equal(isValidManagedScriptTargetPath("/references"), true);
  assert.equal(isValidManagedScriptTargetPath("/blogs/article-1"), true);
  for (const path of ["https://example.com", "//example.com", "/a/../b", "/a?b=1", "/a#hash", "/a\\b", "/%2e%2e/admin"]) {
    assert.equal(isValidManagedScriptTargetPath(path), false, path);
  }
  const scripts = [
    { id: "global", placement: "HEAD", snippet: "global();", targetPaths: [], enabled: true },
    { id: "page", placement: "BODY_START", snippet: "page();", targetPaths: ["/references"], enabled: true },
    { id: "disabled", placement: "BODY_END", snippet: "disabled();", targetPaths: [], enabled: false },
    { id: "duplicate", placement: "BODY_END", snippet: "global();", targetPaths: ["/references"], enabled: true },
  ];
  assert.deepEqual(runtimeScriptsForPath(scripts, "/references").map(({ id }) => id), ["global", "page"]);
  assert.deepEqual(runtimeScriptsForPath(scripts, "/about").map(({ id }) => id), ["global"]);
  assert.deepEqual(runtimeScriptsForPath(scripts, "/references?x=1").map(({ id }) => id), ["global"]);
});

test("public runtime endpoint returns only enabled snippets matching the requested path and de-duplicates code", async () => {
  const repo = makeRepository();
  const deps = dependencies(repo);
  await handleManagedScriptsCollection(mutation("POST", input()), deps);
  await handleManagedScriptsCollection(mutation("POST", input({ name: "duplicate", targetPaths: ["/references"] })), deps);
  await handleManagedScriptsCollection(mutation("POST", input({ name: "page only", snippet: "page();", targetPaths: ["/references"] })), deps);

  const response = await handlePublicRuntimeScripts(new Request("http://localhost/api/site-scripts?path=%2Freferences"), repo);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.scripts.map(({ id }) => id), ["script-1", "script-3"]);
  assert.equal("name" in body.scripts[0], false);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const invalid = await handlePublicRuntimeScripts(new Request("http://localhost/api/site-scripts?path=%2Fbad%3Fx"), repo);
  assert.equal(invalid.status, 422);
});

test("manager UI warns about XSS-capable scripts and exposes access only through existing admin routes", async () => {
  const { readFileSync } = await import("node:fs");
  const manager = readFileSync(new URL("../src/app/admin/scripts/AdminScriptManager.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/admin/scripts/page.tsx", import.meta.url), "utf8");
  const injector = readFileSync(new URL("../src/app/ScriptInjector.tsx", import.meta.url), "utf8");
  const docs = readFileSync(new URL("../docs/ADMIN_SCRIPT_MANAGER.md", import.meta.url), "utf8");
  assert.match(manager, /Privileged JavaScript — XSS capable/);
  assert.match(manager, /Never store secrets/);
  assert.match(page, /user\.role !== "ADMIN" && user\.role !== "SUPER_ADMIN"/);
  assert.match(injector, /usePathname/);
  assert.match(injector, /document\.head\.append/);
  assert.match(injector, /document\.body\.insertBefore/);
  assert.match(injector, /document\.body\.append/);
  assert.match(injector, /life-managed-script/);
  assert.match(injector, /NEXT_PUBLIC_LIFE_MANAGED_SCRIPTS_ENABLED/);
  assert.match(docs, /migration is approved and applied/);
});
