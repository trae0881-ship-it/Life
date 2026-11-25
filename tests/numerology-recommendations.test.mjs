import test from "node:test";
import assert from "node:assert/strict";
import {
  createNameRecommendations,
  createMobileRecommendations,
  createCareerRecommendations,
  createMarriageRecommendations,
  compareSavedNumerologyReports,
  sanitizeNumerologyExport,
} from "../src/calculation/numerology-recommendations.ts";
import { createProfessionalNumerologyReport } from "../src/calculation/numerology.ts";

test("name recommendations compare bounded alternatives across both name systems",()=>{
  const result=createNameRecommendations({name:"Ada",dateOfBirth:"1990-08-15",system:"chaldean"});
  assert.ok(result.alternatives.length>0);
  assert.ok(result.alternatives.every((item)=>item.spelling!==result.original));
  assert.ok(result.alternatives.every((item)=>item.changedLetters.length>0&&item.changedLetters.length<=2));
  assert.ok(result.alternatives.every((item)=>Number.isFinite(item.chaldeanCompound)&&Number.isFinite(item.pythagoreanCompound)));
  assert.ok(result.alternatives.every((item)=>item.supporting.length+item.contradictory.length+item.neutral.length>0));
});

test("mobile recommendations remain masked and pattern-only",()=>{
  const recommendations=createMobileRecommendations({countryCode:"91",mobileNumber:"9876543210",dateOfBirth:"1990-08-15"});
  assert.ok(recommendations.length>0);
  assert.ok(recommendations.every((item)=>item.maskedNumber.startsWith("****")));
  assert.ok(recommendations.every((item)=>item.targetRoot>=1&&item.targetRoot<=9));
  assert.ok(recommendations.every((item)=>item.supporting.length+item.contradictory.length+item.neutral.length>0));
});

test("career recommendations expose 12 categories with scores and evidence",()=>{
  const recommendations=createCareerRecommendations({dateOfBirth:"1990-08-15",name:"Ada Lovelace",system:"pythagorean"});
  assert.equal(recommendations.length,12);
  assert.ok(recommendations.every((item)=>item.score>=0&&item.score<=100));
  assert.ok(recommendations.every((item)=>item.supporting.length+item.contradictory.length+item.neutral.length>0));
  assert.ok(recommendations.every((item)=>item.strengths.length>0&&item.development.length>0));
  assert.equal(new Set(recommendations.map((item)=>item.category)).size,12);
});

test("marriage recommendations provide evidence, communication and cooperation guidance",()=>{
  const recommendations=createMarriageRecommendations({firstName:"Ada",firstDob:"1990-08-15",secondName:"Grace",secondDob:"1992-03-11",system:"pythagorean"});
  assert.ok(recommendations);
  assert.equal(recommendations.score>=0&&recommendations.score<=recommendations.maximumScore,true);
  assert.ok(recommendations.supporting.length+recommendations.contradictory.length+recommendations.neutral.length>0);
  assert.ok(recommendations.communication.length>=3);
  assert.ok(recommendations.cooperation.length>=3);
});

test("saved report comparison exports only changed fields",()=>{
  const left={dateOfBirth:"1990-08-15",name:"Ada",nameRoot:9,system:"pythagorean"};
  const right={dateOfBirth:"1990-08-15",name:"Aida",nameRoot:8,system:"chaldean"};
  const comparison=compareSavedNumerologyReports("Old",left,"New",right);
  assert.equal(comparison.differences.length>0,true);
  assert.match(comparison.summary,/report field/);
});

test("export sanitizer masks complete mobile numbers recursively",()=>{
  const result=sanitizeNumerologyExport({
    name:"Ada",
    mobile:{countryCode:"91",nationalNumber:"9876543210",fullNumber:"919876543210"},
    nested:{phone:"9876543210"},
  });
  assert.equal(result.mobile.nationalNumber,"****3210");
  assert.equal(result.mobile.fullNumber,"****3210");
  assert.equal(result.nested.phone,"****3210");
});

test("professional recommendation report is identical across Hindi and English values",()=>{
  const en=createProfessionalNumerologyReport({name:"Ada Lovelace",dateOfBirth:"1990-08-15",language:"en"});
  const hi=createProfessionalNumerologyReport({name:"Ada Lovelace",dateOfBirth:"1990-08-15",language:"hi"});
  assert.equal(en.sections.length,17);
  assert.equal(hi.sections.length,17);
  assert.deepEqual(en.sections.map((item)=>item.value),hi.sections.map((item)=>item.value));
  assert.deepEqual(en.sections.map((item)=>item.evidence),hi.sections.map((item)=>item.evidence));
});
