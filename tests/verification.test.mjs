import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VERIFICATION_SECTIONS } from "../src/verification/definitions.ts";
import { makeChecklist, publicVerificationRun, statusFor } from "../src/verification/status.ts";
import { checkedRequirements } from "../src/verification/review.ts";

test("checklist definition contains nine sections and 59 stable requirements", () => {
  assert.equal(new Set(VERIFICATION_SECTIONS.map((item) => item.sectionId)).size, 9);
  assert.equal(VERIFICATION_SECTIONS.length, 59);
  assert.equal(new Set(VERIFICATION_SECTIONS.map((item) => item.id)).size, 59);
});

test("planetary and kundali sections match their exact requirement lists", () => {
  const planetary = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "planetary");
  const charts = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "charts-vargas");
  assert.deepEqual(planetary.map((item) => item.requirement), [
    "Sun, Moon और सभी supported grahas की positions calculate हों", "Tropical और sidereal longitude consistent हों", "Lahiri सहित configured ayanamsa modes verified हों", "Mean और true lunar nodes अलग हों", "Degree-minute-second मूल precision से display हों", "Retrograde, direct और stationary rules test हों", "0°/360° और zodiac boundary cases test हों", "House placement और Nakshatra unrounded values से calculate हों",
  ]);
  assert.deepEqual(charts.map((item) => item.requirement), [
    "Lagna और house cusps verified हों", "North Indian और South Indian chart layouts सही हों", "D1 Rashi chart verified हो", "D2 से D60 तक supported divisional charts के rules individually tested हों", "Nakshatra और Pada boundary tests pass हों", "Yogas, Doshas, aspects और dignity rules documented हों", "Chart renderer केवल calculation engine के results दिखाए",
  ]);
});

test("Dasha and Panchanga sections match their exact requirement lists", () => {
  const dasha = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "dasha-kp");
  const panchanga = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "panchanga-transit");
  assert.deepEqual(dasha.map((item) => item.requirement), [
    "Birth Moon से initial Vimshottari Dasha balance calculate हो", "Mahadasha, Antardasha और Pratyantardasha boundaries tested हों", "Dasha chronology में unexplained gaps या overlaps न हों", "KP ayanamsa और cusp conventions explicit हों", "Sub-lord और sub-sub-lord interval boundaries tested हों", "Planetary और house significators documented rules से calculate हों",
  ]);
  assert.deepEqual(panchanga.map((item) => item.requirement), [
    "Tithi, Vara, Yoga, Karana और Nakshatra tested हों", "Sunrise, sunset, moonrise और moonset limitations documented हों", "Transit और sign-ingress events tested हों", "Event timestamps सही local date से map हों", "Unsupported conditions पर fabricated result न मिले",
  ]);
  assert.equal(dasha.length, 6);
  assert.equal(panchanga.length, 5);
  assert.equal(`${checkedRequirements(dasha.map((item) => item.id), [], {}, "Review").size}/${dasha.length} checked`, "0/6 checked");
  assert.equal(`${checkedRequirements(panchanga.map((item) => item.id), [], {}, "Review").size}/${panchanga.length} checked`, "0/5 checked");
});

test("accuracy and deployment sections match their exact requirement lists", () => {
  const accuracy = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "accuracy-validation");
  const deployment = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "railway-db-security");
  assert.deepEqual(accuracy.map((item) => item.requirement), [
    "Unit, integration और regression tests execute हों", "Golden reference datasets का source और version recorded हो", "Independent reference comparison वास्तव में execute हो", "Reference settings और coordinate conventions compatible हों", "Angular differences और tolerances सही तरीके से calculate हों", "Failed critical checks पर verified status block हो", "Repeated identical calculations reproducible हों",
  ]);
  assert.deepEqual(deployment.map((item) => item.requirement), [
    "Railway production build और startup verified हों", "PostgreSQL migrations सुरक्षित हों", "DATABASE_URL और secrets code में hard-coded न हों", "Saved charts और calculation provenance persist हों", "User ownership और admin authorization server-side enforced हों", "Backup और restore procedure tested हो", "Outbound network blocked होने पर local calculation tests pass हों",
  ]);
  assert.equal(accuracy.length, 7);
  assert.equal(deployment.length, 7);
  assert.equal(accuracy[0].sectionTitle, "Accuracy & Independent Validation");
  assert.equal(deployment[0].sectionTitle, "Railway, Database & Security");
  assert.equal(`${checkedRequirements(accuracy.map((item) => item.id), [], {}, "Review").size}/${accuracy.length} checked`, "0/7 checked");
  assert.equal(`${checkedRequirements(deployment.map((item) => item.id), [], {}, "Review").size}/${deployment.length} checked`, "0/7 checked");
});

