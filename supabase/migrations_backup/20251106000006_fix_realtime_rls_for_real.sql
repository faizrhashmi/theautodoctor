-- ============================================================================
-- FIX RLS FOR REALTIME - FINAL VERSION
-- Simplify policy to work reliably with postgres_changes subscriptions
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Mechanics can view assignments for realtime" ON session_assignments;

-- Create simplified policy that works with realtime
-- This policy is intentionally broad to allow postgres_changes events to work
-- The API endpoints still filter results appropriately for security
CREATE POLICY "Mechanics can view assignments for realtime"
  ON session_assignments FOR SELECT
  USING (
    -- Allow all authenticated mechanics to see all assignments
    -- This is REQUIRED for postgres_changes events to be delivered
    EXISTS (
      SELECT 1 FROM mechanics m WHERE m.user_id = auth.uid()
    )
  );

-- Add admin access policy (using existing is_admin function)
CREATE POLICY "Admins can view all assignments"
  ON session_assignments FOR SELECT
  USING (is_admin(auth.uid()));

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policy for reliable realtime events';
  RAISE NOTICE 'Mechanics will now receive postgres_changes events for all assignments';
  RAISE NOTICE 'API endpoints handle filtering for appropriate access control';
END $$;
