import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { logDatabaseServiceError } from "../src/server/database-error-logging.ts";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("database operation logs include a safe error code without leaking the error message", () => {
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args);

  try {
    const error = Object.assign(new Error("private birth details"), { code: "P2022" });
    logDatabaseServiceError("Saved Kundali history load", error);
  } finally {
    console.error = originalError;
  }

  assert.deepEqual(logs, [[
    "Database service operation failed.",
    {
      operation: "Saved Kundali history load",
      errorType: "Error",
      errorCode: "P2022",
    },
  ]]);
  assert.doesNotMatch(JSON.stringify(logs), /private birth details/);
});

test("database logger rejects untrusted or oversized codes", () => {
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args);

  try {
    logDatabaseServiceError("Birth profile list load", { code: "private details" });
    logDatabaseServiceError("Birth profile list load", { code: "X".repeat(33) });
  } finally {
    console.error = originalError;
  }

  assert.equal(logs.length, 2);
  for (const [, details] of logs) {
    assert.deepEqual(details, {
      operation: "Birth profile list load",
      errorType: "UnknownError",
    });
  }
});

test("chart and account persistence routes log unexpected database failures", () => {
  const chartRoute = source("src/app/api/charts/route.ts");
  const savedChartsRoute = source("src/app/api/saved-charts/route.ts");
  const savedChartRoute = source("src/app/api/saved-charts/[chartId]/route.ts");
  const profilesRoute = source("src/app/api/profiles/route.ts");

  assert.match(chartRoute, /logDatabaseServiceError\("Kundali report save", error\)/);
  assert.match(savedChartsRoute, /logDatabaseServiceError\("Saved Kundali history load", error\)/);
  assert.match(savedChartsRoute, /logDatabaseServiceError\("Saved Kundali report creation", error\)/);
  assert.match(savedChartRoute, /logDatabaseServiceError\("Saved Kundali report reopen", error\)/);
  assert.match(profilesRoute, /logDatabaseServiceError\("Birth profile list load", error\)/);
});
