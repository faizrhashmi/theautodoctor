-- ============================================================================
-- ADD PENDING_WAIVER STATUS TO SESSION_ASSIGNMENTS
-- Allows free sessions to be created in pending_waiver state until waiver signed
-- ============================================================================

-- Drop existing constraint
ALTER TABLE session_assignments
DROP CONSTRAINT IF EXISTS session_assignments_status_check;

-- Add new constraint with 'pending_waiver' status
ALTER TABLE session_assignments
ADD CONSTRAINT session_assignments_status_check
CHECK (status IN ('pending_waiver','queued','offered','accepted','declined','expired','cancelled','completed'));

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Added pending_waiver status to session_assignments constraint';
  RAISE NOTICE 'Free sessions will now be created with status=pending_waiver until waiver is signed';
END $$;
