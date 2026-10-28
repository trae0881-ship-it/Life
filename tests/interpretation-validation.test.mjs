import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("interpretation validation keeps source review and approval pending", () => {
  const worksheet = readFileSync(new URL("../docs/INTERPRETATION_VALIDATION.md", import.meta.url), "utf8");
  assert.match(worksheet, /Independent reviewer decision: PENDING/);
  assert.match(worksheet, /Bibliographic verification and direct passage verification/);
  assert.match(worksheet, /calculation validation versus interpretation validation/i);
  assert.match(worksheet, /Cannot establish/);
  assert.match(worksheet, /Missing-input chart/);
  assert.match(worksheet, /remain `PARTIALLY_SUPPORTED`/);
});
