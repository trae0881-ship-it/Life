CREATE TABLE "SeoPageSetting" (
    "path" VARCHAR(180) NOT NULL,
    "settings" JSONB NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPageSetting_pkey" PRIMARY KEY ("path")
);

CREATE TABLE "SeoAuditHistory" (
    "id" VARCHAR(100) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "pagesAudited" INTEGER NOT NULL,
    "record" JSONB NOT NULL,
    "actorUserId" TEXT NOT NULL,

    CONSTRAINT "SeoAuditHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeoPageSetting_updatedAt_idx" ON "SeoPageSetting"("updatedAt");
CREATE INDEX "SeoAuditHistory_completedAt_id_idx" ON "SeoAuditHistory"("completedAt", "id");
CREATE INDEX "SeoAuditHistory_actorUserId_completedAt_idx" ON "SeoAuditHistory"("actorUserId", "completedAt");

ALTER TABLE "SeoPageSetting"
ADD CONSTRAINT "SeoPageSetting_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SeoAuditHistory"
ADD CONSTRAINT "SeoAuditHistory_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
