-- ============================================================================
-- FIX: workshop_roles RLS Policies to Prevent Recursion
-- ============================================================================
-- Problem: workshop_roles policies query organization_members directly
-- This causes recursion when evaluating RFQ policies
--
-- Solution: Use user_organizations() helper function instead
-- ============================================================================

-- Drop old workshop_roles policies
DROP POLICY IF EXISTS "Workshop admins can manage roles" ON workshop_roles;
DROP POLICY IF EXISTS "Workshop members can view roles" ON workshop_roles;
DROP POLICY IF EXISTS "Service role has full access to workshop_roles" ON workshop_roles;

-- Recreate with helper function (non-recursive)
CREATE POLICY "Workshop admins can manage roles"
  ON workshop_roles
  FOR ALL
  USING (
    workshop_id IN (
      SELECT user_organizations(auth.uid())  -- ← Uses helper function
    )
    AND is_org_owner_or_admin(workshop_id, auth.uid())  -- ← Uses helper function!
  );

CREATE POLICY "Workshop members can view roles"
  ON workshop_roles
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT user_organizations(auth.uid())  -- ← Uses helper function!
    )
  );

CREATE POLICY "Service role has full access to workshop_roles"
  ON workshop_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Verifying workshop_roles RLS Fix';
  RAISE NOTICE '============================================';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'workshop_roles';

  RAISE NOTICE 'INFO: workshop_roles has policies: %', policy_count;

  IF policy_count >= 3 THEN
    RAISE NOTICE 'PASS: All expected policies created';
  ELSE
    RAISE WARNING 'WARN: Expected 3+ policies, found: %', policy_count;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUCCESS: workshop_roles recursion fix complete!';
  RAISE NOTICE '============================================';
END $$;
