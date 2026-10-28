import test from "node:test";
import assert from "node:assert/strict";
import { calculateBirthChart } from "../src/calculation/chart.ts";
import { buildHouseAnalysis, findHouseForLongitude, listParashariAspects, planetsFromMoon, signHouseFromReference } from "../src/calculation/house-analysis.ts";

const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

test("Moon chart numbers houses from the actual Moon sign and keeps planetary signs unchanged", () => {
  const planets = [
    { name: "Moon", sign: "Scorpio", longitude: 220, house: 6 },
    { name: "Sun", sign: "Sagittarius", longitude: 250, house: 7 },
    { name: "Mars", sign: "Libra", longitude: 200, house: 5 },
  ];
  const moonChart = planetsFromMoon(planets, "Scorpio");
  assert.deepEqual(moonChart?.map(({ name, sign, house }) => [name, sign, house]), [
    ["Moon", "Scorpio", 1],
    ["Sun", "Sagittarius", 2],
    ["Mars", "Libra", 12],
  ]);
  assert.equal(signHouseFromReference("Aries", "Pisces"), 2);
  assert.equal(signHouseFromReference("Invalid", "Pisces"), null);
  assert.equal(planetsFromMoon(planets, undefined), null);
});

test("house assignment uses start-inclusive and end-exclusive cusp boundaries", () => {
  const cusps = Array.from({ length: 12 }, (_, index) => index * 30);
  assert.equal(findHouseForLongitude(cusps, 0), 1);
  assert.equal(findHouseForLongitude(cusps, 29.999999), 1);
  assert.equal(findHouseForLongitude(cusps, 30), 2);
  assert.equal(findHouseForLongitude(cusps, 359.999999), 12);
  assert.equal(findHouseForLongitude(cusps, 360), 1);
  assert.equal(findHouseForLongitude(cusps.slice(1), 0), null);
});

test("house analysis associates actual assigned planets and derives forward-arc interval midpoints", () => {
  const houses = signs.map((sign, index) => ({ house: index + 1, sign, cuspLongitude: index * 30 }));
  const result = buildHouseAnalysis(houses, [
    { name: "Mars", sign: "Aries", longitude: 15, house: 1 },
    { name: "Jupiter", sign: "Taurus", longitude: 35, house: 2 },
  ], "WholeSign");
  assert.equal(result?.houses[0].intervalMidpointLongitude, 15);
  assert.equal(result?.houses[11].intervalMidpointLongitude, 345);
  assert.deepEqual(result?.houses[0].planets, ["Mars"]);
  assert.deepEqual(result?.houses[1].planets, ["Jupiter"]);
  assert.equal(buildHouseAnalysis(houses.slice(0, 11), [], "WholeSign"), null);
  assert.equal(buildHouseAnalysis(houses, [{ name: "Bad", sign: "Aries", longitude: Number.NaN, house: 1 }], "WholeSign"), null);
});

test("Parashari aspect rows preserve source, target house, offset, and target planet membership", () => {
  const aspects = {
    convention: "Parashari",
    details: [{ name: "Jupiter", house: 1, aspectsHouses: [5, 7, 9], aspectsPlanets: ["Mercury", "Saturn"] }],
  };
  const planets = [
    { name: "Mercury", sign: "Leo" },
    { name: "Saturn", sign: "Sagittarius" },
    { name: "Venus", sign: "Gemini" },
  ];
  const rows = listParashariAspects(aspects, planets, "Aries");
  assert.deepEqual(rows?.map(({ targetHouse, aspectOffset, targetPlanets }) => [targetHouse, aspectOffset, targetPlanets]), [
    [5, 5, ["Mercury"]],
    [7, 7, []],
    [9, 9, ["Saturn"]],
  ]);
  assert.equal(listParashariAspects(null), null);
  assert.equal(listParashariAspects(aspects, planets, "Unknown"), null);
});

test("selected calculated profile supplies Moon, cusp, Chalit, and aspect data without another chart calculation", () => {
  const input = {
    fullName: "Selected profile A",
    birthPlace: "UTC fixture",
    localDate: "2000-01-01",
    localTime: "12:00",
    timeZone: "Etc/UTC",
    latitude: 0,
    longitude: 0,
  };
  const chart = calculateBirthChart(input);
  assert.equal(chart.input.fullName, input.fullName);
  assert.equal(planetsFromMoon(chart.planets, chart.planets.find((planet) => planet.name === "Moon")?.sign)?.find((planet) => planet.name === "Moon")?.house, 1);
  assert.ok(buildHouseAnalysis(chart.houses, chart.planets, chart.settings.houseSystem));
  assert.ok(listParashariAspects(chart.planetaryAspects, chart.planets, chart.ascendant.sign));
  for (const planet of chart.planets) assert.equal(findHouseForLongitude(chart.houses.map((house) => house.cuspLongitude), planet.longitude), planet.house);
  const otherChart = calculateBirthChart({ ...input, fullName: "Selected profile B", localDate: "2001-04-15" });
  assert.equal(otherChart.input.fullName, "Selected profile B");
  assert.notEqual(otherChart.provenance.resultHash, chart.provenance.resultHash);
  const otherMoon = otherChart.planets.find((planet) => planet.name === "Moon");
  assert.equal(planetsFromMoon(otherChart.planets, otherMoon?.sign)?.find((planet) => planet.name === "Moon")?.house, 1);
});

test("dashboard includes localized dedicated Moon, Bhava Chalit, and Drishti surfaces", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../src/app/HouseAnalysisSections.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(page, /<HouseAnalysisSections chart=\{chart\} language=\{language\}/);
  assert.match(source, /chart\.input\.fullName \|\| chart\.input\.birthPlace/);
  assert.match(source, /id="chandra-kundli"/);
  assert.match(source, /id="bhava-chalit"/);
  assert.match(source, /id="bhava-madhya-drishti"/);
  assert.match(source, /planetaryAspects\.convention/);
});
