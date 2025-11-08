-- Server-Authoritative Timer System
-- Adds clock fields to sessions table and creates RPCs for timer management

-- ==================================================================================
-- Step 1: Add clock fields to sessions table
-- ==================================================================================

DO $$
BEGIN
  -- Add is_paused field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'is_paused'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN is_paused BOOLEAN DEFAULT false;
  END IF;

  -- Add total_paused_ms field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'total_paused_ms'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN total_paused_ms BIGINT DEFAULT 0;
  END IF;

  -- Add last_state_change_at field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'last_state_change_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN last_state_change_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for paused sessions
CREATE INDEX IF NOT EXISTS sessions_is_paused_idx ON public.sessions (is_paused) WHERE is_paused = true;

-- ==================================================================================
-- Step 2: Create session_clock_get RPC
-- ==================================================================================

CREATE OR REPLACE FUNCTION public.session_clock_get(p_session_id UUID)
RETURNS TABLE(
  session_id UUID,
  started_at TIMESTAMPTZ,
  is_paused BOOLEAN,
  total_paused_ms BIGINT,
  last_state_change_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  server_now TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session record;
BEGIN
  -- Fetch session clock data
  SELECT
    s.id,
    s.started_at,
    COALESCE(s.is_paused, false) as is_paused,
    COALESCE(s.total_paused_ms, 0) as total_paused_ms,
    s.last_state_change_at,
    s.duration_minutes
  INTO v_session
  FROM sessions s
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;

  -- Return clock parameters with server timestamp
  RETURN QUERY SELECT
    v_session.id,
    v_session.started_at,
    v_session.is_paused,
    v_session.total_paused_ms,
    v_session.last_state_change_at,
    v_session.duration_minutes,
    now() as server_now;
END;
$$;

COMMENT ON FUNCTION public.session_clock_get IS
  'Returns session clock parameters with server timestamp for client-side computation';

-- ==================================================================================
-- Step 3: Create session_clock_pause RPC
-- ==================================================================================

CREATE OR REPLACE FUNCTION public.session_clock_pause(
  p_session_id UUID,
  p_reason TEXT DEFAULT 'participant_disconnected'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  is_paused BOOLEAN,
  total_paused_ms BIGINT,
  last_state_change_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session record;
  v_now TIMESTAMPTZ := now();
  v_elapsed_since_change BIGINT;
BEGIN
  -- Lock and fetch session
  SELECT
    s.id,
    s.started_at,
    s.is_paused,
    s.total_paused_ms,
    s.last_state_change_at,
    s.status
  INTO v_session
  FROM sessions s
  WHERE s.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;

  -- Check if session is already in terminal state
  IF v_session.status IN ('completed', 'cancelled', 'expired', 'failed') THEN
    RETURN QUERY SELECT
      false,
      'Session is already ended'::TEXT,
      v_session.is_paused,
      v_session.total_paused_ms,
      v_session.last_state_change_at;
    RETURN;
  END IF;

  -- Idempotency: already paused
  IF v_session.is_paused THEN
    RETURN QUERY SELECT
      true,
      'Session already paused'::TEXT,
      true,
      v_session.total_paused_ms,
      v_session.last_state_change_at;
    RETURN;
  END IF;

  -- Can only pause a started session
  IF v_session.started_at IS NULL THEN
    RETURN QUERY SELECT
      false,
      'Cannot pause session that has not started'::TEXT,
      false,
      v_session.total_paused_ms,
      v_session.last_state_change_at;
    RETURN;
  END IF;

  -- Update session to paused state
  UPDATE sessions
  SET
    is_paused = true,
    last_state_change_at = v_now,
    updated_at = v_now,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'pause_events', COALESCE(metadata->'pause_events', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'paused_at', v_now,
          'reason', p_reason
        )
      )
    )
  WHERE id = p_session_id;

  -- Log event
  INSERT INTO session_events (
    session_id,
    event_type,
    created_at,
    metadata
  ) VALUES (
    p_session_id,
    'timer_paused',
    v_now,
    jsonb_build_object(
      'reason', p_reason,
      'paused_at', v_now
    )
  );

  RETURN QUERY SELECT
    true,
    format('Session paused: %s', p_reason)::TEXT,
    true,
    v_session.total_paused_ms,
    v_now;
END;
$$;

COMMENT ON FUNCTION public.session_clock_pause IS
  'Pauses session timer. Idempotent - safe to call repeatedly.';

-- ==================================================================================
-- Step 4: Create session_clock_resume RPC
-- ==================================================================================

CREATE OR REPLACE FUNCTION public.session_clock_resume(
  p_session_id UUID,
  p_reason TEXT DEFAULT 'participants_reconnected'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  is_paused BOOLEAN,
  total_paused_ms BIGINT,
  last_state_change_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session record;
  v_now TIMESTAMPTZ := now();
  v_pause_duration_ms BIGINT;
BEGIN
  -- Lock and fetch session
  SELECT
    s.id,
    s.started_at,
    s.is_paused,
    s.total_paused_ms,
    s.last_state_change_at,
    s.status
  INTO v_session
  FROM sessions s
  WHERE s.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;

  -- Check if session is already in terminal state
  IF v_session.status IN ('completed', 'cancelled', 'expired', 'failed') THEN
    RETURN QUERY SELECT
      false,
      'Session is already ended'::TEXT,
      v_session.is_paused,
      v_session.total_paused_ms,
      v_session.last_state_change_at;
    RETURN;
  END IF;

  -- Idempotency: already running
  IF NOT v_session.is_paused THEN
    RETURN QUERY SELECT
      true,
      'Session already running'::TEXT,
      false,
      v_session.total_paused_ms,
      v_session.last_state_change_at;
    RETURN;
  END IF;

  -- Calculate pause duration and add to total
  v_pause_duration_ms := EXTRACT(EPOCH FROM (v_now - v_session.last_state_change_at)) * 1000;

  -- Update session to running state
  UPDATE sessions
  SET
    is_paused = false,
    total_paused_ms = v_session.total_paused_ms + v_pause_duration_ms,
    last_state_change_at = v_now,
    updated_at = v_now,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'resume_events', COALESCE(metadata->'resume_events', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'resumed_at', v_now,
          'pause_duration_ms', v_pause_duration_ms,
          'reason', p_reason
        )
      )
    )
  WHERE id = p_session_id;

  -- Log event
  INSERT INTO session_events (
    session_id,
    event_type,
    created_at,
    metadata
  ) VALUES (
    p_session_id,
    'timer_resumed',
    v_now,
    jsonb_build_object(
      'reason', p_reason,
      'resumed_at', v_now,
      'pause_duration_ms', v_pause_duration_ms
    )
  );

  RETURN QUERY SELECT
    true,
    format('Session resumed after %s ms: %s', v_pause_duration_ms, p_reason)::TEXT,
    false,
    v_session.total_paused_ms + v_pause_duration_ms,
    v_now;
END;
$$;

COMMENT ON FUNCTION public.session_clock_resume IS
  'Resumes session timer and accumulates paused duration. Idempotent - safe to call repeatedly.';

-- ==================================================================================
-- Step 5: Grant execute permissions
-- ==================================================================================

-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION public.session_clock_get TO authenticated;
GRANT EXECUTE ON FUNCTION public.session_clock_pause TO authenticated;
GRANT EXECUTE ON FUNCTION public.session_clock_resume TO authenticated;
