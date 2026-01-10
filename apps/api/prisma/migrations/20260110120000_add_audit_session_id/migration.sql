-- Add session_id to audit logs for request/session correlation

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "session_id" VARCHAR;

CREATE INDEX IF NOT EXISTS "idx_audit_logs_session_id" ON "audit_logs"("session_id");
