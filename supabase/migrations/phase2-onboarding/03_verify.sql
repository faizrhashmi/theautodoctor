-- Phase 2.1: Onboarding Checklist System - Verification
-- Verifies the onboarding tracking columns exist and are configured correctly
-- Date: 2025-11-03

DO $$
DECLARE
  v_onboarding_dismissed_exists BOOLEAN;
  v_onboarding_dismissed_at_exists BOOLEAN;
  v_index_exists BOOLEAN;
BEGIN
  -- Check if onboarding_dismissed column exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'onboarding_dismissed'
    AND data_type = 'boolean'
  ) INTO v_onboarding_dismissed_exists;

  -- Check if onboarding_dismissed_at column exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'onboarding_dismissed_at'
    AND data_type = 'timestamp with time zone'
  ) INTO v_onboarding_dismissed_at_exists;

  -- Check if index exists
  SELECT EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'profiles'
    AND indexname = 'profiles_onboarding_dismissed_idx'
  ) INTO v_index_exists;

  -- Report results
  IF v_onboarding_dismissed_exists AND v_onboarding_dismissed_at_exists AND v_index_exists THEN
    RAISE NOTICE '✓ Onboarding checklist migration verified successfully';
    RAISE NOTICE '  - onboarding_dismissed column: %', v_onboarding_dismissed_exists;
    RAISE NOTICE '  - onboarding_dismissed_at column: %', v_onboarding_dismissed_at_exists;
    RAISE NOTICE '  - Index created: %', v_index_exists;
  ELSE
    RAISE EXCEPTION 'Onboarding checklist migration verification failed:
      onboarding_dismissed: %, onboarding_dismissed_at: %, index: %',
      v_onboarding_dismissed_exists, v_onboarding_dismissed_at_exists, v_index_exists;
  END IF;
END $$;

-- Display column details
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('onboarding_dismissed', 'onboarding_dismissed_at')
ORDER BY column_name;
