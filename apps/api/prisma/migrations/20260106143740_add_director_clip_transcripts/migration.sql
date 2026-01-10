-- CreateEnum
CREATE TYPE "DirectorStep" AS ENUM ('IMPORT', 'ANALYZING', 'PICKING', 'EDITING', 'EXPORTING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DirectorAssetOrigin" AS ENUM ('UPLOAD', 'URL_IMPORT');

-- CreateEnum
CREATE TYPE "DirectorIngestStatus" AS ENUM ('UPLOADING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "DirectorJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobType" ADD VALUE 'DIRECTOR_ANALYSIS';
ALTER TYPE "JobType" ADD VALUE 'DIRECTOR_TRANSCRIBE';
ALTER TYPE "JobType" ADD VALUE 'DIRECTOR_EXPORT';

-- CreateTable
CREATE TABLE "director_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" "DirectorStep" NOT NULL DEFAULT 'IMPORT',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "director_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_assets" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentHash" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "origin" "DirectorAssetOrigin" NOT NULL,
    "sourceUrlNormalized" TEXT,
    "ingestStatus" "DirectorIngestStatus" NOT NULL DEFAULT 'UPLOADING',
    "durationMs" INTEGER,
    "thumbnailStorageKey" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "director_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_analysis_jobs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "bullmqJobId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "DirectorJobStatus" NOT NULL DEFAULT 'PENDING',
    "config" JSONB NOT NULL DEFAULT '{}',
    "metrics" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "director_analysis_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_clip_candidates" (
    "id" TEXT NOT NULL,
    "analysisJobId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "tags" TEXT[],
    "score" DOUBLE PRECISION,
    "rank" INTEGER NOT NULL,
    "previewStorageKey" TEXT,
    "videoPreviewStorageKey" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "director_clip_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_selected_clips" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "trimStartMs" INTEGER NOT NULL DEFAULT 0,
    "trimEndMs" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "director_selected_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_transcribe_jobs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "bullmqJobId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "DirectorJobStatus" NOT NULL DEFAULT 'PENDING',
    "engine" TEXT,
    "language" TEXT,
    "segments" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "director_transcribe_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_subtitle_styles" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fontToken" TEXT NOT NULL DEFAULT 'font-default',
    "textColorToken" TEXT NOT NULL DEFAULT 'text-white',
    "bgColorToken" TEXT NOT NULL DEFAULT 'bg-overlay',
    "fontSize" INTEGER NOT NULL DEFAULT 32,
    "position" TEXT NOT NULL DEFAULT 'bottom',
    "animation" TEXT NOT NULL DEFAULT 'fade',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "director_subtitle_styles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_export_jobs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "bullmqJobId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "DirectorJobStatus" NOT NULL DEFAULT 'PENDING',
    "aspectRatio" TEXT NOT NULL DEFAULT '9:16',
    "quality" TEXT NOT NULL DEFAULT '1080p',
    "includeSubtitles" BOOLEAN NOT NULL DEFAULT true,
    "outputStorageKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "director_export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director_clip_transcripts" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "selected_clip_id" TEXT NOT NULL,
    "status" "DirectorJobStatus" NOT NULL DEFAULT 'PENDING',
    "language" TEXT,
    "engine" TEXT NOT NULL DEFAULT 'WHISPER_LOCAL',
    "segments" JSONB,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "director_clip_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "director_sessions_userId_idx" ON "director_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "director_assets_sessionId_key" ON "director_assets"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "director_analysis_jobs_sessionId_key" ON "director_analysis_jobs"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "director_analysis_jobs_idempotencyKey_key" ON "director_analysis_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "director_clip_candidates_analysisJobId_idx" ON "director_clip_candidates"("analysisJobId");

-- CreateIndex
CREATE INDEX "director_selected_clips_sessionId_idx" ON "director_selected_clips"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "director_transcribe_jobs_sessionId_key" ON "director_transcribe_jobs"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "director_transcribe_jobs_idempotencyKey_key" ON "director_transcribe_jobs"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "director_subtitle_styles_sessionId_key" ON "director_subtitle_styles"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "director_export_jobs_sessionId_key" ON "director_export_jobs"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "director_export_jobs_idempotencyKey_key" ON "director_export_jobs"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "director_clip_transcripts_selected_clip_id_key" ON "director_clip_transcripts"("selected_clip_id");

-- CreateIndex
CREATE INDEX "director_clip_transcripts_session_id_idx" ON "director_clip_transcripts"("session_id");

-- AddForeignKey
ALTER TABLE "director_sessions" ADD CONSTRAINT "director_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_assets" ADD CONSTRAINT "director_assets_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "director_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_analysis_jobs" ADD CONSTRAINT "director_analysis_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "director_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_clip_candidates" ADD CONSTRAINT "director_clip_candidates_analysisJobId_fkey" FOREIGN KEY ("analysisJobId") REFERENCES "director_analysis_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_selected_clips" ADD CONSTRAINT "director_selected_clips_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "director_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_selected_clips" ADD CONSTRAINT "director_selected_clips_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "director_clip_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_transcribe_jobs" ADD CONSTRAINT "director_transcribe_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "director_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_subtitle_styles" ADD CONSTRAINT "director_subtitle_styles_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "director_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_export_jobs" ADD CONSTRAINT "director_export_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "director_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_clip_transcripts" ADD CONSTRAINT "director_clip_transcripts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "director_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_clip_transcripts" ADD CONSTRAINT "director_clip_transcripts_selected_clip_id_fkey" FOREIGN KEY ("selected_clip_id") REFERENCES "director_selected_clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
