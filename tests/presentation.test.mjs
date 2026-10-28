import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canSubmitBirthForm, hasChartCalculationInputs, validateBirthForm } from "../src/presentation/birth-form.ts";
import { faqCategories, faqQuestions, searchFaq } from "../src/presentation/faq.ts";
import { hasTranslation, isLanguage, languages, missingTranslations, translate, translationKeys } from "../src/presentation/language.ts";
import { LANGUAGE_STORAGE_KEY, readLanguagePreference, writeLanguagePreference } from "../src/presentation/language-preference.ts";
import { missingResultCopy, resultCopy, resultCopyKeys } from "../src/presentation/result-copy.ts";
import { hasUsableChartProvenance } from "../src/presentation/chart-provenance.ts";
import { validateBirthRecord, validateChartInput } from "../src/server/birth-validation.ts";
import { calculateBirthChart } from "../src/calculation/chart.ts";

const screenshotDetails = {
  fullName: "Amrendra kumar pal",
  birthPlace: "Rajpura, Punjab, India",
  localDate: "1997-04-27",
  localTime: "05:45",
  timeZone: "Asia/Kolkata",
  latitude: "30.483997",
  longitude: "76.593948",
  timeKnown: true,
};

test("the supplied Rajpura example is valid and remains valid without an optional name", () => {
  assert.deepEqual(validateBirthForm(screenshotDetails), { valid: true });
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, fullName: "" }), { valid: true });
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, fullName: undefined }), { valid: true });
});

test("production workspace does not preload or expose the test birth example", () => {
  const source = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /loadExampleBirthDetails|Amrendra kumar pal|Rajpura, Punjab/);
});

test("personalization requires calculated chart provenance", () => {
  assert.equal(hasUsableChartProvenance(null), false);
  assert.equal(hasUsableChartProvenance({ input: { utc: "2026-01-01T00:00:00.000Z", timeZone: "Asia/Kolkata" }, provenance: { status: "calculated", resultHash: "hash", engineVersion: "local" } }), true);
  assert.equal(hasUsableChartProvenance({ input: { utc: "2026-01-01T00:00:00.000Z", timeZone: "Asia/Kolkata" }, provenance: { status: "fixture", resultHash: "hash", engineVersion: "local" } }), false);
});

test("public answer pages show applicable source citations without exposing internal rule IDs", () => {
  const page = readFileSync(new URL("../src/app/marriage-timing/page.tsx", import.meta.url), "utf8");
  const sourceDetails = readFileSync(new URL("../src/app/SourceDetails.tsx", import.meta.url), "utf8");
  const interpretation = readFileSync(new URL("../src/app/InterpretationPanel.tsx", import.meta.url), "utf8");
  assert.match(page, /marriageTimingSourcesForResult/);
  assert.match(page, /<SourceDetails sources=/);
  assert.doesNotMatch(sourceDetails, /source\.ruleIds|Rules:/);
  assert.match(sourceDetails, /rel="noopener noreferrer"/);
  assert.doesNotMatch(interpretation, /ruleSource|sourceEnglish/);
});

test("assistant requests are persisted against a selected owned chart and history is server-loaded", () => {
  const source = readFileSync(new URL("../src/app/KundliAssistant.tsx", import.meta.url), "utf8");
  assert.match(source, /api\/assistant\/questions/);
  assert.match(source, /savedChartId: selectedChartId/);
  assert.match(source, /chart\?\.provenance\?\.resultHash/);
  assert.match(source, /requestId: window\.crypto\.randomUUID\(\)/);
});

test("birthplace and location details are optional until a time-based chart is requested", () => {
  assert.deepEqual(validateBirthForm({ localDate: "1997-04-27", timeKnown: false }), { valid: true });
  assert.equal(hasChartCalculationInputs({ localDate: "1997-04-27", timeKnown: false }), false);
  assert.equal(hasChartCalculationInputs(screenshotDetails), true);
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, birthPlace: "Asia/Kolkata", timeZone: "Europe/London" }), { valid: true });
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, timeZone: "Not/A_Timezone" }), {
    valid: false,
    field: "timeZone",
    messageKey: "validation.timeZone",
  });
});

