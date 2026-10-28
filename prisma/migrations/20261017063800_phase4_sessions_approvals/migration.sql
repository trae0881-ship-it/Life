CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VerificationApproval" (
  "id" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "note" TEXT,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationApproval_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VerificationApproval_requirementId_userId_key"
  ON "VerificationApproval"("requirementId", "userId");
CREATE INDEX "VerificationApproval_userId_approvedAt_idx"
  ON "VerificationApproval"("userId", "approvedAt");
ALTER TABLE "VerificationApproval" ADD CONSTRAINT "VerificationApproval_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
