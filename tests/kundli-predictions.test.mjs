import test from "node:test";
import assert from "node:assert/strict";
import { buildRashiLayout } from "../src/presentation/kundli-layout.ts";
import { interpretChart } from "../src/interpretation/rules.ts";
import { answerKundliQuestion, suggestedAssistantTopics } from "../src/presentation/kundli-assistant.ts";
import { assistantQuestionCatalog, filterAssistantQuestions } from "../src/presentation/assistant-questions.ts";
import { languages, translate } from "../src/presentation/language.ts";
import { resolveTransitRequest } from "../src/calculation/transit-input.ts";
import { calculateTransits } from "../src/calculation/events.ts";
import { InputError } from "../src/calculation/time.ts";

const planets = [
  { name: "Sun", sign: "Aries", house: 4, motion: "Direct" },
  { name: "Moon", sign: "Cancer", house: 8, motion: "Direct" },
  { name: "Mars", sign: "Aries", house: 4, motion: "Retrograde" },
  { name: "Saturn", sign: "Pisces", house: 3, motion: "Direct" },
];

test("Rashi layout maps signs and planets consistently for both presentation layouts", () => {
  const placements = buildRashiLayout(planets, "Cancer");
  const byHouse = placements.slice().sort((a, b) => a.house - b.house);
  assert.equal(byHouse[0].sign, "Cancer");
  assert.equal(byHouse[0].isLagna, true);
  assert.deepEqual(byHouse[0].planets.map((planet) => planet.name), ["Moon"]);
  assert.deepEqual(placements.find((item) => item.sign === "Aries").planets.map((planet) => planet.name), ["Sun", "Mars"]);
  assert.equal(placements.find((item) => item.sign === "Aries").house, 10);
  assert.equal(placements.find((item) => item.sign === "Gemini").planets.length, 0);
  assert.throws(() => buildRashiLayout(planets, "Not a sign"), /Unsupported ascendant/);
});

const interpretationFixture = {
  input: { utc: "1997-04-26T00:15:00.000Z", localDate: "1997-04-26", localTime: "05:45", timeZone: "Asia/Kolkata" },
  ascendant: { sign: "Cancer", longitude: 95.5 },
  planets: [
    { name: "Sun", sign: "Aries", siderealLongitude: 12, house: 10, motion: "Direct" },
    { name: "Moon", sign: "Cancer", siderealLongitude: 96, house: 1, motion: "Direct" },
    { name: "Mars", sign: "Virgo", siderealLongitude: 155, house: 3, motion: "Retrograde" },
    { name: "Mercury", sign: "Taurus", siderealLongitude: 44, house: 11, motion: "Direct" },
    { name: "Jupiter", sign: "Aquarius", siderealLongitude: 310, house: 8, motion: "Direct" },
    { name: "Venus", sign: "Gemini", siderealLongitude: 70, house: 12, motion: "Direct" },
    { name: "Saturn", sign: "Pisces", siderealLongitude: 340, house: 9, motion: "Direct" },
  ],
  planetaryDignity: [
    { name: "Sun", dignity: "Exalted", sign: "Aries", signLord: "Mars" },
    { name: "Moon", dignity: "Own sign", sign: "Cancer", signLord: "Moon" },
    { name: "Mars", dignity: "Neutral", sign: "Virgo", signLord: "Mercury" },
    { name: "Mercury", dignity: "Friendly", sign: "Taurus", signLord: "Venus" },
    { name: "Jupiter", dignity: "Neutral", sign: "Aquarius", signLord: "Saturn" },
    { name: "Venus", dignity: "Friendly", sign: "Gemini", signLord: "Mercury" },
    { name: "Saturn", dignity: "Friendly", sign: "Pisces", signLord: "Jupiter" },
  ],
  yogasAndDoshas: [
    { id: "sample-present", name: "Sample yoga", category: "yoga", present: true, rule: "Sun occupies the 10th Rashi house.", planets: ["Sun"] },
    { id: "sample-absent", name: "Not present", category: "dosha", present: false, rule: "A different condition.", planets: [] },
  ],
  vimshottariDasha: {
    convention: { yearDays: 365.2425 },
    mahadashas: [{
      lord: "Jupiter", start: "2024-01-01T00:00:00.000Z", end: "2040-01-01T00:00:00.000Z",
      antardashas: [{
        lord: "Mercury", start: "2025-01-01T00:00:00.000Z", end: "2027-01-01T00:00:00.000Z",
        pratyantardashas: [{ lord: "Saturn", start: "2026-01-01T00:00:00.000Z", end: "2026-06-01T00:00:00.000Z" }],
      }],
    }],
  },
  transits: {
    instantUtc: "2026-10-17T06:30:00.000Z",
    bodies: [{ name: "Sun", sign: "Libra", longitude: 195 }],
  },
};

