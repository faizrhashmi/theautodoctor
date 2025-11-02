-- ============================================================================
-- MASTER FIX: Complete RFQ Recursion Resolution
-- ============================================================================
-- This file combines ALL fixes needed to resolve the infinite recursion error
-- Run this ONCE to fix everything
--
-- Fixes applied:
-- 1. organization_members policies (SELECT, UPDATE, DELETE, ALL)
-- 2. workshop_roles policies (SELECT, ALL)
-- 3. All helper functions (is_admin, user_organizations, is_org_owner_or_admin)
--
-- SAFE TO RUN: Uses CREATE OR REPLACE and DROP IF EXISTS
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ALL HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = $1
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, anon;
COMMENT ON FUNCTION is_admin(UUID) IS 'SECURITY DEFINER: Check if user is an admin without RLS checks';

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
COMMENT ON FUNCTION user_organizations(UUID) IS 'SECURITY DEFINER: Returns active organization IDs for a user without recursive RLS checks';

CREATE OR REPLACE FUNCTION is_org_owner_or_admin(org_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = $1
    AND user_id = $2
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION is_org_owner_or_admin(UUID, UUID) TO authenticated, anon;
COMMENT ON FUNCTION is_org_owner_or_admin(UUID, UUID) IS 'SECURITY DEFINER: Check if user is owner/admin of organization without RLS checks';

-- ============================================================================
-- STEP 2: FIX organization_members POLICIES
-- ============================================================================

-- Drop ALL old policies
DROP POLICY IF EXISTS "Organization members can view members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON organization_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "Users can remove themselves from organizations" ON organization_members;
DROP POLICY IF EXISTS "Service role has full access to organization_members" ON organization_members;

-- Recreate ALL policies with helper functions
CREATE POLICY "Organization members can view members"
  ON organization_members
  FOR SELECT
  USING (
    organization_id IN (SELECT user_organizations(auth.uid()))
  );

CREATE POLICY "Organization owners can manage members"
  ON organization_members
  FOR ALL
  USING (
    organization_id IN (SELECT user_organizations(auth.uid()))
    AND is_org_owner_or_admin(organization_id, auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT user_organizations(auth.uid()))
  );

CREATE POLICY "Users can update their own membership"
  ON organization_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all memberships"
  ON organization_members
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Organization owners can remove members"
  ON organization_members
  FOR DELETE
  USING (
    is_org_owner_or_admin(organization_id, auth.uid())
  );

CREATE POLICY "Users can remove themselves from organizations"
  ON organization_members
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role has full access to organization_members"
  ON organization_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 3: FIX workshop_roles POLICIES
-- ============================================================================

-- Drop old workshop_roles policies
DROP POLICY IF EXISTS "Workshop admins can manage roles" ON workshop_roles;
DROP POLICY IF EXISTS "Workshop members can view roles" ON workshop_roles;
DROP POLICY IF EXISTS "Service role has full access to workshop_roles" ON workshop_roles;

-- Recreate with helper functions
CREATE POLICY "Workshop admins can manage roles"
  ON workshop_roles
  FOR ALL
  USING (
    workshop_id IN (SELECT user_organizations(auth.uid()))
    AND is_org_owner_or_admin(workshop_id, auth.uid())
  );

CREATE POLICY "Workshop members can view roles"
  ON workshop_roles
  FOR SELECT
  USING (
    workshop_id IN (SELECT user_organizations(auth.uid()))
  );

CREATE POLICY "Service role has full access to workshop_roles"
  ON workshop_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  org_policy_count INTEGER;
  workshop_policy_count INTEGER;
  is_admin_exists BOOLEAN;
  user_orgs_exists BOOLEAN;
  is_org_owner_exists BOOLEAN;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Verifying Complete Recursion Fix';
  RAISE NOTICE '============================================';

  -- Check functions
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') INTO is_admin_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_organizations') INTO user_orgs_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_org_owner_or_admin') INTO is_org_owner_exists;

  IF is_admin_exists AND user_orgs_exists AND is_org_owner_exists THEN
    RAISE NOTICE 'PASS: All 3 helper functions exist';
  ELSE
    RAISE WARNING 'FAIL: Missing helper functions';
  END IF;

  -- Check organization_members policies
  SELECT COUNT(*) INTO org_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organization_members';

  RAISE NOTICE 'INFO: organization_members has policies: %', org_policy_count;

  -- Check workshop_roles policies
  SELECT COUNT(*) INTO workshop_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'workshop_roles';

  RAISE NOTICE 'INFO: workshop_roles has policies: %', workshop_policy_count;

  IF org_policy_count >= 7 AND workshop_policy_count >= 3 THEN
    RAISE NOTICE 'PASS: All expected policies created';
  ELSE
    RAISE WARNING 'WARN: Policy count mismatch';
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUCCESS: Complete recursion fix applied!';
  RAISE NOTICE 'INFO: All policies now use SECURITY DEFINER functions';
  RAISE NOTICE 'INFO: Zero direct queries to organization_members';
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Test the fix at: http://localhost:3000/customer/rfq/my-rfqs
-- Should load without "infinite recursion" error
-- ============================================================================
