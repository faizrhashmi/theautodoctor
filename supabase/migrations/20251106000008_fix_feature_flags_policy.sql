-- ============================================================================
-- FIX FEATURE FLAGS RLS POLICY
-- Allow querying all flags to check their enabled status
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view enabled feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;

-- Allow viewing all feature flags (not just enabled ones)
-- This enables proper feature flag pattern where client checks flag status
CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Updated feature flags policy to allow querying all flags';
  RAISE NOTICE 'Clients can now check both enabled and disabled flag status';
END $$;