test("rule-based interpretations identify only chart-supported factors and matched rules", () => {
  const report = interpretChart(interpretationFixture, new Date("2026-03-01T00:00:00.000Z"));
  const allItems = report.sections.flatMap((section) => section.interpretations);
  assert.ok(allItems.some((item) => item.section === "Personality" && item.factors.some((factor) => factor.includes("Cancer"))));
  assert.ok(allItems.some((item) => item.section === "Career" && item.factors.some((factor) => factor.includes("10"))));
  assert.match(allItems.find((item) => item.section === "Career").reading, /House 10 \(Aries\) lord Mars is in Virgo, house 3/);
  assert.ok(allItems.some((item) => item.title === "Sample yoga" && item.rule === "Sun occupies the 10th Rashi house."));
  assert.ok(!allItems.some((item) => item.title === "Not present"));
  assert.ok(allItems.some((item) => item.section === "Dasha" && item.factors.some((factor) => factor.includes("Jupiter"))));
  assert.ok(allItems.some((item) => item.section === "Transits" && item.factors.some((factor) => factor.includes("Transit Sun: Libra"))));
  assert.ok(report.summary && report.summary.finalConclusion.length > 0);
  assert.ok(report.summary.finalConclusion.includes("Cancer") || report.summary.finalConclusion.includes("Lagna"));
  assert.ok(report.summary.strongFactors.length > 0 && report.summary.cautionAreas.length > 0);
  assert.ok(allItems.every((item) => item.factors.length > 0 && item.matchedConditions.length > 0 && item.reading.length > 0 && item.limitation.length > 0));
  assert.match(report.disclaimer, /not scientifically established/i);
  const health = report.sections.find((section) => section.name === "Health indicators");
  assert.equal(health, undefined);
  assert.ok(allItems.some((item) => item.section === "Business" && item.factors.some((factor) => factor.includes("House 3:"))));
  assert.ok(allItems.some((item) => item.section === "Relationships" && item.factors.some((factor) => factor.includes("House 8:"))));
  assert.ok(!allItems.some((item) => item.section === "Education" && item.title.includes("D10")));
  assert.deepEqual(report.sections.find((section) => section.name === "Personality").interpretations[0].evidenceStrength, "multiple calculated factors");
});

test("personal assistant uses this chart's calculated Lagna, Moon placement and evidence", () => {
  const chart = structuredClone(interpretationFixture);
  chart.planets.find((planet) => planet.name === "Moon").nakshatra = "Pushya";
  chart.planets.find((planet) => planet.name === "Moon").pada = 2;
  const answer = answerKundliQuestion(chart, "basics", "en");
  assert.equal(answer.status, "answered");
  assert.ok(answer.evidence.some((item) => item.includes("Lagna: Cancer")));
  assert.ok(answer.evidence.some((item) => item.includes("Moon: Cancer; Nakshatra Pushya, Pada 2")));
  assert.match(answer.disclaimer, /not scientifically established/i);

  chart.ascendant.sign = "Leo";
  const changed = answerKundliQuestion(chart, "basics", "en");
  assert.ok(changed.evidence.some((item) => item.includes("Lagna: Leo")));
  assert.ok(!changed.evidence.some((item) => item.includes("Lagna: Cancer")));
});

test("assistant explains current Dasha, transit and interpretation with chart evidence", () => {
  const dasha = answerKundliQuestion(interpretationFixture, "dasha", "en", new Date("2026-03-01T00:00:00.000Z"));
  assert.equal(dasha.status, "answered");
  assert.ok(dasha.evidence.some((item) => item.includes("Mahadasha: Jupiter")));
  assert.ok(dasha.evidence.some((item) => item.includes("Antardasha: Mercury")));
  assert.ok(dasha.evidence.some((item) => item.includes("Pratyantardasha: Saturn")));

  const transit = answerKundliQuestion(interpretationFixture, "transits", "en");
  assert.ok(transit.evidence.some((item) => item.includes("Transit Sun: Libra")));
  assert.ok(transit.evidence.some((item) => item.includes("2026-10-17T06:30:00.000Z")));

  const interpretation = answerKundliQuestion(interpretationFixture, "interpretation", "en", new Date("2026-03-01T00:00:00.000Z"));
  assert.equal(interpretation.status, "answered");
  assert.ok(interpretation.evidence.some((item) => item.includes("Career")));
  assert.match(interpretation.evidenceDisclosure, /not machine-translated/i);
});

