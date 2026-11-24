import test from "node:test";
import assert from "node:assert/strict";
import {
  PALM_RULES,
  PALM_KNOWLEDGE,
  auditPalmKnowledgeBase,
  answerPalmQuestion,
  comparePalmObservations,
  detectPalmContradictions,
  generatePalmReport,
  searchPalmKnowledge,
} from "../src/palmistry/engine.ts";
import { PALM_FEATURE_DEFINITIONS, PALM_SOURCES_BY_TRADITION } from "../src/palmistry/knowledge.ts";
import { deletePalmReading, listPalmReadings, savePalmReading } from "../src/palmistry/storage.ts";
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
  assert.equal(first.sections.length, 27);
  assert.ok(first.sections.every((section) => section.interpretation.trim()));
  assert.match(first.sections.find((section) => section.knowledgeId === "report.heart").interpretation, /symbolically/i);
  assert.match(first.sections.find((section) => section.knowledgeId === "report.head").interpretation, /No matching observation/);
  assert.equal(first.sections.find((section) => section.knowledgeId === "report.comparison").evidence.length, 0);
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

test("knowledge catalog covers all requested feature families with tradition-specific source rules", () => {
  assert.equal(PALM_FEATURE_DEFINITIONS.length, 43);
  assert.deepEqual(
    [...new Set(PALM_FEATURE_DEFINITIONS.map((feature) => feature.category))].sort(),
    ["finger", "hand shape", "major line", "marking", "mount", "secondary line"],
  );
  assert.ok(PALM_FEATURE_DEFINITIONS.every((feature) => feature.location && feature.variations.length && feature.alternative));
  assert.ok(PALM_RULES.every((rule) => rule.sourceIds.length > 0 && rule.sourceIds.every((sourceId) => PALM_SOURCES_BY_TRADITION[rule.tradition].includes(sourceId))));
  assert.ok(PALM_RULES.every((rule) => rule.weight > 0 && rule.weight <= 1 && /not a probability|validated accuracy/i.test(rule.rationale)));
});

test("each catalog feature can be observed and appears as report evidence", () => {
  const featureObservations = Object.fromEntries(PALM_FEATURE_DEFINITIONS.map((feature) => [feature.id, {
    presence: "observed",
    shape: "curved",
    depth: "deep",
    length: "long",
    direction: "upward",
    continuity: "continuous",
    variation: "",
    confidence: "high",
  }]));
  const report = generatePalmReport({ ...observations, featureObservations }, "right");
  const overall = report.sections.find((section) => section.knowledgeId === "report.overall");
  assert.deepEqual(
    [...new Set(overall.evidence.map((entry) => entry.featureId))].filter((id) => PALM_FEATURE_DEFINITIONS.some((feature) => feature.id === id)).sort(),
    PALM_FEATURE_DEFINITIONS.map((feature) => feature.id).sort(),
  );
});

test("knowledge audit reports no duplicate, unsupported, unreferenced, or invalid entries", () => {
  const audit = auditPalmKnowledgeBase();
  assert.equal(audit.ok, true, JSON.stringify(audit.issues));
  assert.deepEqual(Object.values(audit.issues).flat(), []);
  assert.equal(audit.statistics.reportSections, 27);
});

test("detailed observations are included transparently and contradictory entries are flagged", () => {
  const detailed = {
    ...observations,
    featureObservations: {
      "line.heart": {
        presence: "observed",
        shape: "wavy",
        depth: "deep",
        length: "long",
        direction: "upward",
        continuity: "continuous",
        variation: "",
        confidence: "high",
      },
    },
  };
  const report = generatePalmReport(detailed, "left", "hi");
  assert.match(report.sections.find((section) => section.knowledgeId === "report.heart").interpretation, /लंबाई/);
  assert.match(report.sections.find((section) => section.knowledgeId === "report.heart").observation, /हृदय/);
  assert.equal(report.language, "hi");
  assert.deepEqual(detectPalmContradictions({
    ...detailed,
    lines: { ...detailed.lines, heart: "broken" },
  }), ["line.heart: legacy line quality is broken while detailed continuity is continuous."]);
  assert.ok(detectPalmContradictions({
    ...observations,
    lines: { ...observations.lines, heart: "clear" },
    featureObservations: {
      "line.heart": { ...detailed.featureObservations["line.heart"], presence: "absent", continuity: "not-assessed" },
    },
  }).some((issue) => /legacy line quality is clear while detailed presence is absent/.test(issue)));
});

test("left/right comparison includes user-entered detailed feature differences", () => {
  const left = {
    ...observations,
    featureObservations: {
      "mark.island": {
        presence: "observed", shape: "oval", depth: "shallow", length: "small", direction: "vertical",
        continuity: "interrupted", variation: "", confidence: "medium",
      },
    },
  };
  const right = { ...observations, featureObservations: { "mark.island": { ...left.featureObservations["mark.island"], presence: "absent" } } };
  const differences = comparePalmObservations(left, right);
  assert.ok(differences.some((difference) => difference.label === "Island" && /observed/.test(difference.leftObservation) && /not seen/.test(difference.rightObservation)));
});

test("offline knowledge search matches all terms and validates result limits", () => {
  assert.ok(PALM_KNOWLEDGE.length >= 100);
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
  assert.match(answerPalmQuestion("heart line", "hi").answer, /हृदय|रेखा/);
  assert.throws(() => answerPalmQuestion(" "), /1 to 240 characters/);
  assert.throws(() => answerPalmQuestion("x".repeat(241)), /1 to 240 characters/);
});

test("palmistry workspace uses local storage and makes no network or AI integration calls", () => {
  const workspace = readFileSync(new URL("../src/app/PalmistryWorkspace.tsx", import.meta.url), "utf8");
  const storage = readFileSync(new URL("../src/palmistry/storage.ts", import.meta.url), "utf8");
  const serviceWorker = readFileSync(new URL("../public/palmistry-sw.js", import.meta.url), "utf8");
  assert.match(workspace, /savePalmReading/);
  assert.match(workspace, /searchPalmKnowledge/);
  assert.match(workspace, /comparePalmObservations/);
  assert.match(workspace, /answerPalmQuestion/);
  assert.match(workspace, /never analyzed/);
  assert.doesNotMatch(workspace, /\bfetch\s*\(|\/api\/|openai|anthropic|gemini|claude/i);
  assert.match(storage, /window\.localStorage/);
  assert.doesNotMatch(storage, /\bfetch\s*\(|\/api\//i);
  assert.match(workspace, /register\("\/palmistry-sw\.js"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\(STATIC_PREFIX\)/);
  assert.doesNotMatch(serviceWorker, /\/api\/|https?:\/\/|openai|anthropic|gemini|claude/i);
});

test("Palmistry readings save, reload, cap and delete from browser localStorage", async () => {
  const previousWindow = globalThis.window;
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  try {
    const reading = {
      id: "palm-1",
      title: "Left palm",
      side: "left",
      createdAt: "2026-11-24T00:00:00.000Z",
      observations,
      report: generatePalmReport(observations, "left"),
      imageDataUrl: null,
    };
    await savePalmReading(reading);
    assert.deepEqual(await listPalmReadings(), [reading]);
    await savePalmReading({ ...reading, id: "palm-2", side: "right" });
    await deletePalmReading("palm-1");
    assert.deepEqual((await listPalmReadings()).map((item) => item.id), ["palm-2"]);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
