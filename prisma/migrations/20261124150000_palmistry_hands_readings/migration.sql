CREATE TYPE "PalmistryHandSide" AS ENUM ('LEFT', 'RIGHT');

ALTER TABLE "PalmistryRecord"
  ALTER COLUMN "contentType" DROP NOT NULL,
  ALTER COLUMN "fileExtension" DROP NOT NULL,
  ALTER COLUMN "fileSizeBytes" DROP NOT NULL,
  ALTER COLUMN "originalFile" DROP NOT NULL;

ALTER TABLE "PalmistryRecord"
  ADD CONSTRAINT "PalmistryRecord_legacy_file_fields_check"
  CHECK (
    ("contentType" IS NULL AND "fileExtension" IS NULL AND "fileSizeBytes" IS NULL AND "originalFile" IS NULL)
    OR
    ("contentType" IS NOT NULL AND "fileExtension" IS NOT NULL AND "fileSizeBytes" IS NOT NULL AND "originalFile" IS NOT NULL)
  );

CREATE TABLE "PalmistryHandImage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "handSide" "PalmistryHandSide" NOT NULL,
  "contentType" VARCHAR(32) NOT NULL,
  "fileExtension" VARCHAR(8) NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "originalFile" BYTEA NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PalmistryHandImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PalmistryHandImage_fileSizeBytes_check" CHECK ("fileSizeBytes" > 0 AND "fileSizeBytes" <= 10485760)
);

CREATE UNIQUE INDEX "PalmistryHandImage_userId_handSide_key"
  ON "PalmistryHandImage"("userId", "handSide");
CREATE INDEX "PalmistryHandImage_updatedAt_idx" ON "PalmistryHandImage"("updatedAt");

ALTER TABLE "PalmistryHandImage"
  ADD CONSTRAINT "PalmistryHandImage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PalmistryHandImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PalmistryHandImage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "PalmistryHandImage_owner_select"
  ON "PalmistryHandImage"
  FOR SELECT
  USING ("userId" = current_setting('life.user_id', true));

CREATE POLICY "PalmistryHandImage_owner_insert"
  ON "PalmistryHandImage"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('life.user_id', true));

CREATE POLICY "PalmistryHandImage_owner_update"
  ON "PalmistryHandImage"
  FOR UPDATE
  USING ("userId" = current_setting('life.user_id', true))
  WITH CHECK ("userId" = current_setting('life.user_id', true));

CREATE POLICY "PalmistryHandImage_owner_delete"
  ON "PalmistryHandImage"
  FOR DELETE
  USING ("userId" = current_setting('life.user_id', true));

CREATE TABLE "PalmistryReading" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "observations" JSONB NOT NULL,
  "report" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PalmistryReading_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PalmistryReading_userId_createdAt_idx"
  ON "PalmistryReading"("userId", "createdAt");

ALTER TABLE "PalmistryReading"
  ADD CONSTRAINT "PalmistryReading_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PalmistryReading" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PalmistryReading" FORCE ROW LEVEL SECURITY;

CREATE POLICY "PalmistryReading_owner_select"
  ON "PalmistryReading"
  FOR SELECT
  USING ("userId" = current_setting('life.user_id', true));

CREATE POLICY "PalmistryReading_owner_insert"
  ON "PalmistryReading"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('life.user_id', true));

CREATE POLICY "PalmistryReading_owner_delete"
  ON "PalmistryReading"
  FOR DELETE
  USING ("userId" = current_setting('life.user_id', true));
