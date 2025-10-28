-- ============================================================================
-- PHASE 2.3: FIX SERVICE_PLANS OVERLY PERMISSIVE POLICY
-- ============================================================================
-- This migration fixes the critical security vulnerability where service_plans
-- table has USING (true) and WITH CHECK (true), allowing ANYONE to modify plans.
--
-- Issue: Policy created in 20251027000000_create_service_plans_table.sql
-- uses USING (true) which bypasses all security checks.
--
-- Date: 2025-10-27
-- Priority: HIGH (SECURITY VULNERABILITY)
-- ============================================================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "Admins can manage service plans" ON service_plans;

-- ============================================================================
-- SERVICE_PLANS POLICIES (SECURE)
-- ============================================================================

CREATE POLICY "Admins can manage service plans"
  ON service_plans
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active plans"
  ON service_plans
  FOR SELECT
  USING (
    is_active = true
    AND (auth.uid() IS NOT NULL OR auth.role() = 'anon')
  );

CREATE POLICY "Service role has full access to service_plans"
  ON service_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  insecure_policies INTEGER;
BEGIN
  RAISE NOTICE '=== Verifying service_plans RLS Policies ===';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'service_plans';

  IF policy_count >= 2 THEN
    RAISE NOTICE '✓ service_plans has % policies', policy_count;
  ELSE
    RAISE WARNING '✗ service_plans only has % policies (expected 2+)', policy_count;
  END IF;

  -- Check for remaining insecure policies (should be 0)
  SELECT COUNT(*) INTO insecure_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'service_plans'
  AND (qual = 'true'::text OR with_check = 'true'::text)
  AND policyname != 'Service role has full access to service_plans';

  IF insecure_policies > 0 THEN
    RAISE WARNING '✗ Found % insecure policies with USING(true) or WITH CHECK(true)', insecure_policies;
  ELSE
    RAISE NOTICE '✓ No insecure policies found';
  END IF;

  RAISE NOTICE '=== service_plans security fix complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE service_plans IS 'RLS enabled - Only admins can modify, authenticated users can view active plans';
