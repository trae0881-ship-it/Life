import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCheiroBirthNumber,
  calculateCheiroNameNumber,
  CHEIRO_REVISED_MAPPING,
  CHEIRO_REVISED_METHOD_ID,
  CheiroInputError,
} from "../src/calculation/cheiro-revised.ts";
import { calculateNameName } from "../src/calculation/numerology.ts";

const expectedMapping = {
  A:1,I:1,J:1,Q:1,Y:1,
  B:2,K:2,R:2,
  C:3,G:3,L:3,S:3,
  D:4,M:4,T:4,
  E:5,H:5,N:5,X:5,
  U:6,V:6,W:6,
  O:7,Z:7,
  F:8,P:8,
};

function assertCheiroError(callback, code) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof CheiroInputError);
    assert.equal(error.code, code);
    return true;
  });
}

test("revised-edition mapping exactly assigns A-Z to values 1-8", () => {
  assert.deepEqual(CHEIRO_REVISED_MAPPING, expectedMapping);
  assert.equal(Object.keys(CHEIRO_REVISED_MAPPING).length, 26);
  assert.equal(new Set(Object.keys(CHEIRO_REVISED_MAPPING)).size, 26);
  assert.equal(Object.values(CHEIRO_REVISED_MAPPING).includes(9), false);
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    assert.ok(Object.hasOwn(CHEIRO_REVISED_MAPPING, letter), `${letter} must be mapped`);
  }
});

test("John Smith preserves per-word totals, roots, compound and source metadata", () => {
  const result = calculateCheiroNameNumber("John Smith");
  assert.deepEqual(result.words.map(({ inputWord, normalizedWord, rawTotal, root }) => ({
    inputWord, normalizedWord, rawTotal, root,
  })), [
    { inputWord:"John", normalizedWord:"JOHN", rawTotal:18, root:9 },
    { inputWord:"Smith", normalizedWord:"SMITH", rawTotal:17, root:8 },
  ]);
  assert.deepEqual(result.words[0].letterBreakdown, [
    { letter:"J", value:1 }, { letter:"O", value:7 },
    { letter:"H", value:5 }, { letter:"N", value:5 },
  ]);
  assert.equal(result.compoundNameNumber, 17);
  assert.equal(result.nameRoot, 8);
  assert.equal(result.methodId, CHEIRO_REVISED_METHOD_ID);
  assert.equal(result.methodId, "cheiro-complete-edition-revised-copyright-1959-printing-unknown-v1");
  assert.equal(result.methodVersion, 1);
  assert.equal(result.sourceEdition, "Complete Edition, Revised");
  assert.equal(result.copyrightYear, 1959);
  assert.equal(result.printingYear, null);
});

test("Lloyd George and David Lloyd George use word roots for name compounds", () => {
  const lloydGeorge = calculateCheiroNameNumber("Lloyd George");
  assert.deepEqual(lloydGeorge.words.map(({ rawTotal, root }) => ({ rawTotal, root })), [
    { rawTotal:18, root:9 },
    { rawTotal:25, root:7 },
  ]);
  assert.equal(lloydGeorge.compoundNameNumber, 16);
  assert.equal(lloydGeorge.nameRoot, 7);

  const davidLloydGeorge = calculateCheiroNameNumber("David Lloyd George");
  assert.deepEqual(davidLloydGeorge.words.map(({ rawTotal, root }) => ({ rawTotal, root })), [
    { rawTotal:16, root:7 },
    { rawTotal:18, root:9 },
    { rawTotal:25, root:7 },
  ]);
  assert.equal(davidLloydGeorge.compoundNameNumber, 23);
  assert.equal(davidLloydGeorge.nameRoot, 5);
  assert.deepEqual(davidLloydGeorge.words.map((word) => word.inputWord), ["David", "Lloyd", "George"]);
});

