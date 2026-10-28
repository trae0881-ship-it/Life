import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getLaunchReadiness } from "../src/server/launch-readiness.ts";

const checks = [
  "npm test",
  "npx tsc --noEmit",
  "npx prisma validate",
  "npm run build",
].map((command) => ({
  command,
  status: "PASS",
  exitCode: 0,
  ...(command === "npm test" ? { testCounts: { tests: 4, passed: 4, failed: 0 } } : {}),
}));

test("launch checklist contains all ten required checks and cannot manually mark blocked work complete", () => {
  const readiness = getLaunchReadiness();
  assert.equal(readiness.items.length, 10);
  assert.deepEqual(readiness.items.map((item) => item.title), [
    "All required application features implemented and tested.",
    "Super Admin/Admin/Developer permissions verified.",
    "Database backup and restore procedure validated.",
    "Database migrations reconciled and safely applied.",
    "Database export/import tested on an isolated database.",
    "First-time setup gate tested without bypassing authentication.",
    "Critical routes and links verified.",
    "Production build and regression tests pass.",
    "API keys and authenticated database flows verified.",
    "Load test completed in an isolated environment.",
  ]);
  assert.equal(readiness.completed, readiness.items.filter((item) => item.status === "Verified").length);
  assert.equal(readiness.overall, "Not ready");
  assert.equal(readiness.items.find((item) => item.id === 4)?.status, "Blocked");
  assert.equal(readiness.items.find((item) => item.id === 4)?.lastVerifiedAt, null);
  assert.ok(readiness.items.every((item) => item.lastCheckedAt === readiness.checkedAt && item.testResult.length > 0));
});

test("build evidence is valid only for a matching, successful, recent source fingerprint", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "life-readiness-"));
  const reportDirectory = path.join(directory, "data", "verification");
  const standaloneDirectory = path.join(directory, ".next", "standalone");
  await mkdir(reportDirectory, { recursive: true });
  await mkdir(standaloneDirectory, { recursive: true });
  const fingerprint = "a".repeat(64);
  const now = new Date("2026-10-27T09:00:00.000Z");
  const reportPath = path.join(reportDirectory, "latest.json");
  const manifestPath = path.join(standaloneDirectory, "launch-readiness-build.json");
  const baseReport = {
    format: "life-verification-run-v1",
    sourceFingerprint: fingerprint,
    evidenceFresh: true,
    completedAt: "2026-10-27T08:30:00.000Z",
    checks,
  };

  try {
    await writeFile(reportPath, JSON.stringify(baseReport));
    await writeFile(manifestPath, JSON.stringify({ sourceFingerprint: fingerprint }));
    let readiness = getLaunchReadiness(now, directory);
    assert.equal(readiness.items.find((item) => item.id === 8)?.status, "Verified");
    assert.equal(readiness.items.find((item) => item.id === 8)?.lastVerifiedAt, baseReport.completedAt);
    assert.match(readiness.items.find((item) => item.id === 8)?.testResult ?? "", /npm test: PASS \(4\/4 passed, 0 failed\)/);
    assert.equal(readiness.completed, 1);
    assert.equal(readiness.overall, "Not ready");

    await writeFile(manifestPath, JSON.stringify({ sourceFingerprint: "b".repeat(64) }));
    readiness = getLaunchReadiness(now, directory);
    assert.equal(readiness.items.find((item) => item.id === 8)?.status, "Not yet verified");
    assert.equal(readiness.items.find((item) => item.id === 8)?.lastVerifiedAt, null);

    await writeFile(manifestPath, JSON.stringify({ sourceFingerprint: fingerprint }));
    await writeFile(reportPath, JSON.stringify({
      ...baseReport,
      checks: checks.map((check) => check.command === "npx tsc --noEmit"
        ? { ...check, status: "FAIL", exitCode: 1 }
        : check),
    }));
    readiness = getLaunchReadiness(now, directory);
    assert.equal(readiness.items.find((item) => item.id === 8)?.status, "Not yet verified");
    assert.match(readiness.items.find((item) => item.id === 8)?.testResult ?? "", /npx tsc --noEmit: FAIL/);

    await writeFile(reportPath, JSON.stringify({
      ...baseReport,
      completedAt: "2026-09-01T08:30:00.000Z",
    }));
    readiness = getLaunchReadiness(now, directory);
    assert.equal(readiness.items.find((item) => item.id === 8)?.status, "Not yet verified");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
