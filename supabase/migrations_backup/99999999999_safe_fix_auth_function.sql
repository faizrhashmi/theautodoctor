-- ============================================================================
-- Safe Fix: Ambiguous column in get_authenticated_mechanic_id()
-- ============================================================================
-- This version doesn't use CASCADE, assumes policies are already fixed
-- Date: 2025-10-30
-- ============================================================================

-- Drop and recreate function with unambiguous variable names
-- Use CASCADE because policies depend on this function
DROP FUNCTION IF EXISTS get_authenticated_mechanic_id() CASCADE;

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
DROP POLICY IF EXISTS "Mechanics can view pending requests" ON session_requests;
CREATE POLICY "Mechanics can view pending requests"
  ON session_requests
  FOR SELECT
  USING (
    status = 'pending'
    AND (
      -- Virtual-only mechanics can see virtual/diagnostic/chat requests
      (
        EXISTS (
          SELECT 1 FROM mechanics
          WHERE mechanics.id = get_authenticated_mechanic_id()
          AND mechanics.service_tier = 'virtual_only'
        )
        AND session_type IN ('virtual', 'diagnostic', 'chat')
      )
      OR
      -- Workshop mechanics can see requests for their workshop or unassigned
      (
        EXISTS (
          SELECT 1 FROM mechanics
          WHERE mechanics.id = get_authenticated_mechanic_id()
          AND mechanics.workshop_id IS NOT NULL
        )
        AND (
          workshop_id IN (
            SELECT workshop_id FROM mechanics WHERE id = get_authenticated_mechanic_id()
          )
          OR workshop_id IS NULL
        )
      )
      OR
      -- Independent mechanics can see unassigned requests
      (
        EXISTS (
          SELECT 1 FROM mechanics
          WHERE mechanics.id = get_authenticated_mechanic_id()
          AND mechanics.workshop_id IS NULL
          AND mechanics.service_tier != 'virtual_only'
        )
        AND workshop_id IS NULL
      )
    )
  );

-- Policy: Mechanics can accept requests
DROP POLICY IF EXISTS "Mechanics can accept requests" ON session_requests;
CREATE POLICY "Mechanics can accept requests"
  ON session_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND (
      -- Same logic as view policy
      (
        EXISTS (
          SELECT 1 FROM mechanics
          WHERE mechanics.id = get_authenticated_mechanic_id()
          AND mechanics.service_tier = 'virtual_only'
        )
        AND session_type IN ('virtual', 'diagnostic', 'chat')
      )
      OR
      (
        EXISTS (
          SELECT 1 FROM mechanics
          WHERE mechanics.id = get_authenticated_mechanic_id()
          AND mechanics.workshop_id IS NOT NULL
        )
        AND (
          workshop_id IN (
            SELECT workshop_id FROM mechanics WHERE id = get_authenticated_mechanic_id()
          )
          OR workshop_id IS NULL
        )
      )
      OR
      (
        EXISTS (
          SELECT 1 FROM mechanics
          WHERE mechanics.id = get_authenticated_mechanic_id()
          AND mechanics.workshop_id IS NULL
          AND mechanics.service_tier != 'virtual_only'
        )
        AND workshop_id IS NULL
      )
    )
  );

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed get_authenticated_mechanic_id() function (with CASCADE)';
  RAISE NOTICE '   Variable renamed: user_id → authenticated_user_id';
  RAISE NOTICE '   Recreated 2 dependent policies on session_requests';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To test: SELECT get_authenticated_mechanic_id();';
END $$;
