import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeMobileNumber,
  generateMobileCorrectionPatterns,
  calculateNameCorrections,
  calculateMarriageCompatibility,
  calculateCareerProfile,
  analyzeDateRange,
  calculateNameName,
  calculateLoShu,
  createNumerologyReport,
} from "../src/calculation/numerology.ts";

test("mobile number validation is bounded and separates country code and national digits", () => {
  const mobile=analyzeMobileNumber("+91","9876543210","1990-08-15");
  assert.equal(mobile.countryCode,"91");
  assert.equal(mobile.nationalNumber,"9876543210");
  assert.equal(mobile.fullNumber,"919876543210");
  assert.equal(mobile.compound,[...mobile.fullNumber].reduce((sum,digit)=>sum+Number(digit),0));
  assert.throws(()=>analyzeMobileNumber("91","123","1990-08-15"),/7 to 15 digits/);
  assert.throws(()=>analyzeMobileNumber("91","009876543210","1990-08-15"),/international zero padding/);
  assert.throws(()=>analyzeMobileNumber("91ABC","9876543210","1990-08-15"),/Country code/);
  assert.ok(mobile.repeated.length>0);
  assert.equal(mobile.digitFrequency[9]>=1,true);
});

test("mobile correction suggestions are patterns only and rank transparent root matches", () => {
  const suggestions=generateMobileCorrectionPatterns("91","9876543210","1990-08-15");
  assert.ok(suggestions.length>0);
  assert.ok(suggestions.every((item)=>Number.isInteger(item.targetRoot)&&item.targetRoot>=1&&item.targetRoot<=9));
  assert.ok(suggestions.every((item)=>item.score>0&&item.rationale&&item.example.startsWith("91-")));
  assert.ok(suggestions.every((item)=>item.example.length>3));
  assert.ok(suggestions.every((item)=>typeof item.compoundDelta==="number"));
});

test("name correction engine produces documented one-letter alternatives without duplicates", () => {
  const corrections=calculateNameCorrections("Ada","1990-08-15","chaldean");
  assert.ok(corrections.length>0);
  assert.ok(corrections.every((item)=>item.suggested!==item.original));
  assert.equal(new Set(corrections.map((item)=>item.suggested)).size,corrections.length);
  assert.ok(corrections.every((item)=>item.changedLetters.length>0&&item.changedLetters.length<=2));
  assert.ok(corrections.every((item)=>Number.isInteger(item.originalCompound)&&Number.isInteger(item.newCompound)));
  assert.ok(corrections.every((item)=>item.originalRoot>=1&&item.newRoot>=1&&item.newRoot<=9));
});

test("Indian transliteration and unsupported scripts are explicit rather than authoritative", () => {
  const devanagari=calculateNameName("आरव","pythagorean");
  assert.ok(devanagari.normalized.length>0);
  assert.equal(devanagari.unsupported.length,0);
  const latin=calculateNameName("Arav Sharma","pythagorean");
  assert.ok(latin.normalized.includes("ARAV"));
  assert.ok(latin.breakdown.length>0);
  assert.throws(()=>calculateNameName("李雷","chaldean"),/supported letters/);
});

test("Chaldean and Pythagorean name trinity remains system-specific", () => {
  const chaldean=calculateNameName("Ada Lovelace","chaldean");
  const pythagorean=calculateNameName("Ada Lovelace","pythagorean");
  assert.ok(chaldean.expression.compound>=chaldean.expression.reduced);
  assert.ok(pythagorean.expression.compound>=pythagorean.expression.reduced);
  assert.ok(chaldean.soulUrge.compound>=1);
  assert.ok(chaldean.personality.compound>=1);
  assert.equal(new Set(Object.values(chaldean.mapping)).size,8);
  assert.equal(new Set(Object.values(pythagorean.mapping)).size,9);
});

test("marriage comparison handles two profiles and missing or conflicting inputs", () => {
  const result=calculateMarriageCompatibility("Ada","1990-08-15","Grace","1992-03-11","pythagorean");
  assert.equal(result.system,"pythagorean");
  assert.equal(result.pairs.length,3);
  assert.ok(result.traditionalMethodScore>=0&&result.traditionalMethodScore<=10);
  assert.match(result.disclaimer,/not/);
  assert.throws(()=>calculateMarriageCompatibility("","1990-08-15","Grace","1992-03-11"),/both names/);
  assert.throws(()=>calculateMarriageCompatibility("Ada","1990-02-30","Grace","1992-03-11"),/valid calendar date/);
});

test("career report covers all categories and keeps practical actions separate", () => {
  const career=calculateCareerProfile("1990-08-15","Ada Lovelace","pythagorean");
  assert.deepEqual(career.categories.map((item)=>item.category),["Business","Management","Technology","Sales","Marketing","Finance","Education","Creative professions","Communication","Entrepreneurship"]);
  assert.ok(career.roots.every((root)=>root>=1&&root<=9));
  assert.ok(career.practicalActions.length>=4);
  assert.match(career.disclaimer,/do not determine ability/);
});

test("date range engine uses timezone current date and rejects pre-DOB historical dates", () => {
  const now=new Date(Date.UTC(2026,10,25,12));
  const current=analyzeDateRange("1990-08-15","UTC",{historical:false,now});
  assert.equal(current.year,2026);
  assert.equal(current.month,11);
  assert.equal(current.personalYear,6);
  assert.equal(current.personalMonth,8);
  const historical=analyzeDateRange("1990-08-15","UTC",{historical:true,year:1995,month:3,now});
  assert.equal(historical.year,1995);
  assert.equal(historical.month,3);
  assert.throws(()=>analyzeDateRange("1990-08-15","UTC",{historical:true,year:1989,month:12,now}),/cannot predate/);
  assert.throws(()=>analyzeDateRange("1990-08-15","UTC",{historical:true,year:1990,month:7,now}),/earlier than the user's birth month/);
  assert.throws(()=>analyzeDateRange("1990-02-30","UTC",{historical:false,now}),/valid calendar date/);
});

test("advanced report includes mobile, name and combined evidence without new external calls", () => {
  const report=createNumerologyReport({name:"Ada Lovelace",dateOfBirth:"1990-08-15",language:"en"});
  assert.equal(report.sections.length,30);
  assert.match(report.disclaimer,/does not guarantee/);
  assert.deepEqual(calculateLoShu("1990-08-15","dob-only").missing,[2,3,4,6,7]);
});
