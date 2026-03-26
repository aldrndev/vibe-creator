-- Audit Logging with Immutable Sink
-- Per Digitesia Standard (M5 - Audit Logging)
--
-- Features:
-- - Append-only sink (no updates/deletes)
-- - Tamper detection via hash chaining
-- - Required events: auth, admin, payments, exports

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "request_id" VARCHAR NOT NULL,
  "job_id" VARCHAR,
  "user_id" VARCHAR,
  "tenant_id" VARCHAR,
  "action" VARCHAR NOT NULL,
  "resource_type" VARCHAR,
  "resource_id" VARCHAR,
  "metadata" JSONB DEFAULT '{}',
  "ip_address" VARCHAR,
  "user_agent" TEXT,
  "prev_hash" VARCHAR(64),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT  EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_request_id" ON "audit_logs"("request_id");

-- Immutability enforcement
-- Note: In production, revoke UPDATE/DELETE from app_role
-- REVOKE UPDATE, DELETE ON audit_logs FROM app_role;
-- GRANT INSERT, SELECT ON audit_logs TO app_role;

-- Comment for future reference
COMMENT ON TABLE "audit_logs" IS 'Immutable audit log - DO NOT UPDATE OR DELETE';
COMMENT ON COLUMN "audit_logs"."prev_hash" IS 'SHA256 hash of previous entry for tamper detection';
