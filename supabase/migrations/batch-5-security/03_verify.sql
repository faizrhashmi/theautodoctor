-- ============================================================================
-- BATCH 5 SECURITY REMEDIATION: VERIFICATION SCRIPT
-- ============================================================================
-- Queries pg_catalog to verify all schema objects exist
-- Run with: psql $DATABASE_URL -f 03_verify.sql
-- ============================================================================

-- 1. Verify Tables
SELECT
  '1. TABLES' AS check_name,
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS - All 3 tables exist'
    ELSE 'FAIL - Missing ' || (3 - COUNT(*))::TEXT || ' table(s)'
  END AS status,
  COALESCE(STRING_AGG(tablename, ', '), 'none') AS tables_found
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('livekit_rooms', 'session_invites', 'security_events');

-- 2. Verify Custom Types
SELECT
  '2. CUSTOM TYPES' AS check_name,
  CASE
    WHEN COUNT(*) = 2 THEN 'PASS - All 2 custom types exist'
    ELSE 'FAIL - Missing ' || (2 - COUNT(*))::TEXT || ' type(s)'
  END AS status,
  COALESCE(STRING_AGG(typname, ', '), 'none') AS types_found
FROM pg_type
WHERE typname IN ('invite_status', 'security_event_type');

-- 3. Verify Indexes
SELECT
  '3. INDEXES' AS check_name,
  CASE
    WHEN COUNT(*) >= 12 THEN 'PASS - All expected indexes exist'
    ELSE 'WARN - Only ' || COUNT(*)::TEXT || ' indexes found (expected 12+)'
  END AS status,
  COUNT(*) AS total_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('livekit_rooms', 'session_invites', 'security_events')
  AND indexname LIKE 'idx_%';

-- 4. Verify RLS Policies (per table)
SELECT
  '4. RLS POLICIES' AS check_name,
  tablename,
  COUNT(*) AS policy_count,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL - No policies'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('livekit_rooms', 'session_invites', 'security_events')
GROUP BY tablename
ORDER BY tablename;

-- 5. Verify RLS is enabled
SELECT
  '5. RLS ENABLED' AS check_name,
  tablename,
  CASE
    WHEN rowsecurity THEN 'PASS - Enabled'
    ELSE 'FAIL - Disabled'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('livekit_rooms', 'session_invites', 'security_events')
ORDER BY tablename;

-- 6. Verify Functions
SELECT
  '6. FUNCTIONS' AS check_name,
  CASE
    WHEN COUNT(*) >= 1 THEN 'PASS - expire_old_invite_codes() exists'
    ELSE 'FAIL - Function not found'
  END AS status,
  COUNT(*) AS function_count
FROM pg_proc
WHERE proname = 'expire_old_invite_codes';

-- 7. Verify Foreign Keys
SELECT
  '7. FOREIGN KEYS' AS check_name,
  tc.table_name,
  tc.constraint_name,
  'PASS' AS status
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('livekit_rooms', 'session_invites', 'security_events')
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 8. Verify Check Constraints
SELECT
  '8. CHECK CONSTRAINTS' AS check_name,
  table_name,
  constraint_name,
  'PASS' AS status
FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK'
  AND table_name IN ('livekit_rooms', 'session_invites', 'security_events')
  AND table_schema = 'public'
ORDER BY table_name, constraint_name;

-- 9. Table Row Counts
SELECT
  '9. ROW COUNTS' AS check_name,
  'livekit_rooms' AS table_name,
  COUNT(*) AS row_count
FROM livekit_rooms
UNION ALL
SELECT
  '9. ROW COUNTS' AS check_name,
  'session_invites' AS table_name,
  COUNT(*) AS row_count
FROM session_invites
UNION ALL
SELECT
  '9. ROW COUNTS' AS check_name,
  'security_events' AS table_name,
  COUNT(*) AS row_count
FROM security_events
ORDER BY table_name;

-- ============================================================================
-- SUMMARY: All checks should show PASS status
-- If any show FAIL or WARN, review the specific check above
-- ============================================================================
