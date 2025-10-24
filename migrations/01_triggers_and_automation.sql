-- ============================================================================
-- STEP 1: DATABASE TRIGGERS & AUTOMATION - Session State Management
-- ============================================================================
--
-- Purpose: Add PostgreSQL triggers to automatically manage session state
--          transitions and enforce business rules at the database level.
--
-- What this does:
-- 1. Auto-set timestamps (accepted_at, started_at, ended_at)
-- 2. Auto-release mechanics when requests are cancelled/expired
-- 3. Prevent mechanics from accepting multiple requests
-- 4. Auto-cancel requests when sessions are cancelled
-- 5. Validate state transitions
--
-- Safe to run: Creates backups first, idempotent operations
-- Rollback: Use backup schema if needed
--
-- Run this in: Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1.1 BACKUPS (Create snapshot for rollback)
-- ============================================================================

-- Ensure backup schema exists
CREATE SCHEMA IF NOT EXISTS backup;

-- Backup session_requests table
DROP TABLE IF EXISTS backup.session_requests_before_triggers CASCADE;
CREATE TABLE backup.session_requests_before_triggers AS
SELECT * FROM public.session_requests;

-- Backup sessions table
DROP TABLE IF EXISTS backup.sessions_before_triggers CASCADE;
CREATE TABLE backup.sessions_before_triggers AS
SELECT * FROM public.sessions;

-- Log backup counts
DO $$
DECLARE
  sessions_count INT;
  requests_count INT;
BEGIN
  SELECT COUNT(*) INTO sessions_count FROM backup.sessions_before_triggers;
  SELECT COUNT(*) INTO requests_count FROM backup.session_requests_before_triggers;

  RAISE NOTICE '✓ Backup created:';
  RAISE NOTICE '  - sessions: % rows', sessions_count;
  RAISE NOTICE '  - session_requests: % rows', requests_count;
END $$;


-- ============================================================================
-- 1.2 ADD accepted_at COLUMN (if missing) & TRIGGER FUNCTION
-- ============================================================================

-- Add accepted_at column to session_requests if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'session_requests'
      AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE public.session_requests
      ADD COLUMN accepted_at TIMESTAMPTZ;
    RAISE NOTICE '✓ Added accepted_at column to session_requests';
  ELSE
    RAISE NOTICE '✓ accepted_at column already exists in session_requests';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION auto_set_request_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'accepted', set accepted_at if not already set
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at = NOW();
    RAISE NOTICE '[TRIGGER] Set accepted_at for request %', NEW.id;
  END IF;

  -- When status changes FROM accepted to something else, clear accepted_at
  IF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
    NEW.accepted_at = NULL;
    RAISE NOTICE '[TRIGGER] Cleared accepted_at for request % (status: %)', NEW.id, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_set_request_accepted_at ON public.session_requests;

-- Create trigger
CREATE TRIGGER trigger_auto_set_request_accepted_at
  BEFORE UPDATE ON public.session_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_request_accepted_at();

DO $$
BEGIN
  RAISE NOTICE '✓ Created trigger: auto_set_request_accepted_at';
END $$;


-- ============================================================================
-- 1.3 TRIGGER FUNCTION: Auto-release mechanic when request is cancelled
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_release_mechanic_on_request_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- When request is cancelled/expired, release the mechanic from associated sessions
  IF NEW.status IN ('cancelled', 'expired') AND OLD.status NOT IN ('cancelled', 'expired') THEN

    -- Find and release waiting sessions for this request
    UPDATE public.sessions
    SET
      mechanic_id = NULL,
      status = 'cancelled',
      ended_at = COALESCE(ended_at, NOW()),
      updated_at = NOW()
    WHERE customer_user_id = NEW.customer_id
      AND mechanic_id = NEW.mechanic_id
      AND status IN ('waiting', 'pending')
      AND mechanic_id IS NOT NULL;

    RAISE NOTICE '[TRIGGER] Released mechanic % from sessions for cancelled request %', NEW.mechanic_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_release_mechanic_on_request_cancel ON public.session_requests;

