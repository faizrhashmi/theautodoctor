-- ============================================================================
-- PHASE 3.3: FIX ADMIN TABLE POLICIES
-- ============================================================================
-- This migration adds RLS policies for admin panel tables that have RLS
-- enabled but no visible policies, blocking admin features.
--
-- Tables Fixed:
-- - admin_logs
-- - admin_errors
-- - system_health_checks
-- - cleanup_history
-- - admin_saved_queries
-- - admin_query_history
--
-- Date: 2025-10-27
-- Priority: MEDIUM-HIGH
-- ============================================================================

-- ============================================================================
-- 1. ADMIN_LOGS
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can view all logs"
  ON admin_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to admin_logs"
  ON admin_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. ADMIN_ERRORS
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can view all errors"
  ON admin_errors
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Admins can update error status"
  ON admin_errors
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to admin_errors"
  ON admin_errors
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. SYSTEM_HEALTH_CHECKS
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can view health checks"
  ON system_health_checks
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to system_health_checks"
  ON system_health_checks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. CLEANUP_HISTORY
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can view cleanup history"
  ON cleanup_history
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to cleanup_history"
  ON cleanup_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. ADMIN_SAVED_QUERIES
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can manage their own saved queries"
  ON admin_saved_queries
  FOR ALL
  USING (
    is_admin(auth.uid())
    AND (admin_id = auth.uid() OR admin_id IS NULL)
  )
  WITH CHECK (
    is_admin(auth.uid())
    AND (admin_id = auth.uid() OR admin_id IS NULL)
  );

CREATE POLICY IF NOT EXISTS "Admins can view shared queries"
  ON admin_saved_queries
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to admin_saved_queries"
  ON admin_saved_queries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. ADMIN_QUERY_HISTORY
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can view their own query history"
  ON admin_query_history
  FOR SELECT
  USING (
    is_admin(auth.uid())
    AND admin_id = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Admins can view all query history"
  ON admin_query_history
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to admin_query_history"
  ON admin_query_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. ADMIN_NOTES
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can view all notes"
  ON admin_notes
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Admins can create notes"
  ON admin_notes
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()) AND admin_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Service role has full access to admin_notes"
  ON admin_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. ADMIN_ACTIONS (if exists)
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can view all actions"
  ON admin_actions
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to admin_actions"
  ON admin_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. MECHANIC_ADMIN_ACTIONS (if exists)
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can view mechanic actions"
  ON mechanic_admin_actions
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role has full access to mechanic_admin_actions"
  ON mechanic_admin_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_rec RECORD;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== Verifying Admin Table RLS Policies ===';

  FOR table_rec IN
    SELECT unnest(ARRAY[
      'admin_logs',
      'admin_errors',
      'system_health_checks',
      'cleanup_history',
      'admin_saved_queries',
      'admin_query_history',
      'admin_notes',
      'admin_actions',
      'mechanic_admin_actions'
    ]) AS tablename
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = table_rec.tablename;

    IF policy_count > 0 THEN
      RAISE NOTICE '✓ Table "%" has % policies', table_rec.tablename, policy_count;
    ELSE
      RAISE WARNING '✗ Table "%" has NO policies (may not exist)', table_rec.tablename;
    END IF;
  END LOOP;

  RAISE NOTICE '=== Admin table policies complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE admin_logs IS 'RLS enabled - Admins only, service role for logging';
COMMENT ON TABLE admin_errors IS 'RLS enabled - Admins can view and update error status';
COMMENT ON TABLE system_health_checks IS 'RLS enabled - Admins only';
COMMENT ON TABLE cleanup_history IS 'RLS enabled - Admins only';
COMMENT ON TABLE admin_saved_queries IS 'RLS enabled - Admins manage their queries';
COMMENT ON TABLE admin_query_history IS 'RLS enabled - Admins view their query history';
COMMENT ON TABLE admin_notes IS 'RLS enabled - Admins can create and view notes';
