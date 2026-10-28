import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateIshtakaalFromSunrises,
  calculateSunMoonRiseSet,
  calculateTransits,
  calculateVara,
  formatInZone,
  localDateInZone,
  localWeekdayInZone,
} from "../src/calculation/events.ts";
import { InputError } from "../src/calculation/time.ts";

const MUMBAI = { timeZone: "Asia/Kolkata", latitude: 19.076, longitude: 72.8777 };
const EQUATOR = { timeZone: "Etc/UTC", latitude: 0, longitude: 0 };
const POLAR = { timeZone: "Etc/UTC", latitude: 80, longitude: 0 };

const minutesBetween = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;

test("rise/set returns real Swiss Ephemeris times for a mid-latitude city", () => {
  const result = calculateSunMoonRiseSet({ localDate: "2024-06-21", ...MUMBAI });
  assert.equal(result.library, "Swiss Ephemeris swe_rise_trans");
  for (const key of ["sunrise", "sunset", "moonrise", "moonset"]) {
    assert.equal(result[key].status, "calculated", `${key} must be calculated`);
    assert.ok(Number.isFinite(result[key].julianDayUt), `${key} must carry a Julian day`);
    assert.equal(result[key].occursOnReferenceDate, true, `${key} must fall on the reference local date`);
    assert.equal(result[key].eventLocalDate, "2024-06-21");
  }
  assert.ok(new Date(result.sunrise.utc).getTime() < new Date(result.sunset.utc).getTime(), "sunrise must precede sunset");
  assert.match(result.sunrise.localTime, /^2024-06-21 06:0/);
});

test("equinox at the equator gives a day length near 12h07m", () => {
  const result = calculateSunMoonRiseSet({ localDate: "2000-03-20", ...EQUATOR });
  const dayLengthMinutes = minutesBetween(result.sunrise.utc, result.sunset.utc);
  assert.ok(Math.abs(dayLengthMinutes - (12 * 60 + 7)) <= 5, `equinox day length ${dayLengthMinutes.toFixed(1)} min must be ~12h07m`);
});

test("a circumpolar date returns no-event instead of a fabricated time", () => {
  const result = calculateSunMoonRiseSet({ localDate: "2024-06-21", ...POLAR });
  for (const key of ["sunrise", "sunset", "moonrise", "moonset"]) {
    if (result[key].status === "no-event") {
      assert.equal(result[key].utc, null, `${key} must not invent a time`);
      assert.equal(result[key].julianDayUt, null);
      assert.match(result[key].reason, /no .* for this location and date/);
    } else {
      assert.equal(result[key].status, "calculated");
    }
  }
  assert.equal(result.sunrise.status, "no-event", "midnight sun must have no sunrise on 2024-06-21 at 80N");
});

test("rejects a malformed rise/set date", () => {
  assert.throws(
    () => calculateSunMoonRiseSet({ localDate: "2024-6-21", ...EQUATOR }),
    (error) => error instanceof InputError && error.code === "INVALID_RISE_SET_DATE",
  );
});

test("sunrise-based vara uses the previous weekday before sunrise and the current weekday after", () => {
  const before = calculateVara(new Date("2024-06-21T00:30:00Z"), { localDate: "2024-06-21", ...MUMBAI });
  assert.equal(before.civilWeekday, "Friday");
  assert.equal(before.status, "calculated");
  assert.equal(before.sunriseBasedVara, "Thursday", "06:00 IST precedes the 06:01 IST sunrise, so Thursday's vara still runs");

  const after = calculateVara(new Date("2024-06-21T02:00:00Z"), { localDate: "2024-06-21", ...MUMBAI });
  assert.equal(after.civilWeekday, "Friday");
  assert.equal(after.sunriseBasedVara, "Friday");
  assert.ok(new Date(after.sunriseUtc).getTime() < new Date("2024-06-21T02:00:00Z").getTime());
});

test("sunrise-based vara reports unavailable when no sunrise occurs", () => {
  const result = calculateVara(new Date("2024-06-21T12:00:00Z"), { localDate: "2024-06-21", ...POLAR });
  assert.equal(result.status, "unavailable");
  assert.equal(result.sunriseBasedVara, null);
  assert.match(result.reason, /No sunrise occurs/);
});