-- Create trigger
CREATE TRIGGER trigger_auto_release_mechanic_on_request_cancel
  AFTER UPDATE ON public.session_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_release_mechanic_on_request_cancel();

DO $$
BEGIN
  RAISE NOTICE '✓ Created trigger: auto_release_mechanic_on_request_cancel';
END $$;


-- ============================================================================
-- 1.4 TRIGGER FUNCTION: Prevent mechanic from accepting multiple requests
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_multiple_accepted_requests()
RETURNS TRIGGER AS $$
DECLARE
  other_accepted_count INT;
  active_sessions_count INT;
BEGIN
  -- Only check when status is changing TO 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN

    -- Check for other accepted requests
    SELECT COUNT(*) INTO other_accepted_count
    FROM public.session_requests
    WHERE mechanic_id = NEW.mechanic_id
      AND status = 'accepted'
      AND id != NEW.id;

    IF other_accepted_count > 0 THEN
      RAISE EXCEPTION 'Mechanic % already has % accepted request(s). Cannot accept request %.',
        NEW.mechanic_id, other_accepted_count, NEW.id;
    END IF;

    -- Check for active sessions
    SELECT COUNT(*) INTO active_sessions_count
    FROM public.sessions
    WHERE mechanic_id = NEW.mechanic_id
      AND status IN ('waiting', 'live', 'scheduled');

    IF active_sessions_count > 0 THEN
      RAISE EXCEPTION 'Mechanic % already has % active session(s). Cannot accept request %.',
        NEW.mechanic_id, active_sessions_count, NEW.id;
    END IF;

    RAISE NOTICE '[TRIGGER] Validated: Mechanic % can accept request %', NEW.mechanic_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_prevent_multiple_accepted_requests ON public.session_requests;

-- Create trigger
CREATE TRIGGER trigger_prevent_multiple_accepted_requests
  BEFORE UPDATE ON public.session_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_multiple_accepted_requests();

DO $$
BEGIN
  RAISE NOTICE '✓ Created trigger: prevent_multiple_accepted_requests';
END $$;


-- ============================================================================
-- 1.5 TRIGGER FUNCTION: Auto-cancel requests when session is cancelled
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_cancel_request_on_session_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- When session is cancelled, cancel the associated accepted request
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.mechanic_id IS NOT NULL THEN

    UPDATE public.session_requests
    SET
      status = 'cancelled',
      updated_at = NOW()
    WHERE customer_id = NEW.customer_user_id
      AND mechanic_id = NEW.mechanic_id
      AND status = 'accepted';

    RAISE NOTICE '[TRIGGER] Cancelled accepted request for session %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_cancel_request_on_session_cancel ON public.sessions;

-- Create trigger
CREATE TRIGGER trigger_auto_cancel_request_on_session_cancel
  AFTER UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_cancel_request_on_session_cancel();

DO $$
BEGIN
  RAISE NOTICE '✓ Created trigger: auto_cancel_request_on_session_cancel';
END $$;


-- ============================================================================
-- 1.6 TRIGGER FUNCTION: Auto-set session timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_session_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when session transitions to 'live'
  IF NEW.status = 'live' AND OLD.status != 'live' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
    RAISE NOTICE '[TRIGGER] Set started_at for session %', NEW.id;
  END IF;

  -- Set ended_at when session transitions to terminal status
  IF NEW.status IN ('completed', 'cancelled', 'expired')
     AND OLD.status NOT IN ('completed', 'cancelled', 'expired')
     AND NEW.ended_at IS NULL THEN
    NEW.ended_at = NOW();
    RAISE NOTICE '[TRIGGER] Set ended_at for session %', NEW.id;
  END IF;

  -- Always update updated_at
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_set_session_timestamps ON public.sessions;

-- Create trigger
CREATE TRIGGER trigger_auto_set_session_timestamps
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_session_timestamps();

DO $$
BEGIN
  RAISE NOTICE '✓ Created trigger: auto_set_session_timestamps';
END $$;


