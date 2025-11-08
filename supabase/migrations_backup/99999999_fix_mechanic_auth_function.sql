-- ============================================================================
-- Migration: Fix get_authenticated_mechanic_id() for Supabase Auth
-- ============================================================================
-- Purpose: Update the function to use Supabase Auth instead of deprecated
--          mechanic_sessions table and aad_mech cookie
-- Date: 2025-10-30
-- ============================================================================

-- Drop old function that references deleted mechanic_sessions table
DROP FUNCTION IF EXISTS get_authenticated_mechanic_id();

-- Create new function that uses Supabase Auth
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  mech_id UUID;
  user_id UUID;
BEGIN
  -- Get the authenticated user's ID from Supabase Auth
  user_id := auth.uid();

  -- If no authenticated user, return NULL
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up mechanic ID from mechanics table using user_id
  SELECT id INTO mech_id
  FROM public.mechanics
  WHERE user_id = user_id
  AND can_accept_sessions = true
  LIMIT 1;

  RETURN mech_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO anon;

-- ============================================================================
-- Update RLS Policy to ensure it works correctly
-- ============================================================================

DROP POLICY IF EXISTS "Mechanics can view pending requests" ON public.session_requests;

CREATE POLICY "Mechanics can view pending requests"
  ON public.session_requests
  FOR SELECT
  USING (
    status = 'pending'
    AND get_authenticated_mechanic_id() IS NOT NULL
  );

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
  RAISE NOTICE '✅ Updated get_authenticated_mechanic_id() to use Supabase Auth';
  RAISE NOTICE '✅ Updated session_requests RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Important: This function now requires mechanics to have:';
  RAISE NOTICE '   1. user_id linked to auth.users';
  RAISE NOTICE '   2. can_accept_sessions = true';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To test: SELECT get_authenticated_mechanic_id();';
  RAISE NOTICE '   (Should return mechanic ID when authenticated as mechanic)';
END $$;
