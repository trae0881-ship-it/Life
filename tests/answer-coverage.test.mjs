import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assistantQuestionCatalog } from "../src/presentation/assistant-questions.ts";

test("answer coverage matrix contains exactly one audited row for every assistant question ID", () => {
  const matrix = readFileSync(new URL("../docs/ANSWER_COVERAGE_MATRIX.md", import.meta.url), "utf8");
  const ids = [...matrix.matchAll(/\| \d+ \| `([^`]+)`/g)].map((match) => match[1]);
  assert.deepEqual(ids, assistantQuestionCatalog.map((question) => question.id));
  assert.equal(new Set(ids).size, 38);
  assert.match(matrix, /IMPLEMENTED/);
  assert.match(matrix, /PARTIALLY_SUPPORTED/);
  assert.match(matrix, /UNSUPPORTED/);
});

test("answer rules document that unsupported event timing cannot fabricate dates", () => {
  const rules = readFileSync(new URL("../docs/ANSWER_RULES_AND_LIMITATIONS.md", import.meta.url), "utf8");
  assert.match(rules, /must not receive invented dates/i);
  assert.match(rules, /active approved registry is empty/i);
});
