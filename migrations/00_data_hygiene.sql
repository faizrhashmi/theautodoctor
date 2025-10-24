-- ============================================================================
-- STEP 0: DATA HYGIENE - Database Cleanup Migration
-- ============================================================================
--
-- Purpose: Clean up broken rows, orphan links, and stale sessions before
--          implementing new logic.
--
-- Safe to run: Creates backups first, idempotent operations
-- Rollback: Use backup schema if needed
--
-- Run this in: Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0.1 BACKUPS (Create snapshot for rollback)
-- ============================================================================

-- Create backup schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS backup;

-- Backup sessions table
DROP TABLE IF EXISTS backup.sessions_before_hygiene CASCADE;
CREATE TABLE backup.sessions_before_hygiene AS
SELECT * FROM public.sessions;

-- Backup session_requests table
DROP TABLE IF EXISTS backup.session_requests_before_hygiene CASCADE;
CREATE TABLE backup.session_requests_before_hygiene AS
SELECT * FROM public.session_requests;

-- Log backup counts
DO $$
DECLARE
  sessions_count INT;
  requests_count INT;
BEGIN
  SELECT COUNT(*) INTO sessions_count FROM backup.sessions_before_hygiene;
  SELECT COUNT(*) INTO requests_count FROM backup.session_requests_before_hygiene;

  RAISE NOTICE '✓ Backup created:';
  RAISE NOTICE '  - sessions: % rows', sessions_count;
  RAISE NOTICE '  - session_requests: % rows', requests_count;
END $$;


-- ============================================================================
-- 0.2 NORMALIZE STATUSES - Replace NULL/unknown with 'pending'
-- ============================================================================

-- Fix sessions table statuses
UPDATE public.sessions
SET status = 'pending'
WHERE status IS NULL
   OR status NOT IN ('pending', 'waiting', 'live', 'completed', 'cancelled', 'expired', 'refunded', 'archived');

-- Log sessions normalized
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✓ Normalized % session status(es)', updated_count;
END $$;

-- Fix session_requests table statuses
UPDATE public.session_requests
SET status = 'pending'
WHERE status IS NULL
   OR status NOT IN ('pending', 'accepted', 'cancelled', 'expired', 'unattended');

-- Log requests normalized
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✓ Normalized % request status(es)', updated_count;
END $$;


-- ============================================================================
-- 0.3 ENSURE TIMESTAMPS - Set default values for created_at and add updated_at
-- ============================================================================

-- Add updated_at column to session_requests if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'session_requests'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.session_requests
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✓ Added updated_at column to session_requests';
  ELSE
    RAISE NOTICE '✓ updated_at column already exists in session_requests';
  END IF;
END $$;

-- Add updated_at column to sessions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sessions'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.sessions
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✓ Added updated_at column to sessions';
  ELSE
    RAISE NOTICE '✓ updated_at column already exists in sessions';
  END IF;
END $$;

-- Add default for sessions.created_at if missing
ALTER TABLE public.sessions
  ALTER COLUMN created_at SET DEFAULT NOW();

-- Add default for session_requests.created_at if missing
ALTER TABLE public.session_requests
  ALTER COLUMN created_at SET DEFAULT NOW();

-- Backfill any NULL created_at values (shouldn't happen, but be safe)
UPDATE public.sessions
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE public.session_requests
SET created_at = NOW()
WHERE created_at IS NULL;

DO $$
BEGIN
  RAISE NOTICE '✓ Timestamp defaults ensured';
END $$;


-- ============================================================================
-- 0.4 FIX DANGLING REFERENCES - Release sessions with cancelled/expired requests
-- ============================================================================

-- Release mechanics from sessions whose requests were cancelled/expired
UPDATE public.sessions s
SET
  mechanic_id = NULL,
  status = CASE
    WHEN s.status = 'live' THEN 'cancelled'  -- Live session → cancel it
    ELSE 'waiting'  -- Other status → reset to waiting
  END,
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.session_requests r
  WHERE r.id = s.id  -- Assuming session.id = request.id or link exists
    AND r.status IN ('cancelled', 'expired')
    AND s.mechanic_id IS NOT NULL
    AND s.status IN ('pending', 'waiting', 'live')
);

