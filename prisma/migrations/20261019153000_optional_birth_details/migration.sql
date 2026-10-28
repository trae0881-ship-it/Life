ALTER TABLE "BirthProfile"
  ALTER COLUMN "localTime" DROP NOT NULL,
  ALTER COLUMN "timeZone" DROP NOT NULL,
  ALTER COLUMN "latitude" DROP NOT NULL,
  ALTER COLUMN "longitude" DROP NOT NULL;

ALTER TABLE "BirthProfile"
  ADD COLUMN "birthPlace" TEXT,
  ADD COLUMN "birthTimeAccuracy" TEXT;
