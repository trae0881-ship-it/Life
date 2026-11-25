import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateDateNumbers,
  calculateLoShu,
  calculateNameName,
  calculatePinnaclesAndChallenges,
  createNumerologyReport,
  getPersonalCycles,
  GRID_LAYOUT,
  NUMEROLOGY_SOURCES,
  parseIsoDate,
  PLANE_IDS,
  reduceDigitSum,
} from "../src/calculation/numerology.ts";
import { readFileSync } from "node:fs";

test("Lo Shu vectors use independent DOB-only frequency expectations", () => {
  const one = calculateLoShu("1990-08-15", "dob-only");
  assert.deepEqual(one.present, [1,5,8,9]);
  assert.deepEqual(one.missing, [2,3,4,6,7]);
  assert.deepEqual(one.repeated, [{number:1,count:2},{number:9,count:2}]);
  assert.deepEqual(one.frequency, {1:2,2:0,3:0,4:0,5:1,6:0,7:0,8:1,9:2});

  const two = calculateLoShu("1947-08-15", "dob-only");
  assert.deepEqual(two.present, [1,4,5,7,8,9]);
  assert.deepEqual(two.missing, [2,3,6]);
  assert.deepEqual(two.repeated, [{number:1,count:2}]);
});

test("magic square positions, row columns and diagonals remain valid", () => {
  assert.deepEqual(GRID_LAYOUT, [[4,9,2],[3,5,7],[8,1,6]]);
  for (let row=0; row<3; row++) assert.equal(GRID_LAYOUT[row].reduce((sum,n)=>sum+n,0),15);
  for (let column=0; column<3; column++) assert.equal(GRID_LAYOUT[0][column]+GRID_LAYOUT[1][column]+GRID_LAYOUT[2][column],15);
  assert.equal(GRID_LAYOUT[0][0]+GRID_LAYOUT[1][1]+GRID_LAYOUT[2][2],15);
  assert.equal(GRID_LAYOUT[0][2]+GRID_LAYOUT[1][1]+GRID_LAYOUT[2][0],15);
  assert.equal(PLANE_IDS.length,8);
});

test("Indian date modes keep Moolank and Bhagyank separate and verified", () => {
  assert.deepEqual(calculateDateNumbers("1990-08-15"), {
    iso:"1990-08-15",year:1990,month:8,day:15,
    moolank:6,bhagyankCompound:33,bhagyank:6,birthDay:6,lifePath:6,attitude:5,
  });
  assert.equal(calculateLoShu("1990-08-15","dob-only").missing.includes(2),true);
  const extended = calculateLoShu("1990-08-15","indian-extended");
  assert.equal(extended.frequency[6],2);
  assert.deepEqual(calculateLoShu("1990-08-15","indian-extended").present,[1,5,6,8,9]);
});

test("calendar dates, leap years, DD-MM-YYYY and leading zeros are validated", () => {
  assert.throws(()=>parseIsoDate("1990-02-30"),/valid calendar date/);
  assert.throws(()=>parseIsoDate("1900-02-29"),/valid calendar date/);
  assert.equal(parseIsoDate("2000-02-29").iso,"2000-02-29");
  assert.deepEqual(parseIsoDate("15-08-1990"),{iso:"15-08-1990",year:1990,month:8,day:15});
  assert.throws(()=>parseIsoDate("15/08/1990"),/DD-MM-YYYY/);
});

test("Chaldean and Pythagorean mappings remain separate and fully evidenced", () => {
  const chaldean = calculateNameName("Ada Lovelace","chaldean");
  const pythagorean = calculateNameName("Ada Lovelace","pythagorean");
  assert.equal(chaldean.mapping.A,1);
  assert.equal(chaldean.mapping.Q,1);
  assert.equal(pythagorean.mapping.A,1);
  assert.equal(pythagorean.mapping.J,1);
  assert.notEqual(chaldean.mapping.G,pythagorean.mapping.G);
  assert.equal(chaldean.mapping.B,2);
  assert.equal(pythagorean.mapping.B,2);
  assert.equal(pythagorean.mapping.C,3);
  assert.ok(chaldean.breakdown.length>0);
  assert.throws(()=>calculateNameName("李","pythagorean"),/supported letters/);
  assert.equal(reduceDigitSum(11,true),11);
  assert.equal(reduceDigitSum(22,true),22);
  assert.equal(reduceDigitSum(33,true),33);
});

test("personal cycles and pinnacles are documented and deterministic", () => {
  const reference = new Date(Date.UTC(2026,10,25));
  const cycles = getPersonalCycles("1990-08-15",reference);
  assert.deepEqual(cycles,{year:2026,month:11,day:25,personalYear:6,personalMonth:8,personalDay:6});
  const stages = calculatePinnaclesAndChallenges("1990-08-15");
  assert.equal(stages.pinnacles.length,4);
  assert.equal(stages.challenges.length,4);
  assert.deepEqual(stages.pinnacles.map((item)=>item.reduced),[5,7,3,9]);
  assert.deepEqual(stages.challenges.map((item)=>item.reduced),[2,5,3,7]);
});

test("30-section report is bilingual, evidence-led and disproves no missing feature", () => {
  const report = createNumerologyReport({name:"Ada Lovelace",dateOfBirth:"1990-08-15",system:"chaldean",loShuMode:"dob-only",language:"en",referenceDate:new Date(Date.UTC(2026,10,25))});
  assert.equal(report.sections.length,30);
  assert.equal(report.grid.present.join(","),"1,5,8,9");
  assert.equal(report.grid.missing.join(","),"2,3,4,6,7");
  assert.ok(report.sections.every((section)=>section.value && section.evidence && section.interpretation && section.interpretationHi));
  assert.match(report.disclaimer,/does not guarantee marriage, wealth, employment, health/);
  assert.doesNotMatch(JSON.stringify(report),/\b(?:AI|OpenAI|ChatGPT|Claude|Gemini)\b/i);
  const hindi = createNumerologyReport({name:"Ada Lovelace",dateOfBirth:"1990-08-15",language:"hi"});
  assert.match(hindi.sections[0].titleHi,/संख्या/);
  assert.match(hindi.disclaimer,/गारंटी/);
});

test("all planes and contradictory grid mode calculations are explicitly reported", () => {
  const dob = calculateLoShu("15-08-1990","dob-only");
  assert.equal(dob.planes.length,8);
  assert.deepEqual(dob.planes.map((plane)=>plane.numbers),PLANE_IDS.map((plane)=>[...plane[3]]));
  const extended = calculateLoShu("15-08-1990","indian-extended");
  assert.notDeepEqual(dob.present,extended.present);
  assert.notDeepEqual(dob.missing,extended.missing);
  assert.equal(NUMEROLOGY_SOURCES.length,3);
});

test("workspace and source register remain local, bounded and AI-free", () => {
  const workspace = readFileSync(new URL("../src/app/AstrologyServiceWorkspace.tsx", import.meta.url),"utf8");
  const engine = readFileSync(new URL("../src/calculation/numerology.ts",import.meta.url),"utf8");
  assert.match(workspace,/createNumerologyReport/);
  assert.match(workspace,/Traditional DOB-only/);
  assert.match(workspace,/Indian extended/);
  assert.match(workspace,/Export JSON/);
  assert.match(workspace,/window\.print/);
  assert.doesNotMatch(workspace,/fetch\(.*claude|openai|anthropic|gemini|chatgpt/i);
  assert.doesNotMatch(engine,/fetch\s*\(|https?:\/\/|openai|anthropic|gemini|chatgpt/i);
});
