CREATE TYPE "ApiDeveloperProfileStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "ApiPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ApiSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'SUSPENDED');
CREATE TYPE "ApiPaymentProvider" AS ENUM ('MOCK');
CREATE TYPE "ApiPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED');
CREATE TYPE "ApiInvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'VOID', 'REFUNDED');

CREATE TABLE "ApiDeveloperProfile" (
  "userId" TEXT NOT NULL,
  "status" "ApiDeveloperProfileStatus" NOT NULL DEFAULT 'PENDING',
  "grandfathered" BOOLEAN NOT NULL DEFAULT false,
  "organizationName" VARCHAR(160),
  "website" VARCHAR(2048),
  "supportEmail" VARCHAR(254),
  "description" VARCHAR(2000),
  "applicationReason" VARCHAR(1000),
  "rejectionReason" VARCHAR(1000),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiDeveloperProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "ApiPlan" (
  "id" TEXT NOT NULL,
  "slug" VARCHAR(60) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "status" "ApiPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "priceMinorUnits" BIGINT,
  "currency" VARCHAR(3),
  "taxRateBasisPoints" INTEGER,
  "periodDays" INTEGER,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiPlanProduct" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "requestsPerMinute" INTEGER NOT NULL,
  "dailyQuota" INTEGER NOT NULL,
  "monthlyQuota" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiPlanProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiSubscription" (
  "id" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "developerUserId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "ApiSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "priceMinorUnits" BIGINT,
  "currency" VARCHAR(3),
  "taxRateBasisPoints" INTEGER,
  "periodDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiPayment" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "provider" "ApiPaymentProvider" NOT NULL DEFAULT 'MOCK',
  "status" "ApiPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountMinorUnits" BIGINT NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "isSandbox" BOOLEAN NOT NULL DEFAULT true,
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "providerReference" VARCHAR(200),
  "failureCode" VARCHAR(80),
  "refundedAmountMinorUnits" BIGINT NOT NULL DEFAULT 0,
  "refundReason" VARCHAR(1000),
  "refundRequestedByUserId" TEXT,
  "refundConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiInvoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" VARCHAR(40) NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "paymentId" TEXT,
  "status" "ApiInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "subtotalMinorUnits" BIGINT NOT NULL,
  "taxMinorUnits" BIGINT NOT NULL,
  "totalMinorUnits" BIGINT NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "billingSnapshot" JSONB NOT NULL,
  CONSTRAINT "ApiInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiProviderEvent" (
  "id" TEXT NOT NULL,
  "provider" "ApiPaymentProvider" NOT NULL,
  "providerEventId" VARCHAR(200) NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "payloadHash" VARCHAR(64) NOT NULL,
  "outcome" VARCHAR(100) NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiUsageEvent" (
  "id" TEXT NOT NULL,
  "requestId" VARCHAR(36) NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "developerUserId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "planId" TEXT,
  "endpoint" VARCHAR(120) NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "responseTimeMs" INTEGER NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiPlan_slug_key" ON "ApiPlan"("slug");
CREATE INDEX "ApiPlan_status_createdAt_idx" ON "ApiPlan"("status", "createdAt");
CREATE UNIQUE INDEX "ApiPlanProduct_planId_productId_key" ON "ApiPlanProduct"("planId", "productId");
CREATE INDEX "ApiPlanProduct_productId_planId_idx" ON "ApiPlanProduct"("productId", "planId");
CREATE INDEX "ApiSubscription_developerUserId_status_createdAt_idx" ON "ApiSubscription"("developerUserId", "status", "createdAt");
CREATE UNIQUE INDEX "ApiSubscription_idempotencyKey_key" ON "ApiSubscription"("idempotencyKey");
CREATE INDEX "ApiSubscription_status_currentPeriodEnd_idx" ON "ApiSubscription"("status", "currentPeriodEnd");
CREATE INDEX "ApiSubscription_planId_status_idx" ON "ApiSubscription"("planId", "status");
CREATE UNIQUE INDEX "ApiPayment_idempotencyKey_key" ON "ApiPayment"("idempotencyKey");
CREATE UNIQUE INDEX "ApiPayment_providerReference_key" ON "ApiPayment"("providerReference");
CREATE INDEX "ApiPayment_subscriptionId_createdAt_idx" ON "ApiPayment"("subscriptionId", "createdAt");
CREATE INDEX "ApiPayment_status_createdAt_idx" ON "ApiPayment"("status", "createdAt");
CREATE INDEX "ApiPayment_isSandbox_status_createdAt_idx" ON "ApiPayment"("isSandbox", "status", "createdAt");
CREATE UNIQUE INDEX "ApiInvoice_invoiceNumber_key" ON "ApiInvoice"("invoiceNumber");
CREATE UNIQUE INDEX "ApiInvoice_paymentId_key" ON "ApiInvoice"("paymentId");
CREATE INDEX "ApiInvoice_subscriptionId_issuedAt_idx" ON "ApiInvoice"("subscriptionId", "issuedAt");
CREATE INDEX "ApiInvoice_status_issuedAt_idx" ON "ApiInvoice"("status", "issuedAt");
CREATE UNIQUE INDEX "ApiProviderEvent_provider_providerEventId_key" ON "ApiProviderEvent"("provider", "providerEventId");
CREATE INDEX "ApiProviderEvent_processedAt_provider_idx" ON "ApiProviderEvent"("processedAt", "provider");
CREATE UNIQUE INDEX "ApiUsageEvent_requestId_key" ON "ApiUsageEvent"("requestId");
CREATE INDEX "ApiUsageEvent_developerUserId_occurredAt_idx" ON "ApiUsageEvent"("developerUserId", "occurredAt");
CREATE INDEX "ApiUsageEvent_productId_occurredAt_idx" ON "ApiUsageEvent"("productId", "occurredAt");
CREATE INDEX "ApiUsageEvent_endpoint_occurredAt_idx" ON "ApiUsageEvent"("endpoint", "occurredAt");
CREATE INDEX "ApiUsageEvent_statusCode_occurredAt_idx" ON "ApiUsageEvent"("statusCode", "occurredAt");
CREATE INDEX "ApiUsageEvent_planId_occurredAt_idx" ON "ApiUsageEvent"("planId", "occurredAt");
CREATE INDEX "ApiDeveloperProfile_status_submittedAt_idx" ON "ApiDeveloperProfile"("status", "submittedAt");
CREATE INDEX "ApiDeveloperProfile_reviewedByUserId_reviewedAt_idx" ON "ApiDeveloperProfile"("reviewedByUserId", "reviewedAt");

ALTER TABLE "ApiDeveloperProfile"
  ADD CONSTRAINT "ApiDeveloperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiDeveloperProfile_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApiPlan"
  ADD CONSTRAINT "ApiPlan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiPlan_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ApiPlanProduct"
  ADD CONSTRAINT "ApiPlanProduct_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ApiPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiPlanProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ApiProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ApiSubscription"
  ADD CONSTRAINT "ApiSubscription_developerUserId_fkey" FOREIGN KEY ("developerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ApiPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ApiPayment"
  ADD CONSTRAINT "ApiPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ApiSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiPayment_refundRequestedByUserId_fkey" FOREIGN KEY ("refundRequestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApiInvoice"
  ADD CONSTRAINT "ApiInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ApiSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ApiPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ApiUsageEvent"
  ADD CONSTRAINT "ApiUsageEvent_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiUsageEvent_developerUserId_fkey" FOREIGN KEY ("developerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiUsageEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ApiProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApiUsageEvent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ApiPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ApiDeveloperProfile" ("userId", "status", "grandfathered", "submittedAt", "createdAt", "updatedAt")
SELECT "id", 'VERIFIED', true, "createdAt", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'DEVELOPER'
ON CONFLICT ("userId") DO NOTHING;
