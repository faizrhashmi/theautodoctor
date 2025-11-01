/**
 * Batch 2 - Phase 2: Schema Verification
 *
 * Verifies that schema changes were applied correctly
 * Run this after 01_up.sql to confirm columns exist
 */

-- Check for about_me column
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'mechanics'
      AND column_name = 'about_me'
    ) THEN '✅ mechanics.about_me EXISTS'
    ELSE '❌ mechanics.about_me MISSING'
  END AS about_me_status;

-- Check for hourly_rate column
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'mechanics'
      AND column_name = 'hourly_rate'
    ) THEN '✅ mechanics.hourly_rate EXISTS'
    ELSE '❌ mechanics.hourly_rate MISSING'
  END AS hourly_rate_status;

-- Show column details if they exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  col_description('public.mechanics'::regclass, ordinal_position) as comment
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
  AND column_name IN ('about_me', 'hourly_rate')
ORDER BY column_name;
