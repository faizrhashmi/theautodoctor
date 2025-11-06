-- ============================================================================
-- ENABLE REALTIME FOR SESSION_ASSIGNMENTS TABLE
-- Required for postgres_changes to work in mechanic dashboard
-- ============================================================================

-- Enable REPLICA IDENTITY FULL to get old values in UPDATE events
-- This is required for postgres_changes to provide payload.old
ALTER TABLE session_assignments REPLICA IDENTITY FULL;

-- Add session_assignments to the supabase_realtime publication
-- This enables postgres_changes subscriptions for this table
DO $$
BEGIN
  -- Check if publication exists and add table to it
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Add table to publication (ignore if already exists)
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE session_assignments;
      RAISE NOTICE '✅ Added session_assignments to supabase_realtime publication';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '✅ session_assignments already in supabase_realtime publication';
    END;
  ELSE
    RAISE NOTICE '⚠️  supabase_realtime publication not found - this is unusual';
  END IF;
END $$;
