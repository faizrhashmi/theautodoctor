-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to auto-expire sessions based on plan duration
CREATE OR REPLACE FUNCTION auto_expire_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  plan_duration INTEGER;
  total_duration_minutes INTEGER;
  start_time TIMESTAMPTZ;
  expected_end_time TIMESTAMPTZ;
  channel_name TEXT;
BEGIN
  -- Loop through all active sessions that have started
  FOR session_record IN
    SELECT id, plan, type, status, started_at, created_at, metadata
    FROM sessions
    WHERE status IN ('pending', 'waiting', 'accepted', 'live', 'in_progress', 'reconnecting')
      AND started_at IS NOT NULL
  LOOP
    -- Get plan duration (default to 15 minutes if not found)
    CASE session_record.plan
      WHEN 'video15' THEN plan_duration := 15;
      WHEN 'video30' THEN plan_duration := 30;
      WHEN 'video60' THEN plan_duration := 60;
      WHEN 'diagnostic' THEN plan_duration := 60;
      WHEN 'quick' THEN plan_duration := 15;
      ELSE plan_duration := 15;
    END CASE;

    total_duration_minutes := plan_duration;

    -- Add any time extensions from metadata
    IF session_record.metadata IS NOT NULL AND session_record.metadata ? 'extended_duration' THEN
      total_duration_minutes := (session_record.metadata->>'extended_duration')::INTEGER;
    ELSIF session_record.metadata IS NOT NULL AND session_record.metadata ? 'extensions' THEN
      -- Sum up all extensions
      SELECT COALESCE(SUM((ext->>'minutes')::INTEGER), 0)
      INTO total_duration_minutes
      FROM jsonb_array_elements(session_record.metadata->'extensions') AS ext;
      total_duration_minutes := plan_duration + total_duration_minutes;
    END IF;

    -- Calculate expected end time
    start_time := session_record.started_at;
    expected_end_time := start_time + (total_duration_minutes || ' minutes')::INTERVAL;

    -- Check if session has expired
    IF NOW() >= expected_end_time THEN
      -- Update session to completed
      UPDATE sessions
      SET
        status = 'completed',
        ended_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'auto_expired', true,
          'auto_expired_reason', 'duration_elapsed',
          'auto_expired_at', NOW(),
          'planned_end_time', expected_end_time
        )
      WHERE id = session_record.id;

      -- Broadcast session:ended event
      -- Note: Supabase Realtime will pick this up if configured
      channel_name := CASE
        WHEN session_record.type = 'chat' THEN 'session-' || session_record.id
        ELSE 'session:' || session_record.id
      END;

      -- Log the expiration
      RAISE NOTICE 'Auto-expired session % (plan: %, duration: % minutes)',
        session_record.id, session_record.plan, total_duration_minutes;

      -- Insert session event for audit trail
      INSERT INTO session_events (session_id, event_type, event_data, user_id, user_role, created_at)
      VALUES (
        session_record.id,
        'session_auto_expired',
        jsonb_build_object(
          'plan', session_record.plan,
          'duration_minutes', total_duration_minutes,
          'expected_end_time', expected_end_time
        ),
        NULL,
        'system',
        NOW()
      );
    END IF;
  END LOOP;
END;
$$;

-- Schedule the function to run every minute
SELECT cron.schedule(
  'auto-expire-sessions',           -- Job name
  '* * * * *',                       -- Every minute (cron expression)
  $$SELECT auto_expire_sessions()$$  -- Function to execute
);

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- To unschedule (if needed):
-- SELECT cron.unschedule('auto-expire-sessions');