test("time zone formatting helpers agree with ICU", () => {
  const instant = new Date("2024-06-21T00:31:44.603Z");
  assert.equal(localDateInZone(instant, "Asia/Kolkata"), "2024-06-21");
  assert.equal(localWeekdayInZone(instant, "Asia/Kolkata"), "Friday");
  assert.match(formatInZone(instant, "Asia/Kolkata"), /^2024-06-21 06:01:44$/);
});

test("transit snapshot places bodies in signs and refines the next ingress to sub-second precision", () => {
  const result = calculateTransits(new Date("2024-06-21T00:00:00Z"), { ayanamsa: "Lahiri", horizonDays: 400 });
  assert.equal(result.ayanamsa, "Lahiri");
  assert.equal(result.bodies.length, 9);
  for (const body of result.bodies) {
    assert.ok(typeof body.sign === "string" && body.sign.length > 0, `${body.name} must have a sign`);
    assert.ok(body.pada >= 1 && body.pada <= 4, `${body.name} pada must be 1..4`);
    if (body.nextSignIngress) {
      assert.ok(body.nextSignIngress.refinementDays < 1e-7, `${body.name} ingress bracket must be under 1e-7 days`);
      assert.notEqual(body.nextSignIngress.toSign, body.nextSignIngress.fromSign);
      assert.ok(["direct", "retrograde"].includes(body.nextSignIngress.direction));
      assert.ok(new Date(body.nextSignIngress.utc).getTime() > new Date("2024-06-21T00:00:00Z").getTime());
    }
  }
});

test("transits reproduce a known sidereal ingress: Sun enters Cancer in July 2024", () => {
  const result = calculateTransits(new Date("2024-06-21T00:00:00Z"), { ayanamsa: "Lahiri", horizonDays: 400 });
  const sun = result.bodies.find((body) => body.name === "Sun");
  assert.equal(sun.nextSignIngress.toSign, "Cancer");
  assert.equal(sun.nextSignIngress.fromSign, "Gemini");
  assert.equal(sun.nextSignIngress.direction, "direct");
  assert.match(sun.nextSignIngress.utc, /^2024-07-1[5-7]T/, "Sun must enter sidereal Cancer in mid-July 2024");
});

test("direct and retrograde ingress timestamps bracket their reported sign transition", () => {
  const result = calculateTransits(new Date("2024-06-21T00:00:00Z"), { ayanamsa: "Lahiri", horizonDays: 400 });
  for (const name of ["Sun", "Rahu"]) {
    const body = result.bodies.find((item) => item.name === name);
    const ingress = body.nextSignIngress;
    const ingressMs = Date.parse(ingress.utc);
    const before = calculateTransits(new Date(ingressMs - 1_000), { ayanamsa: "Lahiri", horizonDays: 0.01 })
      .bodies.find((item) => item.name === name);
    const after = calculateTransits(new Date(ingressMs + 1_000), { ayanamsa: "Lahiri", horizonDays: 0.01 })
      .bodies.find((item) => item.name === name);

    assert.equal(before.sign, ingress.fromSign, `${name} sign before ingress`);
    assert.equal(after.sign, ingress.toSign, `${name} sign after ingress`);
    assert.equal(ingress.direction, name === "Sun" ? "direct" : "retrograde");
  }
});

test("transits reject invalid instants, ayanamsas, and horizons before searching", () => {
  assert.throws(
    () => calculateTransits(new Date("invalid")),
    (error) => error instanceof InputError && error.code === "INVALID_TRANSIT_INSTANT",
  );
  assert.throws(
    () => calculateTransits(new Date("2024-01-01T00:00:00Z"), { ayanamsa: "Bogus" }),
    (error) => error instanceof InputError && error.code === "INVALID_TRANSIT_AYANAMSA",
  );
  for (const horizonDays of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => calculateTransits(new Date("2024-01-01T00:00:00Z"), { horizonDays }),
      (error) => error instanceof InputError && error.code === "INVALID_TRANSIT_HORIZON",
      `horizon ${horizonDays} must be rejected`,
    );
  }
});

test("nodes are reported as retrograde in the transit snapshot", () => {
  const result = calculateTransits(new Date("2024-06-21T00:00:00Z"), { ayanamsa: "Lahiri", horizonDays: 400 });
  for (const name of ["Rahu", "Ketu"]) {
    const node = result.bodies.find((body) => body.name === name);
    assert.equal(node.nextSignIngress.direction, "retrograde", `${name} must be retrograde`);
  }
});