test("Final Release section has the exact six release requirements and starts unchecked", () => {
  const release = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "release");
  assert.deepEqual(release.map((item) => item.requirement), [
    "कोई external calculation API dependency न हो", "हर feature की implementation और test evidence मौजूद हो", "Incomplete modules स्पष्ट रूप से listed हों", "Calculation engine और convention versions report में हों", "Actual Railway deployment status verify हो", "Unverified calculations को fully verified न बताया जाए",
  ]);
  assert.equal(release.length, 6);
  assert.equal(release[0].sectionTitle, "Final Release");
  assert.equal(`${checkedRequirements(release.map((item) => item.id), [], {}, "Review").size}/${release.length} checked`, "0/6 checked");
});

test("feature inventory and known limitations list incomplete modules", () => {
  const inventory = readFileSync("docs/FEATURE_INVENTORY.md", "utf8");
  const limitations = readFileSync("docs/KNOWN_LIMITATIONS.md", "utf8");
  for (const feature of ["KP", "Pratyantardasha", "Transit", "Authentication", "Railway"]) {
    assert.match(inventory, new RegExp(feature, "i"), `${feature} should appear in the feature inventory`);
  }
  assert.match(limitations, /registration\/login.*implemented/i);
  assert.match(limitations, /not been tested against a configured database/i);
  assert.match(limitations, /Independent reference/i);
  assert.match(limitations, /not been verified/i);
});

test("Railway status stays untested until a matching deployment evidence record exists", () => {
  const railway = VERIFICATION_SECTIONS.find((item) => item.id === "release-5");
  assert.ok(railway);
  assert.equal(statusFor(railway).status, "NOT_TESTED");
  assert.equal(statusFor(railway).testExecutionStatus, "NOT_RUN");
  const run = { version: "v", runId: "railway-run", environment: "test", startedAt: "2026-10-17T00:00:00.000Z", completedAt: "2026-10-17T00:01:00.000Z", checks: [{ command: railway.testCommand, status: "PASS", exitCode: 0, completedAt: "2026-10-17T00:01:00.000Z" }] };
  assert.equal(statusFor(railway, run).status, "PASS");
  assert.equal(statusFor(railway, run).testExecutionStatus, "PASS");
});

test("local dependency audit cannot mark the outbound-network check fully PASS", () => {
  const dependencyAudit = VERIFICATION_SECTIONS.find((item) => item.id === "release-1");
  assert.ok(dependencyAudit);
  assert.equal(statusFor(dependencyAudit).status, "NOT_TESTED");
  const run = { version: "v", runId: "audit-run", environment: "test", startedAt: "2026-10-17T00:00:00.000Z", completedAt: "2026-10-17T00:01:00.000Z", checks: [{ command: "npm test", status: "PASS", exitCode: 0, passedTests: [dependencyAudit.testTitle], failedTests: [], completedAt: "2026-10-17T00:01:00.000Z" }] };
  assert.equal(statusFor(dependencyAudit, run).status, "TESTED");
  assert.equal(statusFor(dependencyAudit, run).testExecutionStatus, "PASS");
});

test("section check progress is independent, reviewer-specific and preserves unchecked items", () => {
  const ids = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "planetary").map((item) => item.id);
  const chartIds = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "charts-vargas").map((item) => item.id);
  assert.equal(ids.length, 8);
  assert.equal(chartIds.length, 7);
  assert.equal(checkedRequirements(ids, [], {}, "Review A").size, 0);
  assert.equal(checkedRequirements(ids, [{ requirementId: ids[0], reviewer: "Review A" }], {}, "Review A").size, 1);
  assert.equal(`${checkedRequirements(ids, [{ requirementId: ids[0], reviewer: "Review A" }], {}, "Review A").size}/${ids.length} checked`, "1/8 checked");
  assert.equal(checkedRequirements(ids, [{ requirementId: ids[0], reviewer: "Review A" }], { [ids[3]]: { reviewer: "Review A" } }, "Review A").size, 2);
  assert.equal(checkedRequirements(ids, [{ requirementId: ids[0], reviewer: "Review A" }], {}, "Review B").size, 0);
  const dashaIds = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "dasha-kp").map((item) => item.id);
  const panchangaIds = VERIFICATION_SECTIONS.filter((item) => item.sectionId === "panchanga-transit").map((item) => item.id);
  assert.equal(checkedRequirements(dashaIds, [{ requirementId: dashaIds[0], reviewer: "Review A" }], {}, "Review A").size, 1);
  assert.equal(checkedRequirements(panchangaIds, [], {}, "Review A").size, 0);
});

