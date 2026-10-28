import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = (path) => readFileSync(resolve(root, path), "utf8");

test("root layout renders one shared, accessible footer for all App Router pages", () => {
  const layout = source("src/app/layout.tsx");
  const footer = source("src/app/GlobalFooter.tsx");
  assert.match(layout, /<GlobalFooter\s*\/>/);
  assert.match(footer, /<footer className="global-footer">/);
  assert.match(footer, /aria-label="Global footer navigation"/);
  assert.match(footer, /href="\/api\/docs"/);
  assert.match(footer, /href="\/developers"/);
  assert.match(footer, /href="\/#about"/);
  assert.match(footer, /href="\/#contact"/);
});

test("all global footer links resolve to real routes or existing homepage sections", () => {
  const footer = source("src/app/GlobalFooter.tsx");
  const targets = [...footer.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  const pageFiles = new Map([
    ["/", "src/app/page.tsx"],
    ["/blogs", "src/app/blogs/page.tsx"],
    ["/developers", "src/app/developers/page.tsx"],
    ["/api/docs", "src/app/api/docs/page.tsx"],
    ["/references", "src/app/references/page.tsx"],
    ["/privacy-policy", "src/app/privacy-policy/page.tsx"],
    ["/terms-and-conditions", "src/app/terms-and-conditions/page.tsx"],
    ["/disclaimer", "src/app/disclaimer/page.tsx"],
    ["/refund-policy", "src/app/refund-policy/page.tsx"],
  ]);
  for (const [target, page] of pageFiles) assert.ok(existsSync(resolve(root, page)), `${target} page exists`);
  const home = source("src/app/HomepageSections.tsx");
  assert.match(home, /id="about"/);
  assert.match(home, /id="contact"/);
  for (const target of targets) {
    const route = target.split("#")[0] || "/";
    assert.ok(pageFiles.has(route), `footer target ${target} resolves`);
  }
});

test("page-specific full footers are removed so the global footer is not duplicated", () => {
  const pages = [
    "src/app/HomepageSections.tsx",
    "src/app/ChartStudioWorkspace.tsx",
    "src/app/developers/page.tsx",
    "src/app/references/page.tsx",
  ];
  for (const page of pages) assert.doesNotMatch(source(page), /<footer\b/);
});
