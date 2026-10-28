import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateBirthChart } from "../src/calculation/chart.ts";
import { calculateDivisionalLongitude } from "../src/calculation/rules.ts";
import { divisionalChartMetadata } from "../src/calculation/divisional-metadata.ts";
import { rowsForDivision } from "../src/presentation/divisional-chart.ts";
import { getDivisionalChartExplanation } from "../src/presentation/divisional-chart-explanations.ts";

const chartInput = {
  fullName: "Validation fixture",
  birthPlace: "UTC fixture",
  localDate: "2000-01-01",
  localTime: "12:00",
  timeZone: "Etc/UTC",
  latitude: 0,
  longitude: 0,
};

const pyjhoraVargaFixture = JSON.parse(
  readFileSync(new URL("../data/reference/pyjhora-v4.8.7-varga-sign-fixtures.json", import.meta.url), "utf8"),
);

test("calculated chart exposes D2 through D60 in strict numerical order", () => {
  const chart = calculateBirthChart(chartInput);
  const ids = Object.keys(chart.divisionalCharts);
  assert.deepEqual(ids, Array.from({ length: 59 }, (_, index) => `D${index + 2}`));
  assert.equal(new Set(["D1", ...ids]).size, 60);
  for (const id of ids) {
    assert.ok(chart.divisionalCharts[id].length > 0, `${id} has placements`);
    assert.ok(chart.divisionalCharts[id].every((row) => row.division === id && row.convention && row.sign));
    for (const row of chart.divisionalCharts[id]) {
      const sourceLongitude = row.name === "Lagna"
        ? chart.ascendant.longitude
        : chart.planets.find((planet) => planet.name === row.name)?.siderealLongitude;
      assert.notEqual(sourceLongitude, undefined, `${id} ${row.name} has a chart source longitude`);
      assert.deepEqual(
        row,
        { name: row.name, ...calculateDivisionalLongitude(sourceLongitude, Number(id.slice(1))) },
        `${id} ${row.name} is mapped from its full-precision natal longitude`,
      );
    }
  }
});

test("D2-D60 sign mappings match fixed PyJHora 4.8.7 near-boundary fixtures", () => {
  assert.equal(pyjhoraVargaFixture.reference.version, "4.8.7");
  assert.equal(pyjhoraVargaFixture.reference.commit, "ca22995709bd60e371e7820a1a5efc80ce4cf821");
  const chartIds = Object.keys(pyjhoraVargaFixture.charts);
  assert.deepEqual(chartIds, Array.from({ length: 59 }, (_, index) => `D${index + 2}`));

  let comparedCases = 0;
  for (const [id, chart] of Object.entries(pyjhoraVargaFixture.charts)) {
    const division = Number(id.slice(1));
    const expectedSegmentCount = division === 30 ? 5 : division;
    assert.equal(chart.boundaryExactCases, false, `${id} excludes exact boundaries where conventions differ`);
    assert.equal(chart.cases.length, 12 * (2 * expectedSegmentCount - 1), `${id} covers all signs and segment-edge probes`);
    assert.deepEqual(new Set(chart.cases.map(([sourceSign]) => sourceSign)), new Set(Array.from({ length: 12 }, (_, index) => index)));

    for (const [sourceSign, degreesInSign, expectedSign, probe] of chart.cases) {
      assert.ok(probe === 0 || probe === 1, `${id} does not compare incompatible exact-boundary ownership`);
      const actual = calculateDivisionalLongitude(sourceSign * 30 + degreesInSign, division);
      assert.equal(
        actual.signIndex,
        expectedSign,
        `${id}, source sign ${sourceSign}, ${degreesInSign}° within sign, PyJHora probe ${probe}`,
      );
      comparedCases++;
    }
  }
  assert.equal(comparedCases, 42_588);

  const matrix = readFileSync(new URL("../docs/D1_D60_VALIDATION_MATRIX.md", import.meta.url), "utf8");
  const chartRows = matrix.split("\n").filter((line) => /^\| D(?:[1-9]|[1-5]\d|60) - /.test(line));
  assert.equal(chartRows.length, 60, "validation matrix reports each chart separately");
  assert.match(chartRows[0], /SOFTWARE_TESTED; NOT INDEPENDENTLY VERIFIED/);
  assert.equal(
    chartRows.slice(1).filter((line) => /SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED/.test(line)).length,
    59,
    "D2-D60 statuses are mapping-reference matched, not end-to-end verified",
  );
});

