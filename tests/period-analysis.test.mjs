import test from "node:test";
import assert from "node:assert/strict";
import { aggregatePeriodEvidence, analyzeTimelinePeriod, personalizeDashaEvidence } from "../src/calculation/period-analysis.ts";
import { buildTimeline } from "../src/calculation/life-timeline.ts";
import { hasTranslation, translate } from "../src/presentation/language.ts";

const evidence = (ruleId, evidenceKey, direction, lifecycle = "APPROVED") => ({
  ruleId,
  evidenceKey,
  lifecycle,
  direction,
  explanation: `${ruleId} evidence`,
});

test("period evidence aggregation classifies each complete, approved directional result without scores", () => {
  const classifications = [
    ["favorable", [evidence("rule-a", "a", "supportive")]],
    ["challenging", [evidence("rule-a", "a", "challenging")]],
    ["mixed", [evidence("rule-a", "a", "supportive"), evidence("rule-b", "b", "challenging")]],
    ["neutral", [evidence("rule-a", "a", "neutral")]],
  ];
  for (const [expected, items] of classifications) {
    assert.equal(aggregatePeriodEvidence(["rule-a", ...(items.length > 1 ? ["rule-b"] : [])], items, true).classification, expected);
  }
});

test("incomplete inputs, missing outcomes, and unapproved rules fail closed", () => {
  assert.equal(aggregatePeriodEvidence(["rule-a"], [evidence("rule-a", "a", "supportive")], false).classification, "not-evaluated");
  assert.equal(aggregatePeriodEvidence(["rule-a"], [], true).classification, "not-evaluated");
  assert.equal(aggregatePeriodEvidence(["rule-a"], [evidence("rule-a", "a", "supportive", "REVIEW_REQUIRED")], true).classification, "not-evaluated");
  assert.equal(aggregatePeriodEvidence([], [evidence("rule-a", "a", "supportive")], true).classification, "not-evaluated");
});

test("duplicate evidence is deduplicated and conflicting evidence remains mixed", () => {
  const duplicate = aggregatePeriodEvidence(
    ["rule-a", "rule-b"],
    [evidence("rule-a", "same-indicator", "supportive"), evidence("rule-b", "same-indicator", "supportive")],
    true,
  );
  assert.equal(duplicate.classification, "favorable");
  assert.equal(duplicate.contributingEvidence.length, 1);
  const conflict = aggregatePeriodEvidence(
    ["rule-a", "rule-b"],
    [evidence("rule-a", "same-indicator", "supportive"), evidence("rule-b", "same-indicator", "challenging")],
    true,
  );
  assert.equal(conflict.classification, "mixed");
});

test("timeline period analysis reports real overlapping Dasha facts but no unsupported classification", () => {
  const period = buildTimeline("2000-01-01", "yearly")[0];
  const dasha = {
    mahadashas: [{
      lord: "Jupiter",
      start: "1999-12-31T00:00:00.000Z",
      end: "2001-01-02T00:00:00.000Z",
      antardashas: [{
        lord: "Venus",
        start: "2000-01-01T00:00:00.000Z",
        end: "2001-01-01T00:00:00.000Z",
        pratyantardashas: [{ lord: "Saturn", start: "2000-01-01T00:00:00.000Z", end: "2000-06-01T00:00:00.000Z" }],
      }],
    }],
  };
  const analysis = analyzeTimelinePeriod(period, "Etc/UTC", dasha);
  assert.equal(analysis.classification, "not-evaluated");
  assert.equal(analysis.dashaComplete, true);
  assert.deepEqual(analysis.dashaEvidence.map(({ level, lord }) => [level, lord]), [
    ["Mahadasha", "Jupiter"],
    ["Antardasha", "Venus"],
    ["Pratyantardasha", "Saturn"],
  ]);
  assert.equal("confidence" in analysis, false);
  assert.equal("score" in analysis, false);
});

test("timeline Dasha evidence remains isolated to the supplied profile data", () => {
  const period = buildTimeline("2000-01-01", "daily", "2000-06-01")[0];
  const profileDasha = (lord) => ({ mahadashas: [{
    lord,
    start: "1999-12-31T00:00:00.000Z",
    end: "2001-01-02T00:00:00.000Z",
  }] });
  const first = analyzeTimelinePeriod(period, "Etc/UTC", profileDasha("Mars"));
  const second = analyzeTimelinePeriod(period, "Etc/UTC", profileDasha("Moon"));
  assert.equal(first.dashaEvidence[0].lord, "Mars");
  assert.equal(second.dashaEvidence[0].lord, "Moon");
  assert.equal(first.classification, "not-evaluated");
  assert.equal(second.classification, "not-evaluated");
});

