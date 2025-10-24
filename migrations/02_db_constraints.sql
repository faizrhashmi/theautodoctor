-- ============================================================================
-- STEP 2: DATABASE CONSTRAINTS - One-Active-Session Enforcement
-- ============================================================================
--
-- Purpose: Add database-level constraints to enforce business rules:
-- 1. Mechanic can only have ONE active session at a time
-- 2. Session status must be one of the valid enum values
--
-- Safe to run: Idempotent operations, creates backups first
-- Rollback: Use backup schema if needed
--
-- Run this in: Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- 2.1 BACKUPS (Create snapshot for rollback)
-- ============================================================================

-- Ensure backup schema exists
CREATE SCHEMA IF NOT EXISTS backup;

-- Backup sessions table
DROP TABLE IF EXISTS backup.sessions_before_constraints CASCADE;
CREATE TABLE backup.sessions_before_constraints AS
SELECT * FROM public.sessions;

-- Log backup count
DO $$
DECLARE
  sessions_count INT;
BEGIN
  SELECT COUNT(*) INTO sessions_count FROM backup.sessions_before_constraints;
  RAISE NOTICE '✓ Backup created: % sessions', sessions_count;
END $$;


-- ============================================================================
-- 2.2 CLEANUP INVALID STATUSES - Fix before adding constraint
-- ============================================================================

-- First, check what statuses exist in the database (ALL of them)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CURRENT STATUS DISTRIBUTION (ALL VALUES) ===';

  FOR rec IN
    SELECT
      COALESCE(status::TEXT, 'NULL') as status_value,
      COUNT(*) as count
    FROM public.sessions
    GROUP BY status
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  - status "%" : % rows', rec.status_value, rec.count;
  END LOOP;
END $$;

-- Normalize ALL sessions - set valid status for everything
UPDATE public.sessions
SET
  status = CASE
    -- NULL cases
    WHEN status IS NULL THEN 'cancelled'

    -- Already valid - keep as is
    WHEN status IN ('pending', 'scheduled', 'waiting', 'live', 'completed', 'cancelled', 'expired', 'refunded', 'archived')
      THEN status

    -- Common variations
    WHEN status = 'in_progress' THEN 'live'
    WHEN status = 'active' THEN 'live'
    WHEN status = 'finished' THEN 'completed'
    WHEN status = 'done' THEN 'completed'
    WHEN status = 'closed' THEN 'completed'
    WHEN status = 'ended' THEN 'completed'

    -- Default: mark anything else as cancelled
    ELSE 'cancelled'
  END,
  updated_at = NOW()
WHERE
  status IS NULL
  OR status NOT IN ('pending', 'scheduled', 'waiting', 'live', 'completed', 'cancelled', 'expired', 'refunded', 'archived');

DO $$
DECLARE
  fixed_count INT;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  IF fixed_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✓ Normalized % session(s) with invalid status to valid values', fixed_count;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✓ No status normalization needed - all statuses already valid';
  END IF;
END $$;

-- VERIFY: Check if there are still any invalid statuses
DO $$
DECLARE
  invalid_count INT := 0;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.sessions
  WHERE status IS NULL
     OR status NOT IN ('pending', 'scheduled', 'waiting', 'live', 'completed', 'cancelled', 'expired', 'refunded', 'archived');

  IF invalid_count > 0 THEN
    RAISE WARNING '⚠ STILL FOUND % INVALID STATUS(ES) AFTER CLEANUP!', invalid_count;

    -- Show what's still invalid
    FOR rec IN
      SELECT COALESCE(status::TEXT, 'NULL') as status_value, COUNT(*) as count
      FROM public.sessions
      WHERE status IS NULL
         OR status NOT IN ('pending', 'scheduled', 'waiting', 'live', 'completed', 'cancelled', 'expired', 'refunded', 'archived')
      GROUP BY status
    LOOP
      RAISE WARNING '  - Invalid status "%" : % rows', rec.status_value, rec.count;
    END LOOP;

    RAISE EXCEPTION 'Cannot proceed with constraint - still have invalid statuses. ROLLBACK and investigate.';
  ELSE
    RAISE NOTICE '✓ VERIFICATION PASSED: All statuses are now valid!';
  END IF;
END $$;


-- ============================================================================
-- 2.3 ADD STATUS CHECK CONSTRAINT - Enforce valid status values
-- ============================================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sessions_status_check'
      AND table_name = 'sessions'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.sessions DROP CONSTRAINT sessions_status_check;
    RAISE NOTICE '✓ Dropped existing sessions_status_check constraint';
  END IF;
END $$;

-- Add status check constraint
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN (
    'pending',
    'scheduled',
    'waiting',
    'live',
    'completed',
    'cancelled',
    'expired',
    'refunded',
    'archived'
  ));

DO $$
BEGIN
  RAISE NOTICE '✓ Added sessions_status_check constraint';
END $$;


-- ============================================================================
-- 2.4 ADD UNIQUE CONSTRAINT - One mechanic, one active session
-- ============================================================================

