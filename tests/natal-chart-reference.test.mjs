import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateBirthChart } from "../src/calculation/chart.ts";

const caseFixture = JSON.parse(
  await readFile("data/reference/natal-chart-jpl-cases.json", "utf8"),
);
const referenceFixtures = {
  "jpl-horizons-de441-2000-01-01.json": JSON.parse(
    await readFile("data/reference/jpl-horizons-de441-2000-01-01.json", "utf8"),
  ),
  "jpl-horizons-de441-2024-06-21.json": JSON.parse(
    await readFile("data/reference/jpl-horizons-de441-2024-06-21.json", "utf8"),
  ),
  "jpl-horizons-de441-2024-04-15-mercury-retrograde.json": JSON.parse(
    await readFile("data/reference/jpl-horizons-de441-2024-04-15-mercury-retrograde.json", "utf8"),
  ),
};

test("birth-chart pipeline tropical positions match fixed JPL fixtures after IANA time resolution", () => {
  assert.equal(caseFixture.fixtureVersion, 1);
  assert.equal(caseFixture.reference.system, "JPL Horizons");
  assert.equal(caseFixture.reference.ephemeris, "DE441");
  assert.match(caseFixture.caseDataStatus, /Synthetic, non-user/);
  assert.match(caseFixture.boundaryCoverage.natalBirthBoundaryReference, /Unavailable/);
  const toleranceDegrees = caseFixture.reference.toleranceArcseconds / 3600;
  let comparedPlanetPositions = 0;
  const siderealSourceSigns = new Set();

  for (const fixtureCase of caseFixture.cases) {
    const chart = calculateBirthChart(fixtureCase.input);
    assert.equal(chart.input.utc, fixtureCase.expectedUtc, `${fixtureCase.id} resolves to expected UTC`);
    assert.equal(chart.input.resolvedOffset, fixtureCase.expectedOffset, `${fixtureCase.id} resolves IANA offset`);
    assert.equal(chart.settings.ayanamsa, fixtureCase.input.ayanamsa);
    assert.equal(chart.settings.houseSystem, fixtureCase.input.houseSystem);
    assert.equal(chart.settings.node, fixtureCase.input.nodeMode);
    assert.equal(chart.settings.ephemerisManifestVersion, 1);
    assert.match(fixtureCase.ephemeris.utcToUtConvention, /UT1 approximation without DUT1/);

    const reference = referenceFixtures[fixtureCase.ephemeris.referenceFixture];
    assert.equal(reference.epoch, fixtureCase.referenceEpoch);
    assert.equal(reference.source.ephemeris, caseFixture.reference.ephemeris);
    assert.equal(reference.comparison.toleranceArcseconds, caseFixture.reference.toleranceArcseconds);
    assert.match(reference.source.quantityConvention, /ecliptic-of-date apparent/);

    const expectedBodies = reference.bodies ?? [{
      name: reference.body.name,
      longitudeDegrees: reference.body.samples[0].longitudeDegrees,
      latitudeDegrees: reference.body.samples[0].latitudeDegrees,
    }];
    for (const expected of expectedBodies) {
      const actual = chart.planets.find((planet) => planet.name === expected.name);
      assert.ok(actual, `${fixtureCase.id} includes ${expected.name}`);
      siderealSourceSigns.add(Math.floor(actual.siderealLongitude / 30));
      const longitudeDelta = ((actual.tropicalLongitude - expected.longitudeDegrees + 540) % 360) - 180;
      const latitudeDelta = actual.latitude - expected.latitudeDegrees;
      assert.ok(
        Math.abs(longitudeDelta) <= toleranceDegrees,
        `${fixtureCase.id} ${expected.name} longitude delta ${longitudeDelta * 3600} arcsec`,
      );
      assert.ok(
        Math.abs(latitudeDelta) <= toleranceDegrees,
        `${fixtureCase.id} ${expected.name} latitude delta ${latitudeDelta * 3600} arcsec`,
      );
      comparedPlanetPositions++;
    }

    if (fixtureCase.retrogradeBody) {
      const actual = chart.planets.find((planet) => planet.name === fixtureCase.retrogradeBody);
      const samples = reference.body.samples;
      const referenceRate = (samples[1].longitudeDegrees - samples[0].longitudeDegrees) * 1440;
      assert.equal(actual.motion, "Retrograde", `${fixtureCase.id} detects retrograde Mercury`);
      assert.ok(referenceRate < 0, `${fixtureCase.id} JPL finite difference indicates retrograde motion`);
      assert.ok(
        Math.abs(actual.longitudeSpeed - referenceRate) <= reference.comparison.rateToleranceDegreesPerDay,
        `${fixtureCase.id} rate delta ${actual.longitudeSpeed - referenceRate} degrees/day`,
      );
    }
  }

  assert.equal(comparedPlanetPositions, 14);
  assert.ok(siderealSourceSigns.size >= 7, "fixed birth fixtures exercise multiple sidereal source signs");
});

test("natal reference case manifest records unsupported outputs without promoting validation status", () => {
  assert.match(caseFixture.scope, /not independently established/);
  assert.ok(caseFixture.cases.every((fixtureCase) =>
    fixtureCase.input.localDate &&
    fixtureCase.input.localTime &&
    fixtureCase.input.timeZone &&
    Number.isFinite(fixtureCase.input.latitude) &&
    Number.isFinite(fixtureCase.input.longitude) &&
    fixtureCase.input.ayanamsa &&
    fixtureCase.input.houseSystem &&
    fixtureCase.houseSystemConvention &&
    fixtureCase.ephemeris.utcToUtConvention &&
    fixtureCase.input.nodeMode &&
    fixtureCase.ephemeris.referenceFixture,
  ));

  for (const fixtureCase of caseFixture.cases) {
    const chart = calculateBirthChart(fixtureCase.input);
    assert.equal(chart.provenance.independentReferenceValidation, "not-performed");
    assert.equal(chart.provenance.fullyVerified, false);
  }
});
