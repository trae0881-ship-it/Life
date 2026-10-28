import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { savedReportSummary } from "../src/server/saved-report-summary.ts";
import { savedReportSettingsChanged } from "../src/presentation/saved-report.ts";

const snapshot = {
  localDate: "2000-02-29",
  localTime: "12:00",
  timeZone: "Asia/Kolkata",
  latitude: 28.6139,
  longitude: 77.209,
};
const result = {
  settings: { ayanamsa: "Lahiri", houseSystem: "WholeSign", node: "True" },
  planets: [{ name: "Sun" }],
  vimshottariDasha: { mahadashas: [] },
  divisionalCharts: { D1: [] },
  transits: { bodies: [] },
  panchanga: { tithi: "Purnima" },
  kp: { planets: [] },
};

test("saved report summary describes calculated sections from the stored chart result", () => {
  assert.deepEqual(savedReportSummary({ inputSnapshot: snapshot, result, profile: null }), {
    profileLabel: null,
    birthDate: "2000-02-29",
    calculationStatus: "saved-snapshot",
    availableSections: ["kundli", "dasha", "divisionalCharts", "transits", "panchanga", "kp"],
    calculationConvention: ["Lahiri", "WholeSign", "True"],
  });
});

test("saved report summary marks changed linked birth details for recalculation", () => {
  const report = savedReportSummary({
    inputSnapshot: snapshot,
    result,
    profile: { label: "Updated profile", ...snapshot, latitude: 28.7 },
  });
  assert.equal(report.profileLabel, "Updated profile");
  assert.equal(report.calculationStatus, "profile-changed");
});

test("a profile that loses previously known birth details invalidates the linked report status", () => {
  const report = savedReportSummary({
    inputSnapshot: snapshot,
    result,
    profile: { label: "Date-only profile", ...snapshot, localTime: null, timeZone: null, latitude: null, longitude: null },
  });
  assert.equal(report.calculationStatus, "profile-changed");
});

test("saved report settings are compared only against a recalculated chart for the same profile", () => {
  const saved = ["Lahiri", "WholeSign", "True"];
  assert.equal(savedReportSettingsChanged(saved, { ayanamsa: "Lahiri", houseSystem: "WholeSign", node: "True" }), false);
  assert.equal(savedReportSettingsChanged(saved, { ayanamsa: "Raman", houseSystem: "WholeSign", node: "True" }), true);
  assert.equal(savedReportSettingsChanged([], { ayanamsa: "Lahiri", houseSystem: "WholeSign", node: "True" }), null);
});

test("saved report summary fails closed for malformed stored JSON and never invents sections", () => {
  assert.deepEqual(savedReportSummary({ inputSnapshot: null, result: null, profile: null }), {
    profileLabel: null,
    birthDate: null,
    calculationStatus: "saved-snapshot",
    availableSections: [],
    calculationConvention: [],
  });
});

test("saved report endpoints keep list, detail, profile association, and deletion owner-scoped", () => {
  const listRoute = readFileSync(new URL("../src/app/api/saved-charts/route.ts", import.meta.url), "utf8");
  const detailRoute = readFileSync(new URL("../src/app/api/saved-charts/[chartId]/route.ts", import.meta.url), "utf8");
  assert.match(listRoute, /getUserFromRequest\(request\)/);
  assert.match(listRoute, /where: ownedRecordWhere\(user\.id\)/);
  assert.match(listRoute, /orderBy:\s*\[\{\s*createdAt:\s*"desc"\s*\},\s*\{\s*id:\s*"desc"\s*\}\]/);
  assert.match(listRoute, /ownedRecordWhere\(user\.id, body\.profileId\)/);
  assert.match(listRoute, /chart\.input\.(?:localDate|localTime|timeZone|latitude|longitude)/);
  assert.match(detailRoute, /ownedRecordWhere\(user\.id, chartId\)/);
  assert.match(detailRoute, /isRestorableSavedChartResult\(chart\.result\)/);
  assert.match(detailRoute, /UNSUPPORTED_SAVED_CHART/);
  assert.match(detailRoute, /ownedProfile\.localTime === null/);
  assert.match(detailRoute, /PROFILE_CHART_MISMATCH/);
  assert.match(detailRoute, /deleteMany\(\{\s*where: ownedRecordWhere\(user\.id, chartId\)/);
});