test("date/time formats and coordinate bounds are checked without locale-dependent date display", () => {
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, localDate: "1997-02-29" }), {
    valid: false,
    field: "localDate",
    messageKey: "validation.date",
  });
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, localTime: "5:45 AM" }), {
    valid: false,
    field: "localTime",
    messageKey: "validation.time",
  });
  for (const [field, value, messageKey] of [
    ["latitude", "90.01", "validation.latitude"],
    ["latitude", "NaN", "validation.latitude"],
    ["longitude", "-180.01", "validation.longitude"],
  ]) {
    assert.deepEqual(validateBirthForm({ ...screenshotDetails, [field]: value }), {
      valid: false,
      field,
      messageKey,
    });
  }
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, latitude: "-90", longitude: "180" }), { valid: true });
});

test("missing birth time stays blank and is never replaced with noon or midnight", () => {
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, localTime: "", timeKnown: false }), { valid: true });
  assert.equal(hasChartCalculationInputs({ ...screenshotDetails, localTime: "", timeKnown: false }), false);
  const source = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(source, /name="localTime" type="time" step="60"/);
  assert.doesNotMatch(source, /name="localTime"[^>]*value="(?:00:00|12:00)"/);
});

test("DOB-only profiles persist null optional values while preserving known profile details", () => {
  const dobOnly = validateBirthRecord({ localDate: "1997-04-27" });
  assert.deepEqual(dobOnly, {
    birthPlace: null,
    localDate: "1997-04-27",
    localTime: null,
    timeZone: null,
    latitude: null,
    longitude: null,
    birthTimeAccuracy: null,
  });
  const partial = validateBirthRecord({ localDate: "1997-04-27", birthPlace: "Rajpura", localTime: "05:45", birthTimeAccuracy: "exact" });
  assert.equal(partial.birthPlace, "Rajpura");
  assert.equal(partial.localTime, "05:45");
  assert.equal(partial.timeZone, null);
  assert.equal(partial.latitude, null);
  assert.equal(partial.birthTimeAccuracy, "exact");
  const accountPanel = readFileSync(new URL("../src/app/AccountPanel.tsx", import.meta.url), "utf8");
  assert.match(accountPanel, /\(chart \|\| profileDraft\.localDate\)/);
  assert.match(accountPanel, /localDate: source\.localDate/);
  assert.throws(() => validateChartInput({ localDate: "1997-04-27" }), /recorded local time.*No time or location was assumed/i);
  const full = validateChartInput({
    localDate: "1997-04-27",
    localTime: "05:45",
    timeZone: "Asia/Kolkata",
    latitude: 30.483997,
    longitude: 76.593948,
  });
  assert.equal(full.localTime, "05:45");
  assert.equal(full.latitude, 30.483997);
});

test("empty optional browser fields do not carry required validation", () => {
  const source = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
  for (const field of ["localTime", "birthTimeAccuracy", "timeZone", "latitude", "longitude", "birthPlace"]) {
    const fieldTag = source.match(new RegExp(`<input name="${field}"[^>]*>|<select name="${field}"[^>]*>`))?.[0];
    assert.ok(fieldTag, `${field} input exists`);
    assert.doesNotMatch(fieldTag, /required|aria-required="true"/, `${field} must remain optional`);
  }
  assert.match(source, /name="localDate" type="date"[^>]*required aria-required="true"/);
});

