import test from "node:test";
import assert from "node:assert/strict";
import { analyzePlanetaryStatuses } from "../src/calculation/planetary-status.ts";
import { completedAge, currentDashaSummary } from "../src/calculation/dasha-summary.ts";
import { calculateBirthChart } from "../src/calculation/chart.ts";

test("planetary status uses documented dignity, motion, combustion, and vargottama inputs", () => {
  const natal = [
    { name: "Sun", longitude: 0, longitudeSpeed: 1 },
    { name: "Saturn", longitude: 6, longitudeSpeed: -0.2 },
    { name: "Mercury", longitude: 14, longitudeSpeed: 1 },
  ];
  const statuses = analyzePlanetaryStatuses(natal, [
    { name: "Sun", longitude: 10 },
    { name: "Saturn", longitude: 6 },
    { name: "Mercury", longitude: 194 },
  ]);
  assert.equal(statuses.find((item) => item.name === "Sun")?.dignity, "Exalted");
  assert.equal(statuses.find((item) => item.name === "Saturn")?.dignity, "Debilitated");
  assert.equal(statuses.find((item) => item.name === "Saturn")?.retrograde, true);
  assert.equal(statuses.find((item) => item.name === "Mercury")?.combust, false, "combustion boundary is exclusive");
  assert.equal(statuses.find((item) => item.name === "Sun")?.vargottama, true);
  assert.equal(statuses.find((item) => item.name === "Saturn")?.vargottama, true);
  assert.equal(statuses.find((item) => item.name === "Mercury")?.vargottama, false);
});

test("planetary status fails closed when astronomical inputs are missing", () => {
  const [status] = analyzePlanetaryStatuses([{ name: "Moon" }], []);
  assert.equal(status.natalSign, null);
  assert.equal(status.divisionalSign, null);
  assert.equal(status.combust, null);
  assert.equal(status.retrograde, null);
  assert.equal(status.vargottama, null);
  assert.equal(status.available, false);
});

test("Vargottama compares the actual D1 placement with each selected divisional chart", () => {
  const chart = calculateBirthChart({
    fullName: "Status fixture",
    birthPlace: "UTC fixture",
    localDate: "2000-01-01",
    localTime: "12:00",
    timeZone: "Etc/UTC",
    latitude: 0,
    longitude: 0,
  });
  for (const division of ["D9", "D10"]) {
    const rows = chart.divisionalCharts[division];
    const statuses = analyzePlanetaryStatuses(chart.planets, rows);
    for (const status of statuses) {
      const row = rows.find((item) => item.name === status.name);
      assert.equal(status.vargottama, row ? chart.planets.find((item) => item.name === status.name)?.sign === row.sign : null);
    }
  }
});

test("current dasha summary reports age, active periods, and remaining days", () => {
  assert.equal(completedAge("2000-02-29", new Date("2026-02-27T12:00:00Z")), 25);
  assert.equal(completedAge("2000-02-29", new Date("2026-02-28T12:00:00Z")), 26);
  assert.equal(completedAge("2000-02-29", new Date("2026-03-01T12:00:00Z")), 26);
  assert.equal(completedAge("2000-10-20", new Date("2026-10-19T18:45:00Z"), "Pacific/Kiritimati"), 26);
  assert.equal(completedAge("2000-10-20", new Date("2026-10-19T18:45:00Z"), "UTC"), 25);
  const summary = currentDashaSummary("2000-01-01", {
    mahadashas: [{
      lord: "Sun",
      start: "2025-01-01T00:00:00Z",
      end: "2027-01-01T00:00:00Z",
      antardashas: [{ lord: "Moon", start: "2026-01-01T00:00:00Z", end: "2026-07-01T00:00:00Z" }],
    }],
  }, new Date("2026-02-01T00:00:00Z"));
  assert.equal(summary?.age, 26);
  assert.equal(summary?.mahadasha.lord, "Sun");
  assert.equal(summary?.antardasha?.lord, "Moon");
  assert.equal(summary?.remainingDays, 150);
});

test("dashboard exposes accessible mobile navigation and no internal status source paths", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../src/app/HomepageSections.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-expanded=\{menuOpen\}/);
  assert.match(source, /aria-controls="site-navigation"/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /setMenuOpen\(false\)/);
  assert.match(source, /menuButton\.current\?\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
  const responsive = readFileSync(new URL("../src/app/homepage.css", import.meta.url), "utf8");
  assert.match(responsive, /@media\s*\(max-width:\s*760px\)/);
  const panel = readFileSync(new URL("../src/app/PlanetaryStatusPanel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(panel, /src\/|github|fixture|debug/i);
});