test("D11 keeps the selected mapping while identifying its external attribution as unverified", () => {
  const result = calculateDivisionalLongitude(10, 11);
  assert.equal(result.signIndex, 3);
  assert.match(result.convention, /^Rudramsha: LIFE-selected reverse sign seed with forward parts; external attribution unverified$/);
  assert.match(divisionalChartMetadata[10].purpose, /external textual attribution requires verification/);
});

test("typed metadata registry covers every chart without activating unsupported interpretation", () => {
  assert.equal(divisionalChartMetadata.length, 60);
  assert.deepEqual(divisionalChartMetadata.map((item) => item.id), Array.from({ length: 60 }, (_, index) => `D${index + 1}`));
  assert.ok(divisionalChartMetadata.every((item) => item.purpose && item.cannotEstablish && item.interpretationStatus));
  assert.ok(divisionalChartMetadata.filter((item) => item.conventionKind === "custom").length > 0);
  assert.ok(divisionalChartMetadata.every((item) => item.interpretationStatus !== "IMPLEMENTED"));
});

test("D1 rows retain calculated planet houses instead of inferring houses from sign names", () => {
  const rows = rowsForDivision({
    ascendant: { sign: "Aries", longitude: 12 },
    houses: [
      { house: 1, sign: "Aries", cuspLongitude: 0 },
      { house: 2, sign: "Aries", cuspLongitude: 25 },
    ],
    planets: [
      { name: "Moon", sign: "Aries", house: 2, longitude: 28, motion: "Direct" },
      { name: "Mars", sign: "Taurus", house: 3, longitude: 32, motion: "Retrograde" },
    ],
    divisionalCharts: {},
  }, 1);

  assert.deepEqual(rows.map(({ name, house }) => [name, house]), [
    ["Lagna", 1],
    ["Moon", 2],
    ["Mars", 3],
  ]);
});

test("every divisional chart has distinct localized calculation and limitation explanations", () => {
  const languages = ["en", "hi", "hinglish"];
  const explanations = new Map();
  for (const metadata of divisionalChartMetadata) {
    for (const language of languages) {
      const explanation = getDivisionalChartExplanation(
        metadata,
        language,
        `Convention fixture for ${metadata.id}`,
        "within 5 minutes",
        "Lahiri",
        "Placidus",
      );
      assert.ok(explanation.chartName, `${metadata.id} has a localized name`);
      assert.ok(explanation.purpose, `${metadata.id} has an explanation`);
      assert.ok(explanation.calculation.includes(`Convention fixture for ${metadata.id}`));
      assert.ok(explanation.limitation, `${metadata.id} states interpretation limits`);
      assert.ok(explanation.birthTimeSensitivity, `${metadata.id} states birth-time sensitivity`);
      assert.equal(explanation.interpretationStatus, metadata.interpretationStatus);
      explanations.set(`${metadata.id}:${language}`, explanation);
    }
  }
  assert.equal(explanations.size, 180);
  for (const language of languages) {
    assert.equal(
      new Set(divisionalChartMetadata.map((metadata) => {
        const explanation = explanations.get(`${metadata.id}:${language}`);
        return [explanation.chartName, explanation.purpose, explanation.calculation, explanation.limitation].join("|");
      })).size,
      60,
      `${language} explanations are distinct for all 60 charts`,
    );
  }
  assert.notEqual(explanations.get("D13:en").calculation, explanations.get("D14:en").calculation);
  assert.match(explanations.get("D13:en").purpose, /D13/);
  assert.match(explanations.get("D14:en").purpose, /D14/);
  assert.match(explanations.get("D30:en").calculation, /unequal/i);
  assert.match(explanations.get("D60:en").birthTimeSensitivity, /D60/i);
});

