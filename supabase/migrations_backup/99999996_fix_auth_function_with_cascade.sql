-- ============================================================================
-- Fix: Ambiguous column in get_authenticated_mechanic_id() with CASCADE
-- ============================================================================
-- Problem: Cannot drop function because policies depend on it
-- Solution: Drop with CASCADE, fix function, recreate policies
-- Date: 2025-10-30
-- ============================================================================

-- Drop function WITH CASCADE (also drops dependent policies)
DROP FUNCTION IF EXISTS get_authenticated_mechanic_id() CASCADE;

-- Create fixed function with unambiguous variable names
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  mech_id UUID;
  authenticated_user_id UUID;  -- ✅ Renamed to avoid ambiguity with column name
BEGIN
  -- Get the authenticated user's ID from Supabase Auth
  authenticated_user_id := auth.uid();

  -- If no authenticated user, return NULL
  IF authenticated_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up mechanic ID from mechanics table
  -- Now unambiguous: mechanics.user_id (column) = authenticated_user_id (variable)
  SELECT id INTO mech_id
  FROM public.mechanics
  WHERE user_id = authenticated_user_id
  AND can_accept_sessions = true
  LIMIT 1;

  RETURN mech_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO anon;

-- ============================================================================
-- Recreate policies that were dropped by CASCADE
-- ============================================================================

-- Policy: Mechanics can view pending requests
DROP POLICY IF EXISTS "Mechanics can view pending requests" ON public.session_requests;

CREATE POLICY "Mechanics can view pending requests"
  ON public.session_requests
  FOR SELECT
  USING (
    status = 'pending'
    AND get_authenticated_mechanic_id() IS NOT NULL
  );

-- Policy: Mechanics can accept requests
DROP POLICY IF EXISTS "Mechanics can accept requests" ON public.session_requests;

CREATE POLICY "Mechanics can accept requests"
  ON public.session_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND mechanic_id IS NULL  -- Not yet accepted
    AND get_authenticated_mechanic_id() IS NOT NULL
  )
  WITH CHECK (
    mechanic_id = get_authenticated_mechanic_id()
  );

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed get_authenticated_mechanic_id() function';
  RAISE NOTICE '✅ Recreated dependent RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Fixed ambiguous column reference (user_id → authenticated_user_id)';
  RAISE NOTICE '  - Used CASCADE to drop dependent policies';
  RAISE NOTICE '  - Recreated policies with fixed function';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To test: SELECT get_authenticated_mechanic_id();';
  RAISE NOTICE '   (Should return mechanic ID without errors)';
END $$;
