import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { setEphemerisPath, setSiderealMode, calculatePosition, julianDay } from "@swisseph/node";
import { CalculationFlag, LunarPoint, Planet, SiderealMode } from "@swisseph/core";
import { calculateBirthChart, calculateBirthTimeSensitivity, UnsupportedEphemerisDateError, UnsupportedHouseCalculationError, zodiac } from "../src/calculation/chart.ts";

const epheDir = path.resolve("data/ephemeris");
setEphemerisPath(epheDir);
setSiderealMode(SiderealMode.Lahiri);
const bodies = [Planet.Sun, Planet.Moon, Planet.Mercury, Planet.Venus, Planet.Mars, Planet.Jupiter, Planet.Saturn, Planet.Uranus, Planet.Neptune, Planet.Pluto, LunarPoint.MeanNode, LunarPoint.TrueNode];
const flags = CalculationFlag.SwissEphemeris | CalculationFlag.Speed | CalculationFlag.Sidereal;

test("bundled ephemeris files match the checked-in SHA-256 manifest", async () => {
  const manifest = JSON.parse(await readFile("data/ephemeris-manifest.json", "utf8"));
  const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
  assert.equal(manifest.npmTarballIntegrity, lock.packages["node_modules/@swisseph/node"].integrity);
  for (const file of manifest.assets) {
    const bytes = await readFile(path.join(epheDir, file.filename));
    assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), file.sha256, file.filename);
  }
});

test("Swiss engine calculates all 12 bodies deterministically at a reference instant", () => {
  const jd = julianDay(2000, 1, 1, 12);
  const first = bodies.map((body) => calculatePosition(jd, body, flags));
  const second = bodies.map((body) => calculatePosition(jd, body, flags));
  assert.equal(first.length, 12);
  for (let i = 0; i < first.length; i++) {
    assert.ok(first[i].flags & CalculationFlag.SwissEphemeris, `body ${i} must use Swiss files`);
    assert.equal(JSON.stringify(first[i]), JSON.stringify(second[i]), `body ${i} repeats exactly`);
    assert.ok(first[i].longitude >= 0 && first[i].longitude < 360);
    assert.ok(Number.isFinite(first[i].longitudeSpeed));
  }
});

test("conservative ephemeris boundary samples use Swiss files with no fallback", () => {
  for (const year of [1801, 1802, 2398, 2399]) {
    for (const month of [1, 6, 12]) {
      const jd = julianDay(year, month, 15, 12);
      for (const [index, body] of bodies.entries()) {
        const result = calculatePosition(jd, body, flags);
        assert.ok(result.flags & CalculationFlag.SwissEphemeris, `${year}-${month} body ${index}`);
      }
    }
  }
});

test("D1 chart receipt is repeatable and the sensitivity sweep is minute-stepped", () => {
  const input = { localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 };
  const first = calculateBirthChart(input);
  const second = calculateBirthChart(input);
  assert.equal(first.planets.length, 14);
  assert.equal(first.planets.filter((planet) => ["Mean node", "True node", "Mean Ketu", "True Ketu"].includes(planet.name)).length, 4);
  assert.notEqual(first.planets.find((planet) => planet.name === "Mean node").longitude, first.planets.find((planet) => planet.name === "True node").longitude);
  for (const [ascending, descending] of [["Mean node", "Mean Ketu"], ["True node", "True Ketu"]]) {
    const rahu = first.planets.find((planet) => planet.name === ascending);
    const ketu = first.planets.find((planet) => planet.name === descending);
    assert.ok(Math.abs((((ketu.siderealLongitude - rahu.siderealLongitude - 180) + 540) % 360) - 180) < 1e-9);
    assert.equal(ketu.latitude, 0);
  }
  assert.equal(first.provenance.resultHash, second.provenance.resultHash);
  assert.equal(first.settings.bindingVersion, "1.4.0");
  assert.equal(first.settings.runtimeVersion, process.version);
  assert.equal(first.settings.swissEphemerisLibraryVersion, "not-exposed-by-binding");
  assert.equal(first.settings.ephemerisManifestVersion, 1);
  assert.equal(first.settings.timezoneDatabaseVersion, first.provenance.timezoneDatabaseVersion);
  assert.equal(first.settings.ruleSetVersion, "life-core-0.2.0");
  assert.ok(first.vimshottariDasha.mahadashas[0].antardashas[0].pratyantardashas.length > 0);
  assert.equal(first.panchanga.nakshatra.name, first.vimshottariDasha.birthMoon.nakshatra);
  assert.equal(first.panchanga.nakshatra.pada, first.vimshottariDasha.birthMoon.pada);
  assert.ok(first.settings.ephemerisAssets.every((asset) => /^[A-F0-9]{64}$/.test(asset.sha256)));
  assert.ok(first.houses.length === 12);
  assert.deepEqual(Object.keys(first.divisionalCharts), Array.from({ length: 59 }, (_, index) => `D${index + 2}`));
  for (const division of Object.keys(first.divisionalCharts)) {
    assert.equal(first.divisionalCharts[division].length, first.planets.length + 1, `${division} includes Lagna and every active body`);
    assert.equal(first.divisionalCharts[division][0].name, "Lagna");
    assert.ok(first.divisionalCharts[division].every((item) => item.sign && item.convention && item.degreesInSign >= 0 && item.degreesInSign < 30));
  }
  const sweep = calculateBirthTimeSensitivity(input, 2);
  assert.equal(sweep.sampleCount, 5);
  assert.equal(sweep.settings.stepMinutes, 1);
  assert.equal(sweep.changes.length, 13);
  assert.ok(sweep.lagnaRange.spanDegrees > 0);
});