-- ============================================================================
-- 1.7 FUNCTION: Manual cleanup utility (for admin use)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_mechanic_stuck_requests(p_mechanic_id UUID)
RETURNS TABLE(
  cancelled_requests INT,
  released_sessions INT
) AS $$
DECLARE
  v_cancelled_requests INT;
  v_released_sessions INT;
BEGIN
  -- Cancel all accepted requests for this mechanic
  UPDATE public.session_requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE mechanic_id = p_mechanic_id
    AND status = 'accepted';

  GET DIAGNOSTICS v_cancelled_requests = ROW_COUNT;

  -- Release mechanic from waiting sessions
  UPDATE public.sessions
  SET
    mechanic_id = NULL,
    status = 'cancelled',
    ended_at = COALESCE(ended_at, NOW()),
    updated_at = NOW()
  WHERE mechanic_id = p_mechanic_id
    AND status IN ('waiting', 'pending');

  GET DIAGNOSTICS v_released_sessions = ROW_COUNT;

  RAISE NOTICE '[CLEANUP] Mechanic %: cancelled % request(s), released % session(s)',
    p_mechanic_id, v_cancelled_requests, v_released_sessions;

  RETURN QUERY SELECT v_cancelled_requests, v_released_sessions;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE '✓ Created function: cleanup_mechanic_stuck_requests';
END $$;


-- ============================================================================
-- VERIFICATION - Test trigger functionality
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TRIGGERS INSTALLED ===';
  RAISE NOTICE 'Run the following to test:';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 1: Accept a request (should auto-set accepted_at)';
  RAISE NOTICE 'UPDATE session_requests SET status = ''accepted'', mechanic_id = ''<mechanic-uuid>'' WHERE id = ''<request-uuid>'';';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 2: Cancel a request (should release mechanic from sessions)';
  RAISE NOTICE 'UPDATE session_requests SET status = ''cancelled'' WHERE id = ''<request-uuid>'';';
  RAISE NOTICE '';
  RAISE NOTICE '-- Test 3: Manual cleanup for a mechanic';
  RAISE NOTICE 'SELECT * FROM cleanup_mechanic_stuck_requests(''<mechanic-uuid>'');';
  RAISE NOTICE '';
  RAISE NOTICE '=== LIST ALL TRIGGERS ===';
END $$;

-- List all triggers created
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      trigger_name,
      event_manipulation,
      event_object_table,
      action_timing
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name LIKE 'trigger_%'
    ORDER BY event_object_table, trigger_name
  LOOP
    RAISE NOTICE '  % ON % (% %)',
      rec.trigger_name,
      rec.event_object_table,
      rec.action_timing,
      rec.event_manipulation;
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TRIGGERS READY ===';
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
-- -- Drop all triggers
-- DROP TRIGGER IF EXISTS trigger_auto_set_request_accepted_at ON public.session_requests;
-- DROP TRIGGER IF EXISTS trigger_auto_release_mechanic_on_request_cancel ON public.session_requests;
-- DROP TRIGGER IF EXISTS trigger_prevent_multiple_accepted_requests ON public.session_requests;
-- DROP TRIGGER IF EXISTS trigger_auto_cancel_request_on_session_cancel ON public.sessions;
-- DROP TRIGGER IF EXISTS trigger_auto_set_session_timestamps ON public.sessions;
--
-- -- Drop functions
-- DROP FUNCTION IF EXISTS auto_set_request_accepted_at();
-- DROP FUNCTION IF EXISTS auto_release_mechanic_on_request_cancel();
-- DROP FUNCTION IF EXISTS prevent_multiple_accepted_requests();
-- DROP FUNCTION IF EXISTS auto_cancel_request_on_session_cancel();
-- DROP FUNCTION IF EXISTS auto_set_session_timestamps();
-- DROP FUNCTION IF EXISTS cleanup_mechanic_stuck_requests(UUID);
--
-- -- Restore from backup
-- DELETE FROM public.sessions;
-- INSERT INTO public.sessions SELECT * FROM backup.sessions_before_triggers;
--
-- DELETE FROM public.session_requests;
-- INSERT INTO public.session_requests SELECT * FROM backup.session_requests_before_triggers;
--
-- ============================================================================
