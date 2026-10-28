import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { setEphemerisPath, calculatePosition, julianDay } from "@swisseph/node";
import { CalculationFlag, Planet } from "@swisseph/core";

const fixture = JSON.parse(await readFile("data/reference/jpl-horizons-de441-2000-01-01.json", "utf8"));
const solsticeFixture = JSON.parse(await readFile("data/reference/jpl-horizons-de441-2024-06-21.json", "utf8"));
const retrogradeFixture = JSON.parse(await readFile("data/reference/jpl-horizons-de441-2024-04-15-mercury-retrograde.json", "utf8"));
const planetIds = {
  Sun: Planet.Sun,
  Moon: Planet.Moon,
  Mercury: Planet.Mercury,
  Venus: Planet.Venus,
  Mars: Planet.Mars,
  Jupiter: Planet.Jupiter,
  Saturn: Planet.Saturn,
  Uranus: Planet.Uranus,
  Neptune: Planet.Neptune,
  Pluto: Planet.Pluto,
};

test("tropical positions match the versioned JPL Horizons DE441 offline fixture within declared tolerance", () => {
  assert.equal(fixture.fixtureVersion, 1);
  assert.equal(fixture.source.ephemeris, "DE441");
  assert.match(fixture.source.quantityConvention, /ecliptic-of-date apparent/);
  assert.equal(fixture.comparison.engine, "@swisseph/node 1.4.0");
  setEphemerisPath(path.resolve("data/ephemeris"));
  const jd = julianDay(2000, 1, 1, 12);
  const flags = CalculationFlag.SwissEphemeris | CalculationFlag.Speed;
  const toleranceDegrees = fixture.comparison.toleranceArcseconds / 3600;

  for (const reference of fixture.bodies) {
    const position = calculatePosition(jd, planetIds[reference.name], flags);
    assert.ok(position.flags & CalculationFlag.SwissEphemeris, `${reference.name} must use Swiss ephemeris files`);
    const longitudeDelta = ((position.longitude - reference.longitudeDegrees + 540) % 360) - 180;
    assert.ok(Math.abs(longitudeDelta) <= toleranceDegrees,
      `${reference.name} longitude differs by ${longitudeDelta * 3600} arcsec`);
    assert.ok(Math.abs(position.latitude - reference.latitudeDegrees) <= toleranceDegrees,
      `${reference.name} latitude differs by ${(position.latitude - reference.latitudeDegrees) * 3600} arcsec`);
  }
});

test("tropical Sun, Moon, and Mars match a second JPL DE441 epoch within declared tolerance", () => {
  assert.equal(solsticeFixture.fixtureVersion, 1);
  assert.equal(solsticeFixture.source.ephemeris, "DE441");
  assert.match(solsticeFixture.source.quantityConvention, /ecliptic-of-date apparent/);
  assert.equal(solsticeFixture.epoch, "2024-06-21T00:00:00Z");
  assert.equal(solsticeFixture.comparison.engine, "@swisseph/node 1.4.0");
  setEphemerisPath(path.resolve("data/ephemeris"));
  const jd = julianDay(2024, 6, 21, 0);
  const flags = CalculationFlag.SwissEphemeris | CalculationFlag.Speed;
  const toleranceDegrees = solsticeFixture.comparison.toleranceArcseconds / 3600;

  for (const reference of solsticeFixture.bodies) {
    const position = calculatePosition(jd, planetIds[reference.name], flags);
    assert.ok(position.flags & CalculationFlag.SwissEphemeris, `${reference.name} must use Swiss ephemeris files`);
    const longitudeDelta = ((position.longitude - reference.longitudeDegrees + 540) % 360) - 180;
    assert.ok(Math.abs(longitudeDelta) <= toleranceDegrees,
      `${reference.name} longitude differs by ${longitudeDelta * 3600} arcsec`);
    assert.ok(Math.abs(position.latitude - reference.latitudeDegrees) <= toleranceDegrees,
      `${reference.name} latitude differs by ${(position.latitude - reference.latitudeDegrees) * 3600} arcsec`);
  }
});

test("Mercury retrograde direction and speed agree with a finite difference of adjacent JPL positions", () => {
  assert.equal(retrogradeFixture.fixtureVersion, 1);
  assert.equal(retrogradeFixture.source.ephemeris, "DE441");
  assert.equal(retrogradeFixture.body.samples.length, 2);
  setEphemerisPath(path.resolve("data/ephemeris"));
  const samples = retrogradeFixture.body.samples;
  const first = samples[0];
  const second = samples[1];
  const firstPosition = calculatePosition(julianDay(2024, 4, 15, 0), Planet.Mercury, CalculationFlag.SwissEphemeris | CalculationFlag.Speed);
  assert.ok(firstPosition.flags & CalculationFlag.SwissEphemeris);
  const longitudeRateDegreesPerDay = (second.longitudeDegrees - first.longitudeDegrees) * 1440;
  assert.ok(longitudeRateDegreesPerDay < 0, "JPL apparent longitude finite difference must indicate retrograde motion");
  assert.ok(firstPosition.longitudeSpeed < 0, "Swiss speed must classify Mercury retrograde at this epoch");
  assert.ok(Math.abs(firstPosition.longitudeSpeed - longitudeRateDegreesPerDay) < retrogradeFixture.comparison.rateToleranceDegreesPerDay,
    `Swiss rate ${firstPosition.longitudeSpeed}°/day differs from JPL finite difference ${longitudeRateDegreesPerDay}°/day`);
  const longitudeDelta = ((firstPosition.longitude - first.longitudeDegrees + 540) % 360) - 180;
  assert.ok(Math.abs(longitudeDelta) <= retrogradeFixture.comparison.toleranceArcseconds / 3600,
    `Mercury longitude differs by ${longitudeDelta * 3600} arcsec`);
  assert.ok(Math.abs(firstPosition.latitude - first.latitudeDegrees) <= retrogradeFixture.comparison.toleranceArcseconds / 3600,
    `Mercury latitude differs by ${(firstPosition.latitude - first.latitudeDegrees) * 3600} arcsec`);
});
