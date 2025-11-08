-- ============================================================================
-- PHASE 1.3: FIX RECURSIVE ADMIN POLICIES
-- ============================================================================
-- This migration fixes the critical recursive policy issue where admin
-- policies query the profiles table recursively, causing infinite loops.
--
-- Issue: Policies like "Admins can view all profiles" query profiles table
-- within the policy definition on profiles table.
--
-- Solution: Use SECURITY DEFINER functions that bypass RLS
--
-- Date: 2025-10-27
-- Priority: CRITICAL
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Function to check if user is mechanic via custom auth (bypasses RLS)
CREATE OR REPLACE FUNCTION is_authenticated_mechanic(mechanic_id_check UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mechanic_sessions
    WHERE mechanic_id = mechanic_id_check
    AND token = current_setting('request.cookie.aad_mech', true)
    AND expires_at > now()
  );
END;
$$;

-- Function to get mechanic_id from custom auth token (bypasses RLS)
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  mech_id UUID;
BEGIN
  SELECT mechanic_id INTO mech_id
  FROM public.mechanic_sessions
  WHERE token = current_setting('request.cookie.aad_mech', true)
  AND expires_at > now()
  LIMIT 1;

  RETURN mech_id;
END;
$$;

-- ============================================================================
-- STEP 2: FIX PROFILES TABLE POLICIES
-- ============================================================================

-- Drop existing recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate with SECURITY DEFINER function
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================================================
-- STEP 3: FIX INTAKES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all intakes" ON public.intakes;

CREATE POLICY "Admins can view all intakes"
  ON public.intakes
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================================================
-- STEP 4: FIX SESSIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sessions;

CREATE POLICY "Admins can view all sessions"
  ON public.sessions
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Also fix mechanic policies to use helper function
DROP POLICY IF EXISTS "Mechanics can view assigned sessions" ON public.sessions;

CREATE POLICY "Mechanics can view assigned sessions"
  ON public.sessions
  FOR SELECT
  USING (
    mechanic_id = get_authenticated_mechanic_id()
  );

DROP POLICY IF EXISTS "Mechanics can update assigned sessions" ON public.sessions;

CREATE POLICY "Mechanics can update assigned sessions"
  ON public.sessions
  FOR UPDATE
  USING (mechanic_id = get_authenticated_mechanic_id())
  WITH CHECK (mechanic_id = get_authenticated_mechanic_id());

-- ============================================================================
-- STEP 5: FIX SESSION_PARTICIPANTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all participations" ON public.session_participants;

CREATE POLICY "Admins can view all participations"
  ON public.session_participants
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================================================
-- STEP 6: FIX MECHANICS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all mechanics" ON public.mechanics;

CREATE POLICY "Admins can view all mechanics"
  ON public.mechanics
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Fix mechanic self-access
DROP POLICY IF EXISTS "Mechanics can view their own profile" ON public.mechanics;

CREATE POLICY "Mechanics can view their own profile"
  ON public.mechanics
  FOR SELECT
  USING (id = get_authenticated_mechanic_id());

DROP POLICY IF EXISTS "Mechanics can update their own profile" ON public.mechanics;

CREATE POLICY "Mechanics can update their own profile"
  ON public.mechanics
  FOR UPDATE
  USING (id = get_authenticated_mechanic_id())
  WITH CHECK (id = get_authenticated_mechanic_id());

-- ============================================================================
-- STEP 7: FIX CONTACT_REQUESTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view contact requests" ON public.contact_requests;

CREATE POLICY "Admins can view contact requests"
  ON public.contact_requests
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================================================
-- STEP 8: FIX SESSION_REQUESTS TABLE RECURSIVE POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Mechanics can view pending requests" ON public.session_requests;

-- This policy was querying profiles table, causing recursion
CREATE POLICY "Mechanics can view pending requests"
  ON public.session_requests
  FOR SELECT
  USING (
    status = 'pending'
    AND get_authenticated_mechanic_id() IS NOT NULL
  );

-- ============================================================================
-- STEP 9: FIX VEHICLES TABLE (if admin policy exists)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all vehicles" ON public.vehicles;

CREATE POLICY "Admins can view all vehicles"
  ON public.vehicles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================================================
-- STEP 10: FIX MECHANIC_SESSIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Mechanics can view their own sessions" ON public.mechanic_sessions;

CREATE POLICY "Mechanics can view their own sessions"
  ON public.mechanic_sessions
  FOR SELECT
  USING (mechanic_id = get_authenticated_mechanic_id());

DROP POLICY IF EXISTS "Mechanics can delete their own sessions" ON public.mechanic_sessions;

CREATE POLICY "Mechanics can delete their own sessions"
  ON public.mechanic_sessions
  FOR DELETE
  USING (mechanic_id = get_authenticated_mechanic_id());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  RAISE NOTICE '=== Verifying SECURITY DEFINER Functions ===';

  -- Check if functions exist
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('is_admin', 'is_authenticated_mechanic', 'get_authenticated_mechanic_id');

  IF function_count = 3 THEN
    RAISE NOTICE '✓ All 3 helper functions created';
  ELSE
    RAISE WARNING '✗ Only % of 3 helper functions found', function_count;
  END IF;

  -- Test is_admin function
  BEGIN
    PERFORM is_admin('00000000-0000-0000-0000-000000000000'::uuid);
    RAISE NOTICE '✓ is_admin() function is callable';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ is_admin() function error: %', SQLERRM;
  END;

  -- Test get_authenticated_mechanic_id function
  BEGIN
    PERFORM get_authenticated_mechanic_id();
    RAISE NOTICE '✓ get_authenticated_mechanic_id() function is callable';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ get_authenticated_mechanic_id() function error: %', SQLERRM;
  END;

  RAISE NOTICE '=== Recursive Policy Fix Complete ===';
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_authenticated_mechanic(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO authenticated, anon;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION is_admin(UUID) IS 'SECURITY DEFINER: Checks if user is admin without recursive RLS checks';
COMMENT ON FUNCTION is_authenticated_mechanic(UUID) IS 'SECURITY DEFINER: Checks if mechanic is authenticated via custom token';
COMMENT ON FUNCTION get_authenticated_mechanic_id() IS 'SECURITY DEFINER: Returns authenticated mechanic ID from custom token';
