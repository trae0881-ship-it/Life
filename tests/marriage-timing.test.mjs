import test from "node:test";
import assert from "node:assert/strict";
import { calculateMarriageTiming, marriageTimingSourcesForResult } from "../src/presentation/marriage-timing.ts";
import { marriageTimingSources } from "../src/presentation/marriage-timing-sources.ts";
import { formatMarriageAnswer } from "../src/presentation/assistant-answer-format.ts";

const kp = (supportive = true) => ({
  system: "Krishnamurti Paddhati (KP)", ayanamsa: "Krishnamurti", houseSystem: "Placidus",
  cusps: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: "Aries", signLord: "Mars", nakshatra: { lord: "Moon" }, sub: { lord: "Venus" }, subSub: { lord: "Sun" }, signifiedBy: supportive && [2, 7, 11].includes(i + 1) ? ["Venus", "Jupiter"] : [] })),
  planets: [
    { name: "Venus", significations: { houses: supportive ? [2, 7] : [3] } },
    { name: "Jupiter", significations: { houses: supportive ? [7, 11] : [5] } },
    { name: "Sun", significations: { houses: [1] } },
  ],
});

const chart = (kpValue = kp()) => ({
  input: { timeZone: "Asia/Kolkata" },
  settings: { ayanamsa: "Lahiri", houseSystem: "WholeSign", engine: "@swisseph/node" },
  kp: kpValue,
  vimshottariDasha: { mahadashas: [{ lord: "Venus", start: "2026-01-01T00:00:00.000Z", end: "2030-01-01T00:00:00.000Z", antardashas: [{ lord: "Jupiter", start: "2027-01-01T00:00:00.000Z", end: "2029-01-01T00:00:00.000Z", pratyantardashas: [{ lord: "Venus", start: "2028-01-01T00:00:00.000Z", end: "2028-06-01T00:00:00.000Z" }] }] }] },
  transits: { instantUtc: "2026-01-01T00:00:00.000Z", horizonDays: 900, bodies: [{ name: "Jupiter", sign: "Gemini", longitude: 80, nextSignIngress: null }] },
});

test("marriage timing requires KP data and never fabricates a date", () => {
  const result = calculateMarriageTiming({ ...chart(), kp: null }, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.earliest_date, null);
  assert.equal(result.latest_date, null);
  assert.doesNotMatch(JSON.stringify(result), /\d{4}-\d{2}-\d{2}/);
});

