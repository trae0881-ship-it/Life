import { readFileSync } from "node:fs";
import path from "node:path";

export type ReadinessStatus = "Verified" | "Incomplete" | "Blocked" | "Not yet verified";
export type ReadinessItem = {
  id: number;
  title: string;
  status: ReadinessStatus;
  evidence: string;
  testResult: string;
  lastCheckedAt: string;
  lastVerifiedAt: string | null;
  action: string | null;
};

type VerificationReport = {
  format?: string;
  sourceFingerprint?: string;
  evidenceFresh?: boolean;
  completedAt?: string;
  checks?: Array<{
    command: string;
    status: string;
    exitCode: number;
    testCounts?: { tests: number; passed: number; failed: number };
  }>;
};

type BuildManifest = { sourceFingerprint?: string };

const REQUIRED_CHECKS = [
  "npm test",
  "npx tsc --noEmit",
  "npx prisma validate",
  "npm run build",
];

const staticItems: Omit<ReadinessItem, "status" | "lastCheckedAt" | "lastVerifiedAt">[] = [
  {
    id: 1,
    title: "All required application features implemented and tested.",
    evidence: "The feature matrix and regression suite cover the implemented calculation, route, auth-page, Developer footer, and constrained CSV/JSONL transfer surfaces. Unsupported features remain identified as such; native restore, cross-engine conversion, real database verification, and authenticated role flows are not implemented/verified as supported.",
    testResult: "Phase 62 passed the source suite and browser-checked login/signup rendering, API docs/OpenAPI, anonymous dashboard gating, and the responsive Developer footer. Database-backed flows and authenticated role journeys remain unverified.",
    action: "Complete the remaining feature scope and verify database, role, browser, migration, and load workflows in isolation.",
  },
  {
    id: 2,
    title: "Super Admin/Admin/Developer permissions verified.",
    evidence: "Role-specific route guards and mocked authorization tests exist. The PostgreSQL suite prepares Super Admin, Admin, Developer, and regular-user (Viewer-level) sessions, but it requires a fresh disposable loopback database.",
    testResult: "Anonymous access to `/dashboard` and `/developers/dashboard` redirected to login. No authenticated Super Admin, Admin, Developer, User, or Viewer session was exercised; the PostgreSQL runner stopped because LIFE_TEST_DATABASE_URL and .env.test are absent.",
    action: "Verify each role, including Viewer, against protected pages and API endpoints with dedicated isolated accounts.",
  },
  {
    id: 3,
    title: "Database backup and restore procedure validated.",
    evidence: "Phase 62 rechecked the existing private archive (445,509 bytes); SHA-256 matches the recorded digest. Phase 58 `pg_restore --list` found 768 numeric TOC entries. Docker and pg_restore are unavailable.",
    testResult: "Archive digest verified; restore was not attempted. A PostgreSQL 17 Windows service is running and listening on 0.0.0.0:5432, but its database identity/disposability is unverified and it was not accessed.",
    action: "Provide an explicitly disposable, isolated PostgreSQL 17.11 instance and credentials; then perform the documented restore and inspect schema/data.",
  },
  {
    id: 4,
    title: "Database migrations reconciled and safely applied.",
    evidence: "The three discrepancies remain the Blog CMS, Admin Script Manager, and API Platform migrations. Static SQL/Prisma expectations are documented; API migration SQL does not configure RLS.",
    testResult: "No restored schema, `_prisma_migrations` ledger, live RLS policies/grants, or isolated rehearsal was available. No migration or database operation was performed.",
    action: "Provide an isolated restore target to compare all three objects/checksums and API RLS/grants, then rehearse any reviewed correction on a separate disposable clone.",
  },
  {
    id: 5,
    title: "Database export/import tested on an isolated database.",
    evidence: "Super Admin-only CSV/JSONL export and constrained single-table JSONL import are implemented. PostgreSQL integration coverage includes dry-run conflicts, commit, rollback, audit, export redaction, and production-disabled behavior.",
    testResult: "Mocked transfer tests pass and the PostgreSQL suite contains export/import, redaction, formula-injection, rollback, audit, duplicate, and foreign-key cases. No database-backed case ran; no isolated target is available.",
    action: "Provide an isolated disposable PostgreSQL 17.11 test database before running the transfer integration suite.",
  },
  {
    id: 6,
    title: "First-time setup gate tested without bypassing authentication.",
    evidence: "Initialization-state and route authorization unit tests cover unavailable, empty, missing-schema, pending-migration, recovery, initialized, and missing-Super-Admin states. Public setup does not provision/promote administrators.",
    testResult: "Only mocked states and source checks are verified. No real database setup-gate state or authenticated browser session was exercised.",
    action: "Provide an isolated disposable database and role fixtures to exercise each setup state through authenticated requests.",
  },
  {
    id: 7,
    title: "Critical routes and links verified.",
    evidence: "App Router inventory/literal-link tests pass. Phase 63 live app smoke checks on localhost confirmed `/login`, `/signup`, `/signup?next=%2Fdashboard`, `/api/openapi.json`, and the anonymous unauthorized response from `/api/developer/test`; the app served the expected public and auth pages without database mutations.",
    testResult: "Public routes and anonymous guards were browser-checked. Authenticated dashboard/developer roles, dynamic blog data, logout, persistent session verification, and complete interactive-control coverage remain unverified because no isolated authenticated database fixtures were available.",
    action: "Provide isolated authenticated role fixtures and test dynamic content, logout, role journeys, and the remaining browser controls.",
  },
  {
    id: 8,
    title: "Production build and regression tests pass.",
    evidence: "Verification is valid only when tests, TypeScript, Prisma validation, and production build pass for the current source fingerprint. The final Phase 63 clean rebuild was completed after clearing stale `.next` output, and the fresh report is recorded in data/verification/latest.json.",
    testResult: "Fresh verification report records exact results and fingerprint in data/verification/latest.json: 417/417 tests passed; TypeScript, Prisma validation, and production build all passed.",
    action: "Rerun the project verification after any source, test, migration, or build-configuration change.",
  },
  {
    id: 9,
    title: "API keys and authenticated database flows verified.",
    evidence: "API-platform unit tests exist. PostgreSQL integration cases cover key creation/persistence, authentication, quotas, expiry, rotation, revocation, account isolation, role ceilings, and transfer operations.",
    testResult: "PostgreSQL API-key lifecycle, scope, expiry, revoke/rotate, quotas, persistence, audit, role and account isolation tests are prepared but did not run. No verified test URL or disposable fixture exists.",
    action: "Provide an isolated database and dedicated test identities, then run the prepared API/authentication integration suite.",
  },
  {
    id: 10,
    title: "Load test completed in an isolated environment.",
    evidence: "No load-test package/configuration is installed. Although the local app and PostgreSQL 17 service are running, the service is not a verified isolated target and listens on all interfaces.",
    testResult: "No load test ran and no traffic was generated against the app/database. The existing cautious thresholds are proposals, not measured capacity.",
    action: "Provide an isolated local app/database and an approved existing load tool; establish thresholds and monitor system resources before testing.",
  },
];

