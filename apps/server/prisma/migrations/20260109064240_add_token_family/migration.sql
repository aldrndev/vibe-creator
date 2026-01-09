-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "parentTokenId" TEXT,
ADD COLUMN     "tokenFamily" TEXT;

-- CreateIndex
CREATE INDEX "user_sessions_tokenFamily_idx" ON "user_sessions"("tokenFamily");

-- CreateIndex
CREATE INDEX "user_sessions_parentTokenId_idx" ON "user_sessions"("parentTokenId");
