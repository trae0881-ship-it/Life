import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  referenceCategories,
  referenceFeatures,
  referenceRegistry,
} from "../src/presentation/references.ts";

const page = readFileSync(new URL("../src/app/references/page.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/app/HomepageSections.tsx", import.meta.url), "utf8");
const chartStudio = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
const sourceLinks = readFileSync(new URL("../src/app/ReferenceLinks.tsx", import.meta.url), "utf8");
const globalFooter = readFileSync(new URL("../src/app/GlobalFooter.tsx", import.meta.url), "utf8");

test("every registry entry has a unique stable ID, title, category and supported verification status", () => {
  assert.ok(referenceRegistry.length > 0);
  assert.equal(new Set(referenceRegistry.map((reference) => reference.id)).size, referenceRegistry.length);
  for (const reference of referenceRegistry) {
    assert.match(reference.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(reference.title.trim());
    assert.ok(reference.authors_or_organization.trim());
    assert.ok(referenceCategories.includes(reference.category));
    assert.ok(["verified", "partially_verified", "not_yet_verified"].includes(reference.verification_status));
    assert.ok(reference.description.trim());
  }
});

test("partial and unverified entries expose a dated review method and reproducible evidence without promoting status", () => {
  const flagged = referenceRegistry.filter((reference) => reference.verification_status !== "verified");
  assert.ok(flagged.length > 0);
  for (const reference of flagged) {
    assert.ok(reference.verification_review, `${reference.id} review metadata`);
    assert.match(reference.verification_review.checked_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(reference.verification_review.method.trim());
    assert.ok(reference.verification_review.evidence.length > 0);
  }
  assert.match(page, /Review evidence · \{reference\.verification_review\.checked_at\}/);
  assert.match(page, /reference\.verification_review\.method/);
  assert.match(page, /reference\.verification_review\.evidence\.map/);
  assert.equal(referenceRegistry.find((item) => item.id === "iers-bulletin-d-product-metadata").verification_status, "not_yet_verified");
  assert.equal(referenceRegistry.find((item) => item.id === "life-d11-attribution-pending").verification_status, "not_yet_verified");
});

test("provided source URLs are valid HTTP(S), and omitted metadata remains optional", () => {
  for (const reference of referenceRegistry) {
    if (reference.url !== null) {
      const url = new URL(reference.url);
      assert.ok(["http:", "https:"].includes(url.protocol), `${reference.id} URL protocol`);
      assert.ok(url.hostname, `${reference.id} URL hostname`);
    }
    for (const field of ["publisher", "publication_date", "version", "accessed_at"]) {
      assert.ok(reference[field] === null || typeof reference[field] === "string", `${reference.id}.${field}`);
    }
  }
  assert.match(page, /reference\.publication_date \?\? "Not recorded"/);
  assert.match(page, /reference\.version \?\? "Not recorded"/);
  assert.match(page, /reference\.accessed_at \?\? "Not applicable or not recorded"/);
});

test("each feature-to-source relationship points to a declared feature and registry entry", () => {
  const registryIds = new Set(referenceRegistry.map((reference) => reference.id));
  const featureIds = new Set(Object.keys(referenceFeatures));
  for (const reference of referenceRegistry) {
    assert.ok(reference.used_by.length > 0, `${reference.id} must describe its use`);
    for (const feature of reference.used_by) assert.ok(featureIds.has(feature), `${reference.id} -> ${feature}`);
  }
  assert.ok(Object.keys(referenceFeatures).length > 0);
  assert.match(sourceLinks, /getReferencesByIds/);
  const idsInCitations = [...chartStudio.matchAll(/ids=\{\[([^\]]+)\]\}/g)]
    .flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((id) => id[1]));
  assert.ok(idsInCitations.length > 0);
  for (const id of idsInCitations) assert.ok(registryIds.has(id), `citation ID ${id} exists`);
});

test("audit-sensitive references preserve verification and licensing caveats", () => {
  const byId = new Map(referenceRegistry.map((reference) => [reference.id, reference]));
  assert.equal(byId.get("brihat-parashara-hora-shastra-dasha-passage").verification_status, "not_yet_verified");
  assert.match(byId.get("brihat-parashara-hora-shastra-dasha-passage").description, /not available as readable text/);
  assert.equal(byId.get("iers-bulletin-d-product-metadata").verification_status, "not_yet_verified");
  assert.match(byId.get("maitreya8-nakshatra-map").license, /GNU GPL-2\.0-or-later/);
  for (const id of ["saravali-yoni-koota", "saravali-gana-koota", "saravali-nadi-koota", "saravali-varna-koota"]) {
    assert.match(byId.get(id).license, /could not be verified/);
  }
  assert.equal(byId.get("life-d11-attribution-pending").verification_status, "not_yet_verified");
});

test("public references route renders all categories, labels unverified sources and uses safe external links", () => {
  assert.match(page, /References &amp; Sources/);
  assert.match(page, /referenceCategories\.map/);
  assert.match(page, /referenceRegistry\.filter/);
  assert.match(page, /statusLabels\[reference\.verification_status\]/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
  assert.match(page, /not scientifically validated predictions/i);
  assert.match(page, /No research source is currently used to validate astrology as a predictive science/);
});

test("references page is reachable from About and the website footer, with feature citations near chart details", () => {
  assert.match(home, /<a href="\/references">Review LIFE’s references, sources and verification scope<\/a>/);
  assert.match(globalFooter, /<a href="\/references">References<\/a>/);
  assert.match(chartStudio, /<ReferenceLinks title="Calculation and data sources"/);
  assert.match(chartStudio, /<ReferenceLinks title="Calculation conventions"/);
  assert.match(chartStudio, /<ReferenceLinks title="Kundli classification sources"/);
  assert.match(readFileSync(new URL("../src/app/LocationSearch.tsx", import.meta.url), "utf8"), /href="\/references#geonames-cities500"/);
  assert.match(readFileSync(new URL("../src/app/remedies/page.tsx", import.meta.url), "utf8"), /href="\/references#life-remedy-attributions-pending"/);
});
