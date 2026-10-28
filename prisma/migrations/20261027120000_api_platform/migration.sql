CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REVOKED');
CREATE TYPE "ApiUsageWindowType" AS ENUM ('MINUTE', 'DAY', 'MONTH');

CREATE TABLE "ApiProduct" (
  "id" TEXT NOT NULL,
  "slug" VARCHAR(60) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "endpoints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "defaultRequestsPerMinute" INTEGER NOT NULL DEFAULT 30,
  "defaultDailyQuota" INTEGER NOT NULL DEFAULT 1000,
  "defaultMonthlyQuota" INTEGER NOT NULL DEFAULT 30000,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiAccountGrant" (
  "id" TEXT NOT NULL,
  "accountUserId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requestsPerMinute" INTEGER NOT NULL,
  "dailyQuota" INTEGER NOT NULL,
  "monthlyQuota" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "grantedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiAccountGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiAdminPermission" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "maxRequestsPerMinute" INTEGER NOT NULL,
  "maxDailyQuota" INTEGER NOT NULL,
  "maxMonthlyQuota" INTEGER NOT NULL,
  "canManageAccess" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "grantedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiAdminPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "keyId" VARCHAR(24) NOT NULL,
  "digest" VARCHAR(64) NOT NULL,
  "prefix" VARCHAR(32) NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "accountGrantId" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requestsPerMinute" INTEGER NOT NULL,
  "dailyQuota" INTEGER NOT NULL,
  "monthlyQuota" INTEGER NOT NULL,
  "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "rotatedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKeyUsageWindow" (
  "id" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "windowType" "ApiUsageWindowType" NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiKeyUsageWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiAccountUsageWindow" (
  "id" TEXT NOT NULL,
  "accountUserId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "windowType" "ApiUsageWindowType" NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiAccountUsageWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKeyAuditLog" (
  "id" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" VARCHAR(30) NOT NULL,
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKeyAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiPlatformAuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "targetType" VARCHAR(40) NOT NULL,
  "targetId" VARCHAR(120) NOT NULL,
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiPlatformAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiProduct_slug_key" ON "ApiProduct"("slug");
CREATE INDEX "ApiProduct_enabled_name_idx" ON "ApiProduct"("enabled", "name");
CREATE UNIQUE INDEX "ApiAccountGrant_accountUserId_productId_key" ON "ApiAccountGrant"("accountUserId", "productId");
CREATE INDEX "ApiAccountGrant_productId_enabled_idx" ON "ApiAccountGrant"("productId", "enabled");
CREATE UNIQUE INDEX "ApiAdminPermission_adminUserId_productId_key" ON "ApiAdminPermission"("adminUserId", "productId");
CREATE INDEX "ApiAdminPermission_productId_enabled_idx" ON "ApiAdminPermission"("productId", "enabled");
CREATE UNIQUE INDEX "ApiKey_keyId_key" ON "ApiKey"("keyId");
CREATE UNIQUE INDEX "ApiKey_digest_key" ON "ApiKey"("digest");
CREATE UNIQUE INDEX "ApiKey_ownerUserId_label_key" ON "ApiKey"("ownerUserId", "label");
CREATE INDEX "ApiKey_ownerUserId_status_idx" ON "ApiKey"("ownerUserId", "status");
CREATE INDEX "ApiKey_productId_status_idx" ON "ApiKey"("productId", "status");
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");
CREATE UNIQUE INDEX "ApiKeyUsageWindow_apiKeyId_windowType_windowStart_key" ON "ApiKeyUsageWindow"("apiKeyId", "windowType", "windowStart");
CREATE INDEX "ApiKeyUsageWindow_apiKeyId_windowStart_idx" ON "ApiKeyUsageWindow"("apiKeyId", "windowStart");
CREATE UNIQUE INDEX "ApiAccountUsageWindow_accountUserId_productId_windowType_windowStart_key" ON "ApiAccountUsageWindow"("accountUserId", "productId", "windowType", "windowStart");
CREATE INDEX "ApiAccountUsageWindow_accountUserId_productId_windowStart_idx" ON "ApiAccountUsageWindow"("accountUserId", "productId", "windowStart");
CREATE INDEX "ApiKeyAuditLog_apiKeyId_createdAt_idx" ON "ApiKeyAuditLog"("apiKeyId", "createdAt");
CREATE INDEX "ApiKeyAuditLog_actorUserId_createdAt_idx" ON "ApiKeyAuditLog"("actorUserId", "createdAt");
CREATE INDEX "ApiPlatformAuditLog_targetType_targetId_createdAt_idx" ON "ApiPlatformAuditLog"("targetType", "targetId", "createdAt");
CREATE INDEX "ApiPlatformAuditLog_actorUserId_createdAt_idx" ON "ApiPlatformAuditLog"("actorUserId", "createdAt");

ALTER TABLE "ApiAccountGrant" ADD CONSTRAINT "ApiAccountGrant_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiAccountGrant" ADD CONSTRAINT "ApiAccountGrant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ApiProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiAccountGrant" ADD CONSTRAINT "ApiAccountGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiAdminPermission" ADD CONSTRAINT "ApiAdminPermission_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiAdminPermission" ADD CONSTRAINT "ApiAdminPermission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ApiProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiAdminPermission" ADD CONSTRAINT "ApiAdminPermission_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ApiProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_accountGrantId_fkey" FOREIGN KEY ("accountGrantId") REFERENCES "ApiAccountGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKeyUsageWindow" ADD CONSTRAINT "ApiKeyUsageWindow_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiAccountUsageWindow" ADD CONSTRAINT "ApiAccountUsageWindow_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiAccountUsageWindow" ADD CONSTRAINT "ApiAccountUsageWindow_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ApiProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKeyAuditLog" ADD CONSTRAINT "ApiKeyAuditLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKeyAuditLog" ADD CONSTRAINT "ApiKeyAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiPlatformAuditLog" ADD CONSTRAINT "ApiPlatformAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
