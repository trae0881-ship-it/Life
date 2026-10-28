import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePersonalizedRemedies, PERSONALIZED_REMEDIES_RULESET_VERSION } from "../src/presentation/personalized-remedies.ts";
import { remedyCatalog } from "../src/presentation/remedies.ts";

const chart = (overrides = {}) => ({
  input: { utc: "2026-01-01T00:00:00.000Z", timeZone: "Asia/Kolkata", birthPlace: "Test place", birthTimeAccuracy: "exact" },
  settings: { engine: "test-engine", ruleSetVersion: "test-rules" },
  provenance: { status: "calculated", resultHash: "test-hash", engineVersion: "test-engine", ruleSetVersion: "test-rules", calculatedAt: "2026-01-01T00:00:00.000Z" },
  planets: [{ name: "Moon", sign: "Aries", house: 1 }],
  vimshottariDasha: { mahadashas: [{ lord: "Moon", start: "2025-01-01T00:00:00.000Z", end: "2035-01-01T00:00:00.000Z", antardashas: [{ lord: "Mars", start: "2025-01-01T00:00:00.000Z", end: "2026-06-01T00:00:00.000Z" }] }] },
  ...overrides,
});

test("missing, invalid and uncertain charts never receive personalized recommendations", () => {
  assert.equal(evaluatePersonalizedRemedies(null, remedyCatalog, "en").status, "needs_chart");
  assert.equal(evaluatePersonalizedRemedies({ provenance: { status: "calculated" } }, remedyCatalog, "en").status, "needs_chart");
  assert.equal(evaluatePersonalizedRemedies({ ...chart(), input: { ...chart().input, birthTimeAccuracy: "unknown" } }, remedyCatalog, "en").status, "no_supported_rule");
});

test("the default ruleset is explicit and does not promote general catalog entries", () => {
  const result = evaluatePersonalizedRemedies(chart(), remedyCatalog, "hi", "career");
  assert.equal(result.rulesetVersion, PERSONALIZED_REMEDIES_RULESET_VERSION);
  assert.equal(result.status, "no_supported_rule");
  assert.equal(result.recommendations.length, 0);
  assert.match(result.explanation.hi, /पर्याप्त समर्थित/);
});

test("a controlled reviewed rule matches only its required chart condition", () => {
  const rule = {
    id: "test-reviewed-rule",
    version: "test-1",
    remedyId: "planetary-chart-reflection",
    concerns: ["career"],
    category: "sattvik",
    lifecycle: "APPROVED",
    requiredInputs: ["validated provenance", "Moon in Aries"],
    applicableFactors: ["Moon in Aries"],
    source: { title: "Controlled test source", author: "Test reviewer", passageLocator: "fixture", editionOrUrl: "https://example.test/source", status: "verified" },
    review: { reviewer: "test", approvalStatus: "approved", reviewedAt: "2026-01-01", safetyChecked: true },
    safetyExclusions: ["No guaranteed outcomes."],
    confidence: "low",
    matches: (value) => value.planets?.some((planet) => planet.name === "Moon" && planet.sign === "Aries") === true,
    rationale: () => "Controlled test rule only.",
  };
  const matched = evaluatePersonalizedRemedies(chart(), remedyCatalog, "en", "career", new Date("2026-01-01T00:00:00.000Z"), [rule]);
  assert.equal(matched.status, "personalized");
  assert.equal(matched.recommendations[0].ruleId, "test-reviewed-rule");
  const notMatched = evaluatePersonalizedRemedies(chart({ planets: [{ name: "Moon", sign: "Taurus", house: 1 }] }), remedyCatalog, "en", "career", new Date(), [rule]);
  assert.equal(notMatched.status, "no_supported_rule");
});

test("Dasha boundaries are evaluated with start inclusive and end exclusive semantics", () => {
  const rule = {
    id: "test-dasha-rule",
    version: "test-1",
    remedyId: "planetary-chart-reflection",
    concerns: ["planetary"],
    category: "sattvik",
    lifecycle: "APPROVED",
    requiredInputs: ["validated provenance", "current Dasha"],
    applicableFactors: ["Current Mahadasha"],
    source: { title: "Controlled test source", author: "Test reviewer", passageLocator: "fixture", editionOrUrl: "https://example.test/source", status: "verified" },
    review: { reviewer: "test", approvalStatus: "approved", reviewedAt: "2026-01-01", safetyChecked: true },
    safetyExclusions: ["No guaranteed outcomes."],
    confidence: "low",
    matches: (value, now) => {
      const maha = value.vimshottariDasha.mahadashas[0];
      return Date.parse(maha.start) <= now.getTime() && now.getTime() < Date.parse(maha.end);
    },
    rationale: () => "Controlled Dasha boundary test only.",
  };
  assert.equal(evaluatePersonalizedRemedies(chart(), remedyCatalog, "en", "planetary", new Date("2025-01-01T00:00:00.000Z"), [rule]).status, "personalized");
  assert.equal(evaluatePersonalizedRemedies(chart(), remedyCatalog, "en", "planetary", new Date("2035-01-01T00:00:00.000Z"), [rule]).status, "no_supported_rule");
});

test("draft, pending, rejected and retired rules never activate", () => {
  const base = {
    id: "test-lifecycle",
    version: "1",
    remedyId: "planetary-chart-reflection",
    concerns: ["career"],
    category: "sattvik",
    requiredInputs: ["validated provenance"],
    applicableFactors: ["controlled factor"],
    source: { title: "Source", author: "Author", passageLocator: "p. 1", editionOrUrl: "https://example.test", status: "verified" },
    review: { reviewer: "reviewer", approvalStatus: "approved", reviewedAt: "2026-01-01", safetyChecked: true },
    safetyExclusions: ["No guarantee."],
    confidence: "low",
    matches: () => true,
    rationale: () => "Controlled test rule.",
  };
  for (const lifecycle of ["DRAFT", "SOURCE_PENDING", "REVIEW_REQUIRED", "REJECTED", "RETIRED"]) {
    const result = evaluatePersonalizedRemedies(chart(), remedyCatalog, "en", "career", new Date(), [{ ...base, lifecycle }]);
    assert.equal(result.status, "no_supported_rule", lifecycle);
  }
});

test("approved rules require complete source and safety review", () => {
  const incomplete = {
    id: "incomplete",
    version: "1",
    remedyId: "planetary-chart-reflection",
    concerns: ["career"],
    category: "sattvik",
    lifecycle: "APPROVED",
    requiredInputs: ["validated provenance"],
    applicableFactors: ["controlled factor"],
    source: { title: null, author: null, passageLocator: null, editionOrUrl: null, status: "pending" },
    review: { reviewer: null, approvalStatus: "not-reviewed", reviewedAt: null, safetyChecked: false },
    safetyExclusions: [],
    confidence: "low",
    matches: () => true,
    rationale: () => "Must not activate.",
  };
  assert.equal(evaluatePersonalizedRemedies(chart(), remedyCatalog, "en", "career", new Date(), [incomplete]).status, "no_supported_rule");
});
