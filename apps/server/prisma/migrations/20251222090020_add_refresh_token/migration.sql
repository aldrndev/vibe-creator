/*
  Warnings:

  - A unique constraint covering the columns `[refreshToken]` on the table `user_sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `refreshExpiresAt` to the `user_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `user_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshToken_key" ON "user_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "user_sessions_refreshToken_idx" ON "user_sessions"("refreshToken");
