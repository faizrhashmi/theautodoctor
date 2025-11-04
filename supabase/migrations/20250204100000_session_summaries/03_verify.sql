-- ============================================
-- Verify: Session Summaries System
-- Purpose: Confirm table creation and permissions
-- ============================================

-- Check table exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'session_summaries'
    )
    THEN '✓ session_summaries table exists'
    ELSE '✗ session_summaries table MISSING'
  END AS table_check;

-- Check columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'session_summaries'
ORDER BY ordinal_position;

-- Check indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'session_summaries';

-- Check RLS is enabled
SELECT
  CASE
    WHEN relrowsecurity
    THEN '✓ RLS enabled'
    ELSE '✗ RLS NOT enabled'
  END AS rls_status
FROM pg_class
WHERE relname = 'session_summaries'
AND relnamespace = 'public'::regnamespace;

-- Check policies exist
SELECT
  policyname,
  cmd,
  qual IS NOT NULL AS has_using_clause,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'session_summaries'
ORDER BY policyname;

-- Count existing summaries
SELECT
  COUNT(*) AS existing_summaries_count,
  COUNT(DISTINCT session_type) AS session_types
FROM public.session_summaries;

-- Check foreign key constraint
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'session_summaries'
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY';
