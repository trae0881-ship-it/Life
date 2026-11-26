import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  SEO_PAGE_DEFINITIONS,
  auditHistoryCsv,
  createRobotsMetadata,
  createSitemapEntries,
  defaultSeoSettings,
  getPublicSiteOrigin,
  getSeoDashboardData,
  metadataForManagedPage,
  readSeoStore,
  runSeoAudit,
  saveSeoPageSettings,
  validateSeoPageSettings,
} from "../src/server/seo-management.ts";
import {
  handleSeoAudit,
  handleSeoExport,
  handleSeoManagement,
} from "../src/server/seo-management-handler.ts";
import { clearRateLimitsForTests } from "../src/server/rate-limit.ts";

async function withTempStore(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "life-seo-test-"));
  const storePath = path.join(directory, "seo-management.json");
  try {
    return await run(storePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function inMemorySeoRepository() {
  const settings = new Map();
  const audits = [];
  const blogPosts = [];
  const repository = {
    seoPageSetting: {
      findMany: async () => [...settings.values()],
      findUnique: async ({ where }) => settings.get(where.path) ?? null,
      upsert: async ({ where, create, update }) => {
        const current = settings.get(where.path);
        settings.set(where.path, {
          path: where.path,
          settings: current ? update.settings : create.settings,
        });
      },
    },
    seoAuditHistory: {
      findMany: async ({ take }) => [...audits]
        .sort((first, second) => second.completedAt.getTime() - first.completedAt.getTime())
        .slice(0, take),
      create: async ({ data }) => { audits.push(data); },
      deleteMany: async ({ where }) => {
        const retainedIds = new Set(where.id.notIn);
        const before = audits.length;
        for (let index = audits.length - 1; index >= 0; index -= 1) {
          if (!retainedIds.has(audits[index].id)) audits.splice(index, 1);
        }
        return { count: before - audits.length };
      },
    },
    blogPost: {
      count: async () => blogPosts.length,
      findMany: async ({ take }) => blogPosts.slice(0, take),
    },
    $transaction: async (operation) => operation(repository),
  };
  return repository;
}

function adminDependencies(overrides = {}) {
  return {
    authorize: async (_request, allowedRoles) => {
      assert.deepEqual(allowedRoles, ["SUPER_ADMIN"]);
      return { status: 200, user: { id: "seo-test-admin" } };
    },
    ...overrides,
  };
}

function sameOriginRequest(url, method, body) {
  const parsed = new URL(url);
  return new Request(url, {
    method,
    headers: {
      Host: parsed.host,
      Origin: parsed.origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function validRobotsText(origin) {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api",
    "Disallow: /admin",
    "Disallow: /dashboard",
    "Disallow: /super-admin",
    "Disallow: /super-login",
    "Disallow: /developer/dashboard",
    `Sitemap: ${origin}/sitemap.xml`,
  ].join(String.fromCharCode(10));
}

function blockedRobotsText(origin) {
  return ["User-agent: *", "Disallow: /*", `Sitemap: ${origin}/sitemap.xml`].join(String.fromCharCode(10));
}

test("metadata settings accept only managed routes and bounded local canonical paths", () => {
  const valid = defaultSeoSettings("/");
  assert.equal(validateSeoPageSettings(valid)?.path, "/");
  assert.equal(validateSeoPageSettings({ ...valid, path: "/admin" }), null);
  assert.equal(validateSeoPageSettings({ ...valid, canonicalPath: "https://attacker.example/" }), null);
  assert.equal(validateSeoPageSettings({ ...valid, title: " " }), null);
  assert.equal(validateSeoPageSettings({ ...valid, description: "x".repeat(161) }), null);
});

test("metadata generation uses stored settings and does not invent a public origin", async () => {
  await withTempStore(async (storePath) => {
    const settings = { ...defaultSeoSettings("/"), title: "Managed LIFE title" };
    assert.equal((await saveSeoPageSettings(settings, storePath)).title, settings.title);
    assert.equal((await saveSeoPageSettings({ ...settings, title: "Updated managed LIFE title" }, storePath)).title, "Updated managed LIFE title");
    const metadata = await metadataForManagedPage("/", storePath);
    assert.equal(metadata.title, "Updated managed LIFE title");
    const data = await getSeoDashboardData(storePath);
    assert.equal(data.indexedPages, null);
    assert.equal(data.searchConsole.configured, false);
    assert.equal(data.persistence.durableInProduction, false);
  });
});

test("public metadata reads only its setting and falls back to defaults when SEO storage is unavailable", async () => {
  const storedSettings = { ...defaultSeoSettings("/privacy-policy"), title: "Managed privacy title" };
  const repository = {
    seoPageSetting: {
      findUnique: async () => ({ settings: storedSettings }),
    },
    seoAuditHistory: {
      findMany: async () => { throw new Error("Public metadata must not load audit history."); },
    },
  };
  const metadata = await metadataForManagedPage("/privacy-policy", undefined, repository);
  assert.equal(metadata.title, storedSettings.title);

  const loggedErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => loggedErrors.push(args);
  try {
    const fallbackMetadata = await metadataForManagedPage("/privacy-policy", undefined, {
      seoPageSetting: { findUnique: async () => { throw new Error("Database unavailable."); } },
    });
    assert.equal(fallbackMetadata.title, defaultSeoSettings("/privacy-policy").title);
    assert.equal(loggedErrors.length, 1);
    assert.match(loggedErrors[0][0], /using built-in defaults/);
  } finally {
    console.error = originalConsoleError;
  }
});

test("public origin prefers configuration, safely falls back to Railway, then the production deployment origin", () => {
  assert.equal(getPublicSiteOrigin({ LIFE_PUBLIC_APP_URL: "https://custom.life.example" }), "https://custom.life.example");
  assert.equal(getPublicSiteOrigin({ RAILWAY_PUBLIC_DOMAIN: "life-staging.up.railway.app" }), "https://life-staging.up.railway.app");
  assert.equal(getPublicSiteOrigin({ NODE_ENV: "production" }), "https://life-production-66edc885.up.railway.app");
  assert.equal(getPublicSiteOrigin({ RAILWAY_PUBLIC_DOMAIN: "https://user:pass@example.com" }), null);
});

test("production SEO settings and audit history use the PostgreSQL repository", async () => {
  const repository = inMemorySeoRepository();
  const settings = { ...defaultSeoSettings("/"), title: "Persistent LIFE title" };
  await saveSeoPageSettings(settings, undefined, "seo-test-admin", repository);
  assert.equal((await metadataForManagedPage("/", undefined, repository)).title, settings.title);

  const localOrigin = "http://127.0.0.1:43129";
  const previousPublicUrl = process.env.LIFE_PUBLIC_APP_URL;
  process.env.LIFE_PUBLIC_APP_URL = localOrigin;
  const fetcher = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/robots.txt") return new Response(validRobotsText(localOrigin), { status: 200 });
    if (url.pathname === "/sitemap.xml") {
      const entries = SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => `<url><loc>${localOrigin}${pagePath}</loc></url>`).join("");
      return new Response(`<urlset>${entries}</urlset>`, { status: 200 });
    }
    return new Response(
      `<html><head><title>${url.pathname}</title><meta name="description" content="Description"><link rel="canonical" href="${url.pathname}"><meta property="og:title" content="Title"><meta property="og:description" content="Description"></head><body><h1>Page</h1></body></html>`,
      { status: 200 },
    );
  };
  try {
    const audit = await runSeoAudit({
      actorUserId: "seo-test-admin",
      repository,
      fetcher,
      localOrigin,
    });
    const dashboard = await getSeoDashboardData(undefined, repository);
    assert.equal(dashboard.persistence.type, "postgresql");
    assert.equal(dashboard.persistence.durableInProduction, true);
    assert.equal(dashboard.lastAudit.id, audit.id);
  } finally {
    if (previousPublicUrl === undefined) delete process.env.LIFE_PUBLIC_APP_URL;
    else process.env.LIFE_PUBLIC_APP_URL = previousPublicUrl;
  }
});

test("technical audit includes published Blog CMS pages and measures noindex pages without adding them to sitemap", async () => {
  const repository = inMemorySeoRepository();
  const localOrigin = "http://127.0.0.1:43130";
  repository.blogPost.count = async () => 2;
  repository.blogPost.findMany = async () => [
    {
      slug: "public-post", title: "Public Article", excerpt: "An article excerpt with enough content.",
      seoTitle: null, seoDescription: null, canonicalUrl: null, robotsIndex: true,
    },
    {
      slug: "private-post", title: "Private Article", excerpt: "A private article excerpt with enough content.",
      seoTitle: null, seoDescription: null, canonicalUrl: null, robotsIndex: false,
    },
  ];
  const previousPublicUrl = process.env.LIFE_PUBLIC_APP_URL;
  process.env.LIFE_PUBLIC_APP_URL = localOrigin;
  const fetcher = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/robots.txt") {
      return new Response(validRobotsText(localOrigin), { status: 200 });
    }
    if (url.pathname === "/sitemap.xml") {
      const paths = [...SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => pagePath), "/blogs/public-post"];
      return new Response(`<urlset>${paths.map((route) => `<url><loc>${localOrigin}${route}</loc></url>`).join("")}</urlset>`, { status: 200 });
    }
    const noindex = url.pathname === "/blogs/private-post" ? '<meta name="robots" content="noindex,follow">' : "";
    return new Response(
      `<html><head><title>${url.pathname}</title><meta name="description" content="A description for ${url.pathname} that is long enough to inspect."><link rel="canonical" href="${url.pathname}"><meta name="robots" content="${noindex ? "noindex,follow" : "index,follow"}"><meta property="og:title" content="Article"><meta property="og:description" content="A description"><script type="application/ld+json">{"@type":"WebPage"}</script></head><body><h1>Article</h1></body></html>`,
      { status: 200 },
    );
  };
  try {
    const audit = await runSeoAudit({ actorUserId: "seo-test-admin", repository, fetcher, localOrigin });
    const publicPost = audit.pages.find((page) => page.path === "/blogs/public-post");
    const privatePost = audit.pages.find((page) => page.path === "/blogs/private-post");
    assert.equal(audit.pagesAudited, SEO_PAGE_DEFINITIONS.length + 2);
    assert.equal(audit.pagesOmitted, 0);
    assert.equal(publicPost?.checks?.canonical.status, "PASS");
    assert.equal(publicPost?.checks?.sitemap.status, "PASS");
    assert.equal(privatePost?.checks?.robots.status, "PASS");
    assert.equal(privatePost?.checks?.sitemap.status, "NOT_CHECKED");
    assert.equal(audit.sitemap.valid, true);
    assert.equal(audit.robots.valid, true, JSON.stringify(audit.robots));
  } finally {
    if (previousPublicUrl === undefined) delete process.env.LIFE_PUBLIC_APP_URL;
    else process.env.LIFE_PUBLIC_APP_URL = previousPublicUrl;
  }
});

