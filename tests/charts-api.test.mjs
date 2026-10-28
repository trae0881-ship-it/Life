import test from "node:test";
import assert from "node:assert/strict";
import { calculateBirthChart } from "../src/calculation/chart.ts";
import { InputError } from "../src/calculation/time.ts";

/**
 * Integration contract for the POST /api/charts endpoint.
 *
 * `src/app/api/charts/route.ts` performs origin/rate/limit/size checks and the
 * report-level field checks, then forwards the parsed payload unchanged to
 * `calculateBirthChart` and serialises the return value as JSON. These tests
 * therefore drive the exact JSON payload shape the browser sends and assert on
 * the exact JSON shape the UI consumes, including every field added for the
 * astronomical-events (Section F), yoga/dosha/dignity/aspect (Section E) and KP
 * (Section D) features. They also confirm the engine rejects the same malformed
 * inputs the route maps to HTTP 422.
 */

// The literal payload the chart studio builds in src/app/ChartStudioWorkspace.tsx.
const studioPayload = {
  fullName: "Integration Example",
  birthPlace: "Mumbai, Maharashtra, India",
  localDate: "1990-05-15",
  localTime: "10:30",
  timeZone: "Asia/Kolkata",
  latitude: 19.076,
  longitude: 72.8777,
  coordinateSource: "gazetteer",
  birthTimeAccuracy: "exact",
  ayanamsa: "Lahiri",
  houseSystem: "WholeSign",
  nodeMode: "both",
};

