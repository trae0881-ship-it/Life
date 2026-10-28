import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const appRoot = path.join(sourceRoot, "app");
const sourceFiles = [];
const routes = new Set(["/"]);

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(file);
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      sourceFiles.push(file);
    }
  }
}

function routeSegments(route) {
  return route.split("/").filter(Boolean);
}

function routeExists(pathname) {
  const requested = routeSegments(pathname);
  return [...routes].some((route) => {
    const candidate = routeSegments(route);
    return candidate.length === requested.length && candidate.every((segment, index) =>
      /^\[\[?\.\.\./.test(segment) || /^\[.*\]$/.test(segment) || segment === requested[index]);
  });
}

walk(sourceRoot);
for (const file of sourceFiles) {
  const relativeDirectory = path.relative(appRoot, path.dirname(file)).split(path.sep)
    .filter((segment) => segment && !/^\([^)]*\)$/.test(segment));
  const name = path.basename(file);
  if (name === "page.tsx" || name === "route.ts") routes.add(`/${relativeDirectory.join("/")}`);
  if (path.relative(appRoot, file) === "robots.ts") routes.add("/robots.txt");
  if (path.relative(appRoot, file) === "sitemap.ts") routes.add("/sitemap.xml");
}

test("App Router inventory includes public, protected, API, and dynamic route files", () => {
  assert.ok(routes.has("/blogs/[slug]"), "dynamic blog detail page must be inventoried");
  assert.ok(routes.has("/api/developer/test"), "developer API test route must be inventoried");
  assert.ok(routes.has("/super-admin/database"), "protected Database Center must be inventoried");
  assert.ok(routes.has("/robots.txt"));
  assert.ok(routes.has("/sitemap.xml"));
  assert.ok(routes.size >= 70, `expected the current App Router inventory, found ${routes.size} routes`);
});

test("literal internal links resolve to an App Router or metadata route", () => {
  const missing = [];
  const linkPattern = /\bhref\s*=\s*(?:\{\s*)?(['"])([^'"`{}]+)\1\s*\}?|\bhref\s*:\s*(['"])([^'"`{}]+)\3/g;

  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(linkPattern)) {
      const href = match[2] ?? match[4];
      if (!href?.startsWith("/") || href.startsWith("//")) continue;
      const pathname = href.split(/[?#]/, 1)[0] || "/";
      if (!routeExists(pathname)) missing.push(`${path.relative(root, file)}: ${href}`);
    }
  }

  assert.deepEqual(missing, []);
});
