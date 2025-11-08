-- ============================================================================
-- BATCH 5 SECURITY REMEDIATION: UP MIGRATION
-- ============================================================================
-- P0-1: LiveKit room mapping table (remove metadata from JWT)
-- P0-2: Token refresh tracking
-- P0-6: One-time invite codes table
-- P0-4: Security events logging table
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: livekit_rooms
-- Stores server-side mapping of LiveKit rooms to sessions/users
-- Replaces sensitive metadata that was previously in JWT tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS livekit_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_name TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'mechanic')),
  identity TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,

  -- Ensure one user can only join a room once
  CONSTRAINT unique_room_user UNIQUE (room_name, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_livekit_rooms_session_id ON livekit_rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_livekit_rooms_user_id ON livekit_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_livekit_rooms_room_name ON livekit_rooms(room_name);

-- RLS policies
ALTER TABLE livekit_rooms ENABLE ROW LEVEL SECURITY;

-- Users can only see their own room mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'livekit_rooms'
    AND policyname = 'Users can view their own room mappings'
  ) THEN
    CREATE POLICY "Users can view their own room mappings"
      ON livekit_rooms FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role can manage all room mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'livekit_rooms'
    AND policyname = 'Service role can manage all room mappings'
  ) THEN
    CREATE POLICY "Service role can manage all room mappings"
      ON livekit_rooms FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- TABLE 2: session_invites
-- Stores one-time invite codes for joining sessions (replaces token-in-URL)
-- ============================================================================

-- Create enum for invite status if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
    CREATE TYPE invite_status AS ENUM ('pending', 'consumed', 'expired', 'revoked');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS session_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'mechanic')),
  status invite_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_by UUID,
  redeemed_at TIMESTAMPTZ,

  -- Ensure code is uppercase alphanumeric
  CONSTRAINT valid_invite_code CHECK (code ~ '^[A-Z0-9]+$'),

  -- Redeemed codes must have redeemed_by and redeemed_at
  CONSTRAINT redeemed_fields_consistent CHECK (
    (status = 'consumed' AND redeemed_by IS NOT NULL AND redeemed_at IS NOT NULL)
    OR (status != 'consumed' AND redeemed_by IS NULL AND redeemed_at IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_invites_code ON session_invites(code);
CREATE INDEX IF NOT EXISTS idx_session_invites_session_id ON session_invites(session_id);
CREATE INDEX IF NOT EXISTS idx_session_invites_status ON session_invites(status);
CREATE INDEX IF NOT EXISTS idx_session_invites_expires_at ON session_invites(expires_at);

-- RLS policies
ALTER TABLE session_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites they created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'session_invites'
    AND policyname = 'Users can view invites they created'
  ) THEN
    CREATE POLICY "Users can view invites they created"
      ON session_invites FOR SELECT
      USING (auth.uid() = created_by);
  END IF;
END $$;

-- Service role can manage all invites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'session_invites'
    AND policyname = 'Service role can manage all invites'
  ) THEN
    CREATE POLICY "Service role can manage all invites"
      ON session_invites FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- TABLE 3: security_events
-- Logs security-relevant events (malware detection, file validation, etc.)
-- ============================================================================

-- Create enum for event types if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'security_event_type') THEN
    CREATE TYPE security_event_type AS ENUM (
      'file_type_mismatch',
      'file_size_exceeded',
      'malware_detected',
      'malware_scan_failed',
      'unauthorized_access',
      'token_expired',
      'invite_code_invalid',
      'xss_attempt'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type security_event_type NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for timestamp queries
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_session_id ON security_events(session_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);

-- RLS policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can view security events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_events'
    AND policyname = 'Service role can view all security events'
  ) THEN
    CREATE POLICY "Service role can view all security events"
      ON security_events FOR SELECT
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Service role can insert security events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_events'
    AND policyname = 'Service role can create security events'
  ) THEN
    CREATE POLICY "Service role can create security events"
      ON security_events FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically expire old invite codes
CREATE OR REPLACE FUNCTION expire_old_invite_codes()
RETURNS VOID AS $$
BEGIN
  UPDATE session_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE livekit_rooms IS
  'P0-1 FIX: Server-side mapping of LiveKit rooms to sessions/users. Replaces sensitive metadata in JWT tokens.';

COMMENT ON TABLE session_invites IS
  'P0-6 FIX: One-time invite codes for joining sessions. Replaces insecure token-in-URL pattern.';

COMMENT ON TABLE security_events IS
  'P0-4 FIX: Security event logging for malware detection, file validation, and unauthorized access attempts.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
