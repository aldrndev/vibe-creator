DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspension_reason" TEXT;

CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");
