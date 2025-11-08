-- ============================================
-- ADMIN USER MANAGEMENT - PHASE 1 ROLLBACK
-- Date: 2025-11-02
-- Description: Rollback script for Phase 1
-- WARNING: This does NOT drop columns to prevent data loss
-- ============================================

-- ============================================
-- SAFETY NOTICE
-- ============================================
-- This rollback script does NOT drop any columns added by Phase 1.
-- Dropping columns would result in permanent data loss.
--
-- If you need to remove columns, you must:
-- 1. Ensure no data exists in those columns
-- 2. Manually run DROP COLUMN commands
-- 3. Have a full database backup
--
-- This script only drops indexes and constraints for performance rollback.
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Phase 1 Rollback - Safety Mode';
  RAISE NOTICE 'Columns are NOT dropped to prevent data loss';
  RAISE NOTICE 'Only indexes will be removed';
  RAISE NOTICE '============================================';
END $$;

-- Drop indexes created in Phase 1 (if they exist)
DROP INDEX IF EXISTS idx_profiles_account_status;
DROP INDEX IF EXISTS idx_profiles_suspended_until;
DROP INDEX IF EXISTS idx_profiles_email_verified;
DROP INDEX IF EXISTS idx_admin_actions_admin;
DROP INDEX IF EXISTS idx_admin_actions_target;
DROP INDEX IF EXISTS idx_admin_actions_type;

DO $$
BEGIN
  RAISE NOTICE 'Phase 1 indexes removed';
  RAISE NOTICE 'Columns remain in place for data safety';
  RAISE NOTICE 'Manual cleanup required if full removal needed';
END $$;
