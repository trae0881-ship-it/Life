import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBirthNumber,
  calculateDestinyNumber,
  calculateNameNumber,
  calculateNameCompatibility,
  createAnkJyotishReport,
} from "../src/calculation/ank-jyotish.ts";
import { createTarotReading, drawTarotCards, TAROT_CARDS } from "../src/calculation/tarot.ts";
import { isAstrologyReadingService, validateAstrologyReadingInput } from "../src/server/astrology-readings.ts";
import { readFileSync } from "node:fs";

test("Ank Jyotish calculations validate dates and deterministically produce a structured 15-section report", () => {
  assert.equal(calculateBirthNumber("1990-12-29"), 2);
  assert.equal(calculateDestinyNumber("1990-12-29"), 6);
  assert.equal(calculateNameNumber("Ada Lovelace"), calculateNameNumber("Ada Lovelace"));
  assert.throws(() => calculateBirthNumber("1990-02-30"), /valid date/);
  assert.throws(() => calculateNameNumber("李"), /Latin letters/);
  assert.equal(calculateNameCompatibility("Ada", "Ada").sharedThemes, true);
  const report = createAnkJyotishReport({ name: "Ada Lovelace", dateOfBirth: "1990-12-29", comparisonName: "Grace Hopper" });
  assert.equal(report.sections.length, 15);
  assert.equal(report.birthNumber, 2);
  assert.equal(report.destinyNumber, 6);
  assert.match(report.sections.find((section) => section.title === "Career tendencies").interpretation, /does not predict/);
  assert.match(report.sections.find((section) => section.title === "Financial habits prompt").interpretation, /not financial advice/);
});

test("Tarot meanings cover upright and reversed cards and reading layouts", () => {
  assert.equal(TAROT_CARDS.length, 22);
  const reading = createTarotReading({
    spread: "past-present-future",
    topic: "career",
    cards: [
      { id: "fool", reversed: false },
      { id: "magician", reversed: true },
      { id: "world", reversed: false },
    ],
  });
  assert.equal(reading.cards[0].position, "Past");
  assert.equal(reading.cards[1].position, "Present");
  assert.match(reading.cards[1].meaning, /priorities/);
  assert.equal(reading.cards[2].position, "Future");
  assert.match(reading.disclaimer, /not a scientifically validated prediction/);
  assert.throws(() => createTarotReading({ spread: "single", topic: "general", cards: [] }), /exactly 1 card/);
  assert.throws(() => createTarotReading({ spread: "three-card", topic: "general", cards: [{ id: "fool", reversed: false }, { id: "fool", reversed: true }, { id: "world", reversed: false }] }), /distinct cards/);
  assert.equal(new Set(drawTarotCards(3).map((card) => card.id)).size, 3);
});

test("saved service readings accept only known services and bounded supported photo data", () => {
  assert.equal(isAstrologyReadingService("palmistry"), true);
  assert.equal(isAstrologyReadingService("super-admin"), false);
  assert.equal(validateAstrologyReadingInput({ service: "tarot", title: "Reading", payload: { cards: [] } }).service, "tarot");
  assert.equal(validateAstrologyReadingInput({ service: "palmistry", title: "Palm", payload: { imageDataUrl: "data:text/html;base64,abc" } }), null);
  assert.equal(validateAstrologyReadingInput({ service: "palmistry", title: "Palm", payload: { imageDataUrl: "data:image/png;base64,abc" } }).service, "palmistry");
  assert.equal(validateAstrologyReadingInput({ service: "kp-astrology", title: "KP", payload: {} }), null);
  assert.equal(validateAstrologyReadingInput({ service: "tarot", title: " ", payload: {} }), null);
});

test("service pages and reading APIs enforce authentication and per-user ownership", () => {
  const protectedPalmistry = readFileSync(new URL("../src/app/palmistry/page.tsx", import.meta.url), "utf8");
  const readingsApi = readFileSync(new URL("../src/app/api/astrology-readings/route.ts", import.meta.url), "utf8");
  const deleteApi = readFileSync(new URL("../src/app/api/astrology-readings/[readingId]/route.ts", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../prisma/migrations/20261124160000_saved_astrology_readings/migration.sql", import.meta.url), "utf8");
  assert.match(protectedPalmistry, /getCurrentUser/);
  assert.match(protectedPalmistry, /redirect\("\/login\?next=%2Fpalmistry"\)/);
  assert.match(readingsApi, /getUserFromRequest\(request\)/);
  assert.match(readingsApi, /where: \{ userId: user\.id, service \}/);
  assert.match(readingsApi, /userId: user\.id/);
  assert.match(readingsApi, /isSameOriginMutation\(request\)/);
  assert.match(deleteApi, /where: \{ id: readingId, userId: user\.id \}/);
  assert.match(schema, /model SavedAstrologyReading[\s\S]*?userId[\s\S]*?@@index\(\[userId, service, createdAt\]\)/);
  assert.match(migration, /ON DELETE CASCADE/);
  assert.doesNotMatch(migration, /\bDROP\b|\bTRUNCATE\b|\bDELETE FROM\b/i);
});
