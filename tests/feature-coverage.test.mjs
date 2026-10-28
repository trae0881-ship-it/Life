import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("feature coverage matrix records every requested feature without false completion", () => {
  const matrix = readFileSync(new URL("../docs/LIFE_FEATURE_COVERAGE.md", import.meta.url), "utf8");
  const rows = matrix.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| Feature") && !line.startsWith("|---"));
  assert.equal(rows.length, 31);
  assert.match(matrix, /Ashtakavarga \| UNSUPPORTED/);
  assert.match(matrix, /PDF download \| UNSUPPORTED/);
  assert.match(matrix, /Basic Mantra Remedies \| IMPLEMENTED_AND_TESTED/);
  assert.match(matrix, /Explicit terms acceptance and re-acceptance \| IMPLEMENTED_DATABASE_INTEGRATION_UNVERIFIED/);
  assert.match(matrix, /Persistent per-user question history \| IMPLEMENTED_DATABASE_INTEGRATION_UNVERIFIED/);
  assert.match(matrix, /D1-D60 period evidence and classification \| PARTIALLY_IMPLEMENTED/);
  assert.match(matrix, /Analysis readiness states \| IMPLEMENTED/);
  assert.match(matrix, /Saved chart reports \| IMPLEMENTED_DATABASE_INTEGRATION_UNVERIFIED/);
});

test("remedies page exposes a separate basic mantra section", () => {
  const source = readFileSync(new URL("../src/app/remedies/page.tsx", import.meta.url), "utf8");
  assert.match(source, /basicMantra/);
  assert.match(source, /basicMantraSafety/);
});
