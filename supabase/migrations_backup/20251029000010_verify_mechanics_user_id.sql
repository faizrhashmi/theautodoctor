-- Migration: Verify All Mechanics Have user_id
-- Description: Check that all mechanics are linked to Supabase Auth before dropping legacy auth
-- Created: 2025-10-29
-- Phase: Database Cleanup

-- ============================================================================
-- VERIFICATION QUERIES (Run these BEFORE dropping tables/columns)
-- ============================================================================

-- 1. Count mechanics without user_id link
-- EXPECTED: 0 mechanics
SELECT
  COUNT(*) as mechanics_without_user_id,
  'CRITICAL: These mechanics need migration before cleanup' as note
FROM mechanics
WHERE user_id IS NULL;

-- 2. List mechanics without user_id (if any)
SELECT
  id,
  email,
  name,
  created_at,
  'NEEDS MIGRATION' as status
FROM mechanics
WHERE user_id IS NULL
ORDER BY created_at;

-- 3. Verify user_id links are valid
-- Check that all user_id values point to actual Supabase Auth users
SELECT
  COUNT(*) as mechanics_with_invalid_user_id,
  'CRITICAL: These mechanics have invalid user_id links' as note
FROM mechanics m
WHERE m.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = m.user_id
  );

-- 4. Count mechanics with valid user_id
-- This should equal the total number of mechanics
SELECT
  COUNT(*) as mechanics_with_valid_user_id,
  'These mechanics are ready for cleanup' as note
FROM mechanics m
WHERE m.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = m.user_id
  );

-- 5. Summary of mechanic authentication status
SELECT
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as without_user_id,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user_id,
  COUNT(*) as total_mechanics,
  ROUND(
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as migration_percentage
FROM mechanics;

-- ============================================================================
-- SAFETY CHECKS
-- ============================================================================

-- 6. Verify no active sessions in mechanic_sessions table
-- EXPECTED: 0 active sessions (or table doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'mechanic_sessions'
  ) THEN
    RAISE NOTICE 'mechanic_sessions table exists';

    -- Check for active sessions
    EXECUTE '
      SELECT
        COUNT(*) as active_sessions,
        ''WARNING: These sessions are still active'' as note
      FROM mechanic_sessions
      WHERE expires_at > NOW()
    ';
  ELSE
    RAISE NOTICE 'mechanic_sessions table does not exist - cleanup already done';
  END IF;
END $$;

-- 7. Check if password_hash column still contains data
SELECT
  COUNT(CASE WHEN password_hash IS NOT NULL THEN 1 END) as mechanics_with_password_hash,
  COUNT(*) as total_mechanics,
  'These mechanics have legacy password hashes that should be NULL' as note
FROM mechanics;

-- ============================================================================
-- PREREQUISITES FOR CLEANUP
-- ============================================================================

-- ALL of these conditions must be TRUE before proceeding:
--
-- ✅ 1. All mechanics have user_id IS NOT NULL
-- ✅ 2. All user_id values point to valid auth.users entries
-- ✅ 3. No active sessions in mechanic_sessions table
-- ✅ 4. All API routes using requireMechanicAPI (not aad_mech cookie)
-- ✅ 5. Test mechanics can login successfully
-- ✅ 6. No 401 errors in production logs
--
-- If ANY condition is FALSE, DO NOT proceed with cleanup!

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- If cleanup causes issues, we can restore the data from backups:
-- 1. mechanic_sessions table can be recreated from backup
-- 2. password_hash column values can be restored from backup
-- 3. But user_id links should NOT be removed once created!

-- RECOMMENDATION: Take a full database backup before running cleanup migrations