test("birth-time accuracy is unset until explicitly selected and location has no default", () => {
  const source = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(source, /name="birthTimeAccuracy" defaultValue=""><option value="">/);
  assert.doesNotMatch(source, /name="timeZone"[^>]*value="(?:Etc\/UTC|Asia\/Kolkata)"/);
  assert.doesNotMatch(source, /name="latitude"[^>]*value="(?:26|28)\./);
  assert.doesNotMatch(source, /name="longitude"[^>]*value="(?:80|77)\./);
});

test("the chart profile/report continues to distinguish a genuinely known time from a missing one", () => {
  const fullProfile = validateBirthRecord({
    birthPlace: "Rajpura, Punjab, India", localDate: "1997-04-27", localTime: "05:45", timeZone: "Asia/Kolkata",
    latitude: 30.483997, longitude: 76.593948, birthTimeAccuracy: "exact",
  });
  assert.deepEqual(fullProfile, {
    birthPlace: "Rajpura, Punjab, India", localDate: "1997-04-27", localTime: "05:45", timeZone: "Asia/Kolkata",
    latitude: 30.483997, longitude: 76.593948, birthTimeAccuracy: "exact",
  });
  assert.equal(validateBirthRecord({ localDate: "1997-04-27" }).localTime, null);
  const chart = calculateBirthChart(validateChartInput(fullProfile));
  assert.ok(chart.planets.some((planet) => planet.name === "Moon"));
  assert.equal(chart.input.localTime, "05:45");
  assert.equal(chart.input.birthTimeAccuracy, "exact");
});

test("empty optional birth time is not interpreted as unknown-time validation failure", () => {
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, timeKnown: false }), { valid: true });
  assert.deepEqual(validateBirthForm({ ...screenshotDetails, timeKnown: false, localTime: "" }), { valid: true });
});

test("Calculate enables only for valid input and is disabled while a request is in progress", () => {
  assert.equal(canSubmitBirthForm(true, false), true);
  assert.equal(canSubmitBirthForm(true, true), false);
  assert.equal(canSubmitBirthForm(false, false), false);
  assert.equal(canSubmitBirthForm(true, false), true, "recoverable errors restore the button when busy clears");
});

test("all FAQ questions have translations, and search and category filters work", () => {
  assert.equal(faqQuestions.length, 31);
  assert.equal(faqCategories.length, 6);
  for (const question of faqQuestions) {
    assert.ok(translationKeys.includes(question.questionKey), `missing question translation: ${question.questionKey}`);
    assert.ok(translationKeys.includes(question.answerKey), `missing answer translation: ${question.answerKey}`);
    assert.notEqual(translate("hi", question.questionKey), translate("en", question.questionKey), `Hindi question not translated: ${question.id}`);
    assert.notEqual(translate("hi", question.answerKey), translate("en", question.answerKey), `Hindi answer not translated: ${question.id}`);
    assert.notEqual(translate("hinglish", question.questionKey), translate("en", question.questionKey), `Hinglish question not translated: ${question.id}`);
    assert.notEqual(translate("hinglish", question.answerKey), translate("en", question.answerKey), `Hinglish answer not translated: ${question.id}`);
  }
  assert.equal(searchFaq("", "all", "en").length, 31);
  assert.ok(searchFaq("Vimshottari", "timing", "en").some((item) => item.id === "vimshottari"));
  assert.ok(searchFaq("लाहिड़ी", "life", "hi").some((item) => item.id === "lahiri"));
  assert.ok(searchFaq("accuracy", "life", "hinglish").some((item) => item.id === "birth-time"));
  assert.deepEqual(searchFaq("Lahiri", "career", "en"), []);
  assert.deepEqual(searchFaq("no matching question", "all", "en"), []);
  for (const language of languages) {
    for (const question of faqQuestions) {
      assert.ok(translate(language, question.questionKey).trim());
      assert.ok(translate(language, question.answerKey).trim());
    }
  }
  assert.ok(searchFaq("विंशोत्तरी", "timing", "hi").some((item) => item.id === "vimshottari"));
  assert.ok(searchFaq("Vimshottari", "timing", "hinglish").some((item) => item.id === "vimshottari"));
});

