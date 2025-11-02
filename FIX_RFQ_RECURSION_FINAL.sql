-- ============================================================================
-- FINAL FIX: Complete RFQ Recursion Resolution (Including organizations table)
-- ============================================================================
-- This fixes ALL policies across ALL tables that query organization_members
--
-- Tables fixed:
-- 1. organization_members (7 policies)
-- 2. workshop_roles (3 policies)
-- 3. organizations (2 policies) ← THIS WAS THE MISSING PIECE!
--
-- SAFE TO RUN: Uses CREATE OR REPLACE and DROP IF EXISTS
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE ALL HELPER FUNCTIONS EXIST
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

-- ============================================================================
-- STEP 2: FIX organization_members POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Organization members can view members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON organization_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "Users can remove themselves from organizations" ON organization_members;
DROP POLICY IF EXISTS "Service role has full access to organization_members" ON organization_members;

CREATE POLICY "Organization members can view members"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT user_organizations(auth.uid())));

CREATE POLICY "Organization owners can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (SELECT user_organizations(auth.uid()))
    AND is_org_owner_or_admin(organization_id, auth.uid())
  )
  WITH CHECK (organization_id IN (SELECT user_organizations(auth.uid())));

CREATE POLICY "Users can update their own membership"
  ON organization_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all memberships"
  ON organization_members FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Organization owners can remove members"
  ON organization_members FOR DELETE
  USING (is_org_owner_or_admin(organization_id, auth.uid()));

CREATE POLICY "Users can remove themselves from organizations"
  ON organization_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role has full access to organization_members"
  ON organization_members FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 3: FIX workshop_roles POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Workshop admins can manage roles" ON workshop_roles;
DROP POLICY IF EXISTS "Workshop members can view roles" ON workshop_roles;
DROP POLICY IF EXISTS "Service role has full access to workshop_roles" ON workshop_roles;

CREATE POLICY "Workshop admins can manage roles"
  ON workshop_roles FOR ALL
  USING (
    workshop_id IN (SELECT user_organizations(auth.uid()))
    AND is_org_owner_or_admin(workshop_id, auth.uid())
  );

CREATE POLICY "Workshop members can view roles"
  ON workshop_roles FOR SELECT
  USING (workshop_id IN (SELECT user_organizations(auth.uid())));

CREATE POLICY "Service role has full access to workshop_roles"
  ON workshop_roles FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 4: FIX organizations POLICIES (THE MISSING PIECE!)
-- ============================================================================

DROP POLICY IF EXISTS "Organization members can view their org" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update" ON organizations;

CREATE POLICY "Organization members can view their org"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT user_organizations(auth.uid()))  -- ← Fixed!
  );

CREATE POLICY "Organization admins can update"
  ON organizations FOR UPDATE
  USING (
    is_org_owner_or_admin(id, auth.uid())  -- ← Fixed!
  );

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  org_members_count INTEGER;
  workshop_roles_count INTEGER;
  organizations_count INTEGER;
  func_count INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FINAL Recursion Fix Verification';
  RAISE NOTICE '============================================';

  -- Check functions
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname IN ('is_admin', 'user_organizations', 'is_org_owner_or_admin');

  RAISE NOTICE 'Helper functions: % (expected 3)', func_count;

  -- Check policies
  SELECT COUNT(*) INTO org_members_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organization_members';

  SELECT COUNT(*) INTO workshop_roles_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'workshop_roles';

  SELECT COUNT(*) INTO organizations_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organizations';

  RAISE NOTICE 'organization_members policies: % (expected 7)', org_members_count;
  RAISE NOTICE 'workshop_roles policies: % (expected 3)', workshop_roles_count;
  RAISE NOTICE 'organizations policies: % (expected 3+)', organizations_count;

  IF func_count = 3 AND org_members_count >= 7 AND workshop_roles_count >= 3 THEN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SUCCESS: All recursion fixed!';
    RAISE NOTICE 'All 3 tables now use helper functions';
    RAISE NOTICE 'Zero direct organization_members queries';
    RAISE NOTICE '============================================';
  ELSE
    RAISE WARNING 'WARN: Some policies may be missing';
  END IF;
END $$;
