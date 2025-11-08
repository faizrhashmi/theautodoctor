-- ============================================
-- ADMIN USER MANAGEMENT - PHASE 1 VERIFICATION
-- Date: 2025-11-02
-- Description: Verify all Phase 1 schema changes
-- ============================================

-- Display header
SELECT '============================================' as verification;
SELECT 'PHASE 1 SCHEMA VERIFICATION' as verification;
SELECT '============================================' as verification;

-- ============================================
-- 1. VERIFY PROFILES COLUMNS
-- ============================================

SELECT '1. PROFILES TABLE COLUMNS' as section;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('account_status', 'suspended_until', 'ban_reason', 'email_verified', 'deleted_at', 'anonymized')
ORDER BY column_name;

-- ============================================
-- 2. VERIFY MECHANICS COLUMNS
-- ============================================

SELECT '2. MECHANICS TABLE COLUMNS' as section;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
  AND column_name IN ('account_status', 'suspended_until', 'ban_reason')
ORDER BY column_name;

-- ============================================
-- 3. VERIFY ADMIN_ACTIONS TABLE
-- ============================================

SELECT '3. ADMIN_ACTIONS TABLE' as section;

SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'admin_actions'
) as admin_actions_exists;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_actions'
ORDER BY ordinal_position;

-- ============================================
-- 4. VERIFY INDEXES
-- ============================================

SELECT '4. INDEXES CREATED' as section;

SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'mechanics', 'admin_actions')
  AND (
    indexname LIKE 'idx_profiles_account_status%'
    OR indexname LIKE 'idx_profiles_suspended%'
    OR indexname LIKE 'idx_profiles_email_verified%'
    OR indexname LIKE 'idx_admin_actions%'
  )
ORDER BY tablename, indexname;

-- ============================================
-- 5. DATA SUMMARY
-- ============================================

SELECT '5. DATA SUMMARY' as section;

-- Count profiles by status
SELECT
  'Profiles by Status' as metric,
  account_status,
  COUNT(*) as count
FROM profiles
GROUP BY account_status
ORDER BY count DESC;

-- Count email verification
SELECT
  'Email Verification' as metric,
  email_verified,
  COUNT(*) as count
FROM profiles
GROUP BY email_verified;

-- Count suspended users
SELECT
  'Currently Suspended' as metric,
  COUNT(*) as count
FROM profiles
WHERE account_status = 'suspended'
  AND suspended_until IS NOT NULL
  AND suspended_until > NOW();

-- ============================================
-- 6. VERIFICATION COMPLETE
-- ============================================

SELECT '============================================' as verification;
SELECT 'VERIFICATION COMPLETE' as verification;
SELECT '============================================' as verification;
