import test from "node:test";
import assert from "node:assert/strict";
import { calculateKpAstrology, calculateKpLordChain } from "../src/calculation/kp.ts";
import { InputError } from "../src/calculation/time.ts";

// Placidus cusps for a clean whole-sign test chart (one sign per house).
const WHOLE_SIGN_CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

test("star (nakshatra) lords follow the Vimshottari cycle at the 13°20′ boundaries", () => {
  assert.equal(calculateKpLordChain(0).nakshatra.name, "Ashwini");
  assert.equal(calculateKpLordChain(0).nakshatra.lord, "Ketu");
  assert.equal(calculateKpLordChain(13.3333).nakshatra.name, "Ashwini");
  assert.equal(calculateKpLordChain(13.3334).nakshatra.name, "Bharani");
  assert.equal(calculateKpLordChain(13.3334).nakshatra.lord, "Venus");
  assert.equal(calculateKpLordChain(30).nakshatra.name, "Krittika");
  assert.equal(calculateKpLordChain(30).nakshatra.lord, "Sun");
  assert.equal(calculateKpLordChain(359.99).nakshatra.name, "Revati");
  assert.equal(calculateKpLordChain(359.99).nakshatra.lord, "Mercury");
});

test("exact KP star, sub, and sub-sub boundaries belong to the following interval", () => {
  const nakshatraSpan = 360 / 27;
  const firstSubBoundary = nakshatraSpan * 7 / 120;
  const venusSubSpan = nakshatraSpan * 20 / 120;
  const firstSubSubBoundary = firstSubBoundary + venusSubSpan * 20 / 120;

  assert.equal(calculateKpLordChain(nakshatraSpan - 1e-8).nakshatra.lord, "Ketu");
  assert.equal(calculateKpLordChain(nakshatraSpan).nakshatra.lord, "Venus");
  assert.equal(calculateKpLordChain(firstSubBoundary - 1e-8).sub.lord, "Ketu");
  assert.equal(calculateKpLordChain(firstSubBoundary).sub.lord, "Venus");
  assert.equal(calculateKpLordChain(firstSubSubBoundary - 1e-8).subSub.lord, "Venus");
  assert.equal(calculateKpLordChain(firstSubSubBoundary).subSub.lord, "Sun");
});

test("sub lords are the nakshatra split into 9 Vimshottari-proportional parts", () => {
  // Ashwini (Ketu): Ketu 0.7778°, Venus 2.2222°, Sun 0.6667°, Moon 1.1111°, Mars 0.7778°, ...
  assert.equal(calculateKpLordChain(0.5).sub.lord, "Ketu");
  assert.equal(calculateKpLordChain(1.0).sub.lord, "Venus");
  assert.equal(calculateKpLordChain(3.1).sub.lord, "Sun");
  assert.equal(calculateKpLordChain(4.0).sub.lord, "Moon");
  assert.equal(calculateKpLordChain(5.0).sub.lord, "Mars");
  assert.equal(calculateKpLordChain(6.0).sub.lord, "Rahu");
  // Boundary longitude 3.0° is exactly the Sun sub start (Ketu+Venus).
  assert.equal(calculateKpLordChain(3.0).sub.lord, "Sun");
  assert.equal(calculateKpLordChain(3.0 - 1e-6).sub.lord, "Venus");
});

test("sub-sub lords subdivide each sub proportionally from the sub lord", () => {
  // Mars sub starts at 4.7778°; its sub-subs run Mars, Rahu, Jupiter, ... within 0.7778°.
  assert.equal(calculateKpLordChain(5.0).sub.lord, "Mars");
  assert.equal(calculateKpLordChain(5.0).subSub.lord, "Jupiter");
  assert.equal(calculateKpLordChain(4.8).subSub.lord, "Mars");
  assert.equal(calculateKpLordChain(5.0).subSub.spanDegrees > 0, true);
});

