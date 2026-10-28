import test from "node:test";
import assert from "node:assert/strict";
import { calculateGrahaAspects, calculatePlanetaryDignity, calculateYogasAndDoshas } from "../src/calculation/yogas.ts";
import { InputError } from "../src/calculation/time.ts";

const presentIds = (input) => new Set(calculateYogasAndDoshas(input).filter((finding) => finding.present).map((finding) => finding.id));
const byId = (input) => Object.fromEntries(calculateYogasAndDoshas(input).map((finding) => [finding.id, finding]));

test("dignity classifies exaltation, moolatrikona, debilitation, friendship, combustion and retrogression", () => {
  const dignity = calculatePlanetaryDignity([
    { name: "Sun", longitude: 10 }, // 10° Aries: exaltation
    { name: "Moon", longitude: 40 }, // 10° Taurus: exaltation
    { name: "Mars", longitude: 0 }, // 0° Aries: moolatrikona
    { name: "Venus", longitude: 180 }, // 0° Libra: moolatrikona
    { name: "Mercury", longitude: 165, speed: -1 }, // 15° Virgo: exaltation, retrograde
    { name: "Jupiter", longitude: 70 }, // 10° Gemini: enemy sign
    { name: "Saturn", longitude: 190 }, // 10° Libra: exaltation
  ]);
  const byName = Object.fromEntries(dignity.map((entry) => [entry.name, entry]));
  assert.equal(byName.Sun.dignity, "Exalted");
  assert.equal(byName.Moon.dignity, "Exalted");
  assert.equal(byName.Mars.dignity, "Moolatrikona");
  assert.equal(byName.Venus.dignity, "Moolatrikona");
  assert.equal(byName.Mercury.dignity, "Exalted");
  assert.equal(byName.Jupiter.dignity, "Enemy");
  assert.equal(byName.Saturn.dignity, "Exalted");
  assert.equal(byName.Mercury.retrograde, true);
  assert.equal(byName.Jupiter.retrograde, null);
});

test("dignity detects debilitation and combustion", () => {
  const dignity = calculatePlanetaryDignity([
    { name: "Sun", longitude: 10 }, // 10° Aries
    { name: "Saturn", longitude: 20 }, // 10° Aries: debilitated, 10° from Sun -> combust (orb 15)
    { name: "Jupiter", longitude: 120 }, // 0° Leo: 110° from Sun -> not combust
  ]);
  const byName = Object.fromEntries(dignity.map((entry) => [entry.name, entry]));
  assert.equal(byName.Saturn.dignity, "Debilitated");
  assert.equal(byName.Saturn.combust, true);
  assert.equal(byName.Jupiter.combust, false);
  assert.equal(byName.Sun.combust, null);
});

test("rejects malformed dignity input", () => {
  assert.throws(() => calculatePlanetaryDignity([]), (error) => error instanceof InputError && error.code === "INVALID_DIGNITY_INPUT");
  assert.throws(() => calculatePlanetaryDignity([{ name: "Sun", longitude: Number.NaN }]), (error) => error instanceof InputError && error.code === "INVALID_DIGNITY_INPUT");
});

test("Parashari aspects give each body its special drishti", () => {
  const result = calculateGrahaAspects(
    [
      { name: "Mars", longitude: 0 }, // Aries, house 1
      { name: "Jupiter", longitude: 90 }, // Cancer, house 4
      { name: "Sun", longitude: 180 }, // Libra, house 7
      { name: "Moon", longitude: 270 }, // Capricorn, house 10
    ],
    0,
  );
  const byName = Object.fromEntries(result.details.map((entry) => [entry.name, entry]));
  assert.deepEqual(byName.Mars.aspectsHouses, [4, 7, 8]);
  assert.deepEqual(byName.Jupiter.aspectsHouses, [8, 10, 12]);
  assert.deepEqual(byName.Sun.aspectsHouses, [1]);
  assert.deepEqual(byName.Moon.aspectsHouses, [4]);
  assert.deepEqual(byName.Mars.aspectsPlanets, ["Jupiter", "Sun"]);
  assert.deepEqual(byName.Jupiter.aspectsPlanets, ["Moon"]);
  assert.deepEqual(byName.Sun.aspectsPlanets, ["Mars"]);
});

test("rejects an invalid ascendant sign for aspects", () => {
  assert.throws(() => calculateGrahaAspects([{ name: "Sun", longitude: 0 }], 12), (error) => error instanceof InputError && error.code === "INVALID_ASCENDANT_SIGN");
});