test("single-node modes return that ascending node and its opposite descending node", () => {
  for (const [nodeMode, expectedNames] of [
    ["mean", ["Mean node", "Mean Ketu"]],
    ["true", ["True node", "True Ketu"]],
  ]) {
    const chart = calculateBirthChart({ localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0, nodeMode });
    const nodes = chart.planets.filter((planet) => planet.name.includes("node") || planet.name.includes("Ketu"));
    assert.deepEqual(nodes.map((planet) => planet.name), expectedNames);
  }
});

test("chart receipt states UTC input scale and Swiss calc_ut Delta T handling", () => {
  const chart = calculateBirthChart({ localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 });
  assert.equal(chart.input.julianDayUtc, 2451545);
  assert.equal(chart.input.julianDayUt, chart.input.julianDayUtc);
  assert.equal(chart.input.julianDayUtInputScale, "UTC_APPROXIMATED_AS_UT1");
  assert.match(chart.settings.timeScaleConvention, /without DUT1 correction/);
  assert.match(chart.settings.timeScaleConvention, /applies Delta T internally/);
  assert.match(chart.settings.timeScaleConvention, /does not expose the applied Delta T value/);
  assert.equal(chart.provenance.independentReferenceValidation, "not-performed");
  assert.equal(chart.provenance.fullyVerified, false);
});

test("Person name is report metadata and never changes calculated positions", () => {
  const input = { fullName: "First name", localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 };
  const first = calculateBirthChart(input);
  const second = calculateBirthChart({ ...input, fullName: "Different name" });
  for (const field of ["ayanamsa", "ascendant", "mc", "houses", "planets", "divisionalCharts", "vimshottariDasha", "panchanga"]) assert.deepEqual(first[field], second[field], `${field} must not depend on a person's name`);
  assert.notEqual(first.provenance.resultHash, second.provenance.resultHash, "receipt hash includes the changed report metadata");
});

test("coordinate source category is validated and saved in the chart receipt", () => {
  const chart = calculateBirthChart({ coordinateSource: "gazetteer", localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 });
  assert.equal(chart.input.coordinateSource, "gazetteer");
});

test("degree-minute-second display preserves integer engine arcseconds", () => {
  const result = zodiac(12 + 34 / 60 + 56 / 3600);
  assert.deepEqual([result.degrees, result.minutes, result.seconds], [12, 34, 56]);
});

test("zodiac and nakshatra boundary rules wrap longitudes without rounding", () => {
  assert.equal(zodiac(0).sign, "Aries");
  assert.equal(zodiac(360).sign, "Aries");
  assert.equal(zodiac(-0.000001).sign, "Pisces");
  const segment = 360 / 27;
  const pada = segment / 4;
  for (let index = 0; index < 27; index++) {
    const start = index * segment;
    assert.equal(zodiac(start).pada, 1);
    assert.equal(zodiac(start).nakshatra, zodiac(start + 1e-9).nakshatra);
    for (let quarter = 1; quarter < 4; quarter++) {
      const boundary = start + quarter * pada;
      const before = zodiac(boundary - 1e-8);
      const exact = zodiac(boundary);
      const after = zodiac(boundary + 1e-8);
      assert.equal(before.nakshatra, after.nakshatra);
      assert.equal(exact.pada, quarter + 1);
      assert.equal(after.pada, quarter + 1);
    }
  }
  assert.equal(zodiac(360 - 1e-8).nakshatra, "Revati");
  assert.equal(zodiac(360).nakshatra, "Ashwini");
});

