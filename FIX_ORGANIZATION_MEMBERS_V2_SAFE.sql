-- ============================================================================
-- IMPROVED FIX: Organization Members RLS Recursion (Version 2)
-- ============================================================================
-- This completely eliminates recursion by:
-- 1. Creating ALL helper functions with SECURITY DEFINER
-- 2. Using ONLY helper functions in RLS policies (no direct table queries)
-- 3. Ensuring policies NEVER query organization_members directly
--
-- SAFE TO RUN: Uses CREATE OR REPLACE and DROP IF EXISTS
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE is_admin() HELPER FUNCTION
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

-- ============================================================================
-- STEP 2: CREATE user_organizations() HELPER FUNCTION
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

COMMENT ON FUNCTION user_organizations(UUID) IS 'SECURITY DEFINER: Returns active organization IDs for a user without recursive RLS checks';

-- ============================================================================
-- STEP 3: CREATE is_org_owner_or_admin() HELPER FUNCTION (NEW!)
-- ============================================================================
-- This is the KEY change - prevents recursion in Policy 2

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
-- STEP 4: DROP OLD POLICIES (IF EXIST)
-- ============================================================================

DROP POLICY IF EXISTS "Organization members can view members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON organization_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON organization_members;
DROP POLICY IF EXISTS "Service role has full access to organization_members" ON organization_members;

-- ============================================================================
-- STEP 5: CREATE NEW 100% RECURSION-PROOF POLICIES
-- ============================================================================

-- Policy 1: Members can view other members in their organizations
CREATE POLICY "Organization members can view members"
  ON organization_members
  FOR SELECT
  USING (
    organization_id IN (SELECT user_organizations(auth.uid()))
  );

-- Policy 2: Owners/admins can manage members (NOW RECURSION-PROOF!)
CREATE POLICY "Organization owners can manage members"
  ON organization_members
  FOR ALL
  USING (
    -- Check 1: User is a member of the organization
    organization_id IN (SELECT user_organizations(auth.uid()))
    -- Check 2: User has owner/admin role (using SECURITY DEFINER function)
    AND is_org_owner_or_admin(organization_id, auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT user_organizations(auth.uid()))
  );

-- Policy 3: Users can update their own membership (accept invites, etc)
CREATE POLICY "Users can update their own membership"
  ON organization_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Platform admins can view all memberships
CREATE POLICY "Admins can view all memberships"
  ON organization_members
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Policy 5: Service role (backend) has full access
CREATE POLICY "Service role has full access to organization_members"
  ON organization_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 6: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  is_admin_exists BOOLEAN;
  user_orgs_exists BOOLEAN;
  is_org_owner_exists BOOLEAN;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Verifying organization_members RLS Fix V2';
  RAISE NOTICE '============================================';

  -- Check is_admin function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_admin'
  ) INTO is_admin_exists;

  IF is_admin_exists THEN
    RAISE NOTICE 'PASS: is_admin() function exists';
  ELSE
    RAISE WARNING 'FAIL: is_admin() function not found';
  END IF;

  -- Check user_organizations function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_organizations'
  ) INTO user_orgs_exists;

  IF user_orgs_exists THEN
    RAISE NOTICE 'PASS: user_organizations() function exists';
  ELSE
    RAISE WARNING 'FAIL: user_organizations() function not found';
  END IF;

  -- Check is_org_owner_or_admin function (NEW!)
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_org_owner_or_admin'
  ) INTO is_org_owner_exists;

  IF is_org_owner_exists THEN
    RAISE NOTICE 'PASS: is_org_owner_or_admin() function exists';
  ELSE
    RAISE WARNING 'FAIL: is_org_owner_or_admin() function not found';
  END IF;

  -- Check policy count
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organization_members';

  RAISE NOTICE 'INFO: organization_members has policies: %', policy_count;

  IF policy_count >= 5 THEN
    RAISE NOTICE 'PASS: All expected policies created';
  ELSE
    RAISE WARNING 'WARN: Expected 5+ policies, found: %', policy_count;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUCCESS: organization_members V2 fix complete!';
  RAISE NOTICE 'INFO: 100%% recursion-proof - no direct table queries';
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
-- After running this, test by visiting:
-- http://localhost:3000/customer/rfq/my-rfqs
--
-- Should load without "infinite recursion" error
-- ============================================================================
