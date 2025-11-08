-- Migration: Add Token Refresh Mechanism to Mechanic Sessions
-- Priority 5: Implement Token Refresh for Mechanics
-- Date: 2025-10-27
--
-- Changes:
-- 1. Add refresh_token column (30-day refresh token)
-- 2. Add refresh_expires_at column (expiration for refresh token)
-- 3. Add last_activity column (track session activity for monitoring)
--
-- This migration supports the new token refresh mechanism where:
-- - Access tokens (token column) expire after 2 hours
-- - Refresh tokens are valid for 30 days
-- - Refresh endpoint can exchange valid refresh tokens for new access tokens

-- Add refresh token column (nullable for backwards compatibility with existing sessions)
ALTER TABLE mechanic_sessions
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Add refresh token expiration column (nullable for backwards compatibility)
ALTER TABLE mechanic_sessions
ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMP WITH TIME ZONE;

-- Add last activity tracking column (nullable for backwards compatibility)
ALTER TABLE mechanic_sessions
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on refresh_token for efficient lookups during token refresh
CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_refresh_token
ON mechanic_sessions(refresh_token)
WHERE refresh_token IS NOT NULL;

-- Update existing sessions to set last_activity to created_at (or NOW() if no created_at)
UPDATE mechanic_sessions
SET last_activity = COALESCE(created_at, NOW())
WHERE last_activity IS NULL;

-- Comments for documentation
COMMENT ON COLUMN mechanic_sessions.refresh_token IS 'Long-lived refresh token (30 days) used to obtain new access tokens';
COMMENT ON COLUMN mechanic_sessions.refresh_expires_at IS 'Expiration timestamp for the refresh token';
COMMENT ON COLUMN mechanic_sessions.last_activity IS 'Last activity timestamp for session monitoring and cleanup';
