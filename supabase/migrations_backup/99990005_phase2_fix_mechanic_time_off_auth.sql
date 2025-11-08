-- ============================================================================
-- PHASE 2.2: FIX MECHANIC_TIME_OFF AUTH MECHANISM
-- ============================================================================
-- This migration fixes mechanic_time_off policies that use auth.uid() when
-- mechanics use custom token-based authentication.
--
-- Issue: Policy uses auth.uid() but mechanics authenticate via mechanic_sessions
-- table with custom tokens, not Supabase auth.
--
-- Date: 2025-10-27
-- Priority: HIGH
-- ============================================================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Mechanics can manage their own time off" ON mechanic_time_off;
DROP POLICY IF EXISTS "System can view all time off" ON mechanic_time_off;

-- ============================================================================
-- MECHANIC_TIME_OFF POLICIES (FIXED)
-- ============================================================================

CREATE POLICY "Mechanics can manage their own time off"
  ON mechanic_time_off
  FOR ALL
  USING (
    mechanic_id = get_authenticated_mechanic_id()
  )
  WITH CHECK (
    mechanic_id = get_authenticated_mechanic_id()
  );

CREATE POLICY "Workshops can view time off for their mechanics"
  ON mechanic_time_off
  FOR SELECT
  USING (
    mechanic_id IN (
      SELECT m.id FROM mechanics m
      WHERE m.workshop_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Admins can manage all time off"
  ON mechanic_time_off
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Service role has full access to mechanic_time_off"
  ON mechanic_time_off
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
  RAISE NOTICE '=== Verifying mechanic_time_off RLS Policies ===';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'mechanic_time_off';

  IF policy_count >= 3 THEN
    RAISE NOTICE '✓ mechanic_time_off has % policies', policy_count;
  ELSE
    RAISE WARNING '✗ mechanic_time_off only has % policies (expected 3+)', policy_count;
  END IF;

  RAISE NOTICE '=== mechanic_time_off auth fix complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE mechanic_time_off IS 'RLS enabled - Mechanics manage their own time off via custom auth token';
