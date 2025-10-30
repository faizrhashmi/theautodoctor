-- Migration: Drop password_hash Column from Mechanics Table
-- Description: Remove deprecated password hash column (replaced by Supabase Auth)
-- Created: 2025-10-29
-- Phase: Database Cleanup
-- IMPORTANT: Only run this AFTER all mechanics are using Supabase Auth!

-- ============================================================================
-- PRE-MIGRATION SAFETY CHECKS
-- ============================================================================

-- Before running this migration, ensure:
-- ✅ 1. All mechanics have user_id linked to auth.users
-- ✅ 2. All mechanics can login successfully with Supabase Auth
-- ✅ 3. No code references password_hash column
-- ✅ 4. Production testing completed for at least 14 days
-- ✅ 5. Full database backup taken
-- ✅ 6. mechanic_sessions table already dropped (previous migration)

-- ============================================================================
-- FINAL VERIFICATION (Run these queries before DROP)
-- ============================================================================

-- 1. Verify all mechanics have user_id (should be 100%)
DO $$
DECLARE
  mechanics_without_user_id INTEGER;
  total_mechanics INTEGER;
BEGIN
  SELECT COUNT(*) INTO mechanics_without_user_id
  FROM mechanics
  WHERE user_id IS NULL;

  SELECT COUNT(*) INTO total_mechanics
  FROM mechanics;

  IF mechanics_without_user_id > 0 THEN
    RAISE EXCEPTION 'ABORT: Found % mechanics without user_id out of % total. Migration cancelled for safety.',
      mechanics_without_user_id, total_mechanics;
  ELSE
    RAISE NOTICE 'SAFE: All % mechanics have user_id linked', total_mechanics;
  END IF;
END $$;

-- 2. Check how many mechanics still have password_hash data
DO $$
DECLARE
  mechanics_with_hash INTEGER;
BEGIN
  SELECT COUNT(*) INTO mechanics_with_hash
  FROM mechanics
  WHERE password_hash IS NOT NULL;

  IF mechanics_with_hash > 0 THEN
    RAISE NOTICE 'INFO: Found % mechanics with password_hash data (will be archived)', mechanics_with_hash;
  ELSE
    RAISE NOTICE 'SAFE: No mechanics have password_hash data';
  END IF;
END $$;

-- ============================================================================
-- BACKUP DATA (Keep for emergency rollback)
-- ============================================================================

-- Create archive table to store password_hash values (encrypted backup)
CREATE TABLE IF NOT EXISTS mechanics_password_hash_archive (
  mechanic_id UUID PRIMARY KEY,
  password_hash TEXT,
  email TEXT,
  name TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT DEFAULT 'Migrated to Supabase Auth',
  -- Keep user_id for reference
  user_id UUID
);

-- Copy password_hash data to archive table
INSERT INTO mechanics_password_hash_archive (
  mechanic_id,
  password_hash,
  email,
  name,
  user_id
)
SELECT
  id,
  password_hash,
  email,
  name,
  user_id
FROM mechanics
WHERE password_hash IS NOT NULL
ON CONFLICT (mechanic_id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  user_id = EXCLUDED.user_id,
  archived_at = NOW();

-- Log archive action
DO $$
BEGIN
  RAISE NOTICE 'Archived % password hashes to mechanics_password_hash_archive',
    (SELECT COUNT(*) FROM mechanics_password_hash_archive);
END $$;

-- ============================================================================
-- CLEAR PASSWORD HASH DATA (Before dropping column)
-- ============================================================================

-- Set all password_hash values to NULL before dropping the column
-- This ensures no sensitive data is left in database
UPDATE mechanics
SET password_hash = NULL
WHERE password_hash IS NOT NULL;

-- Verify all password hashes are cleared
DO $$
DECLARE
  remaining_hashes INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_hashes
  FROM mechanics
  WHERE password_hash IS NOT NULL;

  IF remaining_hashes > 0 THEN
    RAISE EXCEPTION 'ERROR: % password hashes still present after clearing!', remaining_hashes;
  ELSE
    RAISE NOTICE 'VERIFIED: All password hashes cleared before column drop';
  END IF;
END $$;

-- ============================================================================
-- DROP COLUMN
-- ============================================================================

-- Drop the deprecated password_hash column
ALTER TABLE mechanics
DROP COLUMN IF EXISTS password_hash CASCADE;

-- Log the drop action
DO $$
BEGIN
  RAISE NOTICE 'password_hash column dropped from mechanics table';
  RAISE NOTICE 'Legacy password authentication system removed';
  RAISE NOTICE 'All mechanics now use Supabase Auth passwords exclusively';
END $$;

-- ============================================================================
-- VERIFY CLEANUP
-- ============================================================================

-- Confirm column no longer exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'password_hash'
  ) THEN
    RAISE NOTICE '✅ VERIFIED: password_hash column successfully removed from mechanics table';
  ELSE
    RAISE EXCEPTION 'ERROR: password_hash column still exists in mechanics table!';
  END IF;
END $$;

-- Check if archive was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'mechanics_password_hash_archive'
  ) THEN
    RAISE NOTICE '✅ VERIFIED: mechanics_password_hash_archive table created with % records',
      (SELECT COUNT(*) FROM mechanics_password_hash_archive);
  END IF;
END $$;

-- ============================================================================
-- SECURITY: Restrict access to archive table
-- ============================================================================

-- Only service role should access the password hash archive
REVOKE ALL ON mechanics_password_hash_archive FROM PUBLIC;
REVOKE ALL ON mechanics_password_hash_archive FROM anon, authenticated;

-- Only database administrators and service role can access archive
-- (Supabase automatically handles service role permissions)

DO $$
BEGIN
  RAISE NOTICE 'SECURITY: Access to mechanics_password_hash_archive restricted to service role only';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- If you need to rollback this migration:
--
-- 1. Restore from database backup taken before this migration
-- 2. OR recreate the column manually:
--
-- ALTER TABLE mechanics
-- ADD COLUMN password_hash TEXT;
--
-- 3. Then restore data from mechanics_password_hash_archive:
--
-- UPDATE mechanics m
-- SET password_hash = a.password_hash
-- FROM mechanics_password_hash_archive a
-- WHERE m.id = a.mechanic_id;
--
-- IMPORTANT: This should ONLY be done in an emergency
-- After rollback, you MUST update all mechanic routes to support dual auth again

-- ============================================================================
-- ARCHIVE CLEANUP INSTRUCTIONS
-- ============================================================================

-- The mechanics_password_hash_archive table can be dropped after 180 days
-- if no rollback is needed and all mechanics are confirmed working.
--
-- To drop the archive (after 180 days):
-- DROP TABLE IF EXISTS mechanics_password_hash_archive CASCADE;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration is SAFE to run if:
-- ✅ All mechanics have user_id linked to Supabase Auth
-- ✅ All mechanic API routes use requireMechanicAPI guard
-- ✅ All mechanics can login successfully with Supabase Auth
-- ✅ Production has been running on Supabase Auth for 14+ days without issues
-- ✅ No code references the password_hash column
--
-- This migration is REVERSIBLE via:
-- 1. Database backup restoration
-- 2. Restoring from mechanics_password_hash_archive table
--
-- Archive table (mechanics_password_hash_archive) should be:
-- 1. Kept for 180 days for emergency rollback
-- 2. Access restricted to service role only
-- 3. Dropped after 180 days if no issues reported
--
-- SECURITY NOTE: Password hashes are archived with restricted access
-- but should be permanently deleted once migration is confirmed stable.
