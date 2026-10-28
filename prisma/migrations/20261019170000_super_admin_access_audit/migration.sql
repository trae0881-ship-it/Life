CREATE TYPE "SuperAdminAccessAction" AS ENUM (
  'USER_LIST_READ',
  'USER_FILTERED_READ'
);

CREATE TABLE "SuperAdminAccessLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" "SuperAdminAccessAction" NOT NULL,
  "page" INTEGER NOT NULL,
  "resultCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuperAdminAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuperAdminAccessLog_actorUserId_createdAt_idx"
  ON "SuperAdminAccessLog"("actorUserId", "createdAt");
CREATE INDEX "SuperAdminAccessLog_createdAt_idx"
  ON "SuperAdminAccessLog"("createdAt");

ALTER TABLE "SuperAdminAccessLog"
  ADD CONSTRAINT "SuperAdminAccessLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
