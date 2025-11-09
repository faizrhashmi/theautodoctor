-- ============================================================================
-- SESSION END LOGIC VERIFICATION SCRIPT
-- ============================================================================
-- Purpose: Comprehensive verification of session end logic implementation
-- Run in: Supabase SQL Editor
-- Date: 2025-11-08
-- ============================================================================

-- ============================================================================
-- SECTION 1: VERIFY DATABASE FUNCTION EXISTS
-- ============================================================================

SELECT
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'end_session_with_semantics';

-- Expected: 1 row showing the function exists

-- ============================================================================
-- SECTION 2: CHECK FOR INCORRECTLY MARKED SESSIONS
-- ============================================================================

-- Find sessions marked as 'cancelled' that actually started and ran >= 60 seconds
-- These should be 'completed' instead
SELECT
    id,
    status,
    started_at,
    ended_at,
    EXTRACT(EPOCH FROM (ended_at - started_at))::integer as duration_seconds,
    ROUND(EXTRACT(EPOCH FROM (ended_at - started_at))::numeric / 60, 2) as duration_minutes,
    customer_user_id,
    mechanic_id,
    plan,
    type,
    created_at,
    metadata->'end_semantics' as end_semantics_metadata,
    metadata->'backfilled' as backfill_info
FROM sessions
WHERE status = 'cancelled'
    AND started_at IS NOT NULL
    AND ended_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60
ORDER BY ended_at DESC;

-- Expected: 0 rows (all should be corrected)

-- ============================================================================
-- SECTION 3: CHECK FOR SESSIONS WITH PARTICIPANTS BUT MARKED CANCELLED
-- ============================================================================

-- Find sessions where both participants joined but session is cancelled
WITH session_participant_count AS (
    SELECT
        session_id,
        COUNT(DISTINCT user_id) as participant_count,
        MIN(created_at) as first_join,
        MAX(created_at) as last_join
    FROM session_events
    WHERE event_type IN ('participant_joined', 'started', 'mechanic_joined', 'customer_joined', 'joined')
    GROUP BY session_id
)
SELECT
    s.id,
    s.status,
    s.started_at,
    s.ended_at,
    EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer as duration_seconds,
    spc.participant_count,
    spc.first_join,
    spc.last_join,
    s.plan,
    s.type,
    s.metadata->'end_semantics'->>'final_status' as semantic_status,
    s.metadata->'end_semantics'->>'started' as semantic_started
FROM sessions s
JOIN session_participant_count spc ON s.id = spc.session_id
WHERE s.status = 'cancelled'
    AND spc.participant_count >= 2
    AND s.ended_at IS NOT NULL
ORDER BY s.ended_at DESC
LIMIT 50;

-- Expected: 0 rows or only sessions with duration < 60 seconds

-- ============================================================================
-- SECTION 4: VERIFY COMPLETED SESSIONS ARE ACTUALLY VALID
-- ============================================================================

-- Check that completed sessions actually started and had valid duration
SELECT
    id,
    status,
    started_at,
    ended_at,
    EXTRACT(EPOCH FROM (ended_at - started_at))::integer as duration_seconds,
    duration_minutes,
    plan,
    type,
    metadata->'payout'->>'status' as payout_status,
    metadata->'end_semantics'->>'started' as semantic_started,
    metadata->'end_semantics'->>'duration_seconds' as semantic_duration
FROM sessions
WHERE status = 'completed'
    AND (
        started_at IS NULL
        OR ended_at IS NULL
        OR EXTRACT(EPOCH FROM (ended_at - started_at)) < 60
    )
ORDER BY ended_at DESC
LIMIT 50;

-- Expected: 0 rows (all completed sessions should have valid data)

-- ============================================================================
-- SECTION 5: SESSION STATUS DISTRIBUTION
-- ============================================================================

SELECT
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
    COUNT(CASE WHEN started_at IS NOT NULL THEN 1 END) as started_count,
    COUNT(CASE WHEN started_at IS NULL THEN 1 END) as never_started_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at))), 2) as avg_duration_seconds,
    ROUND(AVG(duration_minutes), 2) as avg_duration_minutes
FROM sessions
WHERE ended_at IS NOT NULL
GROUP BY status
ORDER BY count DESC;

-- Expected: Logical distribution with most being completed or cancelled

-- ============================================================================
-- SECTION 6: CHECK SESSION_EVENTS FOR JOIN TRACKING
-- ============================================================================

-- Verify that session_events properly tracks participant joins
SELECT
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT session_id) as unique_sessions
FROM session_events
WHERE event_type IN ('participant_joined', 'started', 'mechanic_joined', 'customer_joined', 'joined', 'ended', 'cancelled')
GROUP BY event_type
ORDER BY count DESC;

-- Expected: Multiple join events logged

-- ============================================================================
-- SECTION 7: SESSIONS WITH MISMATCHED METADATA
-- ============================================================================

