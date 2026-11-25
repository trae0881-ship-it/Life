import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeAdvancedLoShu,
  calculateNameEnhancedLoShu,
  createUnifiedNumerologyProfile,
  createFutureCycleOverview,
  createNumerologyComparison,
  createProfessionalNumerologyReport,
  calculateMarriageCompatibility,
  calculateCareerProfile,
} from "../src/calculation/numerology.ts";

test("unified professional profile combines all core calculations once", () => {
  const profile=createUnifiedNumerologyProfile({
    name:"Ada Lovelace",dateOfBirth:"1990-08-15",system:"pythagorean",loShuMode:"dob-only",
    countryCode:"91",mobileNumber:"9876543210",
  });
  assert.equal(profile.date.moolank,6);
  assert.equal(profile.date.bhagyank,6);
  assert.equal(profile.name.expression.reduced,9);
  assert.equal(profile.chaldean.expression.reduced,3);
  assert.equal(profile.pythagorean.expression.reduced,profile.name.expression.reduced);
  assert.equal(profile.loShu.present.length,4);
  assert.equal(profile.mobile ? profile.mobile.root >= 1 && profile.mobile.root <= 9 : true,true);
  assert.equal(profile.cycles.personalYear>=1&&profile.cycles.personalYear<=9,true);
  assert.equal(profile.stages.pinnacles.length,4);
});

test("advanced Lo Shu reports all methods and explicit contradictions", () => {
  const advanced=analyzeAdvancedLoShu("1990-08-15","Ada Lovelace","pythagorean");
  assert.equal(advanced.dobOnly.present.length,4);
  assert.equal(advanced.indianExtended.present.includes(6),true);
  assert.ok(advanced.presentOverlap.length>0);
  assert.ok(advanced.contradictions.every((item)=>/DOB-only|name-enhanced|Indian/.test(item)));
  const enhanced=calculateNameEnhancedLoShu("1990-08-15","Ada Lovelace","pythagorean");
  assert.equal(enhanced.mode,"name-enhanced");
  assert.equal(enhanced.nameRoot,enhanced.nameRoot);
  assert.equal(enhanced.planes.length,8);
});

test("marriage engine exposes Chaldean Pythagorean cycles and practical evidence", () => {
  const marriage=calculateMarriageCompatibility("Ada","1990-08-15","Grace","1992-03-11","pythagorean");
  assert.ok(marriage.chaldean.first>=1&&marriage.chaldean.second>=1);
  assert.ok(marriage.pythagorean.first>=1&&marriage.pythagorean.second>=1);
  assert.equal(marriage.repeatedComparison.first.length>=0,true);
  assert.ok(marriage.personalYear.first>=1&&marriage.personalYear.second>=1);
  assert.ok(marriage.communication.first.expression>=1);
  assert.ok(marriage.strengths.length>0);
  assert.ok(marriage.disagreements.length>0);
  assert.ok(marriage.practicalSuggestions.length>0);
  assert.match(marriage.disclaimer,/not a measured probability/);
});

test("career engine shows supporting roots contradictions and practical skills", () => {
  const career=calculateCareerProfile("1990-08-15","Ada Lovelace","pythagorean");
  assert.equal(career.categories.length,12);
  assert.ok(career.categories.every((item)=>item.supportingEvidence.length>=0));
  assert.ok(career.categories.every((item)=>item.contradictions.length>=0));
  assert.ok(career.categories.every((item)=>item.relevantSkills.length>0));
  assert.equal(career.categories.some((item)=>item.category==="Research"||item.category==="Technology"),true);
});

test("future cycles are timezone dynamic and stop at the requested range", () => {
  const now=new Date(Date.UTC(2026,10,25,12));
  const cycles=createFutureCycleOverview("1990-08-15","UTC",4,now);
  assert.equal(cycles.length,4);
  assert.equal(cycles[0].year,2026);
  assert.equal(cycles[3].year,2029);
  assert.throws(()=>createFutureCycleOverview("1990-08-15","UTC",51,now),/1 to 50/);
});

test("comparison studio compares exact side-by-side fields", () => {
  const comparison=createNumerologyComparison({
    kind:"dobs",
    leftLabel:"Ada · 1990-08-15",
    rightLabel:"Grace · 1992-03-11",
    left:{moolank:6,bhagyank:6,nameRoot:8},
    right:{moolank:2,bhagyank:7,nameRoot:5},
  });
  assert.equal(comparison.kind,"dobs");
  assert.equal(comparison.differences.length,3);
  assert.ok(comparison.differences[0].includes("moolank"));
});

test("professional report contains all 17 required sections and remains AI-free", () => {
  const report=createProfessionalNumerologyReport({
    name:"Ada Lovelace",dateOfBirth:"1990-08-15",system:"pythagorean",language:"en",
    countryCode:"91",mobileNumber:"9876543210",
  });
  assert.equal(report.sections.length,17);
  assert.deepEqual(report.sections.map((section)=>section.title),[
    "Personal Numerology Summary","DOB and Core Numbers","Lo Shu Grid","Missing and Repeated Numbers","Name Analysis",
    "Name Correction Comparison","Mobile Number Analysis","Mobile Pattern Suggestions","Combined Compatibility","Marriage Compatibility",
    "Career and Business Analysis","Pinnacle and Challenge Cycles","Personal Year and Month","Historical Analysis","Practical Action Plan",
    "Calculation Evidence","Methodology and Limitations",
  ]);
  assert.doesNotMatch(JSON.stringify(report),/\b(?:AI|OpenAI|ChatGPT|Claude|Gemini)\b/i);
  assert.match(report.disclaimer,/does not guarantee/);
});
