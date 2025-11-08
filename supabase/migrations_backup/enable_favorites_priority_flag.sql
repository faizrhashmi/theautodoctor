-- ============================================================================
-- Enable Favorites Priority Feature Flag in Database
-- ============================================================================
-- This adds the ENABLE_FAVORITES_PRIORITY feature flag to the database
-- so it can be toggled without server restart.
--
-- Usage: Run this SQL in Supabase SQL Editor
-- Then toggle at: http://localhost:3000/admin/feature-flags
-- ============================================================================

-- Insert or update the feature flag
INSERT INTO feature_flags (
  flag_key,
  flag_name,
  description,
  is_enabled,
  enabled_for_roles,
  rollout_percentage,
  metadata
)
VALUES (
  'ENABLE_FAVORITES_PRIORITY',
  'Favorites Priority Broadcast',
  'Enables priority notification to favorite mechanic (10-minute window) before broadcasting to all mechanics. When disabled, standard broadcast to all mechanics.',
  false, -- Default: OFF
  ARRAY['admin', 'customer'], -- Customers can use this feature when enabled
  100, -- 100% rollout when enabled
  '{"phases_completed": ["phase1", "phase2", "phase3"], "requires_database_migration": "phase4"}'::jsonb
)
ON CONFLICT (flag_key)
DO UPDATE SET
  flag_name = EXCLUDED.flag_name,
  description = EXCLUDED.description,
  enabled_for_roles = EXCLUDED.enabled_for_roles,
  rollout_percentage = EXCLUDED.rollout_percentage,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  flag_exists BOOLEAN;
  flag_status BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM feature_flags WHERE flag_key = 'ENABLE_FAVORITES_PRIORITY'
  ) INTO flag_exists;

  IF flag_exists THEN
    SELECT is_enabled INTO flag_status
    FROM feature_flags
    WHERE flag_key = 'ENABLE_FAVORITES_PRIORITY';

    RAISE NOTICE '✅ ENABLE_FAVORITES_PRIORITY flag added successfully';
    RAISE NOTICE 'Current status: %', CASE WHEN flag_status THEN 'ENABLED' ELSE 'DISABLED' END;
    RAISE NOTICE '';
    RAISE NOTICE 'To toggle this flag:';
    RAISE NOTICE '  1. Visit http://localhost:3000/admin/feature-flags';
    RAISE NOTICE '  2. Find "Favorites Priority Broadcast"';
    RAISE NOTICE '  3. Click toggle switch';
    RAISE NOTICE '  4. Changes take effect immediately (no server restart needed)';
  ELSE
    RAISE WARNING '❌ Failed to create ENABLE_FAVORITES_PRIORITY flag';
  END IF;
END $$;
