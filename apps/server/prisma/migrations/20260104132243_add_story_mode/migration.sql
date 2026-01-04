/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `export_history` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProjectMode" AS ENUM ('STORY', 'TIMELINE');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('CREATED', 'STARTING', 'LIVE', 'STOPPING', 'STOPPED', 'FAILED', 'ENDED');

-- CreateEnum
CREATE TYPE "StreamStopReason" AS ENUM ('USER_REQUEST', 'AUTO_STOP', 'ERROR', 'ADMIN', 'SERVER_RESTART', 'QUOTA_EXHAUSTED');

-- AlterEnum
ALTER TYPE "PromptType" ADD VALUE 'TIMELAPSE';

-- AlterTable
ALTER TABLE "download_jobs" ADD COLUMN     "localPath" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "export_history" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "downloadUrl" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "localPath" TEXT,
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'QUEUED',
ADD COLUMN     "phaseProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "timelineData" JSONB,
ADD COLUMN     "urlExpiresAt" TIMESTAMP(3),
ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "mode" "ProjectMode" NOT NULL DEFAULT 'TIMELINE',
ADD COLUMN     "story_data" JSONB;

-- CreateTable
CREATE TABLE "payment_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "xenditInvoiceId" TEXT,
    "xenditPaymentId" TEXT,
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_versions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timelineData" JSONB NOT NULL,
    "textOverlays" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" "StreamStatus" NOT NULL DEFAULT 'STARTING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoStopAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "stopReason" "StreamStopReason",
    "durationMinutesBilled" INTEGER,
    "quotaCycleId" TEXT,
    "config" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "stream_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "currentPeriodStartAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodEndAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_quota_cycles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleStartAt" TIMESTAMP(3) NOT NULL,
    "cycleEndAt" TIMESTAMP(3) NOT NULL,
    "quotaMinutesBase" INTEGER NOT NULL,
    "quotaMinutesTopup" INTEGER NOT NULL DEFAULT 0,
    "quotaMinutesUsed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_quota_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'XENDIT',
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_topup_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'XENDIT',
    "providerPaymentId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "appliedToQuotaCycleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_topup_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_history_xenditInvoiceId_key" ON "payment_history"("xenditInvoiceId");

-- CreateIndex
CREATE INDEX "payment_history_userId_idx" ON "payment_history"("userId");

-- CreateIndex
CREATE INDEX "payment_history_status_idx" ON "payment_history"("status");

-- CreateIndex
CREATE INDEX "project_versions_projectId_idx" ON "project_versions"("projectId");

-- CreateIndex
CREATE INDEX "stream_sessions_userId_status_idx" ON "stream_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "stream_sessions_autoStopAt_status_idx" ON "stream_sessions"("autoStopAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_userId_key" ON "billing_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_providerSubscriptionId_key" ON "billing_subscriptions"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "stream_quota_cycles_userId_status_idx" ON "stream_quota_cycles"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stream_quota_cycles_userId_cycleStartAt_cycleEndAt_key" ON "stream_quota_cycles"("userId", "cycleStartAt", "cycleEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_providerEventId_key" ON "payment_events"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "stream_topup_purchases_providerPaymentId_key" ON "stream_topup_purchases"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "export_history_idempotencyKey_key" ON "export_history"("idempotencyKey");

-- CreateIndex
CREATE INDEX "export_history_idempotencyKey_idx" ON "export_history"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_quotaCycleId_fkey" FOREIGN KEY ("quotaCycleId") REFERENCES "stream_quota_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_quota_cycles" ADD CONSTRAINT "stream_quota_cycles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_topup_purchases" ADD CONSTRAINT "stream_topup_purchases_appliedToQuotaCycleId_fkey" FOREIGN KEY ("appliedToQuotaCycleId") REFERENCES "stream_quota_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_topup_purchases" ADD CONSTRAINT "stream_topup_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
