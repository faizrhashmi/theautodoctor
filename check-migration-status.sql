-- ============================================================================
-- MIGRATION STATUS CHECK
-- ============================================================================

-- Check 1: Active Session Unique Index
SELECT
  'Active Session Unique Index' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'sessions'
      AND indexname = 'uq_active_session_per_customer'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- Check 2: Orphan Cleanup Function
SELECT
  'Orphan Cleanup Function' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'expire_orphaned_sessions'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- Check 3: Cron Job Schedule (requires pg_cron extension)
SELECT
  'Orphan Cleanup Cron Job' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM cron.job
      WHERE jobname = 'expire-orphaned-sessions'
    ) THEN '✅ SCHEDULED'
    ELSE '❌ NOT SCHEDULED'
  END AS status;

-- Check 4: Session Assignments Table
SELECT
  'Session Assignments Table' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'session_assignments'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- Check 5: Session Devices Table
SELECT
  'Session Devices Table' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'session_devices'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- Check 6: Session Events Table
SELECT
  'Session Events Table' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'session_events'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- ============================================================================
-- DETAILED STATS
-- ============================================================================

-- Count records in new tables
SELECT
  'session_assignments' AS table_name,
  COUNT(*) AS row_count
FROM session_assignments
UNION ALL
SELECT
  'session_devices' AS table_name,
  COUNT(*) AS row_count
FROM session_devices
UNION ALL
SELECT
  'session_events' AS table_name,
  COUNT(*) AS row_count
FROM session_events;

-- Show active sessions (should be constrained by unique index)
SELECT
  'Active Sessions (should be 1 per customer)' AS info,
  customer_user_id,
  COUNT(*) AS active_session_count
FROM sessions
WHERE status IN ('pending', 'waiting', 'live', 'scheduled')
GROUP BY customer_user_id
HAVING COUNT(*) > 1;

-- If the above query returns no rows, the constraint is working! ✅
