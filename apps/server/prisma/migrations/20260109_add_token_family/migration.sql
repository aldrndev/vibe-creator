-- Migration: Add token family model for refresh token replay detection
-- Per Digitesia Standard (digitesia-standard-backend.md § Refresh Rotation & Replay Detection)

-- Add token family tracking fields to user_sessions table
ALTER TABLE user_sessions 
  ADD COLUMN token_family VARCHAR(128),
  ADD COLUMN parent_token_id VARCHAR(128),
  ADD COLUMN consumed_at TIMESTAMP;

-- Add index for efficient family lookup during replay detection
CREATE INDEX idx_user_sessions_token_family ON user_sessions(token_family);

-- Add index for parent token lookup
CREATE INDEX idx_user_sessions_parent_token ON user_sessions(parent_token_id);

-- Comments for documentation
COMMENT ON COLUMN user_sessions.token_family IS 'Family identifier for tracking related refresh tokens';
COMMENT ON COLUMN user_sessions.parent_token_id IS 'ID of the parent token that was rotated to create this token';
COMMENT ON COLUMN user_sessions.consumed_at IS 'Timestamp when refresh token was used (single-use enforcement)';
