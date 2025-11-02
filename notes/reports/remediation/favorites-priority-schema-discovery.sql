-- ============================================================================
-- FAVORITES PRIORITY FLOW - SCHEMA DISCOVERY
-- ============================================================================
-- Purpose: Verify current schema state before implementing favorites priority
-- Date: 2025-11-02
-- ============================================================================

-- ============================================================================
-- 1. SESSION_REQUESTS TABLE - Current Columns
-- ============================================================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='session_requests'
ORDER BY ordinal_position;

-- Expected columns we need to verify:
-- ✅ customer_id (UUID) - exists
-- ✅ mechanic_id (UUID) - exists
-- ✅ metadata (JSONB) - exists
-- ❓ preferred_mechanic_id (UUID) - checking if exists
-- ❓ priority_window_minutes (INTEGER) - checking if exists
-- ❓ priority_notified_at (TIMESTAMPTZ) - checking if exists

-- ============================================================================
-- 2. MECHANICS TABLE - Primary Key & Online Status
-- ============================================================================

-- Check PK column name
SELECT c.column_name, c.data_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage c
  ON c.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'mechanics'
  AND tc.constraint_type='PRIMARY KEY';

-- Check for is_online column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='mechanics'
  AND column_name IN ('is_online', 'status', 'id');

-- ============================================================================
-- 3. SESSIONS TABLE - Sanity Check
-- ============================================================================
SELECT COUNT(*) AS sessions_table_exists
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name='sessions';

-- ============================================================================
-- 4. CUSTOMER_FAVORITES TABLE - Verify Exists
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='customer_favorites'
ORDER BY ordinal_position;

-- ============================================================================
-- 5. CHECK FOR EXISTING PRIORITY COLUMNS (Phase 4 Pre-check)
-- ============================================================================
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='session_requests'
        AND column_name='preferred_mechanic_id'
    ) THEN '✅ preferred_mechanic_id EXISTS'
    ELSE '❌ preferred_mechanic_id MISSING'
  END AS preferred_mechanic_id_status,

  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='session_requests'
        AND column_name='priority_window_minutes'
    ) THEN '✅ priority_window_minutes EXISTS'
    ELSE '❌ priority_window_minutes MISSING'
  END AS priority_window_status,

  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='session_requests'
        AND column_name='priority_notified_at'
    ) THEN '✅ priority_notified_at EXISTS'
    ELSE '❌ priority_notified_at MISSING'
  END AS priority_notified_status;

-- ============================================================================
-- END OF SCHEMA DISCOVERY
-- ============================================================================
