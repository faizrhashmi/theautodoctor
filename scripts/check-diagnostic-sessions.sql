-- ============================================================================
-- DIAGNOSTIC_SESSIONS TABLE INVESTIGATION
-- ============================================================================
-- Purpose: Check if diagnostic_sessions table has the same status issue as sessions
-- Run in: Supabase SQL Editor
-- Date: 2025-11-08
-- ============================================================================

-- ============================================================================
-- SECTION 1: CHECK IF TABLE EXISTS
-- ============================================================================

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'diagnostic_sessions'
) as table_exists;

-- ============================================================================
-- SECTION 2: GET TABLE SCHEMA
-- ============================================================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'diagnostic_sessions'
ORDER BY ordinal_position;

-- ============================================================================
-- SECTION 3: CHECK FOR INCORRECT STATUSES IN DIAGNOSTIC_SESSIONS
-- ============================================================================

-- Check if diagnostic_sessions has same issue
SELECT
    COUNT(*) as total_diagnostic_sessions,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE
        WHEN status = 'cancelled'
        AND started_at IS NOT NULL
        AND ended_at IS NOT NULL
        AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60
    THEN 1 END) as incorrect_cancelled_count
FROM diagnostic_sessions
WHERE ended_at IS NOT NULL;

-- ============================================================================
-- SECTION 4: DETAILED INCORRECT SESSIONS
-- ============================================================================

-- Show sessions that might be incorrectly marked
SELECT
    id,
    status,
    started_at,
    ended_at,
    EXTRACT(EPOCH FROM (ended_at - started_at))::integer as duration_seconds,
    duration_minutes,
    session_type,
    customer_id,
    mechanic_id,
    payment_status,
    base_price
FROM diagnostic_sessions
WHERE status = 'cancelled'
    AND started_at IS NOT NULL
    AND ended_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60
ORDER BY ended_at DESC
LIMIT 50;

-- ============================================================================
-- SECTION 5: CHECK IF DIAGNOSTIC_SESSIONS USES SAME END LOGIC
-- ============================================================================

-- Check if diagnostic_sessions records reference the semantic function
SELECT
    id,
    status,
    started_at,
    ended_at,
    metadata,
    metadata ? 'end_semantics' as has_semantic_metadata
FROM diagnostic_sessions
WHERE ended_at IS NOT NULL
ORDER BY ended_at DESC
LIMIT 10;

-- ============================================================================
-- SECTION 6: COMPARISON WITH SESSIONS TABLE
-- ============================================================================

SELECT
    'sessions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
    COUNT(CASE WHEN metadata ? 'end_semantics' THEN 1 END) as using_semantic_logic
FROM sessions
WHERE ended_at IS NOT NULL
UNION ALL
SELECT
    'diagnostic_sessions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
    COUNT(CASE WHEN metadata ? 'end_semantics' THEN 1 END) as using_semantic_logic
FROM diagnostic_sessions
WHERE ended_at IS NOT NULL;

-- ============================================================================
-- SECTION 7: RECOMMENDATION
-- ============================================================================

DO $$
DECLARE
    v_diagnostic_count integer;
    v_incorrect_count integer;
    v_sessions_using_semantic integer;
    v_diagnostic_using_semantic integer;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO v_diagnostic_count
    FROM diagnostic_sessions
    WHERE ended_at IS NOT NULL;

    SELECT COUNT(*) INTO v_incorrect_count
    FROM diagnostic_sessions
    WHERE status = 'cancelled'
        AND started_at IS NOT NULL
        AND ended_at IS NOT NULL
        AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60;

    SELECT COUNT(*) INTO v_sessions_using_semantic
    FROM sessions
    WHERE ended_at IS NOT NULL
        AND metadata ? 'end_semantics';

    SELECT COUNT(*) INTO v_diagnostic_using_semantic
    FROM diagnostic_sessions
    WHERE ended_at IS NOT NULL
        AND metadata ? 'end_semantics';

    RAISE NOTICE '=== DIAGNOSTIC_SESSIONS ANALYSIS ===';
    RAISE NOTICE 'Total diagnostic_sessions: %', v_diagnostic_count;
    RAISE NOTICE 'Incorrectly marked as cancelled: %', v_incorrect_count;
    RAISE NOTICE 'Sessions using semantic logic: %', v_sessions_using_semantic;
    RAISE NOTICE 'Diagnostic_sessions using semantic logic: %', v_diagnostic_using_semantic;
    RAISE NOTICE '';

    IF v_diagnostic_count = 0 THEN
        RAISE NOTICE '✅ RESULT: diagnostic_sessions table appears to be DEPRECATED or empty';
        RAISE NOTICE '   All session records are in the sessions table';
        RAISE NOTICE '   ACTION: No fix needed for diagnostic_sessions';
    ELSIF v_incorrect_count > 0 THEN
        RAISE NOTICE '❌ RESULT: diagnostic_sessions HAS THE SAME ISSUE';
        RAISE NOTICE '   % sessions incorrectly marked as cancelled', v_incorrect_count;
        RAISE NOTICE '   ACTION REQUIRED: Apply same fix to diagnostic_sessions table';
        RAISE NOTICE '';
        RAISE NOTICE 'RECOMMENDED FIX:';
        RAISE NOTICE '1. Create similar semantic function for diagnostic_sessions';
        RAISE NOTICE '2. Update API endpoints to use semantic logic';
        RAISE NOTICE '3. Run backfill migration to correct historical data';
    ELSIF v_diagnostic_using_semantic < v_diagnostic_count / 2 THEN
        RAISE NOTICE '⚠️  RESULT: diagnostic_sessions exists but not using semantic logic';
        RAISE NOTICE '   ACTION: Update code to use end_session_with_semantics function';
    ELSE
        RAISE NOTICE '✅ RESULT: diagnostic_sessions appears to be working correctly';
        RAISE NOTICE '   All sessions using semantic logic';
    END IF;
END $$;

-- ============================================================================
-- SECTION 8: MIGRATION CHECK
-- ============================================================================

-- Check if there was a migration to consolidate tables
SELECT
    version,
    name,
    applied_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%session%'
    OR name LIKE '%diagnostic%'
ORDER BY applied_at DESC
LIMIT 20;

-- ============================================================================
-- END OF DIAGNOSTIC_SESSIONS INVESTIGATION
-- ============================================================================