test("direct and retrograde labels follow signed engine speed", () => {
  const chart = calculateBirthChart({ localDate: "2020-10-15", localTime: "12:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 });
  assert.ok(chart.planets.some((planet) => planet.longitudeSpeed < 0));
  assert.ok(chart.planets.some((planet) => planet.longitudeSpeed > 0));
  for (const planet of chart.planets) assert.equal(planet.motion, planet.longitudeSpeed < 0 ? "Retrograde" : "Direct");
});

test("chart records selectable settings and distinguishes calculation from reference validation", () => {
  const chart = calculateBirthChart({
    fullName: "A. Example",
    localDate: "2000-01-01",
    localTime: "12:00",
    timeZone: "Etc/UTC",
    latitude: 40.7128,
    longitude: -74.006,
    birthTimeAccuracy: "within-5-minutes",
    ayanamsa: "Raman",
    houseSystem: "Equal",
    nodeMode: "mean",
  });
  assert.equal(chart.settings.ayanamsa, "Raman");
  assert.equal(chart.settings.houseSystem, "Equal");
  assert.equal(chart.settings.node, "mean");
  assert.equal(chart.input.fullName, "A. Example");
  assert.equal(chart.input.birthTimeAccuracy, "within-5-minutes");
  assert.equal(chart.planets.length, 12);
  assert.ok(!chart.planets.some((planet) => planet.name === "True node"));
  assert.ok(chart.planets.some((planet) => planet.name === "Mean Ketu"));
  assert.equal(chart.provenance.status, "calculated");
  assert.equal(chart.provenance.fullyVerified, false);
  assert.equal(chart.provenance.independentReferenceValidation, "not-performed");
  assert.equal(chart.provenance.consistencyChecks.tropicalSidereal, "passed");
  for (const planet of chart.planets) {
    const expected = (planet.tropicalLongitude - chart.ayanamsa + 360) % 360;
    const difference = ((expected - planet.siderealLongitude + 540) % 360) - 180;
    assert.ok(Math.abs(difference) < 0.00001);
    assert.ok(planet.house >= 1 && planet.house <= 12);
  }
});

test("house systems and sensitivity follow selected chart conventions", () => {
  const input = { localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 40.7128, longitude: -74.006, houseSystem: "Placidus", ayanamsa: "Krishnamurti", nodeMode: "true" };
  const chart = calculateBirthChart(input);
  const sweep = calculateBirthTimeSensitivity(input, 2);
  assert.equal(chart.houses.length, 12);
  assert.equal(chart.settings.houseSystem, "Placidus");
  assert.equal(sweep.settings.houseSystem, "Placidus");
  assert.equal(sweep.settings.ayanamsa, "Krishnamurti");
  assert.equal(sweep.settings.nodeMode, "true");
  assert.equal(sweep.sampleCount, 5);
  assert.equal(sweep.changes.some((item) => item.label === "Mean node"), false);
});

test("all supported house systems expose their distinct cusp semantics and respond to location", () => {
  const input = { localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 40.7128, longitude: -74.006, ayanamsa: "Lahiri" };
  const charts = Object.fromEntries(["WholeSign", "Equal", "Placidus", "Koch"].map((houseSystem) =>
    [houseSystem, calculateBirthChart({ ...input, houseSystem })]));
  const equal = charts.Equal;
  for (let index = 0; index < 12; index++) {
    const expected = (equal.ascendant.longitude + index * 30) % 360;
    const delta = ((equal.houses[index].cuspLongitude - expected + 540) % 360) - 180;
    assert.ok(Math.abs(delta) < 1e-8, `Equal house ${index + 1} must be 30° from the ascendant`);
  }
  for (const house of charts.WholeSign.houses) {
    assert.ok(Math.abs(house.cuspLongitude % 30) < 1e-8, `Whole Sign house ${house.house} starts on a sign boundary`);
  }
  assert.notEqual(charts.WholeSign.houses[0].cuspLongitude, charts.WholeSign.ascendant.longitude, "Whole Sign boundary is distinct from the ascendant degree");
  assert.notEqual(charts.Placidus.houses[1].cuspLongitude, charts.Koch.houses[1].cuspLongitude, "Placidus and Koch are distinct at this mid-latitude location");
  const changedLocation = calculateBirthChart({ ...input, longitude: -73.0, houseSystem: "Placidus" });
  assert.notEqual(changedLocation.ascendant.longitude, charts.Placidus.ascendant.longitude, "longitude affects the local ascendant");
  const changedLatitude = calculateBirthChart({ ...input, latitude: 34.0, houseSystem: "Placidus" });
  assert.notEqual(changedLatitude.houses[1].cuspLongitude, charts.Placidus.houses[1].cuspLongitude, "latitude affects location-dependent Placidus cusps");
});

test("unsupported high-latitude quadrant systems fail explicitly while supported systems remain available", () => {
  const input = { localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 66.6, longitude: 0 };
  for (const houseSystem of ["Placidus", "Koch"]) {
    assert.throws(() => calculateBirthChart({ ...input, houseSystem }), UnsupportedHouseCalculationError);
  }
  for (const houseSystem of ["WholeSign", "Equal"]) {
    const chart = calculateBirthChart({ ...input, houseSystem });
    assert.equal(chart.houses.length, 12);
  }
});

test("unsupported data dates fail closed instead of returning fallback positions", () => {
  assert.throws(() => calculateBirthChart({ localDate: "1800-01-01", localTime: "00:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 }), UnsupportedEphemerisDateError);
});
