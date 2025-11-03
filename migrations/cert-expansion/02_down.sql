-- PHASE 1 MIGRATION: 02_down.sql
-- PURPOSE: Rollback script - removes ONLY the new columns added in 02_up.sql
-- SAFETY: Uses IF EXISTS guards - idempotent, can run multiple times
-- CRITICAL: This NEVER touches legacy red_seal_* columns

-- ============================================================================
-- WARNING
-- ============================================================================

-- ⚠️ This rollback script will:
--   ✅ Drop new certification_* columns (added in Phase 1)
--   ✅ Drop the performance index
--   ❌ NOT drop red_seal_* columns (these are legacy, must be preserved)
--   ❌ NOT delete any mechanic records

-- ⚠️ Data loss warning:
--   If backfill (Phase 3) has run, this will lose the backfilled data
--   in the new certification_* columns. However, the original red_seal_*
--   data remains intact, so it can be re-backfilled if needed.

-- ============================================================================
-- BEGIN TRANSACTION
-- ============================================================================

BEGIN;

-- ============================================================================
-- DROP INDEX
-- ============================================================================

DROP INDEX IF EXISTS public.idx_mechanics_certification_type;

-- ============================================================================
-- DROP NEW COLUMNS (Phase 1 additions only)
-- ============================================================================

ALTER TABLE public.mechanics
DROP COLUMN IF EXISTS certification_type,
DROP COLUMN IF EXISTS certification_number,
DROP COLUMN IF EXISTS certification_authority,
DROP COLUMN IF EXISTS certification_region,
DROP COLUMN IF EXISTS certification_expiry_date;

-- ============================================================================
-- VERIFY LEGACY COLUMNS STILL EXIST
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
    RAISE EXCEPTION '❌ CRITICAL ERROR: Legacy columns missing after rollback: %. ROLLBACK TRANSACTION!', array_to_string(missing_legacy, ', ');
  ELSE
    RAISE NOTICE '✅ Rollback successful: New columns dropped, legacy columns preserved';
  END IF;
END $$;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-ROLLBACK VERIFICATION
-- ============================================================================

-- Run this query after rollback to confirm:
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'mechanics'
   AND column_name LIKE 'certification_%') AS new_columns_remaining,

  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'mechanics'
   AND column_name LIKE 'red_seal_%') AS legacy_columns_intact,

  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'mechanics'
          AND column_name LIKE 'certification_%') = 0
     AND (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'mechanics'
          AND column_name LIKE 'red_seal_%') >= 4
    THEN '✅ ROLLBACK SUCCESSFUL'
    ELSE '❌ ROLLBACK INCOMPLETE'
  END AS rollback_status;

-- Expected:
-- new_columns_remaining | legacy_columns_intact | rollback_status
-- ----------------------+----------------------+----------------------
-- 0                     | 4                    | ✅ ROLLBACK SUCCESSFUL
