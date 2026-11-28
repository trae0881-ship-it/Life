ALTER TABLE "SavedChart"
  ADD COLUMN "divisionalChartCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastViewedAt" TIMESTAMP(3);

UPDATE "SavedChart" AS saved
SET "divisionalChartCount" = CASE
  WHEN jsonb_typeof(saved."result"->'divisionalCharts') = 'object' THEN (
    SELECT COUNT(*)::INTEGER
    FROM jsonb_each(saved."result"->'divisionalCharts') AS division(key, value)
    WHERE division.key <> 'D1'
      AND CASE
        WHEN jsonb_typeof(division.value) = 'array' THEN jsonb_array_length(division.value) > 0
        ELSE FALSE
      END
  )
  ELSE 0
END;

CREATE INDEX "SavedChart_userId_lastViewedAt_idx"
  ON "SavedChart"("userId", "lastViewedAt");
