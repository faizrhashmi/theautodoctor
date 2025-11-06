-- ============================================================================
-- ADD 'COMPLETED' STATUS TO SESSION_ASSIGNMENTS
-- Enables proper lifecycle tracking for assignments
-- ============================================================================

-- Drop existing constraint
ALTER TABLE session_assignments
DROP CONSTRAINT IF EXISTS session_assignments_status_check;

-- Add new constraint with 'completed' status
ALTER TABLE session_assignments
ADD CONSTRAINT session_assignments_status_check
CHECK (status IN ('queued','offered','accepted','declined','expired','cancelled','completed'));

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Added "completed" status to session_assignments';
  RAISE NOTICE 'Sessions can now be properly marked as completed';
  RAISE NOTICE 'This will fix the issue where completed sessions remain in the queue';
END $$;
