-- ========================================
-- ADMIN USER MANAGEMENT SCHEMA INTROSPECTION
-- Date: 2025-11-02
-- Purpose: Verify existing schema before implementing user management features
-- ========================================

-- 1. Check profiles table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check mechanics table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
ORDER BY ordinal_position;

-- 3. Check if admins table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'admins'
) as admins_table_exists;

-- 4. Check if admin_audit_log table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'admin_audit_log'
) as audit_log_table_exists;

-- 5. Get auth.users schema (limited to what we can access)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Check for existing RLS policies on profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- 7. Check for existing RLS policies on mechanics
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'mechanics'
ORDER BY policyname;

-- 8. Sample current profile role distribution
SELECT
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;

-- 9. Check for any existing status-like columns in profiles
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND (
    column_name ILIKE '%status%'
    OR column_name ILIKE '%deleted%'
    OR column_name ILIKE '%banned%'
    OR column_name ILIKE '%suspended%'
    OR column_name ILIKE '%verified%'
  );

-- 10. Check for existing indexes that might need updating
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'mechanics', 'admins', 'admin_audit_log')
ORDER BY tablename, indexname;
