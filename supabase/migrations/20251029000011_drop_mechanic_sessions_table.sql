-- Migration: Drop mechanic_sessions Table
-- Description: Remove deprecated mechanic session tracking table (replaced by Supabase Auth)
-- Created: 2025-10-29
-- Phase: Database Cleanup
-- IMPORTANT: Only run this AFTER verifying all mechanics use Supabase Auth!

-- ============================================================================
-- PRE-MIGRATION SAFETY CHECKS
-- ============================================================================

-- Before running this migration, ensure:
-- ✅ 1. All mechanics have user_id linked to auth.users
-- ✅ 2. All mechanic routes use requireMechanicAPI (not aad_mech cookie)
-- ✅ 3. No active sessions in mechanic_sessions table
-- ✅ 4. Test mechanics can login successfully
-- ✅ 5. Production testing completed for at least 7 days
-- ✅ 6. Full database backup taken

-- ============================================================================
-- FINAL VERIFICATION (Run these queries before DROP)
-- ============================================================================

-- Count active sessions (should be 0)
DO $$
DECLARE
  active_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'mechanic_sessions'
  ) THEN
    SELECT COUNT(*) INTO active_count
    FROM mechanic_sessions
    WHERE expires_at > NOW();

    IF active_count > 0 THEN
      RAISE EXCEPTION 'ABORT: Found % active sessions in mechanic_sessions table. Migration cancelled for safety.', active_count;
    ELSE
      RAISE NOTICE 'SAFE: No active sessions found in mechanic_sessions table';
    END IF;
  ELSE
    RAISE NOTICE 'mechanic_sessions table does not exist - already dropped';
  END IF;
END $$;

-- ============================================================================
-- BACKUP DATA (Optional - keep for historical analysis)
-- ============================================================================

-- Create archive table with session data for historical reference
CREATE TABLE IF NOT EXISTS mechanic_sessions_archive (
  id UUID PRIMARY KEY,
  mechanic_id UUID,
  token TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT DEFAULT 'Migrated to Supabase Auth'
);

-- Copy data to archive (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'mechanic_sessions'
  ) THEN
    INSERT INTO mechanic_sessions_archive (
      id, mechanic_id, token, created_at, expires_at
    )
    SELECT id, mechanic_id, token, created_at, expires_at
    FROM mechanic_sessions
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Archived % sessions to mechanic_sessions_archive',
      (SELECT COUNT(*) FROM mechanic_sessions);
  ELSE
    RAISE NOTICE 'mechanic_sessions table does not exist - no data to archive';
  END IF;
END $$;

-- ============================================================================
-- DROP TABLE
-- ============================================================================

-- Drop the deprecated mechanic_sessions table
DROP TABLE IF EXISTS mechanic_sessions CASCADE;

-- Log the drop action
DO $$
BEGIN
  RAISE NOTICE 'mechanic_sessions table dropped successfully';
  RAISE NOTICE 'Legacy mechanic authentication system removed';
  RAISE NOTICE 'All mechanics now use Supabase Auth exclusively';
END $$;

-- ============================================================================
-- VERIFY CLEANUP
-- ============================================================================

-- Confirm table no longer exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'mechanic_sessions'
  ) THEN
    RAISE NOTICE '✅ VERIFIED: mechanic_sessions table successfully removed';
  ELSE
    RAISE EXCEPTION 'ERROR: mechanic_sessions table still exists!';
  END IF;
END $$;

-- Check if archive was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'mechanic_sessions_archive'
  ) THEN
    RAISE NOTICE '✅ VERIFIED: mechanic_sessions_archive table created with % records',
      (SELECT COUNT(*) FROM mechanic_sessions_archive);
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- If you need to rollback this migration:
--
-- 1. Restore from database backup taken before this migration
-- 2. OR recreate the table manually:
--
-- CREATE TABLE mechanic_sessions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
--   token TEXT NOT NULL UNIQUE,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   expires_at TIMESTAMPTZ NOT NULL
-- );
--
-- CREATE INDEX idx_mechanic_sessions_token ON mechanic_sessions(token);
-- CREATE INDEX idx_mechanic_sessions_mechanic_id ON mechanic_sessions(mechanic_id);
-- CREATE INDEX idx_mechanic_sessions_expires_at ON mechanic_sessions(expires_at);
--
-- 3. Then restore data from mechanic_sessions_archive:
--
-- INSERT INTO mechanic_sessions (id, mechanic_id, token, created_at, expires_at)
-- SELECT id, mechanic_id, token, created_at, expires_at
-- FROM mechanic_sessions_archive;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration is SAFE to run if:
-- ✅ All mechanics have user_id linked to Supabase Auth
-- ✅ All mechanic API routes use requireMechanicAPI guard
-- ✅ No active sessions exist in mechanic_sessions table
-- ✅ Production has been running on Supabase Auth for 7+ days without issues
--
-- This migration is REVERSIBLE via:
-- 1. Database backup restoration
-- 2. Restoring from mechanic_sessions_archive table
--
-- Archive table (mechanic_sessions_archive) can be dropped after 90 days
-- if no issues are reported.
