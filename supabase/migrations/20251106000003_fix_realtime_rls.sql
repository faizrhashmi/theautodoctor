-- ============================================================================
-- FIX RLS FOR REALTIME ON SESSION_ASSIGNMENTS
-- Allows authenticated users to receive realtime events for all assignments
-- ============================================================================

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Mechanics can view their assignments" ON session_assignments;

-- Create new policy that allows all authenticated mechanics to see all assignments
-- This is needed for realtime events to work properly
CREATE POLICY "Mechanics can view assignments for realtime"
  ON session_assignments FOR SELECT
  USING (
    -- Allow if user is authenticated and has mechanic role
    EXISTS (
      SELECT 1 FROM mechanics m
      WHERE m.user_id = auth.uid()
    )
    -- OR allow if viewing queued/offered assignments (for broadcast visibility)
    OR status IN ('queued', 'offered')
  );

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policy for realtime compatibility';
END $$;
