-- Add persisted user preferences for account-level settings.
CREATE TABLE "user_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notifications" JSONB NOT NULL DEFAULT '{"email":true,"push":false,"marketing":false}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

ALTER TABLE "user_preferences"
ADD CONSTRAINT "user_preferences_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
