CREATE TABLE IF NOT EXISTS "trending_items" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "platform" VARCHAR NOT NULL,
  "type" VARCHAR NOT NULL,
  "external_id" TEXT NOT NULL,
  "external_url_hash" VARCHAR(64) NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "thumbnail_url" TEXT,
  "external_url" TEXT,
  "rank" INTEGER,
  "metrics" JSONB DEFAULT '{}'::jsonb,
  "category" TEXT,
  "region" VARCHAR(2) NOT NULL,
  "fetched_at" TIMESTAMP(6) NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "trending_items_unique"
  ON "trending_items" ("platform", "type", "region", "external_url_hash");

CREATE INDEX IF NOT EXISTS "idx_trending_items_region_fetched_at"
  ON "trending_items" ("region", "fetched_at");

CREATE INDEX IF NOT EXISTS "idx_trending_items_expires_at"
  ON "trending_items" ("expires_at");

CREATE TABLE IF NOT EXISTS "trending_platform_status" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "platform" VARCHAR NOT NULL,
  "region" VARCHAR(2) NOT NULL,
  "status" VARCHAR NOT NULL,
  "last_success_at" TIMESTAMP(6),
  "last_failure_at" TIMESTAMP(6),
  "error_message" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "trending_platform_status_unique"
  ON "trending_platform_status" ("platform", "region");

CREATE INDEX IF NOT EXISTS "idx_trending_platform_status_region_status"
  ON "trending_platform_status" ("region", "status");
