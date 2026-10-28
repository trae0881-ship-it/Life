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
  assert.deepEqual(robots.rules[0].disallow, ["/api/", "/admin/", "/dashboard/", "/super-admin/"]);
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
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\nDisallow: /api/\n", { status: 200 });
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
      assert.equal(audit.sitemap.valid, true);
      assert.equal(audit.sitemap.listedPages, SEO_PAGE_DEFINITIONS.length);
      assert.equal(audit.robots.valid, true);
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
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /*\n", { status: 200 });
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
