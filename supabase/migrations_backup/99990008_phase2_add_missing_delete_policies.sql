-- ============================================================================
-- PHASE 2.5: ADD MISSING DELETE POLICIES
-- ============================================================================
-- This migration adds missing DELETE policies for tables where users should
-- be able to delete their own data but currently cannot.
--
-- Issue: Many tables have SELECT, INSERT, UPDATE policies but no DELETE policy,
-- preventing users from removing their own data.
--
-- Date: 2025-10-27
-- Priority: HIGH
-- ============================================================================

-- ============================================================================
-- 1. INTAKES - Users should delete their own intakes
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Users can delete their own intakes"
  ON intakes
  FOR DELETE
  USING (auth.uid() = customer_user_id);

CREATE POLICY IF NOT EXISTS "Admins can delete any intake"
  ON intakes
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 2. SESSION_REQUESTS - Mechanics should cancel pending requests
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Customers can cancel their pending requests"
  ON session_requests
  FOR DELETE
  USING (
    auth.uid() = customer_id
    AND status = 'pending'
  );

CREATE POLICY IF NOT EXISTS "Admins can delete any session request"
  ON session_requests
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 3. SESSION_PARTICIPANTS - Users can leave sessions
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Users can remove themselves from sessions"
  ON session_participants
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can remove any participant"
  ON session_participants
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 4. ORGANIZATION_MEMBERS - Owners can remove members
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Organization owners can remove members"
  ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
  );

CREATE POLICY IF NOT EXISTS "Users can remove themselves from organizations"
  ON organization_members
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 5. SESSION_EXTENSIONS - Users can cancel extension requests
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Users can cancel their own extension requests"
  ON session_extensions
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE customer_user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- ============================================================================
-- 6. MECHANIC_AVAILABILITY - Mechanics can delete availability blocks
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Mechanics can delete their own availability"
  ON mechanic_availability
  FOR DELETE
  USING (mechanic_id = get_authenticated_mechanic_id());

-- ============================================================================
-- 7. CUSTOMER_FAVORITES - Already has DELETE policy, verify
-- ============================================================================

-- This should already exist from Phase 1, but ensure it's there
CREATE POLICY IF NOT EXISTS "Customers can delete their favorites"
  ON customer_favorites
  FOR DELETE
  USING (auth.uid() = customer_user_id);

-- ============================================================================
-- 8. WAIVER_SIGNATURES - Users should NOT delete (audit trail)
-- ============================================================================

-- NO DELETE policy for waiver_signatures - these should be immutable for legal reasons
COMMENT ON TABLE waiver_signatures IS 'RLS enabled - NO DELETE allowed, immutable audit trail';

-- ============================================================================
-- 9. MECHANIC_TIME_OFF - Mechanics can delete their time off
-- ============================================================================

-- Already handled in Phase 2.2, but ensure it's comprehensive
CREATE POLICY IF NOT EXISTS "Mechanics can delete their own time off"
  ON mechanic_time_off
  FOR DELETE
  USING (mechanic_id = get_authenticated_mechanic_id());

-- ============================================================================
-- 10. CONTACT_REQUESTS - NO DELETE (admin-only access)
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Admins can delete contact requests"
  ON contact_requests
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_rec RECORD;
  delete_policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== Verifying DELETE Policies ===';

  FOR table_rec IN
    SELECT unnest(ARRAY[
      'intakes',
      'session_requests',
      'session_participants',
      'organization_members',
      'session_extensions',
      'mechanic_availability',
      'customer_favorites',
      'mechanic_time_off',
      'contact_requests'
    ]) AS tablename
  LOOP
    SELECT COUNT(*) INTO delete_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = table_rec.tablename
    AND cmd = 'DELETE';

    IF delete_policy_count > 0 THEN
      RAISE NOTICE '✓ Table "%" has % DELETE policies', table_rec.tablename, delete_policy_count;
    ELSE
      RAISE WARNING '✗ Table "%" has NO DELETE policies', table_rec.tablename;
    END IF;
  END LOOP;

  RAISE NOTICE '=== DELETE policy addition complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE intakes IS 'RLS enabled - Users can delete their own intakes';
COMMENT ON TABLE session_requests IS 'RLS enabled - Customers can cancel pending requests';
COMMENT ON TABLE session_participants IS 'RLS enabled - Users can leave sessions';
COMMENT ON TABLE organization_members IS 'RLS enabled - Owners can remove members, users can leave';
COMMENT ON TABLE session_extensions IS 'RLS enabled - Users can cancel pending extensions';
COMMENT ON TABLE mechanic_availability IS 'RLS enabled - Mechanics can delete availability blocks';
