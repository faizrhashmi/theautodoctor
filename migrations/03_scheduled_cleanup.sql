-- ============================================================================
-- Migration 03: SCHEDULED CLEANUP - No-show timers and stuck session handling
-- ============================================================================
--
-- Purpose: Automated cleanup of abandoned/stuck sessions and requests
--
-- Timers:
-- 1. Customer no-show: Cancel after 10 minutes (accepted → cancelled)
-- 2. Mechanic no-show: Release after 5 minutes of no join (waiting → pending)
-- 3. Stuck sessions: End after 3 hours (live/reconnecting → cancelled)
--
-- These functions can be:
-- - Called manually via Supabase Dashboard
-- - Triggered by Supabase Edge Functions on schedule
-- - Triggered by pg_cron (if enabled in your Supabase project)
--
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: Cancel customer no-shows
-- ============================================================================
-- Cancels requests that have been accepted but customer hasn't shown up for 10+ minutes
-- Status: accepted → cancelled
-- This frees up the mechanic to accept other requests

CREATE OR REPLACE FUNCTION cleanup_customer_no_shows()
RETURNS TABLE(
  request_id UUID,
  customer_id UUID,
  mechanic_id UUID,
  action TEXT,
  elapsed_minutes INTEGER
) AS $$
DECLARE
  timeout_minutes INTEGER := 10;
  affected_count INTEGER := 0;
BEGIN
  -- Find accepted requests where customer hasn't joined for 10+ minutes
  -- and cancel them, releasing the mechanic

  WITH cancelled_requests AS (
    UPDATE public.session_requests
    SET
      status = 'cancelled',
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'cancelled_reason', 'customer_no_show',
        'cancelled_at', NOW(),
        'timeout_minutes', timeout_minutes
      )
    WHERE
      status = 'accepted'
      AND accepted_at IS NOT NULL
      AND accepted_at < NOW() - INTERVAL '10 minutes'
      -- Exclude if there's already an active session for this request
      AND NOT EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.metadata->>'request_id' = session_requests.id::TEXT
          AND s.status IN ('waiting', 'live')
      )
    RETURNING
      id,
      customer_id,
      mechanic_id,
      EXTRACT(EPOCH FROM (NOW() - accepted_at)) / 60 AS elapsed_minutes
  )
  SELECT
    cr.id,
    cr.customer_id,
    cr.mechanic_id,
    'cancelled_customer_no_show' AS action,
    cr.elapsed_minutes::INTEGER
  FROM cancelled_requests cr
  INTO request_id, customer_id, mechanic_id, action, elapsed_minutes;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RAISE NOTICE '[CLEANUP] Customer no-shows: Cancelled % requests', affected_count;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION 2: Reassign mechanic no-shows
-- ============================================================================
-- Releases sessions that have been waiting for mechanic to join for 5+ minutes
-- Status: waiting → cancelled (session), accepted → pending (request)
-- This returns the request to the queue for another mechanic

CREATE OR REPLACE FUNCTION cleanup_mechanic_no_shows()
RETURNS TABLE(
  session_id UUID,
  request_id TEXT,
  mechanic_id UUID,
  customer_id UUID,
  action TEXT,
  elapsed_minutes INTEGER
) AS $$
DECLARE
  timeout_minutes INTEGER := 5;
  affected_count INTEGER := 0;
