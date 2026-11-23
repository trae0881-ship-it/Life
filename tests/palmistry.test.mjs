import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { assistantQuestionCatalog } from "../src/presentation/assistant-questions.ts";
import { answerPalmistryQuestion } from "../src/presentation/palmistry-assistant.ts";
import {
  emptyPalmistryObservations,
  parsePalmistryObservations,
  readPalmistryObservationsInput,
} from "../src/server/palmistry-observations.ts";
import {
  MAX_PALMISTRY_FILE_BYTES,
  palmistryDownloadName,
  validatePalmistryUpload,
} from "../src/server/palmistry-files.ts";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function validPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.from([0, 0, 0, 0, 0]))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function jpegSegment(marker, data) {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(data.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), length, data]);
}

function validJpeg() {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    jpegSegment(0xc0, Buffer.from([8, 0, 1, 0, 1, 1, 1, 0x11, 0])),
    jpegSegment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    Buffer.from([0x11, 0xff, 0xd9]),
  ]);
}

test("validates Palmistry image extension, MIME, and file signature", () => {
  assert.equal(validatePalmistryUpload("palm.png", "image/png", validPng()).extension, "png");
  assert.equal(validatePalmistryUpload("palm.jpeg", "image/jpeg", validJpeg()).extension, "jpeg");
  assert.throws(() => validatePalmistryUpload("palm.pdf", "application/pdf", Buffer.from("%PDF-1.4\n%%EOF")), (error) => error.code === "UNSUPPORTED_FILE_TYPE");
  assert.throws(() => validatePalmistryUpload("palm.png", "image/jpeg", validPng()), (error) => error.code === "MIME_TYPE_MISMATCH");
  assert.throws(() => validatePalmistryUpload("palm.jpg", "image/jpeg", Buffer.from("not an image file")), (error) => error.code === "INVALID_FILE_SIGNATURE");
  assert.throws(() => validatePalmistryUpload("..\\palm.jpg", "image/jpeg", validJpeg()), (error) => error.code === "INVALID_FILENAME");
  assert.throws(
    () => validatePalmistryUpload("large.png", "image/png", new Uint8Array(MAX_PALMISTRY_FILE_BYTES + 1)),
    (error) => error.code === "FILE_TOO_LARGE" && error.status === 413,
  );
});

test("accepts only the five enumerated user-verified line observations", () => {
  assert.deepEqual(parsePalmistryObservations(emptyPalmistryObservations), emptyPalmistryObservations);
  assert.equal(parsePalmistryObservations({ ...emptyPalmistryObservations, heartLine: "invented" }), null);
  assert.equal(parsePalmistryObservations({ ...emptyPalmistryObservations, extra: "data" }), null);
  assert.equal(readPalmistryObservationsInput({ ...emptyPalmistryObservations, lifeLine: "clear" }).lifeLine, "clear");
  assert.equal(readPalmistryObservationsInput({ ...emptyPalmistryObservations, customText: "claim" }), null);
});

test("answers only from marked observations and returns insufficient or unsupported instead of predictions", () => {
  const observations = { ...emptyPalmistryObservations, heartLine: "clear" };
  assert.deepEqual(answerPalmistryQuestion(observations, "marriage_factors"), {
    status: "traditional",
    factors: [{ factor: "heartLine", visibility: "clear" }],
  });
  assert.deepEqual(answerPalmistryQuestion(observations, "career_growth"), {
    status: "insufficient",
    factors: [],
  });
  assert.deepEqual(answerPalmistryQuestion(observations, "marriage_timing"), {
    status: "unsupported",
    factors: [],
  });
  assert.deepEqual(answerPalmistryQuestion(emptyPalmistryObservations, "strongest_indicators"), {
    status: "insufficient",
    factors: [],
  });
});

test("the complete shared Kundali question catalog is accepted without importing chart facts", () => {
  assert.equal(assistantQuestionCatalog.length, 38);
  for (const question of assistantQuestionCatalog) {
    const result = answerPalmistryQuestion(emptyPalmistryObservations, question.id);
    assert.ok(["unsupported", "insufficient"].includes(result.status));
    assert.deepEqual(result.factors, []);
  }
});

test("original hand-image filenames are generated from validated server metadata", () => {
  assert.equal(
    palmistryDownloadName("abcdefgh123456789012345678901234", new Date("2026-11-24T12:00:00Z"), "png"),
    "LIFE-Palmistry-Original-2026-11-24-abcdefgh.png",
  );
  assert.throws(() => palmistryDownloadName("../another-user", new Date(), "png"));
});