function assertAllNumbersFinite(value, path = "$") {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be a finite number (got ${value})`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertAllNumbersFinite(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) assertAllNumbersFinite(item, `${path}.${key}`);
  }
}

test("the studio payload returns a JSON-safe chart with every new section present", () => {
  const chart = calculateBirthChart(studioPayload);
  // A route response is JSON, so verify the engine output survives a round-trip.
  const roundTripped = JSON.parse(JSON.stringify(chart));
  assertAllNumbersFinite(roundTripped);
  for (const key of ["riseSet", "vara", "transits", "planetaryDignity", "planetaryAspects", "yogasAndDoshas", "kp"]) {
    assert.ok(key in roundTripped, `${key} must be present in the API response`);
  }
  assert.equal(roundTripped.settings.ruleSetVersion, "life-core-0.2.0");
});

test("chart calculation accepts an omitted or blank optional display name", () => {
  const withoutName = { ...studioPayload };
  delete withoutName.fullName;
  assert.equal(calculateBirthChart(withoutName).input.fullName, null);
  assert.equal(calculateBirthChart({ ...studioPayload, fullName: "" }).input.fullName, null);
});

test("the Rajpura form example reaches the engine with its selected settings", () => {
  const chart = calculateBirthChart({
    ...studioPayload,
    fullName: "Amrendra kumar pal",
    birthPlace: "Rajpura, Punjab, India",
    localDate: "1997-04-27",
    localTime: "05:45",
    timeZone: "Asia/Kolkata",
    latitude: 30.483997,
    longitude: 76.593948,
    ayanamsa: "Krishnamurti",
    houseSystem: "WholeSign",
    nodeMode: "mean",
  });
  assert.equal(chart.input.fullName, "Amrendra kumar pal");
  assert.equal(chart.input.birthPlace, "Rajpura, Punjab, India");
  assert.equal(chart.input.localDate, "1997-04-27");
  assert.equal(chart.input.localTime, "05:45");
  assert.equal(chart.input.timeZone, "Asia/Kolkata");
  assert.equal(chart.input.latitude, 30.483997);
  assert.equal(chart.input.longitude, 76.593948);
  assert.equal(chart.settings.ayanamsa, "Krishnamurti");
  assert.equal(chart.settings.houseSystem, "WholeSign");
  assert.equal(chart.settings.node, "mean");
});

test("rise/set response reports real times or an explicit no-event, never a guess", () => {
  const chart = calculateBirthChart(studioPayload);
  const { riseSet, vara } = chart;
  for (const key of ["sunrise", "sunset", "moonrise", "moonset"]) {
    const event = riseSet[key];
    assert.equal(event.event, key);
    assert.ok(["calculated", "no-event"].includes(event.status));
    if (event.status === "calculated") {
      assert.ok(Number.isFinite(Date.parse(event.utc)), `${key} utc must parse`);
      assert.match(event.localTime, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      assert.equal(typeof event.occursOnReferenceDate, "boolean");
      assert.equal(event.reason, null);
    } else {
      assert.equal(event.utc, null);
      assert.match(event.reason, /no .* for this location and date/i);
    }
  }
  assert.equal(vara.status, "calculated");
  assert.ok(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].includes(vara.civilWeekday));
  assert.ok(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].includes(vara.sunriseBasedVara));

  // A circumpolar summer date must degrade to no-event instead of inventing a time.
  const polar = calculateBirthChart({ ...studioPayload, localDate: "2024-06-21", latitude: 80, longitude: 0, timeZone: "Etc/UTC" });
  assert.equal(polar.riseSet.sunrise.status, "no-event");
  assert.equal(polar.riseSet.sunset.status, "no-event");
  assert.equal(polar.vara.status, "unavailable");
  assert.equal(polar.vara.sunriseBasedVara, null);
  // Placidus cusps for KP are undefined at this latitude; KP degrades to null while
  // the rest of the chart (Whole Sign houses) still calculates.
  assert.equal(polar.kp, null);
  assert.equal(polar.houses.length, 12);
});

test("transit response carries root-refined sign-ingress events", () => {
  const chart = calculateBirthChart(studioPayload);
  const { transits } = chart;
  assert.equal(transits.ayanamsa, "Lahiri");
  assert.equal(transits.bodies.length, 9);
  const refined = transits.bodies.filter((body) => body.nextSignIngress);
  assert.ok(refined.length > 0, "at least one body must have a next ingress within the horizon");
  for (const body of transits.bodies) {
    assert.ok(body.sign && body.nakshatra);
    assert.ok(body.pada >= 1 && body.pada <= 4);
    if (body.nextSignIngress) {
      assert.ok(Number.isFinite(Date.parse(body.nextSignIngress.utc)));
      assert.ok(["direct", "retrograde"].includes(body.nextSignIngress.direction));
      assert.ok(body.nextSignIngress.refinementDays > 0 && body.nextSignIngress.refinementDays < 1e-7, "ingress must be bisected below the 1e-7 day bracket");
    }
  }
});

test("dignity, aspect, yoga and dosha sections are fully populated", () => {
  const chart = calculateBirthChart(studioPayload);
  assert.equal(chart.planetaryDignity.length, 9);
  for (const planet of chart.planetaryDignity) {
    assert.equal(typeof planet.dignity, "string");
    assert.ok(planet.dignity.length > 0);
    assert.ok(planet.combust === null || typeof planet.combust === "boolean");
    assert.ok(planet.retrograde === null || typeof planet.retrograde === "boolean");
  }
  assert.match(chart.planetaryAspects.convention, /Parashari/);
  assert.equal(chart.planetaryAspects.details.length, 9);
  for (const detail of chart.planetaryAspects.details) {
    assert.ok(detail.aspectsHouses.length >= 1);
    assert.ok(detail.aspectsHouses.every((house) => house >= 1 && house <= 12));
    const seventhFromSelf = ((detail.house - 1 + 6) % 12) + 1;
    assert.ok(detail.aspectsHouses.includes(seventhFromSelf), "every body must aspect the 7th house counted from itself");
  }
  assert.ok(Array.isArray(chart.yogasAndDoshas) && chart.yogasAndDoshas.length > 0);
  const ids = chart.yogasAndDoshas.map((finding) => finding.id);
  assert.equal(new Set(ids).size, ids.length, "yoga ids must be unique");
  for (const finding of chart.yogasAndDoshas) {
    assert.ok(["yoga", "dosha"].includes(finding.category));
    assert.equal(typeof finding.present, "boolean");
    assert.ok(finding.rule.length > 0, "every finding must carry the literal rule");
  }
});

test("KP response exposes star, sub and sub-sub lords plus significators", () => {
  const chart = calculateBirthChart(studioPayload);
  const { kp } = chart;
  assert.equal(kp.system, "Krishnamurti Paddhati (KP)");
  assert.equal(kp.ayanamsa, "Krishnamurti");
  assert.equal(kp.houseSystem, "Placidus");
  assert.ok(Number.isFinite(kp.ayanamsaValue) && kp.ayanamsaValue > 23 && kp.ayanamsaValue < 25);
  assert.equal(kp.planets.length, 9);
  for (const planet of kp.planets) {
    assert.ok(planet.nakshatra.lord && planet.sub.lord && planet.subSub.lord);
    assert.ok(planet.house >= 1 && planet.house <= 12);
    assert.deepEqual(planet.significations.houses, [...new Set(planet.significations.houses)].sort((a, b) => a - b));
    assert.ok(planet.significations.houses.includes(planet.house), "a planet always signifies the house it occupies");
  }
  assert.equal(kp.cusps.length, 12);
  for (const cusp of kp.cusps) {
    assert.ok(cusp.house >= 1 && cusp.house <= 12);
    assert.ok(Array.isArray(cusp.signifiedBy));
    assert.ok(cusp.sub.lord && cusp.subSub.lord);
  }
});

test("identical studio payloads produce an identical, reproducible response hash", () => {
  const first = calculateBirthChart(studioPayload);
  const second = calculateBirthChart({ ...studioPayload });
  assert.equal(first.provenance.resultHash, second.provenance.resultHash);
  assert.deepEqual(first.kp.planets, second.kp.planets);
  assert.deepEqual(first.riseSet, second.riseSet);
  assert.deepEqual(first.transits.bodies.map((body) => body.nextSignIngress), second.transits.bodies.map((body) => body.nextSignIngress));
  const recalculated = calculateBirthChart({ ...studioPayload, localTime: "11:30", latitude: 18.5204, longitude: 73.8567 });
  assert.notEqual(recalculated.input.utc, first.input.utc);
  assert.notEqual(recalculated.provenance.resultHash, first.provenance.resultHash);
  assert.notEqual(recalculated.ascendant.longitude, first.ascendant.longitude);
});

test("the engine rejects the same malformed payload fields the route maps to HTTP 422", () => {
  const cases = [
    [{ fullName: "x".repeat(121) }, "INVALID_NAME"],
    [{ birthPlace: "" }, "INVALID_BIRTHPLACE"],
    [{ coordinateSource: "satellite" }, "INVALID_COORDINATE_SOURCE"],
    [{ ayanamsa: "Fagan" }, "UNSUPPORTED_AYANAMSA"],
    [{ houseSystem: "Regiomontanus" }, "UNSUPPORTED_HOUSE_SYSTEM"],
    [{ nodeMode: "oscillating" }, "INVALID_NODE_MODE"],
    [{ latitude: 91 }, "INVALID_COORDINATES"],
    [{ localTime: "25:00" }, "UNSUPPORTED_DATE"],
    [{ localDate: "2024-02-30" }, "INVALID_DATE"],
    [{ timeZone: "Mars/Olympus" }, "INVALID_TIMEZONE"],
  ];
  for (const [override, code] of cases) {
    assert.throws(() => calculateBirthChart({ ...studioPayload, ...override }), (error) => {
      assert.ok(error instanceof InputError, `${code} must be an InputError`);
      assert.equal(error.code, code);
      return true;
    }, `expected ${code}`);
  }
});

test("a daylight-saving overlap returns the same explicit offset choice the route forwards to the UI", () => {
  assert.throws(
    () => calculateBirthChart({ ...studioPayload, localDate: "2024-11-03", localTime: "01:30", timeZone: "America/New_York", latitude: 40.7128, longitude: -74.006 }),
    (error) => {
      assert.ok(error instanceof InputError);
      assert.equal(error.code, "AMBIGUOUS_LOCAL_TIME");
      assert.ok(Array.isArray(error.details) && error.details.length >= 2);
      return true;
    },
  );
});