test("selected calculation-backed questions disclose their exact chart rule and facts", () => {
  const cases = [
    ["marriage_factors", "Project-selected relationship context: houses 2, 7 and 8"],
    ["partner_indicators", "Project-selected relationship context: houses 2, 7 and 8"],
    ["government_indicators", "Project-selected career context: houses 6, 10 and 11"],
    ["career_growth", "Project-selected career context: houses 6, 10 and 11"],
    ["foreign_travel_indicators", "Project-selected foreign-travel context: calculated houses 3, 9 and 12"],
  ];
  for (const [question, rule] of cases) {
    const chart = question === "foreign_travel_indicators"
      ? {
        ...structuredClone(interpretationFixture),
        houses: [3, 9, 12].map((house) => ({ house, sign: "Aries", cuspLongitude: house * 30 })),
      }
      : interpretationFixture;
    const answer = answerKundliQuestion(chart, question, "en");
    assert.ok(["answered", "limited"].includes(answer.status), question);
    assert.ok(answer.evidence.some((item) => item.startsWith(rule)), question);
    assert.ok(answer.evidence.some((item) => /House \d+/.test(item)), question);
    if (answer.status === "limited") assert.ok(answer.limitations.length > 0, question);
  }
});

test("selected-rule evidence exposes convention provenance, matched inputs, and conflicts without ranking them", () => {
  const chart = structuredClone(interpretationFixture);
  chart.planetaryDignity.find((item) => item.name === "Saturn").dignity = "Debilitated";
  const answer = answerKundliQuestion(chart, "career_growth", "en");

  assert.ok(answer.evidence.some((item) => item.includes("Rule convention (not a source-reviewed outcome rule):")));
  assert.ok(answer.evidence.some((item) => item.includes("Rule provenance: Parashari house topics")));
  assert.ok(answer.evidence.some((item) => item.startsWith("Matched chart conditions:")));
  assert.ok(answer.evidence.some((item) => item.includes("Conflicting chart factors: Saturn has reported debilitated dignity")));
  assert.ok(answer.limitations.length > 0);
  assert.doesNotMatch(answer.explanation, /probability|guarantee/i);
});

test("selected-rule evidence does not fabricate a match when required factors are missing", () => {
  const chart = structuredClone(interpretationFixture);
  chart.planets = chart.planets.filter((planet) => planet.name !== "Saturn");
  const report = interpretChart(chart, new Date("2026-03-01T00:00:00.000Z"));
  assert.equal(report.sections.find((section) => section.name === "Career")?.available, false);

  const answer = answerKundliQuestion(chart, "career_growth", "en");
  assert.equal(answer.status, "unavailable");
  assert.deepEqual(answer.evidence, []);
  assert.ok(answer.limitations.length > 0);
});

test("career and exam questions use only their matching interpretation sections", () => {
  const career = answerKundliQuestion(interpretationFixture, "government_indicators", "en");
  const exams = answerKundliQuestion(interpretationFixture, "competitive_exams", "en");

  assert.ok(career.evidence.some((item) => item.startsWith("Career factors:")));
  assert.ok(!career.evidence.some((item) => item.startsWith("Education factors:")));
  assert.ok(exams.evidence.some((item) => item.startsWith("Education factors:")));
  assert.ok(!exams.evidence.some((item) => item.startsWith("Career factors:")));

  const noCareerPlanets = structuredClone(interpretationFixture);
  noCareerPlanets.planets = noCareerPlanets.planets.filter((planet) => !["Saturn", "Sun", "Mercury"].includes(planet.name));
  const unavailableCareer = answerKundliQuestion(noCareerPlanets, "career_growth", "en");
  assert.equal(unavailableCareer.status, "unavailable");
  assert.deepEqual(unavailableCareer.evidence, []);
});

test("calculation-backed question explanations remain localized without adding unsupported timing", () => {
  for (const language of languages) {
    const answer = answerKundliQuestion(interpretationFixture, "career_growth", language);
    assert.ok(["answered", "limited"].includes(answer.status));
    assert.ok(answer.explanation.length > 0);
    assert.ok(answer.limitations.length > 0);
    assert.ok(!answer.evidence.some((item) => /\b20\d\d-\d\d-\d\d\b/.test(item)));
  }
});

test("relationship and career rules fail closed when required planetary facts are missing", () => {
  const relationshipMissing = structuredClone(interpretationFixture);
  relationshipMissing.planets = relationshipMissing.planets.filter((planet) => !["Venus", "Jupiter"].includes(planet.name));
  const relationshipReport = interpretChart(relationshipMissing, new Date("2026-03-01T00:00:00.000Z"));
  assert.equal(relationshipReport.sections.find((section) => section.name === "Relationships")?.available, false);

  const careerMissing = structuredClone(interpretationFixture);
  careerMissing.planets = careerMissing.planets.filter((planet) => !["Saturn", "Sun", "Mercury"].includes(planet.name));
  const careerReport = interpretChart(careerMissing, new Date("2026-03-01T00:00:00.000Z"));
  assert.equal(careerReport.sections.find((section) => section.name === "Career")?.available, false);
});

