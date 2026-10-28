import { VERIFICATION_SECTIONS, VERIFICATION_SECTION_META, type EvidenceDefinition, type TechnicalStatus } from "./definitions.ts";

export type CommandEvidence = { command: string; status: "PASS" | "FAIL" | "NOT_RUN"; exitCode: number | null; stdout?: string; stderr?: string; passedTests?: string[]; failedTests?: string[]; startedAt?: string; completedAt?: string };
export type VerificationRun = { version: string; runId: string; environment: string; startedAt: string; completedAt: string; checks: CommandEvidence[] };
export type PublicVerificationRun = Pick<VerificationRun, "version" | "runId" | "startedAt" | "completedAt"> & {
  checks: Omit<CommandEvidence, "stdout" | "stderr" | "passedTests" | "failedTests">[];
};
export type RequirementEvidence = { requirementId: string; status: TechnicalStatus; implementationStatus: EvidenceDefinition["implementation"]; testExecutionStatus: "NOT_RUN" | "PASS" | "FAIL"; method: string; actualResult: string; evidenceReference: string; testedAt?: string; remediation: string; critical: boolean; note?: string };

export function publicVerificationRun(run?: VerificationRun): PublicVerificationRun | null {
  if (!run) return null;
  return {
    version: run.version,
    runId: run.runId,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    checks: run.checks.map((check) => ({
      command: check.command,
      status: check.status,
      exitCode: check.exitCode,
      ...(check.startedAt ? { startedAt: check.startedAt } : {}),
      ...(check.completedAt ? { completedAt: check.completedAt } : {}),
    })),
  };
}

export function statusFor(definition: EvidenceDefinition, run?: VerificationRun): RequirementEvidence {
  const check = definition.testTitle ? run?.checks.find((item) => item.passedTests?.includes(definition.testTitle!) || item.failedTests?.includes(definition.testTitle!)) : undefined;
  const commandCheck = !definition.testTitle ? run?.checks.find((item) => item.command === definition.testCommand && item.status !== "NOT_RUN") : undefined;
  const failed = Boolean(definition.testTitle && check?.failedTests?.includes(definition.testTitle) || commandCheck?.status === "FAIL");
  const executed = Boolean(definition.testTitle && (check?.passedTests?.includes(definition.testTitle) || check?.failedTests?.includes(definition.testTitle)) || commandCheck);
  const testExecutionStatus = failed ? "FAIL" as const : executed ? "PASS" as const : "NOT_RUN" as const;
  let status: TechnicalStatus;
  let actualResult = "No directly linked test has been executed in the recorded verification run.";
  if (definition.blockedReason) { status = "BLOCKED"; actualResult = definition.blockedReason; }
  else if (definition.testTitle && check?.failedTests?.includes(definition.testTitle)) { status = "FAIL"; actualResult = `Test failed: ${definition.testTitle}`; }
  else if (definition.testTitle && check?.passedTests?.includes(definition.testTitle)) { status = definition.successfulTestStatus ?? "TESTED"; actualResult = `Test passed: ${definition.testTitle}`; }
  else if (commandCheck?.status === "FAIL") { status = "FAIL"; actualResult = `Verification command failed: ${commandCheck.command}`; }
  else if (commandCheck?.status === "PASS") { status = definition.successfulTestStatus ?? "TESTED"; actualResult = `Verification command completed successfully: ${commandCheck.command}`; }
  else if (definition.implementation === "NOT_IMPLEMENTED") { status = "NOT_STARTED"; actualResult = "Implementation is not present."; }
  else { status = "NOT_TESTED"; actualResult = definition.note ?? "Implementation is present or partial, but linked evidence has not been recorded."; }
  return { requirementId: definition.id, status, implementationStatus: definition.implementation, testExecutionStatus, method: definition.verificationMethod, actualResult, evidenceReference: definition.evidenceReference, ...(check?.completedAt ?? commandCheck?.completedAt ? { testedAt: check?.completedAt ?? commandCheck?.completedAt } : {}), remediation: definition.remediation, critical: definition.critical, ...(definition.note ? { note: definition.note } : {}) };
}

export function makeChecklist(run?: VerificationRun, reviewCount = 0) {
  const items = VERIFICATION_SECTIONS.map((definition) => ({ ...definition, ...statusFor(definition, run) }));
  const statuses: TechnicalStatus[] = ["NOT_STARTED", "IMPLEMENTED", "TESTED", "PASS", "FAIL", "BLOCKED", "NOT_TESTED"];
  const counts = Object.fromEntries(statuses.map((status) => [status, items.filter((item) => item.status === status).length])) as Record<TechnicalStatus, number>;
  const criticalIssues = items.filter((item) => item.critical && item.status !== "PASS");
  const incompleteModules = items.filter((item) => item.implementation !== "IMPLEMENTED" || item.status !== "PASS").map(({ id, sectionTitle, requirement, implementation, status, actualResult, evidenceReference, testedAt }) => ({ id, sectionTitle, requirement, implementationStatus: implementation, status, actualResult, evidenceReference, ...(testedAt ? { testedAt } : {}) }));
  const railwayVerification = items.find((item) => item.id === "railway-db-security-1");
  return { version: run?.version ?? "life-verification-1.0.0", sections: VERIFICATION_SECTION_META.map((section) => ({ ...section, items: items.filter((item) => item.sectionId === section.id) })), items, counts, total: items.length, reviewed: reviewCount, evidenceCompleteness: items.length ? Math.round(items.filter((item) => ["PASS", "TESTED", "FAIL"].includes(item.status)).length / items.length * 100) : 0, releaseReady: criticalIssues.length === 0, criticalIssues: criticalIssues.map(({ id, requirement, status, remediation }) => ({ id, requirement, status, remediation })), incompleteModules, railwayVerification: railwayVerification ? { id: railwayVerification.id, status: railwayVerification.status, implementationStatus: railwayVerification.implementation, testExecutionStatus: railwayVerification.testExecutionStatus, actualResult: railwayVerification.actualResult, evidenceReference: railwayVerification.evidenceReference, ...(railwayVerification.testedAt ? { testedAt: railwayVerification.testedAt } : {}) } : null, lastRun: run ?? null };
}
