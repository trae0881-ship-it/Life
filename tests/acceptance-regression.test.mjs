import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateBirthChart } from "../src/calculation/chart.ts";
import { engineHealth } from "../src/calculation/health.ts";
import { applicationReady, databaseHealth } from "../src/server/database-health.ts";
import { answerKundliQuestion } from "../src/presentation/kundli-assistant.ts";
import { assistantQuestionCatalog } from "../src/presentation/assistant-questions.ts";
import { languages } from "../src/presentation/language.ts";
import { hasUsableChartProvenance } from "../src/presentation/chart-provenance.ts";
import { isRestorableSavedChartResult } from "../src/presentation/saved-chart-validation.ts";
import { remedyCatalog, remedyCategories, sortRemedies } from "../src/presentation/remedies.ts";
import { ownedRecordWhere } from "../src/server/ownership.ts";
import { validateBirthForm } from "../src/presentation/birth-form.ts";

const birthInput = {
  fullName: "Acceptance test chart",
  birthPlace: "Mumbai, Maharashtra, India",
  localDate: "1990-05-15",
  localTime: "10:30",
  timeZone: "Asia/Kolkata",
  latitude: 19.076,
  longitude: 72.8777,
  coordinateSource: "gazetteer",
  birthTimeAccuracy: "exact",
  ayanamsa: "Lahiri",
  houseSystem: "WholeSign",
  nodeMode: "mean",
};

test("TC-01 / TC-03 / TC-04: valid, missing-date and invalid-input boundaries", () => {
  const chart = calculateBirthChart(birthInput);
  assert.equal(chart.input.localDate, birthInput.localDate);
  assert.equal(chart.input.localTime, birthInput.localTime);
  assert.equal(chart.input.timeZone, birthInput.timeZone);
  assert.equal(chart.provenance.status, "calculated");
  assert.equal(isRestorableSavedChartResult(chart), true);
  assert.equal(isRestorableSavedChartResult({ ...chart, planets: [] }), false);
  assert.equal(isRestorableSavedChartResult({ input: chart.input, provenance: chart.provenance }), false);
  assert.equal(validateBirthForm({ ...birthInput, localDate: "" }).valid, false);
  assert.equal(validateBirthForm({ ...birthInput, timeZone: "Not/A_Timezone" }).valid, false);
  assert.equal(validateBirthForm({ ...birthInput, latitude: "91" }).valid, false);
});

test("TC-02 / TC-19: saved-record ownership predicate is user scoped", () => {
  assert.deepEqual(ownedRecordWhere("user-a", "chart-1"), { id: "chart-1", userId: "user-a" });
  assert.deepEqual(ownedRecordWhere("user-a"), { userId: "user-a" });
  assert.notDeepEqual(ownedRecordWhere("user-a", "chart-1"), ownedRecordWhere("user-b", "chart-1"));
});

test("TC-05 / TC-06 / TC-25: provenance accepts only calculated current charts", () => {
  const first = calculateBirthChart(birthInput);
  const second = calculateBirthChart({ ...birthInput, localDate: "1991-05-15" });
  assert.notEqual(first.provenance.resultHash, second.provenance.resultHash);
  assert.equal(hasUsableChartProvenance(first), true);
  assert.equal(hasUsableChartProvenance(second), true);
  assert.equal(hasUsableChartProvenance(null), false);
  assert.equal(hasUsableChartProvenance({ ...first, provenance: { ...first.provenance, status: "fixture" } }), false);
  assert.equal(hasUsableChartProvenance({ input: { utc: first.input.utc, timeZone: first.input.timeZone }, provenance: { status: "calculated", resultHash: "" , engineVersion: first.provenance.engineVersion } }), false);
  const page = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(page, /removeItem\("life-current-chart"\)/);
});

test("TC-07: health reports local engine readiness and no external calculation service", async () => {
  const health = await engineHealth();
  assert.equal(typeof health.ready, "boolean");
  assert.equal(health.engine, "@swisseph/node");
  assert.ok(["loaded", "load-failed", "not-loaded"].includes(health.nativeBinding));
  assert.equal(health.outboundCalculationServices, "none");
  assert.match(health.supportedDateRange, /Sampled/);
});

