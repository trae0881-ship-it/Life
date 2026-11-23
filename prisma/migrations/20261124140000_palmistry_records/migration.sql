CREATE TABLE "PalmistryRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentType" VARCHAR(32) NOT NULL,
  "fileExtension" VARCHAR(8) NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "originalFile" BYTEA NOT NULL,
  "observations" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PalmistryRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PalmistryRecord_fileSizeBytes_check" CHECK ("fileSizeBytes" > 0 AND "fileSizeBytes" <= 10485760)
);

CREATE UNIQUE INDEX "PalmistryRecord_userId_key" ON "PalmistryRecord"("userId");
CREATE INDEX "PalmistryRecord_updatedAt_idx" ON "PalmistryRecord"("updatedAt");

ALTER TABLE "PalmistryRecord"
  ADD CONSTRAINT "PalmistryRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PalmistryRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PalmistryRecord" FORCE ROW LEVEL SECURITY;

CREATE POLICY "PalmistryRecord_owner_select"
  ON "PalmistryRecord"
  FOR SELECT
  USING ("userId" = current_setting('life.user_id', true));

CREATE POLICY "PalmistryRecord_owner_insert"
  ON "PalmistryRecord"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('life.user_id', true));

CREATE POLICY "PalmistryRecord_owner_update"
  ON "PalmistryRecord"
  FOR UPDATE
  USING ("userId" = current_setting('life.user_id', true))
  WITH CHECK ("userId" = current_setting('life.user_id', true));

CREATE POLICY "PalmistryRecord_owner_delete"
  ON "PalmistryRecord"
  FOR DELETE
  USING ("userId" = current_setting('life.user_id', true));