test("Napoleon Bonaparte preserves the printed compound and labels raw totals as mapped values", () => {
  const result = calculateCheiroNameNumber("Napoleon Bonaparte");
  assert.deepEqual(result.words.map(({ rawTotal, root }) => ({ rawTotal, root })), [
    { rawTotal:41, root:5 },
    { rawTotal:35, root:8 },
  ]);
  assert.equal(result.compoundNameNumber, 13);
  assert.equal(result.nameRoot, 4);
});

test("Cheiro Birth Number is a separate day-of-month calculation", () => {
  for (const [dayOfMonth, birthNumber] of [[8,8],[17,8],[1,1],[10,1],[19,1],[28,1]]) {
    assert.deepEqual(calculateCheiroBirthNumber(dayOfMonth), {
      concept:"cheiro-birth-number",
      dayOfMonth,
      birthNumber,
    });
  }
});

test("invalid Cheiro Birth Number inputs are rejected", () => {
  for (const day of [0,32,-1,1.5,Number.NaN,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,"8",null]) {
    assertCheiroError(() => calculateCheiroBirthNumber(day), "INVALID_BIRTH_DAY");
  }
});

test("strict name validation preserves explicit ASCII word boundaries", () => {
  const titleCase = calculateCheiroNameNumber("John Smith");
  const lowerCase = calculateCheiroNameNumber("john smith");
  assert.equal(lowerCase.compoundNameNumber, titleCase.compoundNameNumber);
  assert.deepEqual(lowerCase.words.map((word) => word.normalizedWord), ["JOHN", "SMITH"]);

  const singleWord = calculateCheiroNameNumber("JohnSmith");
  assert.equal(singleWord.words.length, 1);
  assert.equal(singleWord.words[0].inputWord, "JohnSmith");
});

test("strict name validation rejects empty, long and ambiguous spacing", () => {
  assertCheiroError(() => calculateCheiroNameNumber(""), "EMPTY_NAME");
  assertCheiroError(() => calculateCheiroNameNumber("   "), "INVALID_WORD_SPACING");
  assertCheiroError(() => calculateCheiroNameNumber("A".repeat(101)), "NAME_TOO_LONG");
  assertCheiroError(() => calculateCheiroNameNumber("John  Smith"), "INVALID_WORD_SPACING");
  assertCheiroError(() => calculateCheiroNameNumber(" John Smith"), "INVALID_WORD_SPACING");
  assertCheiroError(() => calculateCheiroNameNumber("John Smith "), "INVALID_WORD_SPACING");
  assertCheiroError(() => calculateCheiroNameNumber("John\tSmith"), "INVALID_WORD_SPACING");
  assertCheiroError(() => calculateCheiroNameNumber("John\nSmith"), "INVALID_WORD_SPACING");
});

test("strict name validation rejects punctuation and ambiguous segmentation", () => {
  assertCheiroError(() => calculateCheiroNameNumber("John, Smith"), "UNSUPPORTED_PUNCTUATION");
  assertCheiroError(() => calculateCheiroNameNumber("John.Smith"), "UNSUPPORTED_PUNCTUATION");
  assertCheiroError(() => calculateCheiroNameNumber("Jean-Luc Picard"), "AMBIGUOUS_WORD_SEGMENTATION");
  assertCheiroError(() => calculateCheiroNameNumber("O'Connor"), "AMBIGUOUS_WORD_SEGMENTATION");
});

test("strict name validation rejects unsupported and mixed scripts without transliteration", () => {
  for (const name of ["李雷","John 李","José","Jose\u0301","आरव"]) {
    assertCheiroError(() => calculateCheiroNameNumber(name), "UNSUPPORTED_SCRIPT");
  }
});

test("existing Chaldean and Pythagorean outputs remain unchanged", () => {
  const chaldean = calculateNameName("Ada Lovelace", "chaldean");
  const pythagorean = calculateNameName("Ada Lovelace", "pythagorean");
  assert.deepEqual(chaldean.expression, { compound:39, reduced:3 });
  assert.deepEqual(pythagorean.expression, { compound:36, reduced:9 });
});
