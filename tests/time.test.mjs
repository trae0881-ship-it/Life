import test from "node:test";
import assert from "node:assert/strict";
import { InputError, resolveBirthInput } from "../src/calculation/time.ts";

test("resolves a normal IANA wall time to a stable UTC instant", () => {
  const result = resolveBirthInput({ localDate: "2000-01-01", localTime: "12:00", timeZone: "Asia/Kolkata", latitude: 19.07, longitude: 72.87 });
  assert.equal(result.instant.toISOString(), "2000-01-01T06:30:00.000Z");
  assert.equal(result.resolvedOffset, "+05:30");
});

test("chart display name is optional but bounded when supplied", () => {
  const birth = { localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 };
  assert.doesNotThrow(() => resolveBirthInput(birth));
  assert.doesNotThrow(() => resolveBirthInput({ ...birth, fullName: "" }));
  assert.throws(() => resolveBirthInput({ ...birth, fullName: "x".repeat(121) }), (error) => error instanceof InputError && error.code === "INVALID_NAME");
});

test("accepts leap day and rejects an impossible calendar date", () => {
  assert.equal(resolveBirthInput({ localDate: "2000-02-29", localTime: "00:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 }).instant.toISOString(), "2000-02-29T00:00:00.000Z");
  assert.throws(() => resolveBirthInput({ localDate: "1900-02-29", localTime: "00:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0 }), (error) => error instanceof InputError && error.code === "INVALID_DATE");
});

test("rejects nonexistent daylight-saving wall times", () => {
  assert.throws(() => resolveBirthInput({ localDate: "2024-03-10", localTime: "02:30", timeZone: "America/New_York", latitude: 40.7, longitude: -74 }), (error) => error instanceof InputError && error.code === "NONEXISTENT_LOCAL_TIME");
});

test("requires the user to resolve repeated daylight-saving wall times", () => {
  assert.throws(() => resolveBirthInput({ localDate: "2024-11-03", localTime: "01:30", timeZone: "America/New_York", latitude: 40.7, longitude: -74 }), (error) => error instanceof InputError && error.code === "AMBIGUOUS_LOCAL_TIME" && error.details.includes("-04:00") && error.details.includes("-05:00"));
  const result = resolveBirthInput({ localDate: "2024-11-03", localTime: "01:30", timeZone: "America/New_York", latitude: 40.7, longitude: -74, selectedOffset: "-05:00" });
  assert.equal(result.instant.toISOString(), "2024-11-03T06:30:00.000Z");
});

test("rejects invalid zones and coordinates", () => {
  assert.throws(() => resolveBirthInput({ localDate: "2000-01-01", localTime: "12:00", timeZone: "Mars/Olympus", latitude: 0, longitude: 0 }), (error) => error instanceof InputError && error.code === "INVALID_TIMEZONE");
  assert.throws(() => resolveBirthInput({ localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 91, longitude: 0 }), (error) => error instanceof InputError && error.code === "INVALID_COORDINATES");
  assert.throws(() => resolveBirthInput({ localDate: "2000-01-01", localTime: "12:00", timeZone: "Etc/UTC", latitude: 0, longitude: 0, coordinateSource: "guessed" }), (error) => error instanceof InputError && error.code === "INVALID_COORDINATE_SOURCE");
});
