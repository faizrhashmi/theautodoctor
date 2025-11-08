-- ============================================================================
-- CLEANUP STUCK SESSION ASSIGNMENTS
-- Fix assignments that should be completed but aren't
-- ============================================================================

-- Update assignments for completed sessions
UPDATE session_assignments sa
SET
  status = 'completed',
  updated_at = NOW(),
  metadata = COALESCE(sa.metadata, '{}'::jsonb) || jsonb_build_object(
    'cleanup_at', NOW(),
    'cleanup_reason', 'retroactive_completion_fix',
    'previous_status', sa.status
  )
FROM sessions s
WHERE sa.session_id = s.id
  AND s.status = 'completed'
  AND sa.status IN ('accepted', 'queued', 'offered');

-- Update assignments for cancelled sessions
UPDATE session_assignments sa
SET
  status = 'cancelled',
  updated_at = NOW(),
  metadata = COALESCE(sa.metadata, '{}'::jsonb) || jsonb_build_object(
    'cleanup_at', NOW(),
    'cleanup_reason', 'retroactive_cancellation_fix',
    'previous_status', sa.status
  )
FROM sessions s
WHERE sa.session_id = s.id
  AND s.status = 'cancelled'
  AND sa.status IN ('accepted', 'queued', 'offered');

-- Update assignments for expired sessions
UPDATE session_assignments sa
SET
  status = 'expired',
  updated_at = NOW(),
  expired_at = COALESCE(sa.expired_at, NOW()),
  metadata = COALESCE(sa.metadata, '{}'::jsonb) || jsonb_build_object(
    'cleanup_at', NOW(),
    'cleanup_reason', 'retroactive_expiration_fix',
    'previous_status', sa.status
  )
FROM sessions s
WHERE sa.session_id = s.id
  AND s.status = 'expired'
  AND sa.status IN ('queued', 'offered');

-- Log results
DO $$
DECLARE
  completed_count INTEGER;
  cancelled_count INTEGER;
  expired_count INTEGER;
BEGIN
  -- Count what was updated
  SELECT COUNT(*) INTO completed_count
  FROM session_assignments sa
  JOIN sessions s ON sa.session_id = s.id
  WHERE s.status = 'completed'
    AND sa.status = 'completed'
    AND sa.metadata ? 'cleanup_reason';

  SELECT COUNT(*) INTO cancelled_count
  FROM session_assignments sa
  JOIN sessions s ON sa.session_id = s.id
  WHERE s.status = 'cancelled'
    AND sa.status = 'cancelled'
    AND sa.metadata ? 'cleanup_reason';

  SELECT COUNT(*) INTO expired_count
  FROM session_assignments sa
  JOIN sessions s ON sa.session_id = s.id
  WHERE s.status = 'expired'
    AND sa.status = 'expired'
    AND sa.metadata ? 'cleanup_reason';

  RAISE NOTICE '✅ Cleanup completed:';
  RAISE NOTICE '  - % assignments marked as completed', completed_count;
  RAISE NOTICE '  - % assignments marked as cancelled', cancelled_count;
  RAISE NOTICE '  - % assignments marked as expired', expired_count;
  RAISE NOTICE 'Total: % assignments cleaned up', completed_count + cancelled_count + expired_count;
END $$;
