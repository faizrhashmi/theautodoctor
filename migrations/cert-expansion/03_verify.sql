-- PHASE 1 MIGRATION: 03_verify.sql
-- PURPOSE: Verify that 02_up.sql ran successfully
-- SAFETY: Read-only queries - makes NO changes
-- RUN THIS AFTER 02_up.sql to confirm schema changes

-- ============================================================================
-- VERIFICATION 1: Check new columns exist
-- ============================================================================

DO $$
DECLARE
  missing_columns TEXT[];
  col_name TEXT;
BEGIN
  -- Check each new column
  SELECT ARRAY_AGG(column_name)
  INTO missing_columns
  FROM (
    SELECT 'certification_type' AS column_name
    UNION SELECT 'certification_number'
    UNION SELECT 'certification_authority'
    UNION SELECT 'certification_region'
    UNION SELECT 'certification_expiry_date'
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = expected.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ PASS: All new columns exist';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION 2: Check column data types
-- ============================================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name = 'certification_type' AND data_type = 'text' AND is_nullable = 'YES' THEN '✅'
    WHEN column_name = 'certification_number' AND data_type = 'text' AND is_nullable = 'YES' THEN '✅'
    WHEN column_name = 'certification_authority' AND data_type = 'text' AND is_nullable = 'YES' THEN '✅'
    WHEN column_name = 'certification_region' AND data_type = 'text' AND is_nullable = 'YES' THEN '✅'
    WHEN column_name = 'certification_expiry_date' AND data_type = 'date' AND is_nullable = 'YES' THEN '✅'
    ELSE '❌ WRONG TYPE/NULLABILITY'
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
  AND column_name IN (
    'certification_type',
    'certification_number',
    'certification_authority',
    'certification_region',
    'certification_expiry_date'
  )
ORDER BY column_name;

-- Expected: All rows show ✅

-- ============================================================================
-- VERIFICATION 3: Check CHECK constraint on certification_type
-- ============================================================================

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition,
  CASE
    WHEN pg_get_constraintdef(oid) LIKE '%red_seal%' THEN '✅ Contains expected values'
    WHEN pg_get_constraintdef(oid) LIKE '%provincial%' THEN '✅ Contains expected values'
    ELSE '⚠️ Check definition'
  END AS status
FROM pg_constraint
WHERE conrelid = 'public.mechanics'::regclass
  AND contype = 'c'  -- CHECK constraint
  AND pg_get_constraintdef(oid) LIKE '%certification_type%';

-- Expected: 1 row with constraint containing allowed values

-- ============================================================================
-- VERIFICATION 4: Check index was created
-- ============================================================================

SELECT
  indexname,
  indexdef,
  CASE
    WHEN indexname = 'idx_mechanics_certification_type' THEN '✅ Index exists'
    ELSE '❌ Index missing'
  END AS status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'mechanics'
  AND indexname = 'idx_mechanics_certification_type';

-- Expected: 1 row showing index exists

-- ============================================================================
-- VERIFICATION 5: Check old columns are UNTOUCHED
-- ============================================================================

DO $$
DECLARE
  missing_legacy TEXT[];
BEGIN
  SELECT ARRAY_AGG(column_name)
  INTO missing_legacy
  FROM (
    SELECT 'red_seal_certified' AS column_name
    UNION SELECT 'red_seal_number'
    UNION SELECT 'red_seal_province'
    UNION SELECT 'red_seal_expiry_date'
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = expected.column_name
  );

  IF missing_legacy IS NOT NULL THEN
    RAISE EXCEPTION '❌ VERIFICATION FAILED: Legacy columns were dropped: %', array_to_string(missing_legacy, ', ');
  ELSE
    RAISE NOTICE '✅ PASS: All legacy red_seal_* columns still exist (backward compatibility maintained)';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION 6: Check all new columns are initially NULL
-- ============================================================================

SELECT
  COUNT(*) AS total_mechanics,
  COUNT(certification_type) AS has_cert_type,
  COUNT(certification_number) AS has_cert_number,
  CASE
    WHEN COUNT(certification_type) = 0
     AND COUNT(certification_number) = 0
     AND COUNT(certification_authority) = 0
     AND COUNT(certification_region) = 0
     AND COUNT(certification_expiry_date) = 0
    THEN '✅ All new columns are NULL (backfill not run yet)'
    ELSE '⚠️ Some columns have data (backfill may have run)'
  END AS status
FROM mechanics;

-- Expected: All new columns should be NULL (backfill happens in Phase 3)

-- ============================================================================
-- VERIFICATION 7: Final summary
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'mechanics'
   AND column_name LIKE 'certification_%') AS new_columns_added,

  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'mechanics'
   AND column_name LIKE 'red_seal_%') AS legacy_columns_kept,

  (SELECT COUNT(*) FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'mechanics'
   AND indexname = 'idx_mechanics_certification_type') AS indexes_created,

  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'mechanics'
          AND column_name LIKE 'certification_%') = 5
    THEN '✅ MIGRATION SUCCESSFUL'
    ELSE '❌ MIGRATION FAILED'
  END AS migration_status;

-- Expected output:
-- new_columns_added | legacy_columns_kept | indexes_created | migration_status
-- ------------------+---------------------+-----------------+----------------------
-- 5                 | 4                   | 1               | ✅ MIGRATION SUCCESSFUL

-- ============================================================================
-- POST-VERIFICATION NOTES
-- ============================================================================

-- If all checks pass (✅), migration was successful and it's safe to proceed to Phase 2
-- If any check fails (❌), DO NOT PROCEED - run 02_down.sql and investigate
