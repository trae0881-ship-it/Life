CREATE TYPE "AstrologyReportType" AS ENUM ('VEDIC', 'KP', 'COMBINED');

ALTER TABLE "SavedChart"
  ADD COLUMN "reportType" "AstrologyReportType" NOT NULL DEFAULT 'VEDIC',
  ADD COLUMN "availableChartCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "SavedChart" AS saved
SET
  "reportType" = CASE
    WHEN jsonb_typeof(saved."result"->'kp') = 'object' THEN 'COMBINED'::"AstrologyReportType"
    ELSE 'VEDIC'::"AstrologyReportType"
  END,
  "availableChartCount" = (
    CASE
      WHEN jsonb_typeof(saved."result"->'planets') = 'array'
        AND jsonb_array_length(saved."result"->'planets') > 0 THEN 1
      ELSE 0
    END
    + CASE
      WHEN jsonb_typeof(saved."result"->'divisionalCharts') = 'object' THEN (
        SELECT COUNT(*)::INTEGER
        FROM jsonb_each(saved."result"->'divisionalCharts') AS division(key, value)
        WHERE jsonb_typeof(division.value) = 'array'
          AND CASE
            WHEN jsonb_typeof(division.value) = 'array' THEN jsonb_array_length(division.value) > 0
            ELSE FALSE
          END
      )
      ELSE 0
    END
  );

CREATE INDEX "SavedChart_userId_reportType_createdAt_idx"
  ON "SavedChart"("userId", "reportType", "createdAt");

ALTER TABLE "KundliQuestion"
  ADD COLUMN "sectionKey" VARCHAR(60),
  ADD COLUMN "sectionLabel" VARCHAR(100);

CREATE INDEX "KundliQuestion_userId_savedChartId_sectionKey_createdAt_idx"
  ON "KundliQuestion"("userId", "savedChartId", "sectionKey", "createdAt");

ALTER TYPE "SuperAdminAccessAction" ADD VALUE IF NOT EXISTS 'KUNDALI_REPORT_LIST_READ';
ALTER TYPE "SuperAdminAccessAction" ADD VALUE IF NOT EXISTS 'KUNDALI_REPORT_DETAIL_READ';