test("detects classical conjunction and kendra yogas from rasi houses", () => {
  const ids = presentIds({
    ascendantLongitude: 0,
    planets: [
      { name: "Sun", longitude: 10 }, // Aries
      { name: "Moon", longitude: 10 }, // Aries
      { name: "Mars", longitude: 10 }, // Aries, house 1
      { name: "Mercury", longitude: 12 }, // Aries
      { name: "Jupiter", longitude: 95 }, // Cancer, 4th from Moon (kendra)
      { name: "Venus", longitude: 185 }, // Libra, house 7
      { name: "Saturn", longitude: 275 }, // Capricorn, house 10
      { name: "Rahu", longitude: 20 }, // Aries
      { name: "Ketu", longitude: 200 }, // Libra
    ],
  });
  for (const id of ["chandra-mangala", "budhaditya", "gajakesari", "mahapurusha-mars", "mahapurusha-jupiter", "mahapurusha-venus", "mahapurusha-saturn"]) {
    assert.ok(ids.has(id), `${id} should be present`);
  }
  assert.ok(!ids.has("mahapurusha-mercury"), "Mercury is in Aries, not own/exalted, so Bhadra must be absent");
  assert.ok(ids.has("mangal-dosha"), "Mars in the 1st from the ascendant is a Kuja dosha");
  assert.ok(ids.has("grahan-dosha"), "the Sun is with Rahu in Aries");
  assert.ok(ids.has("pitra-dosha"), "the Sun is conjunct a node");
});

test("Gajakesari reports the Jupiter-to-Moon house and Kemadruma respects the Moon's surroundings", () => {
  const gaja = byId({
    ascendantLongitude: 0,
    planets: [
      { name: "Moon", longitude: 10 }, // Aries
      { name: "Jupiter", longitude: 190 }, // Libra: 7th from the Moon
    ],
  });
  assert.equal(gaja.gajakesari.present, true);
  assert.equal(gaja.gajakesari.detail, "Jupiter is in the 7th from the Moon.");

  const kemadruma = byId({
    ascendantLongitude: 0,
    planets: [
      { name: "Moon", longitude: 10 }, // Aries, isolated
      { name: "Sun", longitude: 12 }, // allowed to be with the Moon
    ],
  });
  assert.equal(kemadruma.kemadruma.present, true);

  const kemadrumaBroken = byId({
    ascendantLongitude: 0,
    planets: [
      { name: "Moon", longitude: 10 }, // Aries
      { name: "Jupiter", longitude: 40 }, // Taurus: 2nd from the Moon
    ],
  });
  assert.equal(kemadrumaBroken.kemadruma.present, false);
  assert.equal(kemadrumaBroken.sunapha.present, true);
});

test("detects and classifies Kaal Sarpa Dosha with its named form", () => {
  const result = byId({
    ascendantLongitude: 0,
    planets: [
      { name: "Sun", longitude: 10 },
      { name: "Moon", longitude: 20 },
      { name: "Mars", longitude: 30 },
      { name: "Mercury", longitude: 40 },
      { name: "Jupiter", longitude: 50 },
      { name: "Venus", longitude: 60 },
      { name: "Saturn", longitude: 70 },
      { name: "Rahu", longitude: 0 }, // Aries -> house 1
      { name: "Ketu", longitude: 180 },
    ],
  });
  assert.equal(result["kaal-sarpa"].present, true);
  assert.match(result["kaal-sarpa"].detail, /Anant form \(Rahu in the 1st house\)/);
});

test("Pitra Dosha states its same-sign node rule without implying a degree-based conjunction", () => {
  const finding = byId({
    ascendantLongitude: 0,
    planets: [
      { name: "Sun", longitude: 0 },
      { name: "Rahu", longitude: 29.5 },
      { name: "Ketu", longitude: 209.5 },
    ],
  })["pitra-dosha"];
  assert.equal(finding.present, true);
  assert.match(finding.rule, /Sun shares a sign with Rahu\/Ketu/);
  assert.doesNotMatch(finding.rule, /conjunct/i);
});

test("a scattered chart is not marked with Kaal Sarpa or Mangal dosha", () => {
  const ids = presentIds({
    ascendantLongitude: 0,
    planets: [
      { name: "Sun", longitude: 10 },
      { name: "Moon", longitude: 40 },
      { name: "Mars", longitude: 270 }, // Capricorn, house 10 -> not a Kuja house from asc or Moon
      { name: "Rahu", longitude: 200 },
      { name: "Ketu", longitude: 20 },
    ],
  });
  assert.ok(!ids.has("kaal-sarpa"));
  assert.ok(!ids.has("mangal-dosha"));
});

test("rejects malformed yoga input", () => {
  assert.throws(() => calculateYogasAndDoshas({ ascendantLongitude: Number.NaN, planets: [] }), (error) => error instanceof InputError && error.code === "INVALID_YOGA_INPUT");
});