function readJson<T>(candidates: string[]): T | null {
  for (const candidate of candidates) {
    try {
      return JSON.parse(readFileSync(candidate, "utf8")) as T;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) return null;
    }
  }
  return null;
}

function verificationEvidenceIsCurrent(report: VerificationReport | null, manifest: BuildManifest | null, now: Date) {
  if (!report || !manifest
    || report.format !== "life-verification-run-v1"
    || report.evidenceFresh !== true
    || !/^[a-f0-9]{64}$/.test(report.sourceFingerprint ?? "")
    || report.sourceFingerprint !== manifest.sourceFingerprint
    || !report.completedAt
    || !Number.isFinite(Date.parse(report.completedAt))
    || now.getTime() - Date.parse(report.completedAt) > 30 * 24 * 60 * 60 * 1000
    || Date.parse(report.completedAt) > now.getTime()) return false;

  const checks = new Map((report.checks ?? []).map((check) => [check.command, check]));
  return REQUIRED_CHECKS.every((command) => {
    const check = checks.get(command);
    return check?.status === "PASS" && check.exitCode === 0;
  });
}

function verificationTestResult(report: VerificationReport | null) {
  const checks = new Map((report?.checks ?? []).map((check) => [check.command, check]));
  return REQUIRED_CHECKS.map((command) => {
    const check = checks.get(command);
    if (!check) return `${command}: missing`;
    if (command === "npm test" && check.testCounts) {
      return `${command}: ${check.status} (${check.testCounts.passed}/${check.testCounts.tests} passed, ${check.testCounts.failed} failed)`;
    }
    return `${command}: ${check.status}`;
  }).join("; ");
}

export function getLaunchReadiness(now = new Date(), workingDirectory = process.cwd()) {
  const report = readJson<VerificationReport>([
    path.join(workingDirectory, "data", "verification", "latest.json"),
    path.join(workingDirectory, ".next", "standalone", "data", "verification", "latest.json"),
  ]);
  const manifest = readJson<BuildManifest>([
    path.join(workingDirectory, ".next", "standalone", "launch-readiness-build.json"),
    path.join(workingDirectory, "launch-readiness-build.json"),
  ]);
  const fresh = verificationEvidenceIsCurrent(report, manifest, now);
  const checkedAt = now.toISOString();
  const items: ReadinessItem[] = staticItems.map((item) => ({
    ...item,
    status: item.id === 8 ? (fresh ? "Verified" : "Not yet verified") : statusFor(item.id),
    lastCheckedAt: checkedAt,
    lastVerifiedAt: item.id === 8 && fresh ? report?.completedAt ?? null : null,
    evidence: item.id === 8 && fresh
      ? `Fresh verification run ${report?.completedAt}: ${REQUIRED_CHECKS.join(", ")} all passed; source fingerprint matches this build.`
      : item.evidence,
    testResult: item.id === 8 && report ? verificationTestResult(report) : item.testResult,
    action: item.id === 8 && fresh ? null : item.action,
  }));
  const completed = items.filter((item) => item.status === "Verified").length;
  return {
    checkedAt: now.toISOString(),
    completed,
    total: items.length,
    overall: completed === items.length ? "Ready for review" : "Not ready",
    items,
  };
}

function statusFor(id: number): ReadinessStatus {
  if ([3, 4, 5, 9, 10].includes(id)) return "Blocked";
  if ([1].includes(id)) return "Incomplete";
  return "Not yet verified";
}
