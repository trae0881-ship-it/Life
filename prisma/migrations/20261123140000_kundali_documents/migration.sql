CREATE TYPE "KundaliProcessingStatus" AS ENUM ('MANUAL_REVIEW_REQUIRED');

CREATE TABLE "KundaliDocument" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentType" VARCHAR(32) NOT NULL,
  "fileExtension" VARCHAR(8) NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "processingStatus" "KundaliProcessingStatus" NOT NULL DEFAULT 'MANUAL_REVIEW_REQUIRED',
  "originalFile" BYTEA NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KundaliDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KundaliDocument_fileSizeBytes_check" CHECK ("fileSizeBytes" > 0 AND "fileSizeBytes" <= 10485760)
);

CREATE UNIQUE INDEX "KundaliDocument_userId_key" ON "KundaliDocument"("userId");

ALTER TABLE "KundaliDocument"
  ADD CONSTRAINT "KundaliDocument_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KundaliDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KundaliDocument" FORCE ROW LEVEL SECURITY;

CREATE POLICY "KundaliDocument_owner_isolation"
  ON "KundaliDocument"
  USING ("userId" = current_setting('life.user_id', true))
  WITH CHECK ("userId" = current_setting('life.user_id', true));