test("rejects a non-finite longitude", () => {
  assert.throws(
    () => calculateKpLordChain(Number.NaN),
    (error) => error instanceof InputError && error.code === "INVALID_KP_LONGITUDE",
  );
});

test("cusp and planet lord chains are produced for all 12 houses", () => {
  const result = calculateKpAstrology({ planets: [{ name: "Sun", longitude: 135 }], cusps: WHOLE_SIGN_CUSPS });
  assert.equal(result.cusps.length, 12);
  assert.equal(result.cusps[0].signLord, "Mars");
  assert.equal(result.cusps[0].nakshatra.lord, "Ketu");
  assert.equal(result.cusps[9].signLord, "Saturn");
  assert.equal(result.ayanamsa, "Krishnamurti");
  assert.equal(result.houseSystem, "Placidus");
});

test("planet significators apply the four-fold KP rule", () => {
  const result = calculateKpAstrology({
    planets: [
      { name: "Sun", longitude: 135 }, // Leo, house 5; Purva Phalguni star lord Venus
      { name: "Venus", longitude: 45 }, // Taurus, house 2; Rohini star lord Moon
      { name: "Rahu", longitude: 200 }, // Libra, house 7; Vishakha star lord Jupiter
      { name: "Ketu", longitude: 45 }, // Taurus, house 2; Rohini star lord Moon
    ],
    cusps: WHOLE_SIGN_CUSPS,
  });
  const byName = Object.fromEntries(result.planets.map((planet) => [planet.name, planet]));
  // Sun: occupies 5, owns 5 (Leo), star lord Venus occupies 2, Venus owns 2 and 7.
  assert.deepEqual(byName.Sun.significations.houses, [2, 5, 7]);
  assert.deepEqual(byName.Sun.significations.starLordOwned, [2, 7]);
  // Venus: occupies 2, owns 2 and 7, star lord Moon owns 4 (Moon not placed in the chart).
  assert.deepEqual(byName.Venus.significations.houses, [2, 4, 7]);
  assert.deepEqual(byName.Venus.significations.starLordOccupied, []);
  // Rahu owns no house; it signifies the star lord's houses and its sign dispositor Venus.
  assert.deepEqual(byName.Rahu.significations.owned, []);
  assert.deepEqual(byName.Rahu.significations.dispositorOccupied, [2]);
  assert.deepEqual(byName.Rahu.significations.dispositorOwned, [2, 7]);
  assert.deepEqual(byName.Rahu.significations.houses, [2, 7, 9, 12]);
  assert.deepEqual(byName.Ketu.significations.dispositorOccupied, [2]);
  assert.deepEqual(byName.Ketu.significations.dispositorOwned, [2, 7]);
  assert.deepEqual(byName.Ketu.significations.houses, [2, 4, 7]);
});

test("house significators are the planets that signify that house", () => {
  const result = calculateKpAstrology({
    planets: [
      { name: "Sun", longitude: 135 },
      { name: "Venus", longitude: 45 },
      { name: "Rahu", longitude: 200 },
      { name: "Ketu", longitude: 45 },
    ],
    cusps: WHOLE_SIGN_CUSPS,
  });
  const house2 = result.cusps.find((cusp) => cusp.house === 2);
  const house7 = result.cusps.find((cusp) => cusp.house === 7);
  assert.deepEqual(house2.signifiedBy.sort(), ["Ketu", "Rahu", "Sun", "Venus"]);
  assert.deepEqual(house7.signifiedBy.sort(), ["Ketu", "Rahu", "Sun", "Venus"]);
});

test("rejects malformed inputs", () => {
  assert.throws(() => calculateKpAstrology({ planets: [], cusps: WHOLE_SIGN_CUSPS }), (error) => error instanceof InputError && error.code === "INVALID_KP_PLANETS");
  assert.throws(() => calculateKpAstrology({ planets: [{ name: "Sun", longitude: 0 }], cusps: [0, 1, 2] }), (error) => error instanceof InputError && error.code === "INVALID_KP_CUSPS");
});