BEGIN
  -- Find sessions stuck in 'waiting' status for 5+ minutes (mechanic hasn't joined)
  -- Cancel the session and reset the request to pending

  WITH released_sessions AS (
    UPDATE public.sessions
    SET
      status = 'cancelled',
      ended_at = NOW(),
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'cancelled_reason', 'mechanic_no_show',
        'cancelled_at', NOW(),
        'timeout_minutes', timeout_minutes
      )
    WHERE
      status = 'waiting'
      AND created_at < NOW() - INTERVAL '5 minutes'
      AND started_at IS NULL -- Mechanic never joined
    RETURNING
      id,
      mechanic_id,
      customer_user_id,
      metadata->>'request_id' AS request_id,
      EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS elapsed_minutes
  ),
  reset_requests AS (
    UPDATE public.session_requests
    SET
      status = 'pending',
      mechanic_id = NULL,
      accepted_at = NULL,
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'reassigned_reason', 'mechanic_no_show',
        'reassigned_at', NOW(),
        'previous_mechanic', (
          SELECT mechanic_id FROM released_sessions
          WHERE released_sessions.request_id = session_requests.id::TEXT
          LIMIT 1
        )
      )
    WHERE
      id::TEXT IN (SELECT request_id FROM released_sessions WHERE request_id IS NOT NULL)
    RETURNING id
  )
  SELECT
    rs.id,
    rs.request_id,
    rs.mechanic_id,
    rs.customer_user_id,
    'released_mechanic_no_show' AS action,
    rs.elapsed_minutes::INTEGER
  FROM released_sessions rs
  INTO session_id, request_id, mechanic_id, customer_id, action, elapsed_minutes;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RAISE NOTICE '[CLEANUP] Mechanic no-shows: Released % sessions, reset % requests',
    affected_count,
    (SELECT COUNT(*) FROM reset_requests);

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION 3: End stuck live/reconnecting sessions
-- ============================================================================
-- Ends sessions that have been live or reconnecting for 3+ hours
-- Status: live/reconnecting → cancelled
-- This prevents sessions from being stuck forever

CREATE OR REPLACE FUNCTION cleanup_stuck_live_sessions()
RETURNS TABLE(
  session_id UUID,
  mechanic_id UUID,
  customer_id UUID,
  status TEXT,
  action TEXT,
  elapsed_hours NUMERIC
) AS $$
DECLARE
  timeout_hours INTEGER := 3;
  affected_count INTEGER := 0;
BEGIN
  -- Find sessions stuck in 'live' status for 3+ hours and end them

  WITH ended_sessions AS (
    UPDATE public.sessions
    SET
      status = 'cancelled',
      ended_at = NOW(),
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'cancelled_reason', 'stuck_session_timeout',
        'cancelled_at', NOW(),
        'timeout_hours', timeout_hours,
        'previous_status', status
      )
    WHERE
      status IN ('live', 'reconnecting')
      AND started_at IS NOT NULL
      AND started_at < NOW() - INTERVAL '3 hours'
    RETURNING
      id,
      mechanic_id,
      customer_user_id,
      (metadata->>'previous_status')::TEXT AS previous_status,
      EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600 AS elapsed_hours
  )
  SELECT
    es.id,
    es.mechanic_id,
    es.customer_user_id,
    es.previous_status,
    'cancelled_stuck_session' AS action,
    ROUND(es.elapsed_hours, 2) AS elapsed_hours
  FROM ended_sessions es
  INTO session_id, mechanic_id, customer_id, status, action, elapsed_hours;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RAISE NOTICE '[CLEANUP] Stuck sessions: Cancelled % live/reconnecting sessions', affected_count;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION 4: Master cleanup function (runs all cleanups)
-- ============================================================================
-- Runs all cleanup functions in sequence and returns summary

CREATE OR REPLACE FUNCTION run_scheduled_cleanup()
RETURNS TABLE(
  cleanup_type TEXT,
  affected_count INTEGER,
  run_at TIMESTAMPTZ
) AS $$
DECLARE
  customer_no_shows INTEGER := 0;
  mechanic_no_shows INTEGER := 0;
  stuck_sessions INTEGER := 0;
  run_timestamp TIMESTAMPTZ := NOW();