test("only directly linked executed tests can set an evidence status", () => {
  const definition = VERIFICATION_SECTIONS.find((item) => item.testTitle);
  assert.ok(definition);
  assert.equal(statusFor(definition).status, "NOT_TESTED");
  assert.equal(statusFor(definition).implementationStatus, "IMPLEMENTED");
  assert.equal(statusFor(definition).testExecutionStatus, "NOT_RUN");
  const run = { version: "v", runId: "run", environment: "test", startedAt: "2026-10-16T00:00:00.000Z", completedAt: "2026-10-16T00:01:00.000Z", checks: [{ command: definition.testCommand, status: "PASS", exitCode: 0, passedTests: [definition.testTitle], failedTests: [], completedAt: "2026-10-16T00:01:00.000Z" }] };
  assert.equal(statusFor(definition, run).status, definition.successfulTestStatus);
  assert.equal(statusFor(definition, run).implementationStatus, "IMPLEMENTED");
  assert.equal(statusFor(definition, run).testExecutionStatus, "PASS");
  run.checks[0].passedTests = [];
  run.checks[0].failedTests = [definition.testTitle];
  assert.equal(statusFor(definition, run).status, "FAIL");
});

test("critical release gate fails closed and reviewer count cannot change technical status", () => {
  const checklist = makeChecklist(undefined, 0);
  assert.equal(checklist.sections.length, 9);
  assert.deepEqual(checklist.sections.map((section) => section.items.length), [6, 7, 8, 7, 6, 5, 7, 7, 6]);
  assert.equal(checklist.releaseReady, false);
  assert.ok(checklist.criticalIssues.length > 0);
  assert.equal(makeChecklist(undefined, 59).releaseReady, false);
  assert.equal(checklist.railwayVerification?.status, "BLOCKED");
  assert.ok(checklist.incompleteModules.some((item) => item.id === "release-5"));
  assert.ok(checklist.criticalIssues.some((item) => item.id === "release-5"));
});

test("public verification acknowledgements are local-only and expose no reviewer text", () => {
  const route = readFileSync("src/app/api/verification/route.ts", "utf8");
  assert.match(route, /acknowledgementsPersistent:\s*false/);
  assert.match(route, /acknowledgements:\s*\[\]/);
  assert.match(route, /ACKNOWLEDGEMENTS_LOCAL_ONLY/);
  assert.doesNotMatch(route, /verificationAcknowledgement\.(findMany|upsert|deleteMany)/);
});

test("authenticated verification approvals are scoped to the reviewer and return minimized fields", () => {
  const route = readFileSync("src/app/api/verification/approvals/route.ts", "utf8");
  assert.match(route, /where:\s*\{\s*userId:\s*auth\.user\.id\s*\}/);
  assert.match(route, /select:\s*\{\s*id:\s*true,\s*requirementId:\s*true,\s*approvedAt:\s*true\s*\}/);
  assert.doesNotMatch(route, /include:\s*\{\s*user:/);
  assert.doesNotMatch(route, /select:\s*\{\s*id:\s*true,\s*email:\s*true,\s*role:\s*true/);
});

test("public verification run omits process output and environment metadata", () => {
  const run = publicVerificationRun({
    version: "v",
    runId: "run",
    environment: "private-hostname; Node v22",
    startedAt: "2026-10-21T00:00:00.000Z",
    completedAt: "2026-10-21T00:01:00.000Z",
    checks: [{
      command: "npm test",
      status: "PASS",
      exitCode: 0,
      stdout: "PRIVATE_API_KEY=must-not-be-returned",
      stderr: "private machine path",
      passedTests: ["private test case title"],
      startedAt: "2026-10-21T00:00:01.000Z",
      completedAt: "2026-10-21T00:00:30.000Z",
    }],
  });
  assert.ok(run);
  assert.equal("environment" in run, false);
  assert.equal("stdout" in run.checks[0], false);
  assert.equal("stderr" in run.checks[0], false);
  assert.equal("passedTests" in run.checks[0], false);
  assert.doesNotMatch(JSON.stringify(run), /must-not-be-returned|private machine path|private-hostname|private test case title/);
});
