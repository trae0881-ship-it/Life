CREATE TABLE "SavedAstrologyReading" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "service" VARCHAR(32) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SavedAstrologyReading_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SavedAstrologyReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SavedAstrologyReading_userId_service_createdAt_idx"
  ON "SavedAstrologyReading"("userId", "service", "createdAt");