test("sitemap and robots helpers include only canonical indexable LIFE routes", () => {
  const pages = SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => defaultSeoSettings(pagePath));
  pages[1] = { ...pages[1], canonicalPath: "/" };
  pages[2] = { ...pages[2], robots: { index: false, follow: true } };
  const entries = createSitemapEntries("https://life.example", pages);
  assert.equal(entries.length, SEO_PAGE_DEFINITIONS.length - 2);
  assert.ok(entries.every((entry) => entry.url.startsWith("https://life.example/")));
  assert.deepEqual(createSitemapEntries(null, pages), []);
  const robots = createRobotsMetadata("https://life.example");
  assert.equal(robots.sitemap, "https://life.example/sitemap.xml");
  assert.deepEqual(robots.rules[0].disallow, ["/api", "/admin", "/dashboard", "/super-admin", "/super-login", "/developer/dashboard"]);
});

test("technical audit measures managed routes, JSON-LD, status, sitemap and broken internal links", async () => {
  await withTempStore(async (storePath) => {
    const localOrigin = "http://127.0.0.1:43127";
    const calls = [];
    const previousPublicUrl = process.env.LIFE_PUBLIC_APP_URL;
    process.env.LIFE_PUBLIC_APP_URL = localOrigin;
    const fetcher = async (input) => {
      const url = new URL(input);
      calls.push(url.pathname);
      if (url.pathname === "/robots.txt") return new Response(validRobotsText(localOrigin), { status: 200 });
      if (url.pathname === "/sitemap.xml") {
        const pages = SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => `<url><loc>${localOrigin}${pagePath}</loc></url>`).join("");
        return new Response(`<urlset>${pages}</urlset>`, { status: 200 });
      }
      if (url.pathname === "/privacy-policy") return new Response("Not found", { status: 404 });
      const title = url.pathname === "/" ? "Home" : url.pathname.slice(1);
      return new Response(
        `<html><head><title>${title}</title><meta name="description" content="Description ${title}"><link href="${url.pathname}" rel="canonical"><script defer type="application/ld+json">{"@type":"WebPage"}</script></head><body><h1>${title}</h1><img src="/chart.png"><a href="/privacy-policy">Broken route</a><a href="https://external.example/">External</a></body></html>`,
        { status: 200 },
      );
    };

    try {
      const audit = await runSeoAudit({ storePath, fetcher, localOrigin });
      assert.equal(audit.pagesAudited, SEO_PAGE_DEFINITIONS.length);
      assert.equal(audit.metrics.missingTitles, 0);
      assert.equal(audit.metrics.missingDescriptions, 0);
      assert.equal(audit.metrics.brokenInternalLinks, SEO_PAGE_DEFINITIONS.length - 1);
      assert.equal(audit.metrics.validJsonLdBlocks, SEO_PAGE_DEFINITIONS.length - 1);
      assert.equal(audit.metrics.invalidJsonLdBlocks, 0);
      assert.equal(audit.metrics.imagesMissingAlt, SEO_PAGE_DEFINITIONS.length - 1);
      assert.equal(audit.metrics.missingOpenGraph, SEO_PAGE_DEFINITIONS.length - 1);
      assert.equal(audit.readinessLabel, "internal_heuristic_not_google_ranking");
      assert.equal(audit.sitemap.valid, false);
      assert.equal(audit.sitemap.listedPages, SEO_PAGE_DEFINITIONS.length);
      assert.equal(audit.pages.find((page) => page.path === "/privacy-policy")?.checks?.sitemap.status, "FAILED");
      assert.equal(audit.robots.valid, true, JSON.stringify(audit.robots));
      assert.equal(audit.pages.find((page) => page.path === "/").internalLinkCount, 1);
      assert.ok(audit.pages.find((page) => page.path === "/")?.issues.some((issue) => issue.code === "IMAGE_ALT_MISSING"));
      assert.equal(calls.filter((pathname) => pathname === "/sitemap.xml").length, 1);
      const stored = await readSeoStore(storePath);
      assert.equal(stored.audits[0].id, audit.id);
      assert.match(auditHistoryCsv(stored.audits), /"completedAt","pagesAudited"/);
    } finally {
      if (previousPublicUrl === undefined) delete process.env.LIFE_PUBLIC_APP_URL;
      else process.env.LIFE_PUBLIC_APP_URL = previousPublicUrl;
    }
  });

  test("SEO file persistence rejects unsafe replacement targets rather than reporting a successful save", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "life-seo-target-"));
    try {
      await assert.rejects(saveSeoPageSettings(defaultSeoSettings("/"), directory));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

test("technical audit detects wildcard public-page blocks and duplicate sitemap entries", async () => {
  await withTempStore(async (storePath) => {
    const localOrigin = "http://127.0.0.1:43128";
    const previousPublicUrl = process.env.LIFE_PUBLIC_APP_URL;
    process.env.LIFE_PUBLIC_APP_URL = localOrigin;
    const fetcher = async (input) => {
      const url = new URL(input);
      if (url.pathname === "/robots.txt") return new Response(blockedRobotsText(localOrigin), { status: 200 });
      if (url.pathname === "/sitemap.xml") {
        const paths = SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => pagePath);
        paths[1] = paths[0];
        return new Response(`<urlset>${paths.map((pagePath) => `<url><loc>${localOrigin}${pagePath}</loc></url>`).join("")}</urlset>`, { status: 200 });
      }
      const title = url.pathname === "/" ? "Home" : url.pathname.slice(1);
      return new Response(
        `<html><head><title>${title}</title><meta name="description" content="${title}"><link rel="canonical" href="${url.pathname}"></head><body><h1>${title}</h1></body></html>`,
        { status: 200 },
      );
    };
    try {
      const audit = await runSeoAudit({ storePath, fetcher, localOrigin });
      assert.equal(audit.robots.valid, false);
      assert.equal(audit.robots.blockedPublicPaths.length, SEO_PAGE_DEFINITIONS.length);
      assert.equal(audit.sitemap.listedPages, SEO_PAGE_DEFINITIONS.length - 1);
      assert.equal(audit.sitemap.valid, false);
    } finally {
      if (previousPublicUrl === undefined) delete process.env.LIFE_PUBLIC_APP_URL;
      else process.env.LIFE_PUBLIC_APP_URL = previousPublicUrl;
    }
  });
});

