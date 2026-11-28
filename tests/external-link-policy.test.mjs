import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getApprovedExternalHref } from "../src/presentation/external-link-policy.ts";
import { referenceRegistry } from "../src/presentation/references.ts";
import { PALM_SOURCES } from "../src/palmistry/sources.ts";

test("all registered visible reference and catalog links use approved HTTPS destinations", () => {
  const urls = [
    ...referenceRegistry.flatMap((reference) => [
      reference.url,
      ...(reference.verification_review?.evidence ?? []),
    ]),
    ...PALM_SOURCES.map((source) => source.url),
  ].filter((value) => typeof value === "string" && value.startsWith("https://"));

  assert.ok(urls.length > 0);
  for (const url of urls) assert.equal(getApprovedExternalHref(url), new URL(url).href, url);
});

test("external link policy rejects non-HTTPS, deceptive hosts, credentials, and unexpected ports", () => {
  for (const url of [
    "http://www.astro.com/swisseph",
    "javascript:alert(1)",
    "https://archive.org.evil.example/details/book",
    "https://archive.org@evil.example/details/book",
    "https://user:password@archive.org/details/book",
    "https://archive.org:8443/details/book",
    "https://sub.archive.org/details/book",
  ]) {
    assert.equal(getApprovedExternalHref(url), null, url);
  }
});

test("reference renderers validate URLs before creating external links", () => {
  const referencePage = readFileSync(new URL("../src/app/references/page.tsx", import.meta.url), "utf8");
  const palmistry = readFileSync(new URL("../src/app/PalmistryWorkspace.tsx", import.meta.url), "utf8");
  assert.match(referencePage, /getApprovedExternalHref/);
  assert.match(palmistry, /getApprovedExternalHref/);
  assert.match(palmistry, /rel="noopener noreferrer"/);
});
