-- Fix Session End Semantics Migration
-- Ensures sessions that actually started are marked as "completed", not "cancelled"
-- Only pre-start exits should be marked as "cancelled"

-- Set minimum billable threshold (60 seconds = 1 minute)
-- This prevents accidental/instant connects from counting as billable sessions
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
  -- Method 1: Check if started_at is set
  v_started := (v_session.started_at IS NOT NULL);

  -- Method 2: If not, check session_events for participant joins
  IF NOT v_started THEN
    SELECT MIN(e.created_at) INTO v_first_join
    FROM session_events e
    WHERE e.session_id = p_session_id
      AND e.event_type IN ('participant_joined', 'started', 'mechanic_joined', 'customer_joined');

    IF v_first_join IS NOT NULL THEN
      v_started := true;
      -- Backfill started_at if it was missing
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
    -- Session started and ran long enough → COMPLETED
    v_final := 'completed';
    v_message := format('Session completed after %s seconds', v_duration);
  ELSE
    -- Session never started or too short → CANCELLED (pre-start exit / no-show)
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

-- Add helpful comment
COMMENT ON FUNCTION public.end_session_with_semantics IS
  'Intelligently ends a session with correct semantics: completed if started + billable time, cancelled if pre-start exit';