-- Clean up any duplicate active sessions FIRST (if they exist)
-- This query will keep the most recent session and cancel older duplicates
DO $$
DECLARE
  duplicates_fixed INT := 0;
BEGIN
  -- Find mechanics with multiple active sessions
  WITH mechanic_active_sessions AS (
    SELECT
      mechanic_id,
      id,
      created_at,
      ROW_NUMBER() OVER (
        PARTITION BY mechanic_id
        ORDER BY created_at DESC
      ) as rn
    FROM public.sessions
    WHERE mechanic_id IS NOT NULL
      AND status IN ('waiting', 'live', 'scheduled')
  )
  -- Cancel all but the most recent active session for each mechanic
  UPDATE public.sessions s
  SET
    status = 'cancelled',
    ended_at = COALESCE(ended_at, NOW()),
    updated_at = NOW(),
    metadata = COALESCE(
      CASE WHEN s.metadata IS NOT NULL AND s.metadata::text != 'null'
           THEN s.metadata
           ELSE '{}'::jsonb
      END,
      '{}'::jsonb
    ) || jsonb_build_object(
      'cancelled_reason', 'duplicate_active_session',
      'cancelled_by', 'migration_cleanup',
      'cancelled_at', NOW()
    )
  FROM mechanic_active_sessions mas
  WHERE s.id = mas.id
    AND mas.rn > 1; -- Keep row 1 (most recent), cancel others

  GET DIAGNOSTICS duplicates_fixed = ROW_COUNT;

  IF duplicates_fixed > 0 THEN
    RAISE NOTICE '✓ Cancelled % duplicate active session(s)', duplicates_fixed;
  ELSE
    RAISE NOTICE '✓ No duplicate active sessions found';
  END IF;
END $$;

-- Drop existing index/constraint if it exists
DROP INDEX IF EXISTS public.uniq_mech_one_active;

-- Create partial unique index - one mechanic, one active session
-- This constraint prevents a mechanic from being assigned to multiple active sessions
CREATE UNIQUE INDEX uniq_mech_one_active
  ON public.sessions(mechanic_id)
  WHERE status IN ('waiting', 'live', 'scheduled')
    AND mechanic_id IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '✓ Created unique index: uniq_mech_one_active';
  RAISE NOTICE '  → Mechanic can only have ONE active session (waiting/live/scheduled)';
END $$;


-- ============================================================================
-- VERIFICATION - Test constraints
-- ============================================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
  index_exists BOOLEAN;
BEGIN
  -- Check status constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sessions_status_check'
      AND table_name = 'sessions'
      AND table_schema = 'public'
  ) INTO constraint_exists;

  -- Check unique index
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uniq_mech_one_active'
      AND tablename = 'sessions'
      AND schemaname = 'public'
  ) INTO index_exists;

  RAISE NOTICE '';
  RAISE NOTICE '=== CONSTRAINTS VERIFICATION ===';
  RAISE NOTICE '  Status Check Constraint: %', CASE WHEN constraint_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Unique Active Session Index: %', CASE WHEN index_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  IF constraint_exists AND index_exists THEN
    RAISE NOTICE '  ✓ All constraints installed successfully!';
  ELSE
    RAISE WARNING '  ⚠ Some constraints are missing - check the output above';
  END IF;
END $$;


-- ============================================================================
-- TEST THE CONSTRAINTS (Optional - run after COMMIT to verify)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST THE CONSTRAINTS ===';
  RAISE NOTICE 'After COMMITting, test with:';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 1: Try to insert invalid status (should fail)';
  RAISE NOTICE 'INSERT INTO sessions (customer_user_id, status, plan, type)';
  RAISE NOTICE 'VALUES (''00000000-0000-0000-0000-000000000000'', ''invalid_status'', ''chat10'', ''chat'');';
  RAISE NOTICE '-- Expected: CHECK constraint violation';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 2: Try to create duplicate active sessions (should fail on second insert)';
  RAISE NOTICE 'INSERT INTO sessions (mechanic_id, customer_user_id, status, plan, type)';
  RAISE NOTICE 'VALUES (''<mechanic-uuid>'', ''<customer-uuid>'', ''waiting'', ''chat10'', ''chat'');';
  RAISE NOTICE '-- Run again with same mechanic_id - Expected: unique constraint violation';
  RAISE NOTICE '';
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CONSTRAINTS READY ===';
  RAISE NOTICE 'Review the output above. If everything looks good, COMMIT.';
  RAISE NOTICE 'If not, ROLLBACK and restore from backup schema.';
END $$;

-- DON'T AUTO-COMMIT - Let user review first
-- COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
--
-- If something went wrong, rollback and restore:
--
-- ROLLBACK;
--
-- -- Drop constraints
-- ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
-- DROP INDEX IF EXISTS public.uniq_mech_one_active;
--
-- -- Restore from backup
-- DELETE FROM public.sessions;
-- INSERT INTO public.sessions SELECT * FROM backup.sessions_before_constraints;
--
-- ============================================================================
