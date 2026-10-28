ALTER TABLE "User"
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

CREATE TABLE "KundliQuestion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT,
  "savedChartId" TEXT,
  "requestId" TEXT NOT NULL,
  "question" VARCHAR(500) NOT NULL,
  "questionId" TEXT,
  "topic" TEXT,
  "answer" JSONB NOT NULL,
  "answerStatus" TEXT NOT NULL,
  "chartResultHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KundliQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KundliQuestion_userId_requestId_key"
  ON "KundliQuestion"("userId", "requestId");
CREATE INDEX "KundliQuestion_userId_createdAt_idx"
  ON "KundliQuestion"("userId", "createdAt");
CREATE INDEX "KundliQuestion_userId_topic_createdAt_idx"
  ON "KundliQuestion"("userId", "topic", "createdAt");

ALTER TABLE "KundliQuestion" ADD CONSTRAINT "KundliQuestion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KundliQuestion" ADD CONSTRAINT "KundliQuestion_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "BirthProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KundliQuestion" ADD CONSTRAINT "KundliQuestion_savedChartId_fkey"
  FOREIGN KEY ("savedChartId") REFERENCES "SavedChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