test("localized selected-rule answers distinguish calculated facts from interpretation", () => {
  const english = answerKundliQuestion(interpretationFixture, "marriage_factors", "en");
  assert.match(english.explanation, /documented relationship context rule/i);
  assert.match(english.explanation, /calculated chart facts/i);
  assert.doesNotMatch(english.explanation, /D9|5th|Moon/);

  const governmentEnglish = answerKundliQuestion(interpretationFixture, "government_indicators", "en");
  assert.match(governmentEnglish.explanation, /not a government-employment classifier/i);

  for (const language of ["hi", "hinglish"]) {
    const relationship = answerKundliQuestion(interpretationFixture, "marriage_factors", language);
    const career = answerKundliQuestion(interpretationFixture, "government_indicators", language);
    assert.ok(relationship.explanation.length > 0);
    assert.ok(career.explanation.length > 0);
    assert.ok(relationship.limitations.some((item) => item.length > 20));
    assert.ok(career.limitations.some((item) => item.length > 20));
  }
});

test("assistant uses actual D1, D9 and D10 placements or discloses missing divisional data", () => {
  const chart = {
    ...interpretationFixture,
    divisionalCharts: {
      D9: [{ name: "Moon", sign: "Virgo", degreesInSign: 7.25 }],
      D10: [{ name: "Sun", sign: "Capricorn", degreesInSign: 2.5 }],
    },
  };
  const answer = answerKundliQuestion(chart, "vargas", "en");
  assert.ok(answer.evidence.some((item) => item.includes("D1 placements")));
  assert.ok(answer.evidence.some((item) => item.includes("Moon: Virgo, 7.2500°")));
  assert.ok(answer.evidence.some((item) => item.includes("Sun: Capricorn, 2.5000°")));

  const partial = answerKundliQuestion({ ...chart, divisionalCharts: undefined }, "D9", "en");
  assert.equal(partial.status, "unavailable");
  assert.ok(partial.evidence[0].startsWith("D9: "));
});

test("assistant reports missing chart data and unsupported questions without inventing placements", () => {
  assert.equal(answerKundliQuestion(null, "basics", "en").status, "needs-chart");
  const unsupported = answerKundliQuestion(interpretationFixture, "Will I definitely become wealthy?", "en");
  assert.equal(unsupported.status, "unsupported");
  assert.deepEqual(unsupported.evidence, []);

  const withoutTransit = { ...interpretationFixture, transits: undefined };
  assert.equal(answerKundliQuestion(withoutTransit, "transits", "en").status, "unavailable");
  const withoutMoon = { ...interpretationFixture, planets: interpretationFixture.planets.filter((planet) => planet.name !== "Moon") };
  assert.equal(answerKundliQuestion(withoutMoon, "basics", "en").status, "unavailable");
  const withoutDasha = answerKundliQuestion(interpretationFixture, "dasha", "en", new Date("2050-01-01T00:00:00.000Z"));
  assert.equal(withoutDasha.status, "unavailable");
  assert.ok(!withoutDasha.evidence.some((item) => item.includes("Mahadasha:")));
});

test("popular question catalog has translated labels and marriage/government questions first", () => {
  assert.equal(assistantQuestionCatalog.length, 38);
  assert.deepEqual(assistantQuestionCatalog.slice(0, 8).map((item) => item.category), Array(8).fill("marriage"));
  assert.deepEqual(assistantQuestionCatalog.slice(8, 16).map((item) => item.category), Array(8).fill("government"));
  for (const language of languages) {
    for (const item of assistantQuestionCatalog) {
      const label = translate(language, `assistant.popular.${item.id}`);
      assert.ok(label.trim());
      assert.ok(!label.startsWith("⚠"), `${language} translation missing for ${item.id}`);
      assert.ok(item.topic);
    }
    for (const key of ["assistant.search", "assistant.noQuestions", "assistant.category.marriage", "assistant.category.government", "assistant.limitations", "assistant.followups"]) {
      assert.ok(translate(language, key).trim());
      assert.ok(!translate(language, key).startsWith("⚠"), `${language} translation missing for ${key}`);
    }
  }
});

test("popular-question search and category filters use translated labels and prioritize primary intents", () => {
  assert.equal(filterAssistantQuestions("marriage", "", "en").length, 8);
  assert.equal(filterAssistantQuestions("government", "", "hi").length, 8);
  assert.ok(filterAssistantQuestions("all", "Meri shaadi", "hinglish").some((item) => item.id === "marriage_timing"));
  assert.ok(filterAssistantQuestions("marriage", "शादी", "hi").length > 0);
  assert.ok(filterAssistantQuestions("all", "", "en").length === assistantQuestionCatalog.length);
  assert.deepEqual(filterAssistantQuestions("foreign", "not a match", "en"), []);
});

