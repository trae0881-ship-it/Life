import test from "node:test";
import assert from "node:assert/strict";
import {
  reduceDigitSum,
  compoundAndReduced,
  parseIsoDate,
  calculateDateNumbers,
  calculateLoShu,
  calculateNameName,
  analyzeMobileNumber,
  getPersonalCycles,
  compareNumerologyModules,
  explainMarriageScore,
  createProfessionalNumerologyReport,
  analyzeDateRange,
} from "../src/calculation/numerology.ts";

test("reduction and master handling use one documented zero-safe convention",()=>{
  assert.equal(reduceDigitSum(0),0);
  assert.equal(reduceDigitSum(9),9);
  assert.equal(reduceDigitSum(10),1);
  assert.equal(reduceDigitSum(29),2);
  assert.equal(reduceDigitSum(11,true),11);
  assert.equal(reduceDigitSum(22,true),22);
  assert.equal(reduceDigitSum(33,true),33);
  assert.deepEqual(compoundAndReduced(33,true),{compound:33,reduced:33});
  assert.deepEqual(compoundAndReduced(34,true),{compound:34,reduced:7});
});

test("DOB life, birth and destiny calculations use independent vectors",()=>{
  const date=calculateDateNumbers("15-08-1990");
  assert.equal(date.moolank,6);
  assert.equal(date.birthDay,6);
  assert.equal(date.bhagyank,6);
  assert.equal(date.lifePath,6);
  assert.equal(date.bhagyankCompound,33);
  assert.throws(()=>parseIsoDate("31-04-1990"),/valid calendar date/);
  assert.throws(()=>parseIsoDate("1799-12-31"),/valid calendar date|1800/);
});

test("name mappings and compound/reduction handling do not leak between systems",()=>{
  const chaldean=calculateNameName("Ada Lovelace","chaldean");
  const pythagorean=calculateNameName("Ada Lovelace","pythagorean");
  assert.notEqual(chaldean.expression.compound,pythagorean.expression.compound);
  assert.equal(chaldean.breakdown.length>0,true);
  assert.equal(pythagorean.vowelLetters.length>0,true);
  assert.throws(()=>calculateNameName("李雷","chaldean"),/supported letters/);
  assert.throws(()=>calculateNameName("","pythagorean"),/Enter a name/);
});

test("Lo Shu zero handling and independent vectors remain consistent",()=>{
  const grid=calculateLoShu("2000-01-01","dob-only");
  assert.equal(grid.frequency[0],undefined);
  assert.ok(grid.gridDigits.every((digit)=>digit>=1&&digit<=9));
  assert.equal(grid.present.includes(2),true);
  assert.equal(grid.present.includes(1),true);
  assert.equal(grid.planes.length,8);
});

test("mobile validation, compound, root and privacy-safe output are auditable",()=>{
  const mobile=analyzeMobileNumber("+91","9876543210","1990-08-15");
  assert.equal(mobile.compound,[...mobile.fullNumber].reduce((sum,digit)=>sum+Number(digit),0));
  assert.equal(mobile.root,reduceDigitSum(mobile.compound));
  assert.equal(mobile.nationalNumber,"9876543210");
  assert.equal(mobile.fullNumber.endsWith("3210"),true);
  assert.throws(()=>analyzeMobileNumber("91","123456","1990-08-15"),/7 to 15/);
  assert.throws(()=>analyzeMobileNumber("","+1234567890","1990-08-15"),/Country code/);
});

test("personal cycles use timezone date parts instead of UTC date assumptions",()=>{
  const nearMidnight=new Date("2026-11-25T22:30:00Z");
  const utc=getPersonalCycles("1990-08-15",nearMidnight,"UTC");
  const kolkata=getPersonalCycles("1990-08-15",nearMidnight,"Asia/Kolkata");
  assert.equal(utc.day,25);
  assert.equal(kolkata.day,26);
  assert.ok(utc.personalYear>=1&&utc.personalYear<=9);
  assert.ok(kolkata.personalMonth>=1&&kolkata.personalMonth<=9);
});

test("cross-module evidence reports supporting contradictory and neutral relationships",()=>{
  const evidence=compareNumerologyModules({
    dateOfBirth:"1990-08-15",name:"Ada Lovelace",system:"pythagorean",
    countryCode:"91",mobileNumber:"9876543210",
  });
  assert.equal(evidence.relations.length>=4,true);
  assert.ok(evidence.relations.every((item)=>["supporting","contradictory","neutral"].includes(item.relation)));
  assert.ok(evidence.relations.every((item)=>item.formula&&item.evidence&&item.explanation));
});

test("marriage score factors, weights formula and final result are reproducible",()=>{
  const score=explainMarriageScore("Ada","1990-08-15","Grace","1992-03-11","pythagorean");
  assert.equal(score.maximumScore,10);
  assert.equal(score.formula.includes("3"),true);
  assert.deepEqual(score.weights,{moolank:3,bhagyank:4,name:3,complementaryLoShu:1});
  assert.equal(score.finalScore>=0&&score.finalScore<=10,true);
  assert.ok([...score.positive,...score.negative].every((item)=>Number.isFinite(item.points)));
  assert.ok(score.neutral.every((item)=>item.factor&&item.evidence));
  assert.deepEqual(explainMarriageScore("Ada","1990-08-15","Grace","1992-03-11","pythagorean"),score);
});

test("historical date validation rejects DOB-equal and pre-DOB boundaries correctly",()=>{
  assert.throws(()=>analyzeDateRange("1990-08-15","UTC",{historical:true,year:1989,month:12}),/cannot predate/);
  assert.throws(()=>analyzeDateRange("1990-08-15","UTC",{historical:true,year:1990,month:7}),/birth month/);
  const valid=analyzeDateRange("1990-08-15","UTC",{historical:true,year:1990,month:8});
  assert.equal(valid.year,1990);
  assert.equal(valid.month,8);
});

test("Hindi and English professional reports contain identical values and 17 sections",()=>{
  const en=createProfessionalNumerologyReport({name:"Ada Lovelace",dateOfBirth:"1990-08-15",language:"en",countryCode:"91",mobileNumber:"9876543210"});
  const hi=createProfessionalNumerologyReport({name:"Ada Lovelace",dateOfBirth:"1990-08-15",language:"hi",countryCode:"91",mobileNumber:"9876543210"});
  assert.equal(en.sections.length,17);
  assert.equal(hi.sections.length,17);
  assert.deepEqual(en.sections.map((item)=>item.value),hi.sections.map((item)=>item.value));
  assert.deepEqual(en.sections.map((item)=>item.evidence),hi.sections.map((item)=>item.evidence));
  assert.match(hi.sections[0].titleHi,/व्यक्तिगत/);
  assert.match(en.disclaimer,/does not guarantee/);
  assert.doesNotMatch(JSON.stringify(en),/\b(?:ChatGPT|Claude|Gemini|OpenAI)\b/i);
  const json=JSON.parse(JSON.stringify(en));
  assert.equal(json.sections.length,17);
  assert.deepEqual(json.sections.map((item)=>item.value),en.sections.map((item)=>item.value));
});
