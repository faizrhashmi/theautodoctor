-- Backfill Script: Fix Session End Semantics for Historical Data
-- Corrects sessions that were marked as "cancelled" but actually started and had billable time

-- Preview query (run this first to see what will change)
-- Uncomment to preview before applying:
/*
SELECT
  id,
  status,
  started_at,
  ended_at,
  duration_minutes,
  EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at))::integer AS actual_duration_seconds,
  type,
  plan,
  metadata->'no_show' AS has_no_show_flag,
  metadata->'cancelled_via_end' AS cancelled_via_end
FROM sessions
WHERE status = 'cancelled'
  AND started_at IS NOT NULL
  AND EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at))::integer >= 60
ORDER BY started_at DESC
LIMIT 100;
*/

-- Backfill: Correct sessions that were wrongly marked as cancelled
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
  -- Session ran for at least 60 seconds (1 minute)
  AND EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at))::integer >= 60
  -- Only correct sessions that haven't been manually marked
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

-- Also create audit log entries for corrected sessions
-- Note: Using 'ended' event_type since 'status_corrected' is not in the CHECK constraint
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
  NULL, -- System action, no specific user
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
  -- Only create event if backfill event doesn't already exist
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
