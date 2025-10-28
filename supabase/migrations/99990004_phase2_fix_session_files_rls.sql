-- ============================================================================
-- PHASE 2.1: FIX SESSION_FILES RLS POLICIES
-- ============================================================================
-- This migration adds RLS policies for session_files table.
-- The table has RLS enabled but no policies, blocking file uploads/downloads.
--
-- Issue: session_files table created in 20251020023736 has RLS enabled
-- but no CREATE POLICY statements.
--
-- Date: 2025-10-27
-- Priority: HIGH
-- ============================================================================

-- ============================================================================
-- SESSION_FILES POLICIES
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Users can upload files to their own sessions"
  ON session_files
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      -- Customer uploading to their session
      session_id IN (
        SELECT id FROM sessions WHERE customer_user_id = auth.uid()
      )
      OR
      -- Mechanic uploading to their assigned session
      session_id IN (
        SELECT id FROM sessions
        WHERE mechanic_id IN (
          SELECT mechanic_id FROM mechanic_sessions
          WHERE token = current_setting('request.cookie.aad_mech', true)
          AND expires_at > now()
        )
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Users can view files from their sessions"
  ON session_files
  FOR SELECT
  USING (
    -- Customer viewing their session files
    session_id IN (
      SELECT id FROM sessions WHERE customer_user_id = auth.uid()
    )
    OR
    -- Mechanic viewing their assigned session files
    session_id IN (
      SELECT id FROM sessions
      WHERE mechanic_id IN (
        SELECT mechanic_id FROM mechanic_sessions
        WHERE token = current_setting('request.cookie.aad_mech', true)
        AND expires_at > now()
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Users can delete their own uploaded files"
  ON session_files
  FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Admins can manage all session files"
  ON session_files
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to session_files"
  ON session_files
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SESSION_RECORDINGS POLICIES (if not already exists)
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Users can view recordings from their sessions"
  ON session_recordings
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE customer_user_id = auth.uid()
      OR mechanic_id IN (
        SELECT mechanic_id FROM mechanic_sessions
        WHERE token = current_setting('request.cookie.aad_mech', true)
        AND expires_at > now()
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can manage all recordings"
  ON session_recordings
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to session_recordings"
  ON session_recordings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== Verifying session_files RLS Policies ===';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'session_files';

  IF policy_count >= 4 THEN
    RAISE NOTICE '✓ session_files has % policies', policy_count;
  ELSE
    RAISE WARNING '✗ session_files only has % policies (expected 4+)', policy_count;
  END IF;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'session_recordings';

  IF policy_count >= 2 THEN
    RAISE NOTICE '✓ session_recordings has % policies', policy_count;
  ELSE
    RAISE WARNING '✗ session_recordings only has % policies (expected 2+)', policy_count;
  END IF;

  RAISE NOTICE '=== session_files RLS configuration complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE session_files IS 'RLS enabled - Users can upload/view files from their own sessions';
COMMENT ON TABLE session_recordings IS 'RLS enabled - Users can view recordings from their sessions';