test("language switching uses supported persisted identifiers and no translation keys are missing", () => {
  assert.deepEqual(languages, ["en", "hi", "hinglish"]);
  for (const language of languages) assert.deepEqual(missingTranslations(language), []);
  for (const language of languages) assert.deepEqual(missingResultCopy(language), []);
  assert.equal(isLanguage("hi"), true);
  assert.equal(isLanguage("fr"), false);
  assert.notEqual(translate("en", "faq.title"), translate("hi", "faq.title"));
  assert.equal(translationKeys.length > 150, true);
  assert.ok(hasTranslation("hi", "chart.samePlacements"));
  assert.ok(hasTranslation("hinglish", "interpretation.evidenceNote"));
  assert.equal(hasTranslation("hi", "not.a.translation.key"), false);
  assert.match(translate("hi", "not.a.translation.key"), /Translation unavailable/);
  assert.match(translate("hi", "faq.simple.lagna"), /लग्न/);
  assert.match(translate("hi", "faq.simple.nakshatra"), /नक्षत्र/);
  assert.match(translate("hi", "faq.simple.dasha"), /दशा/);
  assert.match(translate("hinglish", "faq.simple.graha"), /Graha/);
});

test("static UI translation calls and Kundli explanation keys are registered", () => {
  const files = [
    "../src/app/page.tsx",
    "../src/app/KundliChart.tsx",
    "../src/app/InterpretationPanel.tsx",
    "../src/app/AstrologyFaq.tsx",
    "../src/app/AccountPanel.tsx",
    "../src/app/TranslationNotice.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    for (const match of source.matchAll(/(?:translate\(language,\s*|\bt\()\s*["']([^"']+)["']\s*\)/g)) {
      assert.ok(hasTranslation("en", match[1]), `${file}: missing English UI key ${match[1]}`);
      assert.ok(hasTranslation("hi", match[1]), `${file}: missing Hindi UI key ${match[1]}`);
      assert.ok(hasTranslation("hinglish", match[1]), `${file}: missing Hinglish UI key ${match[1]}`);
    }
    for (const match of source.matchAll(/\br\(\s*["'](results\.[^"']+)["']\s*\)/g)) {
      assert.ok(resultCopyKeys().includes(match[1]), `${file}: missing result-copy key ${match[1]}`);
    }
  }
  for (const section of ["Personality", "Education", "Career", "Business", "Finances", "Relationships", "Spiritual interests", "Dasha", "Transits", "Yogas and Doshas", "Planetary strengths"]) {
    for (const language of languages) assert.ok(resultCopy(language, `results.prediction.${section}`).trim());
  }
});

test("language presentation does not mutate calculated chart data", () => {
  const chartData = Object.freeze({
    ascendant: Object.freeze({ sign: "Aries", longitude: 4.123456 }),
    planets: Object.freeze([Object.freeze({ name: "Moon", sign: "Taurus", longitude: 43.987654, nakshatra: "Rohini", pada: 2 })]),
    resultHash: "unchanged-hash",
  });
  const before = JSON.stringify(chartData);
  for (const language of languages) {
    translate(language, "results.guide");
    resultCopy(language, "results.calculatedPositions");
  }
  assert.equal(JSON.stringify(chartData), before);
});

test("language preference is restored by a fresh page instance", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  writeLanguagePreference(storage, "hi");
  assert.equal(values.get(LANGUAGE_STORAGE_KEY), "hi");
  assert.equal(readLanguagePreference(storage), "hi");
  values.set(LANGUAGE_STORAGE_KEY, "fr");
  assert.equal(readLanguagePreference(storage), "en");
});

test("FAQ search and category filtering return translated answer keys for each language", () => {
  for (const language of languages) {
    const matches = searchFaq("", "basics", language);
    assert.ok(matches.length > 0);
    for (const item of matches) {
      assert.ok(translate(language, item.questionKey).trim());
      assert.ok(translate(language, item.answerKey).trim());
    }
  }
});
