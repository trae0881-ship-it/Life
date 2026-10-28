import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateBirthChart } from "../src/calculation/chart.ts";

const sourceCases = JSON.parse(
  await readFile("data/reference/natal-chart-jpl-cases.json", "utf8"),
);
const reference = JSON.parse(
  await readFile("data/reference/pyjhora-natal-cases.json", "utf8"),
);
const sourceById = new Map(sourceCases.cases.map((fixtureCase) => [fixtureCase.id, fixtureCase]));
const signIndex = (longitude) => Math.floor((((longitude % 360) + 360) % 360) / 30);
const numericToleranceDegrees = 4 * Number.EPSILON * 360;

function assertSameDoubleResult(actual, expected, label) {
  assert.ok(
    Number.isFinite(actual) && Number.isFinite(expected)
      && Math.abs(actual - expected) <= numericToleranceDegrees,
    `${label} residual ${actual - expected} degrees exceeds ${numericToleranceDegrees}`,
  );
}

function lifeChartPlacement(chart, division, name) {
  if (division === 1) {
    if (name === "Lagna") return { signIndex: signIndex(chart.ascendant.longitude), longitude: chart.ascendant.longitude };
    const planet = chart.planets.find((item) => item.name === (name === "Rahu" ? "True node" : name));
    return planet && { signIndex: signIndex(planet.siderealLongitude), longitude: planet.siderealLongitude };
  }
  const placement = chart.divisionalCharts[`D${division}`]
    .find((item) => item.name === (name === "Rahu" ? "True node" : name));
  return placement && { signIndex: placement.signIndex, longitude: placement.longitude };
}

test("fixed PyJHora reference records the exact isolated environment and chart inputs", () => {
  assert.equal(reference.fixtureVersion, 1);
  assert.equal(reference.reference.name, "PyJHora");
  assert.equal(reference.reference.version, "4.8.7");
  assert.equal(reference.reference.commit, "ca22995709bd60e371e7820a1a5efc80ce4cf821");
  assert.equal(reference.reference.wheelSha256, "d8d8014573a38ddefedcae57d3b8d84687cac2ad31bb5b1dd70d945906a4d54d");
  assert.match(reference.reference.license, /AGPL-3\.0/);
  assert.match(reference.reference.license, /MIT classifier conflicts/);
  assert.match(reference.reference.runtime, /Python 3\.11\.9; isolated/);
  assert.equal(reference.reference.dependencies.numpy, "2.1.1");
  assert.equal(reference.reference.dependencies.pyswisseph, "2.10.3.2");
  assert.equal(reference.reference.swissEphemerisVersion, "2.10.03");
  assert.equal(reference.reference.numericComparisonToleranceDegrees, numericToleranceDegrees);
  assert.match(reference.reference.numericToleranceRationale, /Four double-precision ULPs/);
  assert.equal(reference.cases.length, sourceCases.cases.length);
  assert.match(reference.cases[0].reference.sharedCoreCaveat, /embedded Swiss version is not exposed/);

  for (const fixtureCase of reference.cases) {
    const inputCase = sourceById.get(fixtureCase.id);
    assert.ok(inputCase, `${fixtureCase.id} has a fixed source input`);
    assert.equal(fixtureCase.input.localDate, inputCase.input.localDate);
    assert.equal(fixtureCase.input.localTime, inputCase.input.localTime);
    assert.equal(fixtureCase.input.timeZone, inputCase.input.timeZone);
    assert.equal(fixtureCase.input.resolvedOffset, inputCase.expectedOffset);
    assert.equal(fixtureCase.input.utc, inputCase.expectedUtc);
    assert.equal(fixtureCase.input.latitude, inputCase.input.latitude);
    assert.equal(fixtureCase.input.longitude, inputCase.input.longitude);
    assert.equal(fixtureCase.input.ayanamsa, "Lahiri");
    assert.equal(fixtureCase.input.zodiac, "sidereal");
    assert.equal(fixtureCase.input.houseSystem, "Placidus");
    assert.equal(fixtureCase.input.nodeMode, "true");
    assert.match(fixtureCase.input.ephemerisPath, /checked-in Swiss Ephemeris assets/);
    assert.match(fixtureCase.input.houseConvention, /sidereal cusps and Ascendant/);
    assert.equal(Object.keys(fixtureCase.charts).length, 60);
    for (let division = 1; division <= 60; division++) {
      assert.ok(fixtureCase.charts[`D${division}`], `D${division} reference output`);
    }
  }
});

test("PyJHora D1-D60 output signs match LIFE across three fixed birth inputs", () => {
  let comparedPlacements = 0;
  for (const fixtureCase of reference.cases) {
    const inputCase = sourceById.get(fixtureCase.id);
    const chart = calculateBirthChart(inputCase.input);
    assert.equal(chart.input.utc, fixtureCase.input.utc, `${fixtureCase.id} UTC`);
    assert.equal(chart.input.resolvedOffset, fixtureCase.input.resolvedOffset, `${fixtureCase.id} timezone offset`);
    assert.equal(chart.settings.ayanamsa, fixtureCase.input.ayanamsa, `${fixtureCase.id} ayanamsa`);
    assert.equal(chart.settings.houseSystem, fixtureCase.input.houseSystem, `${fixtureCase.id} house system`);

    for (let division = 1; division <= 60; division++) {
      const expectedChart = fixtureCase.charts[`D${division}`];
      assert.ok(Object.keys(expectedChart).length >= 12, `D${division} reference placements`);
      for (const [name, expected] of Object.entries(expectedChart)) {
        if (name === "Ketu") continue;
        const actual = lifeChartPlacement(chart, division, name);
        assert.ok(actual, `${fixtureCase.id} D${division} includes ${name}`);
        assert.equal(
          actual.signIndex,
          expected.signIndex,
          `${fixtureCase.id} D${division} ${name} sign`,
        );
        comparedPlacements++;
      }
    }
  }
  assert.equal(comparedPlacements, 2160);
});

test("PyJHora sidereal D1 longitudes, Ascendants, and Placidus cusps reproduce exactly", () => {
  let comparedD1Longitudes = 0;
  let comparedHouseValues = 0;
  for (const fixtureCase of reference.cases) {
    const inputCase = sourceById.get(fixtureCase.id);
    const chart = calculateBirthChart(inputCase.input);

    for (const [name, expected] of Object.entries(fixtureCase.charts.D1)) {
      if (name === "Ketu") continue;
      const actual = lifeChartPlacement(chart, 1, name);
      assert.ok(actual, `${fixtureCase.id} D1 ${name}`);
      assertSameDoubleResult(actual.longitude, expected.longitudeDegrees, `${fixtureCase.id} D1 ${name} longitude`);
      comparedD1Longitudes++;
    }

    assertSameDoubleResult(chart.ascendant.longitude, fixtureCase.houses.ascendantLongitude, `${fixtureCase.id} Ascendant`);
    comparedHouseValues++;
    for (let index = 0; index < 12; index++) {
      assertSameDoubleResult(
        chart.houses[index].cuspLongitude,
        fixtureCase.houses.cusps[index],
        `${fixtureCase.id} Placidus house ${index + 1} cusp`,
      );
      comparedHouseValues++;
    }
  }
  assert.equal(comparedD1Longitudes, 36);
  assert.equal(comparedHouseValues, 39);
});
