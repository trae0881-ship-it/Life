CREATE TABLE "ChecklistRequirementDefinition" (
  "version" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChecklistRequirementDefinition_pkey" PRIMARY KEY ("version", "requirementId")
);

CREATE TABLE "VerificationRun" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "report" JSONB NOT NULL,
  CONSTRAINT "VerificationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationRun_version_completedAt_idx" ON "VerificationRun"("version", "completedAt");

CREATE TABLE "VerificationEvidence" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "implementationStatus" TEXT NOT NULL,
  "testExecutionStatus" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "actualResult" TEXT NOT NULL,
  "evidenceReference" TEXT,
  "testedAt" TIMESTAMP(3),
  "details" TEXT,
  "remediation" TEXT,
  CONSTRAINT "VerificationEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerificationEvidence_runId_fkey" FOREIGN KEY ("runId") REFERENCES "VerificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VerificationEvidence_runId_requirementId_key" ON "VerificationEvidence"("runId", "requirementId");
CREATE INDEX "VerificationEvidence_requirementId_testedAt_idx" ON "VerificationEvidence"("requirementId", "testedAt");

CREATE TABLE "VerificationStatusHistory" (
  "id" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "runId" TEXT,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationStatusHistory_requirementId_changedAt_idx" ON "VerificationStatusHistory"("requirementId", "changedAt");

CREATE TABLE "VerificationAcknowledgement" (
  "id" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "reviewer" TEXT NOT NULL,
  "note" TEXT,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationAcknowledgement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VerificationAcknowledgement_requirementId_reviewer_key" ON "VerificationAcknowledgement"("requirementId", "reviewer");
CREATE INDEX "VerificationAcknowledgement_acknowledgedAt_idx" ON "VerificationAcknowledgement"("acknowledgedAt");