test("audit refuses caller-supplied external origins and rejects corrupt persisted audit history", async () => {
  await withTempStore(async (storePath) => {
    await assert.rejects(
      runSeoAudit({ storePath, localOrigin: "http://127.0.0.1.attacker.example" }),
      /loopback address/,
    );
    await writeFile(storePath, JSON.stringify({ version: 1, settings: {}, audits: [{ id: "invalid" }] }));
    await assert.rejects(readSeoStore(storePath), /invalid audit history/);
  });
});

test("SEO APIs require SUPER_ADMIN authorization before reading or writing data", async () => {
  const denied = {
    authorize: async () => ({ status: 403, user: { id: "regular-user" } }),
    storePath: path.join(os.tmpdir(), "must-not-be-read-seo-store.json"),
  };
  const requests = [
    [handleSeoManagement, new Request("https://life.example/api/super-admin/seo")],
    [handleSeoManagement, sameOriginRequest("https://life.example/api/super-admin/seo", "PATCH", { page: defaultSeoSettings("/") })],
    [handleSeoAudit, sameOriginRequest("https://life.example/api/super-admin/seo/audit", "POST", {})],
    [handleSeoExport, new Request("https://life.example/api/super-admin/seo/export")],
  ];
  for (const [handler, request] of requests) {
    const response = await handler(request, denied);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "FORBIDDEN");
  }
});