BEGIN
  RAISE NOTICE '[CLEANUP] ===== STARTING SCHEDULED CLEANUP =====';
  RAISE NOTICE '[CLEANUP] Timestamp: %', run_timestamp;

  -- 1. Customer no-shows
  BEGIN
    SELECT COUNT(*) INTO customer_no_shows
    FROM cleanup_customer_no_shows();

    RAISE NOTICE '[CLEANUP] ✓ Customer no-shows: % cancelled', customer_no_shows;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[CLEANUP] ✗ Customer no-show cleanup failed: %', SQLERRM;
  END;

  -- 2. Mechanic no-shows
  BEGIN
    SELECT COUNT(*) INTO mechanic_no_shows
    FROM cleanup_mechanic_no_shows();

    RAISE NOTICE '[CLEANUP] ✓ Mechanic no-shows: % released', mechanic_no_shows;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[CLEANUP] ✗ Mechanic no-show cleanup failed: %', SQLERRM;
  END;

  -- 3. Stuck live sessions
  BEGIN
    SELECT COUNT(*) INTO stuck_sessions
    FROM cleanup_stuck_live_sessions();

    RAISE NOTICE '[CLEANUP] ✓ Stuck sessions: % cancelled', stuck_sessions;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[CLEANUP] ✗ Stuck session cleanup failed: %', SQLERRM;
  END;

  RAISE NOTICE '[CLEANUP] ===== CLEANUP COMPLETE =====';
  RAISE NOTICE '[CLEANUP] Total affected: %', (customer_no_shows + mechanic_no_shows + stuck_sessions);

  -- Return summary
  RETURN QUERY
  SELECT 'customer_no_shows'::TEXT, customer_no_shows, run_timestamp
  UNION ALL
  SELECT 'mechanic_no_shows'::TEXT, mechanic_no_shows, run_timestamp
  UNION ALL
  SELECT 'stuck_sessions'::TEXT, stuck_sessions, run_timestamp;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION: Show what would be affected by cleanup (dry run)
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CLEANUP DRY RUN - Preview what would be cleaned ===';
  RAISE NOTICE '';

  -- Customer no-shows (accepted > 10 min, no session)
  RAISE NOTICE '[1] Customer no-shows (accepted > 10 min):';
  FOR rec IN
    SELECT
      id,
      customer_id,
      mechanic_id,
      status,
      EXTRACT(EPOCH FROM (NOW() - accepted_at)) / 60 AS elapsed_minutes
    FROM public.session_requests
    WHERE
      status = 'accepted'
      AND accepted_at IS NOT NULL
      AND accepted_at < NOW() - INTERVAL '10 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.metadata->>'request_id' = session_requests.id::TEXT
          AND s.status IN ('waiting', 'live')
      )
    LIMIT 5
  LOOP
    RAISE NOTICE '  - Request % (elapsed: % min)', rec.id, ROUND(rec.elapsed_minutes);
  END LOOP;

  -- Mechanic no-shows (waiting > 5 min, not started)
  RAISE NOTICE '';
  RAISE NOTICE '[2] Mechanic no-shows (waiting > 5 min, not started):';
  FOR rec IN
    SELECT
      id,
      mechanic_id,
      customer_user_id,
      status,
      EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS elapsed_minutes
    FROM public.sessions
    WHERE
      status = 'waiting'
      AND created_at < NOW() - INTERVAL '5 minutes'
      AND started_at IS NULL
    LIMIT 5
  LOOP
    RAISE NOTICE '  - Session % (elapsed: % min)', rec.id, ROUND(rec.elapsed_minutes);
  END LOOP;

  -- Stuck sessions (live > 3 hours)
  RAISE NOTICE '';
  RAISE NOTICE '[3] Stuck sessions (live > 3 hours):';
  FOR rec IN
    SELECT
      id,
      mechanic_id,
      customer_user_id,
      status,
      EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600 AS elapsed_hours
    FROM public.sessions
    WHERE
      status IN ('live', 'reconnecting')
      AND started_at IS NOT NULL
      AND started_at < NOW() - INTERVAL '3 hours'
    LIMIT 5
  LOOP
    RAISE NOTICE '  - Session % (elapsed: % hours)', rec.id, ROUND(rec.elapsed_hours, 1);
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== DRY RUN COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'To run cleanup, execute: SELECT * FROM run_scheduled_cleanup();';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- COMMIT MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Migration 03: Scheduled cleanup functions created successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  1. cleanup_customer_no_shows() - Cancel requests with no customer (10 min)';
  RAISE NOTICE '  2. cleanup_mechanic_no_shows() - Release sessions with no mechanic (5 min)';
  RAISE NOTICE '  3. cleanup_stuck_live_sessions() - End stuck live sessions (3 hours)';
  RAISE NOTICE '  4. run_scheduled_cleanup() - Master function that runs all cleanups';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  - Test: SELECT * FROM run_scheduled_cleanup();';
  RAISE NOTICE '  - Schedule with Supabase Edge Functions (recommended)';
  RAISE NOTICE '  - Or use pg_cron if enabled: SELECT cron.schedule(...)';
  RAISE NOTICE '';
END $$;
