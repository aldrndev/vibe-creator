-- Add project/session links for project-backed live streaming.
ALTER TABLE "stream_sessions"
ADD COLUMN "projectId" TEXT,
ADD COLUMN "sourceAssetId" TEXT;

CREATE INDEX "stream_sessions_projectId_idx" ON "stream_sessions"("projectId");
CREATE INDEX "stream_sessions_sourceAssetId_idx" ON "stream_sessions"("sourceAssetId");

-- Extend stream stop reasons for lifecycle reconciliation and replacement billing.
ALTER TYPE "StreamStopReason" ADD VALUE IF NOT EXISTS 'REPLACED_BY_NEW_STREAM';
ALTER TYPE "StreamStopReason" ADD VALUE IF NOT EXISTS 'PROCESS_LOST';
