-- Add production export queue/cache metadata without changing existing rows.
ALTER TABLE "export_history"
ADD COLUMN "exportFingerprint" TEXT,
ADD COLUMN "displayFilename" TEXT,
ADD COLUMN "reusedFromJobId" TEXT,
ADD COLUMN "addWatermark" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "consumeQuotaOnSuccess" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "export_history_userId_exportFingerprint_status_urlExpiresAt_idx"
ON "export_history"("userId", "exportFingerprint", "status", "urlExpiresAt");
