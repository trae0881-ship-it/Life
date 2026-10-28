import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { locationSearchPrefix, readLocationLines, searchLocations } from "../src/server/location-search.ts";
import { birthplaceFormFields, manualLocationEditSource } from "../src/presentation/location-selection.ts";
import { readPlaceSearchResponse } from "../src/presentation/location-search.ts";

function placeLine({
  id = "1",
  name = "Rajpura",
  ascii = "Rajpura",
  latitude = "30.483997",
  longitude = "76.593948",
  country = "IN",
  region = "Punjab",
  population = "50000",
  timeZone = "Asia/Kolkata",
} = {}) {
  return [id, name, ascii, latitude, longitude, country, region, population, timeZone].join("\t");
}

test("selectable search results provide verified gazetteer coordinates and an IANA timezone", async () => {
  const result = await searchLocations([placeLine()], "rajpura");
  assert.equal(result.matches.length, 1);
  assert.equal(result.totalMatches, 1);
  assert.equal(result.ambiguous, false);
  assert.deepEqual(result.matches[0], {
    id: "1",
    name: "Rajpura",
    admin1: "Punjab",
    countryCode: "IN",
    countryName: "India",
    latitude: 30.483997,
    longitude: 76.593948,
    timeZone: "Asia/Kolkata",
    population: 50000,
  });
  assert.deepEqual(birthplaceFormFields(result.matches[0]), {
    birthPlace: "Rajpura, Punjab, India",
    latitude: "30.483997",
    longitude: "76.593948",
    timeZone: "Asia/Kolkata",
    coordinateSource: "gazetteer",
  });
  assert.deepEqual(
    await readPlaceSearchResponse(new Response(JSON.stringify(result), { status: 200 })),
    result,
  );
  assert.equal(manualLocationEditSource("gazetteer"), "manual-unknown");
  assert.equal(manualLocationEditSource("birth-record"), "birth-record");
});

test("accent-insensitive place search supports canonical and ASCII spellings", async () => {
  const result = await searchLocations([placeLine({ name: "São Paulo", ascii: "Sao Paulo", country: "BR", region: "São Paulo", timeZone: "America/Sao_Paulo" })], "sao paulo");
  assert.equal(result.matches[0]?.name, "São Paulo");
});

test("ambiguous city names return ranked, disambiguating region and country data", async () => {
  const result = await searchLocations([
    placeLine({ id: "a", name: "Springfield", country: "US", region: "Illinois", population: "100000", timeZone: "America/Chicago" }),
    placeLine({ id: "b", name: "Springfield", country: "US", region: "Missouri", population: "90000", timeZone: "America/Chicago" }),
  ], "springfield");
  assert.equal(result.ambiguous, true);
  assert.equal(result.totalMatches, 2);
  assert.deepEqual(result.matches.map(({ admin1 }) => admin1), ["Illinois", "Missouri"]);
});

test("duplicate gazetteer aliases for the same record are presented only once", async () => {
  const line = placeLine();
  const result = await searchLocations([line, line], "rajpura");
  assert.equal(result.totalMatches, 1);
  assert.equal(result.matches.length, 1);
  assert.equal(result.ambiguous, false);
});

test("empty gazetteer results are explicit and malformed coordinates are rejected", async () => {
  const result = await searchLocations([
    placeLine({ latitude: "91" }),
    placeLine({ id: "2", name: "Another Place", ascii: "Another Place", latitude: "-90", longitude: "180" }),
  ], "rajpura");
  assert.deepEqual(result, { matches: [], totalMatches: 0, ambiguous: false });
});

test("valid coordinate extremes remain selectable", async () => {
  const result = await searchLocations([
    placeLine({ latitude: "-90", longitude: "180" }),
  ], "rajpura");
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].latitude, -90);
  assert.equal(result.matches[0].longitude, 180);
});

test("invalid timezone identifiers never become selectable results", async () => {
  const result = await searchLocations([placeLine({ timeZone: "Mars/Olympus" })], "rajpura");
  assert.deepEqual(result, { matches: [], totalMatches: 0, ambiguous: false });
});

test("failed local provider streams propagate to the API's unavailable response path", async () => {
  async function* brokenProvider() {
    yield placeLine();
    throw new Error("dataset stream failed");
  }
  await assert.rejects(searchLocations(brokenProvider(), "rajpura"), /dataset stream failed/);
  const route = readFileSync(new URL("../src/app/api/locations/route.ts", import.meta.url), "utf8");
  assert.match(route, /LOCATION_DATA_UNAVAILABLE/);
  assert.match(route, /"LOCATION_DATA_UNAVAILABLE", 503/);
});

test("failed and malformed search API responses are rejected instead of becoming placeholder places", async () => {
  await assert.rejects(
    readPlaceSearchResponse(new Response(JSON.stringify({ code: "LOCATION_DATA_UNAVAILABLE" }), { status: 503 })),
    /Place search request failed/,
  );
  await assert.rejects(
    readPlaceSearchResponse(new Response(JSON.stringify({
      matches: [{ id: "bad", name: "Nowhere", admin1: "", countryCode: "XX", countryName: "Unknown", latitude: 91, longitude: 0, timeZone: "Etc/UTC", population: 0 }],
      totalMatches: 1,
      ambiguous: false,
    }), { status: 200 })),
    /response was invalid/,
  );
  await assert.rejects(
    readPlaceSearchResponse(new Response(JSON.stringify({
      matches: [{ id: "bad-zone", name: "Nowhere", admin1: "", countryCode: "US", countryName: "United States", latitude: 0, longitude: 0, timeZone: "Mars/Olympus", population: 1 }],
      totalMatches: 1,
      ambiguous: false,
    }), { status: 200 })),
    /response was invalid/,
  );
});

test("search rejects empty and overlong queries rather than scanning the gazetteer", async () => {
  await assert.rejects(searchLocations([], " "), RangeError);
  await assert.rejects(searchLocations([], "x".repeat(81)), RangeError);
  assert.equal(locationSearchPrefix("!!!"), null);
  assert.equal(locationSearchPrefix("New York"), "ne");
});

test("the bundled gazetteer performs a real offline lookup with populated coordinates and timezone", async () => {
  const prefix = locationSearchPrefix("new york");
  assert.ok(prefix);
  const filePath = path.join(process.cwd(), "data", "locations", "city-index", `${Buffer.from(prefix).toString("hex")}.tsv.gz`);
  const result = await searchLocations(readLocationLines(filePath), "new york");
  assert.ok(result.totalMatches > 0);
  assert.ok(result.matches.some((place) => place.name === "New York City" && place.timeZone === "America/New_York"));
});
