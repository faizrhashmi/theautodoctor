-- ============================================================================
-- Auto-Cleanup Stuck Session Requests
-- ============================================================================
-- This migration creates a function to automatically clean up requests that
-- have been in 'pending' or 'accepted' status for too long
-- Date: 2025-10-31
-- ============================================================================

-- Function to clean up stuck requests
CREATE OR REPLACE FUNCTION cleanup_stuck_session_requests()
RETURNS TABLE (
  cleaned_count INTEGER,
  request_ids UUID[]
) AS $$
DECLARE
  cleaned_ids UUID[];
  count_cleaned INTEGER;
BEGIN
  -- Find and update stuck requests (older than 30 minutes)
  WITH updated AS (
    UPDATE session_requests
    SET status = 'cancelled'
    WHERE status IN ('pending', 'accepted')
      AND created_at < NOW() - INTERVAL '30 minutes'
    RETURNING id
  )
  SELECT array_agg(id), COUNT(*)::INTEGER
  INTO cleaned_ids, count_cleaned
  FROM updated;

  -- Return results
  RETURN QUERY SELECT count_cleaned, cleaned_ids;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_stuck_session_requests() IS
'Automatically cancels session requests that have been stuck in pending/accepted status for more than 30 minutes';

-- Optional: Create a cron job to run this automatically (requires pg_cron extension)
-- Uncomment if you want automatic cleanup every 10 minutes:
/*
SELECT cron.schedule(
  'cleanup-stuck-requests',
  '*/10 * * * *',  -- Every 10 minutes
  $$SELECT cleanup_stuck_session_requests()$$
);
*/

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Created cleanup function for stuck session requests';
  RAISE NOTICE '   - Run manually: SELECT * FROM cleanup_stuck_session_requests();';
  RAISE NOTICE '   - Cleans requests older than 30 minutes in pending/accepted status';
END $$;
