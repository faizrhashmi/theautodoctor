-- ============================================================================
-- COMPREHENSIVE DATABASE AUDIT FOR SESSION ASSIGNMENTS ISSUE
-- This script checks all aspects that could cause dev/prod differences
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA VERIFICATION - session_assignments table
-- ============================================================================
\echo '========================================='
\echo '1. SESSION_ASSIGNMENTS SCHEMA'
\echo '========================================='

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'session_assignments'
ORDER BY ordinal_position;

-- Check constraints
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'session_assignments';

-- Check specific constraint definition
SELECT
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.session_assignments'::regclass
  AND conname LIKE '%status%';

-- ============================================================================
-- 2. RLS POLICY VERIFICATION
-- ============================================================================
\echo ''
\echo '========================================='
\echo '2. RLS POLICIES FOR SESSION_ASSIGNMENTS'
\echo '========================================='

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'session_assignments';

-- Show all RLS policies with their definitions
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'session_assignments'
ORDER BY policyname;

-- ============================================================================
-- 3. REALTIME CONFIGURATION
-- ============================================================================
\echo ''
\echo '========================================='
\echo '3. REALTIME CONFIGURATION'
\echo '========================================='

-- Check replica identity
SELECT
  c.relname AS table_name,
  c.relreplident AS replica_identity
FROM pg_class c
WHERE c.relname = 'session_assignments';
-- Values: d=default, f=full, n=nothing, i=index

-- Check if table is in realtime publication
SELECT
  p.pubname AS publication_name,
  pt.schemaname,
  pt.tablename
FROM pg_publication p
JOIN pg_publication_tables pt ON p.pubname = pt.pubname
WHERE pt.tablename = 'session_assignments'
ORDER BY p.pubname;

-- ============================================================================
-- 4. FOREIGN KEY RELATIONSHIPS
-- ============================================================================
\echo ''
\echo '========================================='
\echo '4. FOREIGN KEY CONSTRAINTS'
\echo '========================================='

SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'session_assignments'
ORDER BY tc.constraint_name;

-- ============================================================================
-- 5. INDEXES
-- ============================================================================
\echo ''
\echo '========================================='
\echo '5. INDEXES ON SESSION_ASSIGNMENTS'
\echo '========================================='

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'session_assignments'
ORDER BY indexname;

-- ============================================================================
-- 6. CURRENT DATA STATE
-- ============================================================================
\echo ''
\echo '========================================='
\echo '6. CURRENT DATA ANALYSIS'
\echo '========================================='

-- Count by status
SELECT
  status,
  COUNT(*) AS count,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM session_assignments
GROUP BY status
ORDER BY count DESC;

-- Recent assignments (last 24 hours)
SELECT
  sa.id AS assignment_id,
  sa.status AS assignment_status,
  sa.created_at,
  sa.offered_at,
  sa.accepted_at,
  s.id AS session_id,
  s.type AS session_type,
  s.status AS session_status,
  s.plan,
  s.customer_user_id,
  CASE
    WHEN sa.mechanic_id IS NOT NULL THEN 'ASSIGNED'
    ELSE 'UNASSIGNED'
  END AS mechanic_status
FROM session_assignments sa
LEFT JOIN sessions s ON sa.session_id = s.id
WHERE sa.created_at > NOW() - INTERVAL '24 hours'
ORDER BY sa.created_at DESC
LIMIT 20;

-- Assignments with missing sessions (orphaned)
SELECT
  COUNT(*) AS orphaned_assignments
FROM session_assignments sa
LEFT JOIN sessions s ON sa.session_id = s.id
WHERE s.id IS NULL;

-- Sessions with missing assignments (should not exist for paid)
SELECT
  COUNT(*) AS sessions_without_assignments
FROM sessions s
LEFT JOIN session_assignments sa ON sa.session_id = s.id
WHERE s.status IN ('pending', 'waiting')
  AND s.metadata->>'payment_method' != 'free'
  AND sa.id IS NULL;