-- Find sessions where metadata doesn't match actual status
SELECT
    id,
    status,
    started_at,
    ended_at,
    EXTRACT(EPOCH FROM (ended_at - started_at))::integer as actual_duration_seconds,
    metadata->'end_semantics'->>'final_status' as metadata_status,
    metadata->'end_semantics'->>'duration_seconds' as metadata_duration,
    metadata->'end_semantics'->>'started' as metadata_started,
    metadata->'payout'->>'status' as payout_status
FROM sessions
WHERE ended_at IS NOT NULL
    AND metadata ? 'end_semantics'
    AND (
        -- Status mismatch
        status::text != (metadata->'end_semantics'->>'final_status')
        OR
        -- Duration mismatch (allow 5 second tolerance)
        ABS(EXTRACT(EPOCH FROM (ended_at - started_at))::integer - (metadata->'end_semantics'->>'duration_seconds')::integer) > 5
    )
ORDER BY ended_at DESC
LIMIT 50;

-- Expected: 0 rows (metadata should match actual data)

-- ============================================================================
-- SECTION 8: PAYOUT STATUS CHECK
-- ============================================================================

-- Verify that payouts were only processed for completed sessions
SELECT
    s.status,
    s.metadata->'payout'->>'status' as payout_status,
    COUNT(*) as count,
    SUM((s.metadata->'payout'->>'amount_cents')::numeric) / 100 as total_payout_dollars
FROM sessions s
WHERE s.metadata ? 'payout'
    AND s.ended_at IS NOT NULL
GROUP BY s.status, s.metadata->'payout'->>'status'
ORDER BY count DESC;

-- Expected: 'transferred' payouts only for 'completed' sessions

-- ============================================================================
-- SECTION 9: RECENT SESSIONS AUDIT (Last 7 Days)
-- ============================================================================

SELECT
    DATE(ended_at) as date,
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN started_at IS NOT NULL THEN 1 END) as started,
    COUNT(CASE WHEN started_at IS NULL THEN 1 END) as never_started,
    ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at))), 0) as avg_duration_sec,
    COUNT(CASE WHEN metadata->'payout'->>'status' = 'transferred' THEN 1 END) as payouts_processed
FROM sessions
WHERE ended_at >= NOW() - INTERVAL '7 days'
    AND ended_at IS NOT NULL
GROUP BY DATE(ended_at), status
ORDER BY date DESC, status;

-- Expected: Recent activity showing proper status distribution

-- ============================================================================
-- SECTION 10: CHECK FOR DIAGNOSTIC_SESSIONS TABLE
-- ============================================================================

-- Check if diagnostic_sessions has same issue
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
    metadata
FROM diagnostic_sessions
WHERE status = 'cancelled'
    AND started_at IS NOT NULL
    AND ended_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60
ORDER BY ended_at DESC
LIMIT 50;

-- Expected: Check if diagnostic_sessions needs the same fix

-- ============================================================================
-- SECTION 11: SUMMARY REPORT
-- ============================================================================

WITH session_stats AS (
    SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status NOT IN ('completed', 'cancelled') THEN 1 END) as other_status_count,
        COUNT(CASE WHEN status = 'completed' AND started_at IS NULL THEN 1 END) as completed_no_start,
        COUNT(CASE WHEN status = 'cancelled' AND started_at IS NOT NULL
                   AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60 THEN 1 END) as cancelled_but_should_complete,
        SUM(CASE WHEN status = 'completed' AND metadata->'payout'->>'status' = 'transferred' THEN 1 ELSE 0 END) as payouts_sent
    FROM sessions
    WHERE ended_at IS NOT NULL
)
SELECT
    '=== SESSION END LOGIC HEALTH CHECK ===' as report_title,
    '' as separator1,
    'Total Sessions: ' || total_sessions as stat1,
    'Completed: ' || completed_count || ' (' || ROUND(completed_count::numeric / total_sessions * 100, 2) || '%)' as stat2,
    'Cancelled: ' || cancelled_count || ' (' || ROUND(cancelled_count::numeric / total_sessions * 100, 2) || '%)' as stat3,
    'Other Status: ' || other_status_count as stat4,
    '' as separator2,
    '❌ ISSUES FOUND:' as issues_header,
    'Completed without start time: ' || completed_no_start as issue1,
    'Cancelled but should be completed: ' || cancelled_but_should_complete as issue2,
    '' as separator3,
    '✅ PAYOUTS:' as payouts_header,
    'Payouts processed: ' || payouts_sent || ' of ' || completed_count || ' completed sessions' as payout_stat
FROM session_stats;

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================

-- NEXT STEPS:
-- 1. If Section 2 returns rows: Run backfill migration
-- 2. If Section 3 returns rows: Investigate why participants joined but session marked cancelled
-- 3. If Section 4 returns rows: Investigate data integrity issues
-- 4. If Section 10 returns rows: diagnostic_sessions needs same fix
