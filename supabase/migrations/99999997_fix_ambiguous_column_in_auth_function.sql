-- ============================================================================
-- Fix: Ambiguous column reference in get_authenticated_mechanic_id()
-- ============================================================================
-- Problem: Variable name "user_id" conflicts with column name "user_id"
-- Error: "column reference user_id is ambiguous"
-- Date: 2025-10-30
-- ============================================================================

-- Drop the broken function
DROP FUNCTION IF EXISTS get_authenticated_mechanic_id();

-- Create fixed function with unambiguous variable names
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  mech_id UUID;
  authenticated_user_id UUID;  -- ✅ Renamed to avoid ambiguity
BEGIN
  -- Get the authenticated user's ID from Supabase Auth
  authenticated_user_id := auth.uid();

  -- If no authenticated user, return NULL
  IF authenticated_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up mechanic ID from mechanics table
  -- Now it's clear: mechanics.user_id (column) = authenticated_user_id (variable)
  SELECT id INTO mech_id
  FROM public.mechanics
  WHERE user_id = authenticated_user_id  -- ✅ No longer ambiguous
  AND can_accept_sessions = true
  LIMIT 1;

  RETURN mech_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO anon;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed get_authenticated_mechanic_id() - removed ambiguous column reference';
  RAISE NOTICE '';
  RAISE NOTICE 'Changed variable name from "user_id" to "authenticated_user_id"';
  RAISE NOTICE 'This prevents PostgreSQL ambiguity error';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To test: SELECT get_authenticated_mechanic_id();';
  RAISE NOTICE '   (Should return mechanic ID when authenticated as mechanic)';
END $$;