test("database health does not claim connectivity when no database URL is configured", async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.deepEqual(await databaseHealth(), { status: "not-configured", configured: false, checked: true });
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test("application readiness requires both a working engine and connected database", () => {
  assert.equal(applicationReady(true, { status: "connected", configured: true, checked: true }), true);
  assert.equal(applicationReady(false, { status: "connected", configured: true, checked: true }), false);
  assert.equal(applicationReady(true, { status: "unreachable", configured: true, checked: true }), false);
  assert.equal(applicationReady(true, { status: "not-configured", configured: false, checked: true }), false);
  const healthRoute = readFileSync(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8");
  assert.match(healthRoute, /applicationReady\(engine\.ready,\s*database\)/);
  const home = readFileSync(new URL("../src/app/HomepageSections.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(home, /api\/health/);
});

test("TC-08 through TC-12: every question ID routes to its declared intent with chart evidence", () => {
  const chart = calculateBirthChart(birthInput);
  for (const question of assistantQuestionCatalog) {
    const answer = answerKundliQuestion(chart, question.id, "en", new Date("2026-10-17T12:00:00.000Z"));
    assert.equal(answer.topic, question.topic, `wrong intent for ${question.id}`);
    assert.notEqual(answer.status, "needs-chart", `missing chart state for ${question.id}`);
    assert.ok(answer.explanation.trim(), `empty answer for ${question.id}`);
    assert.ok(answer.provenance?.chartId, `missing provenance for ${question.id}`);
    assert.equal(answer.provenance?.ruleSetVersion, chart.provenance.ruleSetVersion, `missing rule-set provenance for ${question.id}`);
  }
  assert.equal(assistantQuestionCatalog.length, 38);
});

test("versioned evaluation tables each cover the catalog exactly once", () => {
  const matrix = readFileSync(new URL("../docs/PREDICTION_QUALITY_EVALUATION_V1.md", import.meta.url), "utf8");
  const evaluatedIds = [...matrix.matchAll(/^\|\s*\d+\s*\|\s*`([^`]+)`/gm)].map((match) => match[1]);
  const catalogIds = assistantQuestionCatalog.map((question) => question.id);
  assert.deepEqual(evaluatedIds, [...catalogIds, ...catalogIds]);
});

test("TC-09 through TC-11: unsupported event questions do not fabricate dates", () => {
  const chart = calculateBirthChart(birthInput);
  for (const id of ["government_timing", "business_start", "property", "foreign_timing", "new_job_timing"]) {
    const answer = answerKundliQuestion(chart, id, "en");
    assert.notEqual(answer.status, "answered", `${id} must not claim a supported event prediction`);
    assert.ok(answer.limitations.length > 0);
    assert.doesNotMatch(`${answer.explanation} ${answer.evidence.join(" ")}`, /\b\d{4}-\d{2}-\d{2}\b/);
    assert.doesNotMatch(`${answer.explanation} ${answer.evidence.join(" ")}`, /\b\d+(?:\.\d+)?%/);
  }
});

test("timing answers use only relevant interpretation sections", () => {
  const chart = calculateBirthChart(birthInput);
  const at = new Date("2026-10-17T12:00:00.000Z");
  const business = answerKundliQuestion(chart, "business_start", "en", at);
  const finance = answerKundliQuestion(chart, "financial_timing", "en", at);
  const careerTimingIds = ["government_timing", "government_dasha", "new_job_timing", "job_transit_dasha"];

  assert.ok(business.evidence.some((item) => item.startsWith("Business factors:")));
  assert.ok(business.evidence.every((item) => !/^(Career|Finances) factors:/.test(item)));
  assert.ok(finance.evidence.some((item) => item.startsWith("Finances factors:")));
  assert.ok(finance.evidence.every((item) => !/^(Career|Business) factors:/.test(item)));
  assert.deepEqual(finance, answerKundliQuestion(chart, "financial_timing", "en", at));
  for (const id of careerTimingIds) {
    const answer = answerKundliQuestion(chart, id, "en", at);
    assert.ok(answer.evidence.some((item) => item.startsWith("Career factors:")), `${id} retains Career evidence`);
    assert.ok(answer.evidence.every((item) => !/^(Education|Business|Finances) factors:/.test(item)), `${id} excludes unrelated sections`);
  }
  const careerDasha = answerKundliQuestion(chart, "career_dasha", "en", at);
  assert.ok(careerDasha.evidence.some((item) => item.startsWith("Career factors:")));
  assert.ok(careerDasha.evidence.some((item) => item.startsWith("Business factors:")));
  assert.ok(careerDasha.evidence.every((item) => !/^(Education|Finances) factors:/.test(item)));
});

test("local chart calculations keep working when external requests fail", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Simulated unavailable external service");
  };
  try {
    const chart = calculateBirthChart(birthInput);
    const answer = answerKundliQuestion(chart, "current_dasha", "en", new Date("2026-10-17T12:00:00.000Z"));
    assert.equal(chart.provenance.status, "calculated");
    assert.notEqual(answer.status, "needs-chart");
    assert.equal((await engineHealth()).outboundCalculationServices, "none");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-13 / TC-14: localized answer types are consistent and no-chart answers are non-personalized", () => {
  const chart = calculateBirthChart(birthInput);
  const answers = languages.map((language) => answerKundliQuestion(chart, "marriage_timing", language));
  assert.ok(answers.every((answer) => answer.status === "limited"));
  assert.equal(new Set(answers.map((answer) => answer.provenance?.chartId)).size, 1);
  const noChart = languages.map((language) => answerKundliQuestion(null, "marriage_timing", language));
  assert.ok(noChart.every((answer) => answer.status === "needs-chart"));
  assert.ok(noChart.every((answer) => answer.evidence.length === 0));
});

test("TC-15 through TC-17 / TC-22: remedies contain real category records, safe text and provenance-gated context", () => {
  assert.deepEqual(new Set(remedyCategories.map((category) => category.id)), new Set(["sattvik", "lal-kitab", "tantra"]));
  for (const category of remedyCategories) {
    const records = remedyCatalog.filter((remedy) => remedy.category === category.id);
    assert.ok(records.length > 0, `missing records for ${category.id}`);
    assert.ok(records.every((remedy) => remedy.safety.en.trim()));
  }
  assert.ok(remedyCatalog.some((remedy) => remedy.category === "tantra" && remedy.name.en.includes("Tantra")));
  assert.ok(remedyCatalog.every((remedy) => !/perform harm|coerce someone|guarantee(?:s|d)? (?:marriage|employment|wealth|outcome)|supernatural power/i.test(JSON.stringify(remedy))));
  assert.equal(hasUsableChartProvenance({}), false);
});

test("TC-18 through TC-21: category filtering data and unknown-price sorting are explicit", () => {
  for (const category of ["sattvik", "lal-kitab", "tantra"]) {
    const filtered = remedyCatalog.filter((remedy) => remedy.category === category);
    assert.ok(filtered.length > 0);
    assert.ok(filtered.every((remedy) => remedy.category === category));
  }
  const records = [
    { id: "free", category: "sattvik", name: { en: "Free" }, price: 0 },
    { id: "paid", category: "sattvik", name: { en: "Paid" }, price: 250 },
    { id: "unknown", category: "sattvik", name: { en: "Unknown" }, price: null },
  ];
  assert.deepEqual(sortRemedies(records, "lowest").map((item) => item.id), ["free", "paid", "unknown"]);
  assert.deepEqual(sortRemedies(records, "highest").map((item) => item.id), ["paid", "free", "unknown"]);
});

test("TC-23: public pages expose human-readable citations without internal rule IDs", () => {
  const publicFiles = [
    "src/app/ChartStudioWorkspace.tsx",
    "src/app/InterpretationPanel.tsx",
    "src/app/KundliAssistant.tsx",
    "src/app/remedies/page.tsx",
    "src/app/marriage-timing/page.tsx",
  ];
  for (const file of publicFiles) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /officialUrl|source_ids|rule_ids|ruleSource/);
  }
  const details = readFileSync(new URL("../src/app/SourceDetails.tsx", import.meta.url), "utf8");
  assert.match(details, /rel="noopener noreferrer"/);
  assert.doesNotMatch(details, /source\.ruleIds|Rules:/);
});

test("Supabase service-role credentials are never referenced by client components", () => {
  const clientFiles = [
    "src/app/ChartStudioWorkspace.tsx",
    "src/app/AccountPanel.tsx",
    "src/app/KundliAssistant.tsx",
    "src/app/remedies/page.tsx",
    "src/app/marriage-timing/page.tsx",
  ];
  for (const file of clientFiles) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|service_role/i);
  }
});

test("TC-24: public page styles include narrow viewport containment", () => {
  for (const file of ["src/app/remedies/remedies.css", "src/app/marriage-timing/marriage-timing.css", "src/app/responsive.css"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /overflow|@media|max-width|min-width/);
  }
});

test("TC-25: invalid session records are rejected without invoking chart answers", () => {
  const invalidRecords = [null, {}, { provenance: { status: "fixture" } }, { input: { timeZone: "Asia/Kolkata" }, provenance: { status: "calculated", resultHash: "x", engineVersion: "local" } }];
  for (const record of invalidRecords) assert.equal(hasUsableChartProvenance(record), false);
});
