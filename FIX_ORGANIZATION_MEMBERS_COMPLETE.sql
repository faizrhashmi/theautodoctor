-- ============================================================================
-- COMPLETE FIX: Organization Members RLS Recursion
-- ============================================================================
-- This fixes the infinite recursion error by:
-- 1. Creating is_admin() helper function (if missing)
-- 2. Creating user_organizations() helper function
-- 3. Updating organization_members RLS policies to use these functions
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
-- STEP 3: DROP OLD POLICIES (IF EXIST)
-- ============================================================================

DROP POLICY IF EXISTS "Organization members can view members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON organization_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON organization_members;
DROP POLICY IF EXISTS "Service role has full access to organization_members" ON organization_members;

-- ============================================================================
-- STEP 4: CREATE NEW NON-RECURSIVE POLICIES
-- ============================================================================

-- Policy 1: Members can view other members in their organizations
CREATE POLICY "Organization members can view members"
  ON organization_members
  FOR SELECT
  USING (
    organization_id IN (SELECT user_organizations(auth.uid()))
  );

-- Policy 2: Owners/admins can manage members
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
-- STEP 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  is_admin_exists BOOLEAN;
  user_orgs_exists BOOLEAN;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Verifying organization_members RLS Fix';
  RAISE NOTICE '============================================';

  -- Check is_admin function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_admin'
  ) INTO is_admin_exists;

  IF is_admin_exists THEN
    RAISE NOTICE '✅ is_admin() function exists';
  ELSE
    RAISE WARNING '❌ is_admin() function not found';
  END IF;

  -- Check user_organizations function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_organizations'
  ) INTO user_orgs_exists;

  IF user_orgs_exists THEN
    RAISE NOTICE '✅ user_organizations() function exists';
  ELSE
    RAISE WARNING '❌ user_organizations() function not found';
  END IF;

  -- Check policy count
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organization_members';

  RAISE NOTICE '✅ organization_members has % policies', policy_count;

  IF policy_count >= 5 THEN
    RAISE NOTICE '✅ All expected policies created';
  ELSE
    RAISE WARNING '⚠️  Expected 5+ policies, found %', policy_count;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ organization_members recursion fix complete!';
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