test("divisional UI source defines one navigable section and immediate birth report for D1-D60", () => {
  const source = readFileSync(new URL("../src/app/DivisionalChartSections.tsx", import.meta.url), "utf8");
  assert.match(source, /id={`division-D\$\{division\}`}/);
  assert.match(source, /key=\{`\$\{chart\.provenance\.resultHash\}-D\$\{division\}`\}/);
  assert.match(source, /<BirthDetailsReport[^>]*division=\{division\}/);
  assert.match(source, /getDivisionalChartExplanation/);
  assert.match(source, /<section className="divisional-explanation"/);
  assert.match(source, /row\.house \?\? "—"/);
  assert.match(source, /Array\.from\(\{ length: 60 \}/);
  assert.match(source, /hasUsableChartProvenance/);
  assert.match(source, /<DivisionalTimeline[^>]*metadata=\{metadata\}/);
  assert.match(source, /<DivisionalTimeline[^>]*dasha=\{chart\.vimshottariDasha\}/);
  assert.match(source, /divisionalChartNumbers\.map\(\(division\)/);
  assert.match(source, /<p className="result-guide divisional-timeline-limit">\{t\("timeline\.noRule"\)\}<\/p>/);
  assert.match(source, /href=\{`#division-D\$\{division\}`\}/);
  const timelineSource = readFileSync(new URL("../src/app/DivisionalTimeline.tsx", import.meta.url), "utf8");
  assert.match(timelineSource, /t\("timeline\.title"\)/);
  assert.match(timelineSource, /metadata\.id/);
  assert.match(timelineSource, /not-evaluated/);
  assert.match(timelineSource, /currentAge/);
  assert.match(timelineSource, /timeline-month-grid/);
  assert.match(timelineSource, /timeline-calendar/);
  assert.match(timelineSource, /timeline-time-control/);
  assert.match(timelineSource, /traditionalGuidance/);
  assert.match(timelineSource, /analyzeTimelinePeriod/);
  assert.match(timelineSource, /timeline-period-card/);
  assert.match(timelineSource, /open && selectedDateInRange \? buildTimeline/);
  assert.match(timelineSource, /id=\{`timeline-\$\{metadata\.id\}`\}/);
  assert.match(timelineSource, /data-chart-id=\{metadata\.id\}/);
  assert.match(timelineSource, /timeline-visible-summary/);
  assert.match(timelineSource, /timeline-year-rail/);
  assert.match(timelineSource, /timelineAgeMarkers\(chart\.input\.localDate\)/);
  assert.match(timelineSource, /aria-pressed=\{selectedAge === age\}/);
  assert.match(timelineSource, /setSelectedDate\(chart\.input\.localDate\)/);
  assert.doesNotMatch(timelineSource, /No chart or Vimshottari Dasha was supplied/);
  assert.match(timelineSource, /dashaEvidence\.length > 0/);
  const timelineCalculation = readFileSync(new URL("../src/calculation/life-timeline.ts", import.meta.url), "utf8");
  assert.match(timelineCalculation, /export function timelineAgeMarkers/);
  assert.match(timelineCalculation, /Array\.from\(\{ length: 80 \}/);
  const timelineIds = divisionalChartMetadata.map(({ id }) => `timeline-${id}`);
  assert.equal(timelineIds.length, 60);
  assert.equal(new Set(timelineIds).size, 60);
  assert.deepEqual(timelineIds, Array.from({ length: 60 }, (_, index) => `timeline-D${index + 1}`));
});

test("D1-D60 validation matrix has one row per chart and no independent verification claim", () => {
  const matrix = readFileSync(new URL("../docs/D1_D60_VALIDATION_MATRIX.md", import.meta.url), "utf8");
  const ids = [...matrix.matchAll(/^\| D(\d+)(?: - [^|]+)? \|/gm)].map((match) => Number(match[1]));
  assert.deepEqual(ids, Array.from({ length: 60 }, (_, index) => index + 1));
  assert.match(matrix, /INDEPENDENTLY_VERIFIED/);
  assert.match(matrix, /No chart is marked `INDEPENDENTLY_VERIFIED`/);
});

test("invalid and unsupported birth input remains fail-closed before divisional calculation", () => {
  assert.throws(() => calculateBirthChart({ ...chartInput, localDate: "1900-02-29" }), /Invalid|date/i);
  assert.throws(() => calculateBirthChart({ ...chartInput, timeZone: "Mars/Olympus" }), /timezone/i);
  const { localTime: _localTime, ...missingTime } = chartInput;
  assert.throws(() => calculateBirthChart(missingTime), /time/i);
  const { latitude: _latitude, ...missingCoordinates } = chartInput;
  assert.throws(() => calculateBirthChart(missingCoordinates), /coordinate|latitude/i);
});