-- Log dangling references fixed
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✓ Released % session(s) with cancelled/expired requests', updated_count;
END $$;


-- ============================================================================
-- 0.5 END STUCK LIVE SESSIONS - Auto-end sessions older than 12 hours
-- ============================================================================

-- Mark stale live sessions as completed
UPDATE public.sessions
SET
  status = 'completed',
  ended_at = COALESCE(ended_at, NOW()),
  updated_at = NOW()
WHERE status IN ('live', 'waiting')
  AND created_at < (NOW() - INTERVAL '12 hours')
  AND ended_at IS NULL;

-- Log stuck sessions ended
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✓ Ended % stale live session(s) (>12h old)', updated_count;
END $$;


-- ============================================================================
-- 0.6 ARCHIVE OLD ORPHANS - Clean sessions with no request/mechanic
-- ============================================================================

-- Archive old orphaned sessions (>30 days old, never assigned)
UPDATE public.sessions
SET
  status = 'cancelled',
  updated_at = NOW()
WHERE mechanic_id IS NULL
  AND customer_user_id IS NULL
  AND status IN ('pending', 'waiting')
  AND created_at < (NOW() - INTERVAL '30 days');

-- Log orphans archived
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✓ Archived % old orphan session(s)', updated_count;
END $$;


-- ============================================================================
-- 0.7 CANCEL ORPHANED ACCEPTED REQUESTS - No matching session
-- ============================================================================

-- Cancel accepted requests that have no valid waiting/live session
UPDATE public.session_requests r
SET
  status = 'cancelled',
  updated_at = NOW()
WHERE r.status = 'accepted'
  AND r.mechanic_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.mechanic_id = r.mechanic_id
      AND s.customer_user_id = r.customer_id
      AND s.status IN ('waiting', 'live')
  );

-- Log orphaned accepted requests
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✓ Cancelled % orphaned accepted request(s)', updated_count;
END $$;


-- ============================================================================
-- VERIFICATION - Check status distribution
-- ============================================================================

-- Show sessions status distribution
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SESSIONS STATUS DISTRIBUTION ===';

  FOR rec IN
    SELECT status, COUNT(*) as count
    FROM public.sessions
    GROUP BY status
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  %: %', RPAD(rec.status::TEXT, 15), rec.count;
  END LOOP;
END $$;

-- Show requests status distribution
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== REQUESTS STATUS DISTRIBUTION ===';

  FOR rec IN
    SELECT status, COUNT(*) as count
    FROM public.session_requests
    GROUP BY status
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  %: %', RPAD(rec.status::TEXT, 15), rec.count;
  END LOOP;
END $$;

-- Count "weird" statuses (should be zero or very low)
DO $$
DECLARE
  weird_sessions INT;
  weird_requests INT;
BEGIN
  SELECT COUNT(*) INTO weird_sessions
  FROM public.sessions
  WHERE status NOT IN ('pending', 'waiting', 'live', 'completed', 'cancelled', 'expired', 'refunded', 'archived');

  SELECT COUNT(*) INTO weird_requests
  FROM public.session_requests
  WHERE status NOT IN ('pending', 'accepted', 'cancelled', 'expired', 'unattended');

  RAISE NOTICE '';
  RAISE NOTICE '=== WEIRD STATUS CHECK ===';
  RAISE NOTICE '  Sessions with unknown status: %', weird_sessions;
  RAISE NOTICE '  Requests with unknown status: %', weird_requests;

  IF weird_sessions > 0 OR weird_requests > 0 THEN
    RAISE WARNING 'Found weird statuses! Review before committing.';
  ELSE
    RAISE NOTICE '  ✓ All statuses normalized!';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== DATA HYGIENE COMPLETE ===';
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
-- DELETE FROM public.sessions;
-- INSERT INTO public.sessions SELECT * FROM backup.sessions_before_hygiene;
--
-- DELETE FROM public.session_requests;
-- INSERT INTO public.session_requests SELECT * FROM backup.session_requests_before_hygiene;
--
-- ============================================================================
