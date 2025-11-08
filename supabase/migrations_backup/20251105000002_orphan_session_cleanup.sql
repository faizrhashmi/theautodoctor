-- Migration: Orphan Session Cleanup
-- Date: 2025-11-05
-- Purpose: Automatically expire stale sessions to keep mechanic queues clean
--
-- This migration creates a function to clean up orphaned sessions and
-- schedules it to run every hour via pg_cron.
--
-- A session is considered "orphaned" or "stale" if:
-- - Status is 'pending' or 'waiting'
-- - Created more than 2 hours ago
-- - No recent activity

-- Create function to expire orphaned sessions
CREATE OR REPLACE FUNCTION expire_orphaned_sessions()
RETURNS TABLE (expired_count INTEGER) AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Update stale sessions to 'expired' status
  WITH expired AS (
    UPDATE sessions
    SET
      status = 'expired',
      ended_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_by', 'auto_cleanup',
        'expired_at', NOW(),
        'expired_reason', 'Session exceeded 2-hour time limit without activity'
      )
    WHERE
      -- Only affect pending/waiting sessions
      status IN ('pending', 'waiting')
      -- Created more than 2 hours ago
      AND created_at < NOW() - INTERVAL '2 hours'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_expired_count FROM expired;

  -- Log the cleanup operation
  IF v_expired_count > 0 THEN
    RAISE NOTICE 'Expired % orphaned session(s)', v_expired_count;
  END IF;

  -- Return the count
  RETURN QUERY SELECT v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION expire_orphaned_sessions IS
'Automatically expires sessions that have been pending/waiting for more than 2 hours without activity';

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION expire_orphaned_sessions() TO service_role;

-- Schedule cleanup job to run every hour
-- Note: Requires pg_cron extension
DO $$
BEGIN
  -- Enable pg_cron if not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Remove existing job if it exists (for idempotent migrations)
  PERFORM cron.unschedule('expire-orphaned-sessions');

  -- Schedule job to run every hour
  PERFORM cron.schedule(
    'expire-orphaned-sessions',  -- job name
    '0 * * * *',  -- cron schedule: every hour at minute 0
    'SELECT expire_orphaned_sessions();'
  );

  RAISE NOTICE 'Scheduled orphan session cleanup to run every hour';
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron extension not available - cleanup job not scheduled';
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to schedule cleanup job: %', SQLERRM;
END$$;

-- IMPORTANT: This function runs automatically every hour via pg_cron.
-- You can also call it manually: SELECT expire_orphaned_sessions();
--
-- To check the cron schedule:
-- SELECT * FROM cron.job WHERE jobname = 'expire-orphaned-sessions';
--
-- To disable the cron job:
-- SELECT cron.unschedule('expire-orphaned-sessions');
