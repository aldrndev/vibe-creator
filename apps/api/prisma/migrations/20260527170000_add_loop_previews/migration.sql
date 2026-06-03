-- CreateEnum
CREATE TYPE "LoopPreviewStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "loop_previews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" "LoopPreviewStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT NOT NULL DEFAULT 'QUEUED',
    "render_spec" JSONB NOT NULL,
    "local_path" TEXT,
    "error_message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "loop_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loop_previews_userId_fingerprint_status_expires_at_idx" ON "loop_previews"("userId", "fingerprint", "status", "expires_at");

-- CreateIndex
CREATE INDEX "loop_previews_projectId_idx" ON "loop_previews"("projectId");

-- CreateIndex
CREATE INDEX "loop_previews_status_expires_at_idx" ON "loop_previews"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "loop_previews" ADD CONSTRAINT "loop_previews_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loop_previews" ADD CONSTRAINT "loop_previews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
