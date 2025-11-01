/**
 * Batch 2 - Phase 2: Rollback Script
 *
 * Removes columns added in 01_up.sql
 *
 * WARNING: This will DELETE DATA in about_me and hourly_rate columns
 * Only run if you need to completely rollback Phase 2 changes
 */

-- Remove hourly_rate column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE public.mechanics
    DROP COLUMN hourly_rate;

    RAISE NOTICE 'Dropped column: mechanics.hourly_rate';
  ELSE
    RAISE NOTICE 'Column mechanics.hourly_rate does not exist, skipping';
  END IF;
END $$;

-- Remove about_me column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'about_me'
  ) THEN
    ALTER TABLE public.mechanics
    DROP COLUMN about_me;

    RAISE NOTICE 'Dropped column: mechanics.about_me';
  ELSE
    RAISE NOTICE 'Column mechanics.about_me does not exist, skipping';
  END IF;
END $$;

-- Final verification
DO $$
BEGIN
  RAISE NOTICE 'Rollback complete. Verify with 03_verify.sql';
END $$;