test("marriage and government questions use chart evidence and disclose unsupported event timing", () => {
  const at = new Date("2026-03-01T00:00:00.000Z");
  const marriage = answerKundliQuestion(interpretationFixture, "marriage_timing", "en", at);
  assert.equal(marriage.status, "limited");
  assert.equal(marriage.topic, "relationships");
  assert.ok(marriage.evidence.some((item) => item.includes("House 7:")));
  assert.ok(marriage.evidence.some((item) => item.includes("Mahadasha: Jupiter")));
  assert.match(marriage.limitations.join(" "), /No reliable marriage-event timing rule/i);
  assert.ok(marriage.limitations.some((item) => /No reliable marriage-event timing rule/i.test(item)));

  const government = answerKundliQuestion(interpretationFixture, "government_timing", "en", at);
  assert.equal(government.status, "limited");
  assert.equal(government.topic, "career");
  assert.ok(government.evidence.some((item) => item.includes("House 10:")));
  assert.ok(government.evidence.some((item) => item.includes("Mahadasha: Jupiter")));
  assert.match(government.explanation, /does not calculate|calculate nahi karta/i);
  assert.ok(!/\b\d+(?:\.\d+)?%/.test(government.explanation + government.evidence.join(" ")));
  assert.ok(!marriage.evidence.some((item) => /marriage date|wedding date/i.test(item)));
  assert.ok(!government.evidence.some((item) => /job offer|selection date/i.test(item)));
  assert.equal(answerKundliQuestion(interpretationFixture, "Meri shaadi kab hogi?", "hinglish", at).status, "limited");
  assert.equal(answerKundliQuestion(interpretationFixture, "मुझे सरकारी नौकरी कब मिल सकती है?", "hi", at).status, "limited");
});

test("marriage timing answer remains natural and does not expose the malformed legacy sentence", () => {
  const answer = answerKundliQuestion(interpretationFixture, "मेरी शादी कब होगी?", "hi", new Date("2026-03-01T00:00:00.000Z"));
  assert.equal(answer.status, "limited");
  assert.doesNotMatch(answer.explanation, /आपकी शादी की .* tak पर किया जा सकता है/);
  assert.doesNotMatch(answer.explanation, /20 jan 2028/);
  assert.match(answer.explanation, /विवाह|शादी/);
});

test("popular questions without specialized rules give useful chart evidence and clear limitations", () => {
  const at = new Date("2026-03-01T00:00:00.000Z");
  const houses = Array.from({ length: 12 }, (_, index) => ({
    house: index + 1,
    sign: ["Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini"][index],
    cuspLongitude: index * 30,
  }));
  const chart = { ...interpretationFixture, houses };
  const foreign = answerKundliQuestion(chart, "foreign_timing", "en", at);
  assert.equal(foreign.status, "limited");
  assert.ok(foreign.evidence.some((item) => item.includes("House 9")));
  assert.ok(foreign.limitations.some((item) => item.includes("not implemented")));

  const property = answerKundliQuestion(chart, "property", "en", at);
  assert.ok(property.evidence.some((item) => item.includes("House 4 cusp: Libra")));
  assert.ok(property.limitations.length > 0);

  const compatibility = answerKundliQuestion(interpretationFixture, "compatibility", "en", at);
  assert.ok(compatibility.limitations.some((item) => item.includes("other person's birth chart")));
  assert.ok(compatibility.evidence.some((item) => item.includes("Relationships")));

  const nodes = answerKundliQuestion({
    ...interpretationFixture,
    planets: [...interpretationFixture.planets, { name: "True node", sign: "Leo", siderealLongitude: 125, house: 2, motion: "Retrograde" }, { name: "True Ketu", sign: "Aquarius", siderealLongitude: 305, house: 8, motion: "Retrograde" }],
  }, "rahu_ketu", "en", at);
  assert.ok(nodes.evidence.some((item) => item.includes("True node: Leo")));
  assert.ok(nodes.evidence.some((item) => item.includes("True Ketu: Aquarius")));
});

test("marriage limitations report inputs and method gaps without returning a candidate window", () => {
  const chart = {
    ...interpretationFixture,
    input: { ...interpretationFixture.input, birthTimeAccuracy: "approximate" },
    settings: { ayanamsa: "Lahiri", houseSystem: "WholeSign" },
    kp: { cusps: [{ house: 7 }], planets: [{ name: "Venus" }] },
  };
  const answer = answerKundliQuestion(chart, "marriage_limitations", "en", new Date("2026-03-01T00:00:00.000Z"));
  assert.equal(answer.status, "limited");
  assert.match(answer.explanation, /limits for relationship analysis/i);
  assert.ok(answer.evidence.some((item) => item.includes("approximate")));
  assert.ok(answer.evidence.some((item) => /KP chart factors are present/.test(item)));
  assert.ok(answer.limitations.some((item) => /source-reviewed/i.test(item)));
  assert.equal(answer.timing, undefined);
  assert.ok(!answer.evidence.some((item) => /Mahadasha|Transit|candidate window/i.test(item)));
});