test("missing or out-of-horizon Dasha stays unavailable and does not fabricate evidence", () => {
  const period = buildTimeline("2000-01-01", "daily", "2000-06-01")[0];
  const missing = analyzeTimelinePeriod(period, "Etc/UTC", null);
  assert.equal(missing.classification, "not-evaluated");
  assert.equal(missing.dashaComplete, false);
  assert.deepEqual(missing.dashaEvidence, []);
  const outOfHorizon = analyzeTimelinePeriod(period, "Etc/UTC", {
    mahadashas: [{ lord: "Saturn", start: "1990-01-01T00:00:00Z", end: "1991-01-01T00:00:00Z" }],
  });
  assert.equal(outOfHorizon.classification, "not-evaluated");
  assert.equal(outOfHorizon.dashaComplete, false);
  assert.deepEqual(outOfHorizon.dashaEvidence, []);
});

test("personalized Dasha evidence derives period status, age, and profile-specific natal facts", () => {
  const period = { level: "Mahadasha", lord: "Jupiter", start: "2005-01-01T00:00:00.000Z", end: "2006-03-01T00:00:00.000Z" };
  const natal = {
    planets: [
      { name: "Jupiter", sign: "Sagittarius", house: 9, motion: "Direct" },
      { name: "Venus", sign: "Sagittarius", house: 9, motion: "Retrograde" },
    ],
    houses: [{ house: 9, sign: "Sagittarius" }, { house: 12, sign: "Pisces" }],
    dignity: [{ name: "Jupiter", dignity: "Own sign", sign: "Sagittarius" }],
  };
  const upcoming = personalizeDashaEvidence(period, "2000-02-29", "Etc/UTC", natal, new Date("2004-12-31T23:59:59.999Z"));
  assert.equal(upcoming.periodStatus, "upcoming");
  assert.equal(upcoming.ageAtStart, 4);
  assert.equal(upcoming.ageAtEnd, 6);
  assert.deepEqual(upcoming.houseLordships, [9, 12]);
  assert.equal(upcoming.natalPlacement.sign, "Sagittarius");
  assert.deepEqual(upcoming.sameSignPlanets, ["Venus"]);
  assert.deepEqual(upcoming.dignity, { dignity: "Own sign", sign: "Sagittarius" });
  assert.equal(personalizeDashaEvidence(period, "2000-02-29", "Etc/UTC", natal, new Date(period.start)).periodStatus, "current");
  assert.equal(personalizeDashaEvidence(period, "2000-02-29", "Etc/UTC", natal, new Date(period.end)).periodStatus, "past");
});

test("Dasha context omits natal claims when placements are missing or chart is not D1", () => {
  const period = { level: "Antardasha", lord: "Moon", start: "2020-01-01T00:00:00.000Z", end: "2021-01-01T00:00:00.000Z" };
  const missing = personalizeDashaEvidence(period, "2000-01-01", "Etc/UTC", null, new Date("2020-06-01T00:00:00.000Z"));
  assert.equal(missing.periodStatus, "current");
  assert.equal(missing.natalPlacement, null);
  assert.deepEqual(missing.houseLordships, []);
  assert.deepEqual(missing.sameSignPlanets, []);
});

test("timeline classification and evidence labels have English, Hindi, and Hinglish copy", () => {
  for (const language of ["en", "hi", "hinglish"]) {
    for (const key of [
      "timeline.classification.favorable",
      "timeline.classification.challenging",
      "timeline.classification.mixed",
      "timeline.classification.neutral",
      "timeline.classification.not-evaluated",
      "timeline.explanation.incomplete",
      "timeline.dashaEvidence",
      "timeline.dashaLevel.mahadasha",
      "timeline.dashaIncomplete",
      "timeline.transitNotUsed",
      "timeline.traditionalGuidance",
      "timeline.standaloneTitle",
      "timeline.standaloneLimit",
      "dasha.periodStatus",
      "dasha.periodAge",
      "dasha.natalPlacement",
      "dasha.directionUnavailable",
      "dasha.chartRuleUnavailable",
    ]) {
      assert.equal(hasTranslation(language, key), true, `${language} missing ${key}`);
      assert.doesNotMatch(translate(language, key), /Translation unavailable/);
    }
  }
});
