-- ============================================================================
-- PHASE 2.4: FIX ORGANIZATION_MEMBERS RECURSIVE POLICY
-- ============================================================================
-- This migration fixes the recursive policy issue where organization_members
-- policies query organization_members table within the policy definition.
--
-- Issue: "Organization members can view members" queries organization_members
-- within the policy on organization_members, causing potential recursion.
--
-- Solution: Use SECURITY DEFINER function
--
-- Date: 2025-10-27
-- Priority: HIGH
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE SECURITY DEFINER HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION user_organizations(user_id UUID)
RETURNS TABLE(organization_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = $1 AND status = 'active';
$$;

GRANT EXECUTE ON FUNCTION user_organizations(UUID) TO authenticated, anon;

-- ============================================================================
-- STEP 2: DROP AND RECREATE ORGANIZATION_MEMBERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Organization members can view members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;

-- View policy (uses helper function, no recursion)
CREATE POLICY "Organization members can view members"
  ON organization_members
  FOR SELECT
  USING (
    organization_id IN (SELECT user_organizations(auth.uid()))
  );

-- Owner/admin can manage members
CREATE POLICY "Organization owners can manage members"
  ON organization_members
  FOR ALL
  USING (
    organization_id IN (
      SELECT user_organizations(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT user_organizations(auth.uid())
    )
  );

-- Users can update their own membership (e.g., accept invite)
CREATE POLICY "Users can update their own membership"
  ON organization_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all memberships
CREATE POLICY "Admins can view all memberships"
  ON organization_members
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role has full access to organization_members"
  ON organization_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== Verifying organization_members RLS Fix ===';

  -- Check if helper function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_organizations'
  ) INTO function_exists;

  IF function_exists THEN
    RAISE NOTICE '✓ user_organizations() function exists';
  ELSE
    RAISE WARNING '✗ user_organizations() function not found';
  END IF;

  -- Check policy count
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organization_members';

  IF policy_count >= 4 THEN
    RAISE NOTICE '✓ organization_members has % policies', policy_count;
  ELSE
    RAISE WARNING '✗ organization_members only has % policies (expected 4+)', policy_count;
  END IF;

  RAISE NOTICE '=== organization_members recursion fix complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION user_organizations(UUID) IS 'SECURITY DEFINER: Returns active organization IDs for a user without recursive RLS checks';
COMMENT ON TABLE organization_members IS 'RLS enabled - Members can view, owners/admins can manage';