test("financial growth uses finance evidence only and does not imply an outcome", () => {
  const answer = answerKundliQuestion(interpretationFixture, "financial_growth", "en", new Date("2026-03-01T00:00:00.000Z"));
  assert.equal(answer.status, "limited");
  assert.match(answer.explanation, /does not calculate wealth, income growth or financial outcomes/i);
  assert.ok(answer.evidence.length > 0);
  assert.ok(answer.evidence.some((item) => item.startsWith("Finances factors:")));
  assert.ok(!answer.evidence.some((item) => /^(?:Business|Career|Education) factors:/.test(item)));
  assert.ok(answer.evidence.some((item) => item.startsWith("Rule convention (not a source-reviewed outcome rule):")));
  assert.ok(answer.limitations.some((item) => /No reviewed rule estimates financial growth/.test(item)));
});

test("all popular IDs route to supported answer handling, and rolling 12-month transits use the selected instant", () => {
  const chart = { ...interpretationFixture, houses: Array.from({ length: 12 }, (_, index) => ({
    house: index + 1,
    sign: ["Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini"][index],
    cuspLongitude: index * 30,
  })) };
  for (const item of assistantQuestionCatalog) {
    const result = answerKundliQuestion(chart, item.id, "en", new Date("2026-03-01T00:00:00.000Z"));
    assert.equal(result.topic, item.topic, `wrong route for ${item.id}`);
    assert.notEqual(result.status, "unsupported", `unhandled question ${item.id}`);
    assert.ok(result.explanation.length > 0, `empty answer for ${item.id}`);
  }

  const selectedInstant = new Date("2026-10-19T12:00:00.000Z");
  const transitChart = {
    ...chart,
    settings: { ayanamsa: "Lahiri" },
    transits: {
      instantUtc: "2026-03-01T00:00:00.000Z",
      horizonDays: 900,
      bodies: [{
        name: "Jupiter",
        sign: "Gemini",
        longitude: 80,
        nextSignIngress: { utc: "2026-07-01T00:00:00.000Z", fromSign: "Gemini", toSign: "Cancer", direction: "direct", refinementDays: 0.001 },
      }],
    },
  };
  const transitAnswer = answerKundliQuestion(transitChart, "next_12_months_transits", "en", selectedInstant);
  const selectedTransits = calculateTransits(selectedInstant, { ayanamsa: "Lahiri", horizonDays: 365.2425 });
  assert.ok(transitAnswer.evidence.some((item) => item.includes(`Transit snapshot: ${selectedInstant.toISOString()}`)));
  assert.ok(transitAnswer.evidence.some((item) => item.includes(`calculated horizon: ${selectedTransits.horizonDays} days`)));
  assert.ok(transitAnswer.evidence.some((item) => item.includes(`${selectedTransits.bodies[0].name}: ${selectedTransits.bodies[0].sign} at ${selectedTransits.bodies[0].longitude.toFixed(4)}°`)));
  assert.ok(!transitAnswer.evidence.some((item) => item.includes("2026-07-01T00:00:00.000Z")));
  assert.ok(transitAnswer.limitations.some((item) => item.includes("not a prediction")));
  assert.ok(!transitAnswer.evidence.some((item) => /marriage|job selection|promotion date/i.test(item)));
  const timingAnswer = answerKundliQuestion(transitChart, "job_transit_dasha", "en", selectedInstant);
  assert.ok(!timingAnswer.evidence.some((item) => item.includes("Transit snapshot:")));
  assert.equal(answerKundliQuestion(null, "marriage_timing", "en").status, "needs-chart");
});

