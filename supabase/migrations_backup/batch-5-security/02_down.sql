-- ============================================================================
-- BATCH 5 SECURITY REMEDIATION: DOWN MIGRATION (ROLLBACK)
-- ============================================================================
-- Safely removes all objects created in the up migration
-- Uses IF EXISTS to ensure idempotency
-- ============================================================================

-- Drop RLS policies first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_events'
    AND policyname = 'Service role can create security events'
  ) THEN
    DROP POLICY "Service role can create security events" ON security_events;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_events'
    AND policyname = 'Service role can view all security events'
  ) THEN
    DROP POLICY "Service role can view all security events" ON security_events;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'session_invites'
    AND policyname = 'Service role can manage all invites'
  ) THEN
    DROP POLICY "Service role can manage all invites" ON session_invites;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'session_invites'
    AND policyname = 'Users can view invites they created'
  ) THEN
    DROP POLICY "Users can view invites they created" ON session_invites;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'livekit_rooms'
    AND policyname = 'Service role can manage all room mappings'
  ) THEN
    DROP POLICY "Service role can manage all room mappings" ON livekit_rooms;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'livekit_rooms'
    AND policyname = 'Users can view their own room mappings'
  ) THEN
    DROP POLICY "Users can view their own room mappings" ON livekit_rooms;
  END IF;
END $$;

-- Drop functions
DROP FUNCTION IF EXISTS expire_old_invite_codes();

-- Drop tables (CASCADE will remove foreign keys)
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS session_invites CASCADE;
DROP TABLE IF EXISTS livekit_rooms CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS security_event_type CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
-- All Batch 5 security tables, policies, and types have been removed.
-- To reapply these changes, run 01_up.sql again.
-- ============================================================================
