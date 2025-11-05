-- Apply Session Semantic Fix Migrations
-- Run this in Supabase SQL Editor or via: npx supabase db execute --file apply-semantic-fix.sql

-- ==================================================================================
-- Migration 1: Create the semantic function
-- ==================================================================================

-- Set minimum billable threshold (60 seconds = 1 minute)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_settings
    WHERE name = 'app.min_billable_seconds'
  ) THEN
    PERFORM set_config('app.min_billable_seconds', '60', false);
  END IF;
END $$;

-- Create function to intelligently end sessions with correct semantics
CREATE OR REPLACE FUNCTION public.end_session_with_semantics(
  p_session_id uuid,
  p_actor_id uuid,
  p_actor_role text DEFAULT 'customer',
  p_reason text DEFAULT NULL
)
RETURNS TABLE(
  final_status text,
  started boolean,
  duration_seconds integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session record;
  v_started boolean;
  v_first_join timestamptz;
  v_now timestamptz := now();
  v_min_billable integer := COALESCE(current_setting('app.min_billable_seconds', true)::integer, 60);
  v_duration integer := 0;
  v_final text;
  v_message text;
BEGIN
  -- Lock the session row to prevent race conditions
  SELECT s.* INTO v_session
  FROM sessions s
  WHERE s.id = p_session_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found or locked', p_session_id;
  END IF;

  -- Check if session is already in a terminal state (idempotency)
  IF v_session.status IN ('completed', 'cancelled', 'expired', 'failed') THEN
    RETURN QUERY SELECT
      v_session.status::text,
      (v_session.started_at IS NOT NULL)::boolean,
      COALESCE(EXTRACT(EPOCH FROM (COALESCE(v_session.ended_at, v_now) - v_session.started_at))::integer, 0)::integer,
      'Session already in terminal state'::text;
    RETURN;
  END IF;

  -- Determine if session actually started
  v_started := (v_session.started_at IS NOT NULL);

  -- If not, check session_events for participant joins
  IF NOT v_started THEN
    SELECT MIN(e.created_at) INTO v_first_join
    FROM session_events e
    WHERE e.session_id = p_session_id
      AND e.event_type IN ('participant_joined', 'started', 'mechanic_joined', 'customer_joined');

    IF v_first_join IS NOT NULL THEN
      v_started := true;
      UPDATE sessions
      SET started_at = v_first_join
      WHERE id = p_session_id AND started_at IS NULL;

      v_session.started_at := v_first_join;
    END IF;
  END IF;

  -- Calculate actual session duration
  IF v_started THEN
    v_duration := GREATEST(
      0,
      EXTRACT(EPOCH FROM (v_now - COALESCE(v_session.started_at, v_first_join)))::integer
    );
  END IF;

  -- DECISION LOGIC: Determine final status
  IF v_started AND v_duration >= v_min_billable THEN
    v_final := 'completed';
    v_message := format('Session completed after %s seconds', v_duration);
  ELSE
    v_final := 'cancelled';
    IF NOT v_started THEN
      v_message := 'Session cancelled - never started (no-show)';
    ELSE
      v_message := format('Session cancelled - duration (%ss) below minimum (%ss)', v_duration, v_min_billable);
    END IF;
  END IF;

  -- Update the session with final status
  UPDATE sessions
  SET
    status = v_final,
    ended_at = v_now,
    updated_at = v_now,
    duration_minutes = CASE
      WHEN v_final = 'completed' THEN GREATEST(1, ROUND(v_duration / 60.0))
      ELSE 0
    END,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'end_semantics', jsonb_build_object(
        'ended_at', v_now,
        'ended_by_role', p_actor_role,
        'ended_by_id', p_actor_id,
        'reason', COALESCE(p_reason, 'user_ended'),
        'started', v_started,
        'duration_seconds', v_duration,
        'min_billable_seconds', v_min_billable,
        'final_status', v_final
      )
    )
  WHERE id = p_session_id;

  -- Log session event
  INSERT INTO session_events (
    session_id,
    event_type,
    user_id,
    created_at,
    metadata
  ) VALUES (
    p_session_id,
    CASE WHEN v_final = 'completed' THEN 'ended' ELSE 'cancelled' END,
    p_actor_id,
    v_now,
    jsonb_build_object(
      'final_status', v_final,
      'started', v_started,
      'duration_seconds', v_duration,
      'reason', COALESCE(p_reason, 'user_ended'),
      'actor_role', p_actor_role
    )
  );

  -- Return result
  RETURN QUERY SELECT
    v_final::text,
    v_started::boolean,
    v_duration::integer,
    v_message::text;
END;
$$;

COMMENT ON FUNCTION public.end_session_with_semantics IS
  'Intelligently ends a session with correct semantics: completed if started + billable time, cancelled if pre-start exit';

-- ==================================================================================
-- Migration 2: Backfill historical incorrect sessions
-- ==================================================================================

-- Correct sessions that were wrongly marked as cancelled
UPDATE sessions
SET
  status = 'completed',
  updated_at = now(),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'backfilled', jsonb_build_object(
      'corrected_at', now(),
      'original_status', 'cancelled',
      'reason', 'Session actually started and had billable time',
      'duration_seconds', EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at))::integer
    )
  )
WHERE status = 'cancelled'
  AND started_at IS NOT NULL
  AND EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at))::integer >= 60
  AND NOT (metadata ? 'manual_correction');

-- Log how many records were corrected
DO $$
DECLARE
  v_corrected_count integer;
BEGIN
  SELECT COUNT(*) INTO v_corrected_count
  FROM sessions
  WHERE status = 'completed'
    AND metadata ? 'backfilled';

  RAISE NOTICE '✓ Backfill complete: Corrected % session(s) from cancelled to completed', v_corrected_count;
END $$;

-- Create audit log entries for corrected sessions
INSERT INTO session_events (
  session_id,
  event_type,
  user_id,
  created_at,
  metadata
)
SELECT
  id,
  'ended',
  NULL,
  now(),
  jsonb_build_object(
    'backfill_correction', true,
    'from_status', 'cancelled',
    'to_status', 'completed',
    'reason', 'Backfill: Session actually started and had billable time',
    'duration_seconds', EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at))::integer,
    'backfilled_at', now()
  )
FROM sessions
WHERE status = 'completed'
  AND metadata ? 'backfilled'
  AND NOT EXISTS (
    SELECT 1 FROM session_events se
    WHERE se.session_id = sessions.id
      AND se.metadata @> '{"backfill_correction": true}'::jsonb
  );

-- Summary report
DO $$
DECLARE
  v_total_corrected integer;
  v_total_cancelled integer;
  v_total_completed integer;
BEGIN
  SELECT COUNT(*) INTO v_total_corrected
  FROM sessions
  WHERE metadata ? 'backfilled';

  SELECT COUNT(*) INTO v_total_cancelled
  FROM sessions
  WHERE status = 'cancelled';

  SELECT COUNT(*) INTO v_total_completed
  FROM sessions
  WHERE status = 'completed';

  RAISE NOTICE '=== Session Status Correction Summary ===';
  RAISE NOTICE 'Total corrected: %', v_total_corrected;
  RAISE NOTICE 'Remaining cancelled: %', v_total_cancelled;
  RAISE NOTICE 'Total completed: %', v_total_completed;
  RAISE NOTICE '========================================';
END $$;
