-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'DELETED');

-- AlterTable
ALTER TABLE "projects"
ADD COLUMN "expires_at" TIMESTAMP(3),
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "last_opened_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "lifecycle_status" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "director_sessions"
ADD COLUMN "expires_at" TIMESTAMP(3),
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "last_opened_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "lifecycle_status" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "director_export_jobs"
ADD COLUMN "download_expires_at" TIMESTAMP(3),
ADD COLUMN "output_deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "projects_userId_updatedAt_idx" ON "projects"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "projects_userId_expires_at_idx" ON "projects"("userId", "expires_at");

-- CreateIndex
CREATE INDEX "projects_lifecycle_status_expires_at_idx" ON "projects"("lifecycle_status", "expires_at");

-- CreateIndex
CREATE INDEX "director_sessions_userId_updatedAt_idx" ON "director_sessions"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "director_sessions_userId_expires_at_idx" ON "director_sessions"("userId", "expires_at");

-- CreateIndex
CREATE INDEX "director_sessions_lifecycle_status_expires_at_idx" ON "director_sessions"("lifecycle_status", "expires_at");

-- CreateIndex
CREATE INDEX "director_export_jobs_download_expires_at_idx" ON "director_export_jobs"("download_expires_at");

-- CreateIndex
CREATE INDEX "director_export_jobs_output_deleted_at_idx" ON "director_export_jobs"("output_deleted_at");