test("every popular question has a non-placeholder answer in all supported languages", () => {
  for (const language of languages) {
    for (const item of assistantQuestionCatalog) {
      const answer = answerKundliQuestion(interpretationFixture, item.id, language, new Date("2026-03-01T00:00:00.000Z"));
      assert.notEqual(answer.status, "unsupported", `${language} left ${item.id} unsupported`);
      assert.ok(answer.explanation.trim().length > 80, `${language} answer is too short for ${item.id}`);
      assert.ok(!/^I can't answer|^मैं उत्तर नहीं|^मैं इसका उत्तर नहीं/i.test(answer.explanation.trim()), `${language} placeholder answer for ${item.id}`);
      assert.ok(answer.disclaimer.trim());
    }
  }
});

test("every popular question reports missing-chart state without fabricating evidence", () => {
  for (const language of languages) {
    for (const item of assistantQuestionCatalog) {
      const answer = answerKundliQuestion(null, item.id, language, new Date("2026-03-01T00:00:00.000Z"));
      assert.equal(answer.topic, item.topic, `${language} topic for ${item.id}`);
      assert.equal(answer.status, "needs-chart", `${language} state for ${item.id}`);
      assert.deepEqual(answer.evidence, [], `${language} evidence for ${item.id}`);
      assert.equal(answer.provenance, null, `${language} provenance for ${item.id}`);
    }
  }
});

test("popular timing and language changes preserve the chart and do not invent event dates", () => {
  const before = structuredClone(interpretationFixture);
  const answers = languages.map((language) => answerKundliQuestion(interpretationFixture, "government_timing", language, new Date("2026-03-01T00:00:00.000Z")));
  assert.equal(new Set(answers.map((answer) => answer.explanation)).size, 3);
  assert.deepEqual(answers[0].evidence, answers[1].evidence);
  assert.deepEqual(answers[1].evidence, answers[2].evidence);
  assert.deepEqual(interpretationFixture, before);
  for (const answer of answers) {
    assert.equal(answer.status, "limited");
    assert.ok(answer.limitations.length);
    assert.ok(!/\b\d+(?:\.\d+)?%/.test(answer.explanation));
  }
});

test("assistant provides localized explanations while preserving technical evidence", () => {
  const before = structuredClone(interpretationFixture);
  const english = answerKundliQuestion(interpretationFixture, "career", "en");
  const hindi = answerKundliQuestion(interpretationFixture, "career", "hi");
  const hinglish = answerKundliQuestion(interpretationFixture, "career", "hinglish");
  assert.notEqual(english.explanation, hindi.explanation);
  assert.notEqual(hindi.explanation, hinglish.explanation);
  assert.deepEqual(english.evidence, hindi.evidence);
  assert.deepEqual(interpretationFixture, before);
  assert.equal(answerKundliQuestion(interpretationFixture, "मेरे करियर के कारक", "hi").topic, "career");
  assert.equal(answerKundliQuestion(interpretationFixture, "Mera career samjhaayein", "hinglish").topic, "career");
  assert.equal(suggestedAssistantTopics.length, 11);
  for (const language of ["en", "hi", "hinglish"]) {
    for (const topic of suggestedAssistantTopics) {
      const result = answerKundliQuestion(interpretationFixture, topic, language);
      assert.ok(result.title.length > 0);
      assert.ok(result.explanation.length > 0);
    }
  }
});

test("interpretation output changes with chart factors and stays deterministic for the same inputs", () => {
  const first = interpretChart(interpretationFixture, new Date("2026-03-01T00:00:00.000Z"));
  const second = interpretChart(interpretationFixture, new Date("2026-03-01T00:00:00.000Z"));
  assert.deepEqual(first, second);
  const changed = interpretChart({ ...interpretationFixture, ascendant: { sign: "Leo", longitude: 125 } }, new Date("2026-03-01T00:00:00.000Z"));
  assert.notDeepEqual(first.sections.find((section) => section.name === "Personality"), changed.sections.find((section) => section.name === "Personality"));
});

test("repeated active Dasha lords do not duplicate the same-sign interaction evidence", () => {
  const chart = structuredClone(interpretationFixture);
  chart.planets.find((planet) => planet.name === "Mercury").sign = "Aries";
  chart.planets.find((planet) => planet.name === "Sun").sign = "Aries";
  chart.vimshottariDasha.mahadashas = [{
    lord: "Mercury",
    start: "2025-01-01T00:00:00.000Z",
    end: "2027-01-01T00:00:00.000Z",
    antardashas: [{
      lord: "Sun",
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-12-01T00:00:00.000Z",
      pratyantardashas: [{
        lord: "Sun",
        start: "2026-02-01T00:00:00.000Z",
        end: "2026-04-01T00:00:00.000Z",
      }],
    }],
  }];
  const dasha = interpretChart(chart, new Date("2026-03-01T00:00:00.000Z")).sections
    .find((section) => section.name === "Dasha");
  const mahadasha = dasha?.interpretations.find((item) => item.title === "Active Mahadasha: Mercury");
  assert.equal(mahadasha?.factors.filter((factor) => factor === "Active Mercury/Sun lords share Aries.").length, 1);
});

test("house-lord readings use the selected house cusps and keep business distinct from relationships", () => {
  const customCusps = Array.from({ length: 12 }, (_, index) => ({
    house: index + 1,
    sign: ["Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aquarius", "Taurus", "Gemini"][index],
    cuspLongitude: index * 30,
  }));
  const report = interpretChart({
    ...interpretationFixture,
    settings: { houseSystem: "Placidus", ayanamsa: "Lahiri" },
    houses: customCusps,
  }, new Date("2026-03-01T00:00:00.000Z"));
  const career = report.sections.find((section) => section.name === "Career").interpretations[0];
  const business = report.sections.find((section) => section.name === "Business").interpretations[0];
  const relationships = report.sections.find((section) => section.name === "Relationships").interpretations[0];
  assert.match(career.factors.find((factor) => factor.startsWith("House 10:")) ?? "", /Aquarius cusp; lord Saturn/);
  assert.ok(business.factors.some((factor) => factor.startsWith("House 3:")));
  assert.ok(relationships.factors.some((factor) => factor.startsWith("House 8:")));
  assert.equal(report.houseFramework, "Placidus");
  assert.ok(!business.factors.some((factor) => factor.startsWith("House 8:")));
});

test("missing rule inputs are explicit and do not generate a generic reading", () => {
  const incomplete = {
    ...interpretationFixture,
    planets: interpretationFixture.planets.filter((planet) => planet.name !== "Moon" && planet.name !== "Mercury"),
  };
  const report = interpretChart(incomplete, new Date("2026-03-01T00:00:00.000Z"));
  const personality = report.sections.find((section) => section.name === "Personality");
  const education = report.sections.find((section) => section.name === "Education");
  assert.equal(personality.available, false);
  assert.match(personality.unavailableReason, /Moon/);
  assert.equal(education.available, false);
  assert.match(education.unavailableReason, /Mercury/);
});

test("active Dasha context includes natal placement, conflicting dignity, and half-open boundaries", () => {
  const conflicted = {
    ...interpretationFixture,
    planets: interpretationFixture.planets.map((planet) =>
      planet.name === "Mercury" ? { ...planet, sign: "Aquarius" } : planet),
    planetaryDignity: interpretationFixture.planetaryDignity.map((item) =>
      item.name === "Jupiter" ? { ...item, dignity: "Debilitated" } : item),
  };
  const atStart = interpretChart(conflicted, new Date("2026-01-01T00:00:00.000Z"));
  const active = atStart.sections.find((section) => section.name === "Dasha").interpretations;
  const jupiter = active.find((item) => item.title === "Active Mahadasha: Jupiter");
  assert.ok(jupiter.factors.some((factor) => factor.includes("Jupiter: Aquarius, selected-system house 8")));
  assert.ok(jupiter.conflicts.some((factor) => factor.toLowerCase().includes("debilitated")));
  assert.ok(jupiter.dashaFactors.some((factor) => factor.includes("Active Jupiter/Mercury lords share Aquarius")));
  assert.equal(atStart.currentDasha.pratyantar, "Saturn");

  const atExclusiveEnd = interpretChart(interpretationFixture, new Date("2026-06-01T00:00:00.000Z"));
  assert.equal(atExclusiveEnd.currentDasha.maha, "Jupiter");
  assert.equal(atExclusiveEnd.currentDasha.antar, "Mercury");
  assert.equal(atExclusiveEnd.currentDasha.pratyantar, null);
});

test("transit evidence identifies the selected snapshot and timezone and rule ids are unique", () => {
  const report = interpretChart(interpretationFixture, new Date("2026-03-01T00:00:00.000Z"));
  const items = report.sections.flatMap((section) => section.interpretations);
  const transit = items.find((item) => item.section === "Transits");
  assert.ok(transit.transitFactors.some((factor) => factor.includes("2026-10-17T06:30:00.000Z (Asia/Kolkata)")));
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.ok(items.every((item) => !/confidence\s*:\s*\d/i.test(JSON.stringify(item))));
});

test("transit request validates local date, IANA timezone, coordinates, and convention", () => {
  const input = resolveTransitRequest({
    localDate: "2026-10-17", timeZone: "Asia/Kolkata", latitude: 30.483997, longitude: 76.593948, ayanamsa: "Lahiri",
  });
  assert.equal(input.instant.toISOString(), "2026-10-17T06:30:00.000Z");
  assert.equal(input.ayanamsa, "Lahiri");
  assert.throws(() => resolveTransitRequest({ localDate: "2026-02-30", timeZone: "Asia/Kolkata", latitude: 30, longitude: 76, ayanamsa: "Lahiri" }), (error) => error instanceof InputError && error.code === "INVALID_DATE");
  assert.throws(() => resolveTransitRequest({ localDate: "2026-10-17", timeZone: "Bad/Zone", latitude: 30, longitude: 76, ayanamsa: "Lahiri" }), (error) => error instanceof InputError && error.code === "INVALID_TIMEZONE");
  assert.throws(() => resolveTransitRequest({ localDate: "2026-10-17", timeZone: "UTC", latitude: 90.1, longitude: 76, ayanamsa: "Lahiri" }), (error) => error instanceof InputError && error.code === "INVALID_COORDINATES");
  assert.throws(() => resolveTransitRequest({ localDate: "2026-10-17", timeZone: "UTC", latitude: 30, longitude: 76, ayanamsa: "Fagan" }), (error) => error instanceof InputError && error.code === "INVALID_TRANSIT_INPUT");
});
