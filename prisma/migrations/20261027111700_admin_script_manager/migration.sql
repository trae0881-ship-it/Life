CREATE TYPE "ManagedScriptPlacement" AS ENUM ('HEAD', 'BODY_START', 'BODY_END');
CREATE TYPE "ManagedScriptAuditAction" AS ENUM ('CREATED', 'UPDATED', 'ENABLED', 'DISABLED', 'DELETED');

CREATE TABLE "ManagedScript" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "snippet" TEXT NOT NULL,
    "placement" "ManagedScriptPlacement" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "targetPaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedScript_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManagedScriptAuditLog" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "scriptName" VARCHAR(100) NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "ManagedScriptAuditAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedScriptAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagedScript_enabled_placement_idx" ON "ManagedScript"("enabled", "placement");
CREATE INDEX "ManagedScript_updatedAt_idx" ON "ManagedScript"("updatedAt");
CREATE INDEX "ManagedScriptAuditLog_scriptId_createdAt_idx" ON "ManagedScriptAuditLog"("scriptId", "createdAt");
CREATE INDEX "ManagedScriptAuditLog_actorUserId_createdAt_idx" ON "ManagedScriptAuditLog"("actorUserId", "createdAt");
