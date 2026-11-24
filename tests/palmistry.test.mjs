import test from "node:test";
import assert from "node:assert/strict";
import {
  PALM_KNOWLEDGE,
  answerPalmQuestion,
  comparePalmObservations,
  generatePalmReport,
  searchPalmKnowledge,
} from "../src/palmistry/engine.ts";
import { readFileSync } from "node:fs";

const observations = {
  handShape: "earth",
  fingerLength: "average",
  thumb: "balanced",
  lines: { life: "clear", head: "not-observed", heart: "broken", fate: "not-observed", sun: "not-observed" },
  mounts: { venus: "prominent", jupiter: "not-observed", saturn: "not-observed", apollo: "not-observed", mercury: "not-observed", moon: "not-observed", mars: "not-observed" },
};

test("palmistry reports are reproducible and include only manually observed features", () => {
  const first = generatePalmReport(observations, "left");
  assert.deepEqual(generatePalmReport(observations, "left"), first);
  assert.equal(first.title, "Left palm reading");
  assert.equal(first.sections.length, 15);
  assert.deepEqual(first.sections.map((section) => section.knowledgeId), [
    "shape.earth", "finger.average", "thumb.balanced",
    "line.life.clear", "line.head.not-observed", "line.heart.broken", "line.fate.not-observed", "line.sun.not-observed",
    "mount.venus.prominent", "mount.jupiter.not-observed", "mount.saturn.not-observed", "mount.apollo.not-observed",
    "mount.mercury.not-observed", "mount.moon.not-observed", "mount.mars.not-observed",
  ]);
  assert.match(first.disclaimer, /not scientifically validated/);
  assert.doesNotMatch(JSON.stringify(first), /\b(?:AI|OpenAI|ChatGPT|Claude|Gemini)\b/i);
});

test("left/right comparison reports exact observation differences without inference", () => {
  const right = { ...observations, handShape: "water", lines: { ...observations.lines, heart: "clear" } };
  assert.deepEqual(comparePalmObservations(observations, right), [
    { label: "Hand shape", leftObservation: "Earth (broad palm, shorter fingers)", rightObservation: "Water (long palm, long fingers)" },
    { label: "Heart line", leftObservation: "Broken", rightObservation: "Clear" },
  ]);
  assert.deepEqual(comparePalmObservations(observations, observations), []);
});

test("offline knowledge search matches all terms and validates result limits", () => {
  assert.ok(PALM_KNOWLEDGE.length >= 50);
  assert.ok(searchPalmKnowledge("heart line broken").some((entry) => entry.id === "line.heart.broken"));
  assert.deepEqual(searchPalmKnowledge("nothing matches this phrase"), []);
  assert.deepEqual(searchPalmKnowledge("heart line", 1).length, 1);
  assert.throws(() => searchPalmKnowledge("heart", 0), /positive integer/);
});

test("offline Q&A retrieves relevant bundled passages without generating new advice", () => {
  const answer = answerPalmQuestion("What does a broken heart line mean?");
  assert.ok(answer);
  assert.match(answer.answer, /symbolic change or interruption/);
  assert.deepEqual(answer.sources.map((entry) => entry.id), ["line.heart.broken"]);
  assert.match(answer.disclaimer, /not personalized advice/);
  assert.equal(answerPalmQuestion("What is the meaning of a purple comet?"), null);
  assert.throws(() => answerPalmQuestion(" "), /1 to 240 characters/);
  assert.throws(() => answerPalmQuestion("x".repeat(241)), /1 to 240 characters/);
});

test("palmistry workspace uses local storage and makes no network or AI integration calls", () => {
  const workspace = readFileSync(new URL("../src/app/PalmistryWorkspace.tsx", import.meta.url), "utf8");
  const serviceWorker = readFileSync(new URL("../public/palmistry-sw.js", import.meta.url), "utf8");
  assert.match(workspace, /savePalmReading/);
  assert.match(workspace, /searchPalmKnowledge/);
  assert.match(workspace, /comparePalmObservations/);
  assert.match(workspace, /answerPalmQuestion/);
  assert.match(workspace, /never analyzed/);
  assert.doesNotMatch(workspace, /\bfetch\s*\(|\/api\/|openai|anthropic|gemini|claude/i);
  assert.match(workspace, /register\("\/palmistry-sw\.js"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\(STATIC_PREFIX\)/);
  assert.doesNotMatch(serviceWorker, /\/api\/|https?:\/\/|openai|anthropic|gemini|claude/i);
});
