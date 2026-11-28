CREATE TYPE "ApiProductStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'INACTIVE',
  'SUSPENDED'
);

ALTER TABLE "ApiProduct"
  ADD COLUMN "developerUserId" TEXT,
  ADD COLUMN "category" VARCHAR(60),
  ADD COLUMN "pricingModel" VARCHAR(80),
  ADD COLUMN "status" "ApiProductStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "rejectionReason" VARCHAR(1000);

UPDATE "ApiProduct"
SET "status" = CASE WHEN "enabled" THEN 'ACTIVE'::"ApiProductStatus" ELSE 'INACTIVE'::"ApiProductStatus" END;

CREATE INDEX "ApiProduct_developerUserId_status_idx" ON "ApiProduct"("developerUserId", "status");
CREATE INDEX "ApiProduct_status_createdAt_idx" ON "ApiProduct"("status", "createdAt");

ALTER TABLE "ApiProduct"
  ADD CONSTRAINT "ApiProduct_developerUserId_fkey"
  FOREIGN KEY ("developerUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