test("SEO metadata API validates saves, rejects external canonicals, and exports authorized history", async () => {
  await withTempStore(async (storePath) => {
    const dependencies = adminDependencies({ storePath });
    const getResponse = await handleSeoManagement(new Request("https://life.example/api/super-admin/seo"), dependencies);
    assert.equal(getResponse.status, 200);
    const settings = defaultSeoSettings("/");
    const saveResponse = await handleSeoManagement(
      sameOriginRequest("https://life.example/api/super-admin/seo", "PATCH", { page: settings }),
      dependencies,
    );
    assert.equal(saveResponse.status, 200);
    const invalidResponse = await handleSeoManagement(
      sameOriginRequest("https://life.example/api/super-admin/seo", "PATCH", {
        page: { ...settings, canonicalPath: "https://external.example/" },
      }),
      dependencies,
    );
    assert.equal(invalidResponse.status, 422);
    const exportResponse = await handleSeoExport(new Request("https://life.example/api/super-admin/seo/export"), dependencies);
    assert.equal(exportResponse.status, 200);
    assert.match(await exportResponse.text(), /"completedAt","pagesAudited"/);
  });
});

test("SEO audit endpoint is same-origin, authorized, and rate limited", async () => {
  clearRateLimitsForTests();
  let runCount = 0;
  const dependencies = adminDependencies({ runAudit: async () => ({ id: `audit-${++runCount}` }) });
  const request = () => sameOriginRequest("https://life.example/api/super-admin/seo/audit", "POST", {});
  assert.equal((await handleSeoAudit(new Request("https://life.example/api/super-admin/seo/audit", { method: "POST" }), dependencies)).status, 403);
  assert.equal((await handleSeoAudit(request(), dependencies)).status, 200);
  assert.equal((await handleSeoAudit(request(), dependencies)).status, 200);
  const limited = await handleSeoAudit(request(), dependencies);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after") !== null, true);
  assert.equal(runCount, 2);
  clearRateLimitsForTests();
});