-- ============================================================================
-- 7. SESSIONS TABLE SCHEMA (for reference)
-- ============================================================================
\echo ''
\echo '========================================='
\echo '7. SESSIONS TABLE COLUMNS'
\echo '========================================='

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sessions'
  AND column_name IN ('id', 'type', 'status', 'plan', 'intake_id', 'customer_user_id', 'metadata', 'created_at')
ORDER BY ordinal_position;

-- ============================================================================
-- 8. INTAKES TABLE SCHEMA (for reference)
-- ============================================================================
\echo ''
\echo '========================================='
\echo '8. INTAKES TABLE COLUMNS'
\echo '========================================='

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'intakes'
  AND column_name IN ('id', 'name', 'email', 'concern', 'year', 'make', 'model', 'vin', 'urgent')
ORDER BY ordinal_position;

-- ============================================================================
-- 9. NOTIFICATIONS TABLE SCHEMA
-- ============================================================================
\echo ''
\echo '========================================='
\echo '9. NOTIFICATIONS TABLE COLUMNS'
\echo '========================================='

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Check recent notifications
SELECT
  id,
  user_id,
  type,
  created_at,
  read_at,
  payload
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 10. MECHANICS TABLE SCHEMA (for RLS context)
-- ============================================================================
\echo ''
\echo '========================================='
\echo '10. MECHANICS TABLE COLUMNS'
\echo '========================================='

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mechanics'
  AND column_name IN ('id', 'user_id', 'service_tier', 'workshop_id')
ORDER BY ordinal_position;

-- ============================================================================
-- 11. DEPRECATED session_requests TABLE CHECK
-- ============================================================================
\echo ''
\echo '========================================='
\echo '11. DEPRECATED SESSION_REQUESTS TABLE'
\echo '========================================='

-- Check if table still exists
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'session_requests'
  ) AS session_requests_table_exists;

-- If exists, check recent data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_requests') THEN
    RAISE NOTICE 'session_requests table EXISTS (should be deprecated)';
    RAISE NOTICE 'Recent records:';
  ELSE
    RAISE NOTICE 'session_requests table does NOT exist (good)';
  END IF;
END $$;

-- ============================================================================
-- 12. TRIGGER CHECK
-- ============================================================================
\echo ''
\echo '========================================='
\echo '12. TRIGGERS ON SESSION_ASSIGNMENTS'
\echo '========================================='

SELECT
  tgname AS trigger_name,
  tgtype AS trigger_type,
  tgenabled AS enabled,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.session_assignments'::regclass
  AND tgisinternal = false;

-- ============================================================================
-- 13. MIGRATION STATUS
-- ============================================================================
\echo ''
\echo '========================================='
\echo '13. MIGRATION STATUS (if migrations table exists)'
\echo '========================================='

-- Check if supabase_migrations table exists
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema IN ('public', 'supabase_migrations')
      AND table_name = 'schema_migrations'
  ) AS migrations_table_exists;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
\echo ''
\echo '========================================='
\echo 'SUMMARY CHECKS'
\echo '========================================='

SELECT
  'RLS Enabled' AS check_name,
  CASE WHEN rowsecurity THEN '✅ YES' ELSE '❌ NO' END AS status
FROM pg_tables
WHERE tablename = 'session_assignments'
UNION ALL
SELECT
  'In Realtime Publication' AS check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE tablename = 'session_assignments'
  ) THEN '✅ YES' ELSE '❌ NO' END AS status
UNION ALL
SELECT
  'Has Full Replica Identity' AS check_name,
  CASE WHEN c.relreplident = 'f' THEN '✅ YES' ELSE '❌ NO (' || c.relreplident || ')' END AS status
FROM pg_class c
WHERE c.relname = 'session_assignments'
UNION ALL
SELECT
  'Has Foreign Key to Sessions' AS check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'session_assignments'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%session%'
  ) THEN '✅ YES' ELSE '❌ NO' END AS status
UNION ALL
SELECT
  'Has Status Constraint' AS check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.session_assignments'::regclass
      AND conname LIKE '%status%'
  ) THEN '✅ YES' ELSE '❌ NO' END AS status;

\echo ''
\echo 'Audit complete!'
