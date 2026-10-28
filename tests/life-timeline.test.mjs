import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addCalendarYears, ageOnDate, buildTimeline, daysInMonth, timelineAgeMarkers, timelineDate, timelineRange, weekdayIndex } from "../src/calculation/life-timeline.ts";
import { calculateBirthChart } from "../src/calculation/chart.ts";
import { isValidDateOnly } from "../src/calculation/date-only.ts";
import { validateBirthRecord } from "../src/server/birth-validation.ts";
import { validateBirthForm } from "../src/presentation/birth-form.ts";
import { isRestorableSavedChartResult } from "../src/presentation/saved-chart-validation.ts";

const birth1997 = {
  fullName: "DOB regression",
  birthPlace: "Mumbai, India",
  localDate: "1997-04-27",
  localTime: "10:30",
  timeZone: "Asia/Kolkata",
  latitude: 19.076,
  longitude: 72.8777,
  coordinateSource: "gazetteer",
  birthTimeAccuracy: "exact",
  ayanamsa: "Lahiri",
  houseSystem: "WholeSign",
  nodeMode: "mean",
};

test("DOB 1997-04-27 stays canonical through form, profile validation, chart and saved-report restoration", () => {
  assert.equal(isValidDateOnly("1997-04-27"), true);
  assert.equal(isValidDateOnly("0197-04-27"), true);
  assert.equal(isValidDateOnly("1997-02-29"), false);
  assert.equal(validateBirthForm({ ...birth1997, latitude: String(birth1997.latitude), longitude: String(birth1997.longitude), timeKnown: true }).valid, true);

  const profileInput = validateBirthRecord(birth1997);
  assert.equal(profileInput.localDate, "1997-04-27");
  const chart = calculateBirthChart(birth1997);
  assert.equal(chart.input.localDate, "1997-04-27");
  assert.equal(isRestorableSavedChartResult(chart), true);
  assert.equal(isRestorableSavedChartResult({ ...chart, input: { ...chart.input, localDate: "0197-04-27" } }), false);
  assert.throws(() => validateBirthRecord({ ...birth1997, localDate: "0197-04-27" }), /1800 through 2399/);

  const profileRoute = readFileSync(new URL("../src/app/api/profiles/route.ts", import.meta.url), "utf8");
  const profileDetailRoute = readFileSync(new URL("../src/app/api/profiles/[profileId]/route.ts", import.meta.url), "utf8");
  const accountPanel = readFileSync(new URL("../src/app/AccountPanel.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(profileRoute, /label: body\.label\.trim\(\), \.\.\.input/);
  assert.match(profileDetailRoute, /body\.localDate !== undefined \? \{ localDate: input\.localDate \}/);
  assert.match(profileDetailRoute, /body\.birthPlace !== undefined \? \{ birthPlace: input\.birthPlace \}/);
  assert.match(accountPanel, /isRestorableSavedChartResult\(result\.chart\.result\)/);
  assert.match(accountPanel, /onLoadSavedChart\(result\.chart\.result\)/);
  assert.match(dashboard, /!isValidDateOnly\(profile\.localDate\) \|\| birthYear < 1800 \|\| birthYear > 2399/);
  assert.match(dashboard, /dateField\.value = ""/);
  assert.match(dashboard, /error\.invalidProfileDate/);
});

test("1997 birthday timeline and ages use date-only calendar boundaries", () => {
  assert.deepEqual(timelineRange("1997-04-27"), { start: "1997-04-27", end: "2077-04-27" });
  assert.equal(ageOnDate("1997-04-27", "1997-04-27"), 0);
  assert.equal(ageOnDate("1997-04-27", "2026-10-19"), 29);
  assert.equal(ageOnDate("1997-04-27", "2027-04-26"), 29);
  assert.equal(ageOnDate("1997-04-27", "2027-04-27"), 30);
  assert.equal(ageOnDate("1997-04-27", "2077-04-27"), 80);
  const markers = timelineAgeMarkers("1997-04-27");
  assert.equal(markers.length, 80);
  assert.deepEqual(markers[0], { age: 0, date: "1997-04-27" });
  assert.deepEqual(markers[29], { age: 29, date: "2026-04-27" });
  assert.deepEqual(markers[79], { age: 79, date: "2076-04-27" });
  assert.deepEqual(timelineAgeMarkers("2000-02-29")[1], { age: 1, date: "2001-02-28" });
  assert.throws(() => ageOnDate("1997-04-27", "1997-04-26"), /before the birth date/);
  assert.equal(buildTimeline("1997-04-27", "daily", "2077-04-28").length, 0);
  assert.throws(() => ageOnDate("1997-04-27", "1997-04-31"), /real calendar date/);
  assert.deepEqual(timelineRange("0097-04-27"), { start: "0097-04-27", end: "0177-04-27" });
});

test("date-only birth date is timezone-independent and invalid form dates are rejected", () => {
  const validation = (timeZone) => validateBirthRecord({ ...birth1997, timeZone });
  assert.equal(validation("Asia/Kolkata").localDate, "1997-04-27");
  assert.equal(validation("Pacific/Kiritimati").localDate, "1997-04-27");
  assert.equal(validation("America/Los_Angeles").localDate, "1997-04-27");
  assert.equal(validateBirthForm({ ...birth1997, localDate: "0197-04-27", latitude: String(birth1997.latitude), longitude: String(birth1997.longitude), timeKnown: true }).valid, false);
});

test("timeline ends on the 80th calendar birthday and handles leap-day birth", () => {
  assert.deepEqual(timelineRange("2000-02-29"), { start: "2000-02-29", end: "2080-02-29" });
  assert.deepEqual(timelineRange("2001-02-28"), { start: "2001-02-28", end: "2081-02-28" });
  assert.equal(addCalendarYears(new Date("2000-02-29T00:00:00Z"), 1).toISOString().slice(0, 10), "2001-02-28");
});

test("timeline age and periods use birth anniversaries and bounded selected calendar periods", () => {
  assert.equal(ageOnDate("2000-01-01", "2026-01-01"), 26);
  assert.equal(ageOnDate("2000-01-01", "2025-12-31"), 25);
  assert.equal(ageOnDate("2000-02-29", "2001-02-27"), 0);
  assert.equal(ageOnDate("2000-02-29", "2001-02-28"), 1);
  assert.equal(ageOnDate("2000-02-29", "2004-02-29"), 4);
  const periods = buildTimeline("2000-01-01", "yearly", "2026-01-01");
  assert.equal(periods[0].start, "2000-01-01");
  assert.equal(periods.length, 80);
  assert.equal(periods[26].start, "2026-01-01");
  assert.equal(periods[26].end, "2027-01-01");
  assert.ok(periods.every((period) => period.category === "not-evaluated"));
  assert.ok(periods.every((period) => period.age === period.ageAtEnd));
  const monthly = buildTimeline("2000-01-01", "monthly", "2026-06-15");
  assert.equal(monthly[0].start, "2026-01-01");
  assert.equal(monthly.length, 12);
  assert.equal(daysInMonth(2024, 1), 29);
  assert.equal(timelineDate(2024, 1, 29), "2024-02-29");
  assert.equal(weekdayIndex("2024-02-29"), 4);
  const daily = buildTimeline("2000-01-01", "daily", "2024-02-29");
  assert.equal(daily.length, 29);
  assert.equal(daily[28].start, "2024-02-29");
});

test("timeline periods follow birthdays and include the 80th birthday in month/day views", () => {
  const years = buildTimeline("2000-02-29", "yearly", "2026-02-28");
  assert.equal(years.find((period) => period.age === 1)?.start, "2001-02-28");
  assert.equal(years.find((period) => period.age === 4)?.start, "2004-02-29");
  assert.equal(years.at(-1)?.end, "2080-02-29");
  assert.deepEqual(
    buildTimeline("2000-02-29", "monthly", "2080-02-29").map(({ start, end }) => [start, end]),
    [["2080-01-01", "2080-02-01"], ["2080-02-01", "2080-03-01"]],
  );
  assert.equal(buildTimeline("2000-02-29", "daily", "2080-02-29").find((period) => period.start === "2080-02-29")?.age, 80);
  assert.deepEqual(buildTimeline("2000-01-01", "daily", "2080-01-02"), []);
});

test("invalid timeline date fails closed", () => {
  assert.throws(() => timelineRange("2001-02-29"), /real calendar date/);
  assert.throws(() => timelineRange(""), /valid/);
});