test("2/7/11 significations, 7th cusp sub-lord and Dasha intersection form a candidate window", () => {
  const result = calculateMarriageTiming(chart(), new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(result.status, "candidate_window");
  assert.equal(result.earliest_date, "2028-01-01");
  assert.equal(result.latest_date, "2028-06-01");
  assert.ok(result.kp_evidence.some((item) => item.includes("7th-cusp sub-lord")));
  assert.equal(result.supporting_dasha_periods[0].mahadasha, "Venus");
  assert.equal(result.candidate_windows.length, 1);
  assert.deepEqual(result.transit_evidence, []);
  assert.ok(result.limitations.some((item) => item.includes("no transit evidence is used")));
  assert.deepEqual(result.candidate_windows[0], {
    start: "2028-01-01T00:00:00.000Z",
    end: "2028-06-01T00:00:00.000Z",
    start_date: "2028-01-01",
    end_date: "2028-06-01",
    mahadasha: "Venus",
    bhukti: "Jupiter",
    antara: "Venus",
    supporting_lords: ["Venus", "Jupiter", "Venus"],
  });
  assert.ok(result.source_ids.includes("source-life-kp-convention"));
});

test("conflicting significations return insufficient evidence instead of a weak date", () => {
  const result = calculateMarriageTiming(chart(kp(false)), new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.earliest_date, null);
  assert.ok(result.contradictory_evidence.length > 0);
});

test("source registry IDs are unique and displayed sources belong to the result", () => {
  assert.equal(new Set(marriageTimingSources.map((source) => source.id)).size, marriageTimingSources.length);
  assert.ok(marriageTimingSources.every((source) => (!source.officialUrl || /^https?:\/\//.test(source.officialUrl)) && source.ruleIds.length > 0));
  const result = calculateMarriageTiming(chart(), new Date("2026-01-01T00:00:00.000Z"));
  assert.ok(marriageTimingSourcesForResult(result).every((source) => result.source_ids.includes(source.id)));
});

test("marriage answer formatter creates natural localized date-range answers", () => {
  const result = calculateMarriageTiming(chart(), new Date("2026-01-01T00:00:00.000Z"));
  const hindi = formatMarriageAnswer("hi", result);
  assert.match(hindi.explanation, /विवाह का संभावित समय 1 जनवरी 2028 से 1 जून 2028 के बीच हो सकता है/);
  assert.doesNotMatch(hindi.explanation, /आपकी शादी की|20 jan|tak पर|किया जा सकता है/);
  assert.equal(hindi.timing.startDate, "2028-01-01");
  assert.equal(hindi.timing.endDate, "2028-06-01");
  assert.equal(hindi.timing.status, "candidate_window");
  const english = formatMarriageAnswer("en", result);
  assert.match(english.explanation, /potential marriage period may fall between 1 January 2028 and 1 June 2028/);
});

test("multiple marriage windows are not presented as one continuous date range", () => {
  const base = calculateMarriageTiming(chart(), new Date("2026-01-01T00:00:00.000Z"));
  const result = {
    ...base,
    status: "multiple_windows",
    candidate_windows: [
      base.candidate_windows[0],
      { ...base.candidate_windows[0], start: "2029-01-01T00:00:00.000Z", end: "2029-06-01T00:00:00.000Z", start_date: "2029-01-01", end_date: "2029-06-01" },
    ],
  };
  const answer = formatMarriageAnswer("hi", result);
  assert.match(answer.explanation, /एक से अधिक अलग-अलग संभावित अवधियाँ/);
  assert.match(answer.explanation, /एक लगातार अवधि नहीं है/);
  assert.equal(answer.timing.status, "multiple_windows");
});

test("duplicate qualifying Dasha intersections are deduplicated and separate windows remain separate", () => {
  const duplicateChart = chart();
  duplicateChart.vimshottariDasha.mahadashas[0].antardashas[0].end = "2030-01-01T00:00:00.000Z";
  duplicateChart.vimshottariDasha.mahadashas[0].antardashas[0].pratyantardashas.push(
    { ...duplicateChart.vimshottariDasha.mahadashas[0].antardashas[0].pratyantardashas[0] },
    { lord: "Venus", start: "2029-01-01T00:00:00.000Z", end: "2029-06-01T00:00:00.000Z" },
  );
  const result = calculateMarriageTiming(duplicateChart, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(result.status, "multiple_windows");
  assert.equal(result.candidate_windows.length, 2);
  assert.deepEqual(result.candidate_windows.map((window) => [window.start_date, window.end_date]), [
    ["2028-01-01", "2028-06-01"],
    ["2029-01-01", "2029-06-01"],
  ]);
  assert.equal(new Set(result.candidate_windows.map((window) => `${window.start}|${window.end}|${window.mahadasha}|${window.bhukti}|${window.antara}`)).size, 2);
});

test("candidate window boundaries use the selected chart timezone", () => {
  const timezoneChart = chart();
  timezoneChart.input.timeZone = "America/Los_Angeles";
  timezoneChart.vimshottariDasha.mahadashas[0].antardashas[0].pratyantardashas[0] = {
    lord: "Venus",
    start: "2028-01-01T00:30:00.000Z",
    end: "2028-01-02T00:30:00.000Z",
  };
  const result = calculateMarriageTiming(timezoneChart, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(result.candidate_windows[0].start_date, "2027-12-31");
  assert.equal(result.candidate_windows[0].end_date, "2028-01-01");
});

test("overlapping qualifying intervals remain traceable as separate Dasha candidates", () => {
  const overlapChart = chart();
  overlapChart.vimshottariDasha.mahadashas[0].antardashas[0].pratyantardashas = [
    { lord: "Venus", start: "2028-01-01T00:00:00.000Z", end: "2028-06-01T00:00:00.000Z" },
    { lord: "Venus", start: "2028-05-01T00:00:00.000Z", end: "2028-07-01T00:00:00.000Z" },
  ];
  const result = calculateMarriageTiming(overlapChart, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(result.candidate_windows.length, 2);
  assert.deepEqual(result.candidate_windows.map((window) => [window.start_date, window.end_date]), [
    ["2028-01-01", "2028-06-01"],
    ["2028-05-01", "2028-07-01"],
  ]);
});

test("a broad set of qualifying intersections is reported as separate windows, not one continuous prediction", () => {
  const broadChart = chart();
  broadChart.vimshottariDasha.mahadashas[0].antardashas[0].pratyantardashas = Array.from({ length: 6 }, (_, index) => ({
    lord: "Venus",
    start: `2028-0${index + 1}-01T00:00:00.000Z`,
    end: `2028-0${index + 1}-15T00:00:00.000Z`,
  }));
  const result = calculateMarriageTiming(broadChart, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(result.status, "multiple_windows");
  assert.equal(result.candidate_windows.length, 6);
  assert.match(result.explanation_en, /separate future .* candidate periods/);
  assert.match(result.explanation_en, /not as one continuous period/);
});

test("marriage answer formatter refuses to invent a date when evidence is insufficient", () => {
  const result = calculateMarriageTiming({ ...chart(), kp: null }, new Date("2026-01-01T00:00:00.000Z"));
  for (const language of ["en", "hi", "hinglish"]) {
    const answer = formatMarriageAnswer(language, result);
    assert.equal(answer.timing, null);
    assert.doesNotMatch(answer.explanation, /\b20(?:\s+January|\s+जनवरी)?\s+2028\b|\b2028-01-01\b/);
  }
});
