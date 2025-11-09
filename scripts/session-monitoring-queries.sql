-- ============================================================================
-- SESSION END LOGIC MONITORING QUERIES
-- ============================================================================
-- Purpose: Real-time monitoring and alerting for session end logic health
-- Use: Run periodically or set up as database triggers/cron jobs
-- Date: 2025-11-08
-- ============================================================================

-- ============================================================================
-- ALERT 1: Sessions Marked Cancelled But Should Be Completed
-- ============================================================================
-- Run this every hour to catch sessions being incorrectly marked
-- ALERT if returns > 0 rows

CREATE OR REPLACE VIEW session_status_anomalies AS
SELECT
    s.id,
    s.status,
    s.started_at,
    s.ended_at,
    EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer as duration_seconds,
    s.customer_user_id,
    s.mechanic_id,
    s.plan,
    s.type,
    s.created_at,
    s.metadata->'end_semantics' as end_metadata,
    'Session marked cancelled but had valid start and duration >= 60s' as anomaly_reason,
    NOW() as detected_at
FROM sessions s
WHERE s.status = 'cancelled'
    AND s.started_at IS NOT NULL
    AND s.ended_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) >= 60
    AND s.updated_at >= NOW() - INTERVAL '24 hours'; -- Only recent sessions

COMMENT ON VIEW session_status_anomalies IS
    'Alert: Sessions that should be completed but marked as cancelled';

-- Query to check this alert
SELECT
    COUNT(*) as anomaly_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ HEALTHY - No anomalies detected'
        WHEN COUNT(*) <= 5 THEN '⚠️ WARNING - ' || COUNT(*) || ' sessions need review'
        ELSE '🚨 CRITICAL - ' || COUNT(*) || ' sessions incorrectly marked'
    END as status,
    ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as affected_session_ids
FROM session_status_anomalies;

-- ============================================================================
-- ALERT 2: Completed Sessions Without Valid Start Time
-- ============================================================================

CREATE OR REPLACE VIEW completed_sessions_without_start AS
SELECT
    s.id,
    s.status,
    s.started_at,
    s.ended_at,
    s.duration_minutes,
    s.customer_user_id,
    s.mechanic_id,
    s.plan,
    s.metadata->'payout'->>'status' as payout_status,
    'Completed session has no started_at timestamp' as anomaly_reason,
    NOW() as detected_at
FROM sessions s
WHERE s.status = 'completed'
    AND s.started_at IS NULL
    AND s.updated_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW completed_sessions_without_start IS
    'Alert: Completed sessions missing start timestamp';

-- Query to check this alert
SELECT
    COUNT(*) as anomaly_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ HEALTHY - All completed sessions have start times'
        ELSE '🚨 DATA INTEGRITY ISSUE - ' || COUNT(*) || ' completed sessions missing start time'
    END as status,
    ARRAY_AGG(id) as affected_session_ids
FROM completed_sessions_without_start;

-- ============================================================================
-- ALERT 3: Payouts Sent for Cancelled Sessions
-- ============================================================================

CREATE OR REPLACE VIEW incorrect_payouts AS
SELECT
    s.id,
    s.status,
    s.metadata->'payout'->>'status' as payout_status,
    s.metadata->'payout'->>'amount_dollars' as payout_amount,
    s.metadata->'payout'->>'transfer_id' as stripe_transfer_id,
    s.started_at,
    s.ended_at,
    'Payout processed for a cancelled session' as anomaly_reason,
    NOW() as detected_at
FROM sessions s
WHERE s.status = 'cancelled'
    AND s.metadata->'payout'->>'status' = 'transferred'
    AND s.updated_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW incorrect_payouts IS
    'Alert: Payouts incorrectly sent for cancelled sessions';

-- Query to check this alert
SELECT
    COUNT(*) as anomaly_count,
    COALESCE(SUM((s.metadata->'payout'->>'amount_cents')::numeric), 0) / 100 as total_incorrect_payouts_usd,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ HEALTHY - No incorrect payouts'
        ELSE '🚨 FINANCIAL ISSUE - $' || COALESCE(SUM((s.metadata->'payout'->>'amount_cents')::numeric), 0) / 100 || ' in incorrect payouts'
    END as status,
    ARRAY_AGG(s.id) as affected_session_ids
FROM incorrect_payouts s;

-- ============================================================================
-- ALERT 4: Sessions With Mismatched Duration
-- ============================================================================

CREATE OR REPLACE VIEW sessions_duration_mismatch AS
SELECT
    s.id,
    s.status,
    s.started_at,
    s.ended_at,
    EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer as calculated_duration_seconds,
    s.duration_minutes as stored_duration_minutes,
    (s.metadata->'end_semantics'->>'duration_seconds')::integer as metadata_duration_seconds,
    ABS(
        EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer -
        (s.metadata->'end_semantics'->>'duration_seconds')::integer
    ) as duration_discrepancy_seconds,
    'Duration mismatch between calculated and stored values' as anomaly_reason,
    NOW() as detected_at
FROM sessions s
WHERE s.ended_at IS NOT NULL
    AND s.started_at IS NOT NULL
    AND s.metadata ? 'end_semantics'
    AND ABS(
        EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer -
        (s.metadata->'end_semantics'->>'duration_seconds')::integer
    ) > 10  -- Allow 10 second tolerance for processing time
    AND s.updated_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW sessions_duration_mismatch IS
    'Alert: Sessions with duration calculation discrepancies';

-- ============================================================================
-- METRIC 1: Session Completion Rate (Daily)
-- ============================================================================

CREATE OR REPLACE VIEW session_completion_metrics_daily AS
SELECT
    DATE(ended_at) as date,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
    ROUND(
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) as completion_rate_percent,
    ROUND(
        COUNT(CASE WHEN status = 'cancelled' AND started_at IS NULL THEN 1 END)::numeric /
        NULLIF(COUNT(CASE WHEN status = 'cancelled' THEN 1 END), 0) * 100,
        2
    ) as no_show_rate_percent,
    ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at))), 0) as avg_duration_seconds,
    COUNT(CASE WHEN metadata->'payout'->>'status' = 'transferred' THEN 1 END) as payouts_processed
FROM sessions
WHERE ended_at IS NOT NULL
    AND ended_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(ended_at)
ORDER BY date DESC;

COMMENT ON VIEW session_completion_metrics_daily IS
    'Daily metrics for session completion rates and patterns';

-- ============================================================================
-- METRIC 2: Session End Health Score (Hourly Rolling)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_session_health_score()
RETURNS TABLE(
    period_start timestamptz,
    period_end timestamptz,
    total_sessions bigint,
    health_score numeric,
    score_category text,
    issues_detected jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH hourly_stats AS (
        SELECT
            DATE_TRUNC('hour', ended_at) as hour_start,
            COUNT(*) as total,
            COUNT(CASE
                WHEN status = 'cancelled'
                AND started_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60
            THEN 1 END) as anomaly_cancelled,
            COUNT(CASE
                WHEN status = 'completed'
                AND started_at IS NULL
            THEN 1 END) as anomaly_completed_no_start,
            COUNT(CASE
                WHEN status = 'cancelled'
                AND metadata->'payout'->>'status' = 'transferred'
            THEN 1 END) as anomaly_incorrect_payout,
            COUNT(CASE
                WHEN ended_at IS NOT NULL
                AND started_at IS NOT NULL
                AND metadata ? 'end_semantics'
                AND ABS(
                    EXTRACT(EPOCH FROM (ended_at - started_at))::integer -
                    (metadata->'end_semantics'->>'duration_seconds')::integer
                ) > 10
            THEN 1 END) as anomaly_duration_mismatch
        FROM sessions
        WHERE ended_at >= NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', ended_at)
    )
    SELECT
        h.hour_start as period_start,
        h.hour_start + INTERVAL '1 hour' as period_end,
        h.total as total_sessions,
        ROUND(
            100 - (
                (h.anomaly_cancelled::numeric / NULLIF(h.total, 0) * 40) +
                (h.anomaly_completed_no_start::numeric / NULLIF(h.total, 0) * 30) +
                (h.anomaly_incorrect_payout::numeric / NULLIF(h.total, 0) * 20) +
                (h.anomaly_duration_mismatch::numeric / NULLIF(h.total, 0) * 10)
            ),
            2
        ) as health_score,
        CASE
            WHEN 100 - (
                (h.anomaly_cancelled::numeric / NULLIF(h.total, 0) * 40) +
                (h.anomaly_completed_no_start::numeric / NULLIF(h.total, 0) * 30) +
                (h.anomaly_incorrect_payout::numeric / NULLIF(h.total, 0) * 20) +
                (h.anomaly_duration_mismatch::numeric / NULLIF(h.total, 0) * 10)
            ) >= 95 THEN '✅ EXCELLENT'
            WHEN 100 - (
                (h.anomaly_cancelled::numeric / NULLIF(h.total, 0) * 40) +
                (h.anomaly_completed_no_start::numeric / NULLIF(h.total, 0) * 30) +
                (h.anomaly_incorrect_payout::numeric / NULLIF(h.total, 0) * 20) +
                (h.anomaly_duration_mismatch::numeric / NULLIF(h.total, 0) * 10)
            ) >= 85 THEN '⚠️ GOOD'
            WHEN 100 - (
                (h.anomaly_cancelled::numeric / NULLIF(h.total, 0) * 40) +
                (h.anomaly_completed_no_start::numeric / NULLIF(h.total, 0) * 30) +
                (h.anomaly_incorrect_payout::numeric / NULLIF(h.total, 0) * 20) +
                (h.anomaly_duration_mismatch::numeric / NULLIF(h.total, 0) * 10)
            ) >= 70 THEN '⚠️ NEEDS ATTENTION'
            ELSE '🚨 CRITICAL'
        END as score_category,
        jsonb_build_object(
            'incorrect_cancelled', h.anomaly_cancelled,
            'completed_without_start', h.anomaly_completed_no_start,
            'incorrect_payouts', h.anomaly_incorrect_payout,
            'duration_mismatches', h.anomaly_duration_mismatch
        ) as issues_detected
    FROM hourly_stats h
    ORDER BY h.hour_start DESC;
END;
$$;

COMMENT ON FUNCTION calculate_session_health_score IS
    'Calculates hourly health score (0-100) for session end logic integrity';

-- ============================================================================
-- METRIC 3: Revenue Impact of Incorrect Status
-- ============================================================================

CREATE OR REPLACE VIEW revenue_impact_analysis AS
WITH potential_revenue_loss AS (
    SELECT
        s.id,
        s.plan,
        s.started_at,
        s.ended_at,
        EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer as duration_seconds,
        s.metadata->'payout'->>'amount_dollars' as payout_not_sent,
        CASE s.plan
            WHEN 'chat10' THEN 9.99
            WHEN 'video15' THEN 19.99
            WHEN 'diagnostic' THEN 49.99
            ELSE 0
        END as plan_price_dollars
    FROM sessions s
    WHERE s.status = 'cancelled'
        AND s.started_at IS NOT NULL
        AND EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) >= 60
)
SELECT
    COUNT(*) as affected_sessions,
    SUM(plan_price_dollars) as total_revenue_at_risk_usd,
    ROUND(AVG(duration_seconds), 0) as avg_session_duration_seconds,
    jsonb_agg(
        jsonb_build_object(
            'session_id', id,
            'plan', plan,
            'duration_seconds', duration_seconds,
            'revenue_at_risk', plan_price_dollars
        )
    ) as details
FROM potential_revenue_loss;

COMMENT ON VIEW revenue_impact_analysis IS
    'Calculates potential revenue impact from incorrectly marked sessions';

-- ============================================================================
-- OPERATIONAL QUERY: Sessions Needing Manual Review
-- ============================================================================

CREATE OR REPLACE VIEW sessions_needing_review AS
SELECT
    s.id,
    s.status,
    s.started_at,
    s.ended_at,
    EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer as duration_seconds,
    s.plan,
    s.type,
    s.customer_user_id,
    s.mechanic_id,
    s.metadata->'end_semantics' as end_metadata,
    s.metadata->'payout' as payout_metadata,
    CASE
        WHEN s.status = 'cancelled' AND s.started_at IS NOT NULL AND EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) >= 60
            THEN 'Should be completed - had valid session'
        WHEN s.status = 'completed' AND s.started_at IS NULL
            THEN 'Should be cancelled - never started'
        WHEN s.status = 'cancelled' AND s.metadata->'payout'->>'status' = 'transferred'
            THEN 'URGENT: Payout sent for cancelled session'
        ELSE 'Unknown issue'
    END as review_reason,
    s.created_at,
    s.updated_at
FROM sessions s
WHERE (
    -- Anomaly 1: Cancelled but should be completed
    (s.status = 'cancelled' AND s.started_at IS NOT NULL AND EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) >= 60)
    OR
    -- Anomaly 2: Completed but never started
    (s.status = 'completed' AND s.started_at IS NULL)
    OR
    -- Anomaly 3: Payout sent for cancelled
    (s.status = 'cancelled' AND s.metadata->'payout'->>'status' = 'transferred')
)
ORDER BY s.updated_at DESC;

COMMENT ON VIEW sessions_needing_review IS
    'Sessions with status anomalies requiring manual review and correction';

-- ============================================================================
-- DIAGNOSTIC QUERY: End Session Function Usage Audit
-- ============================================================================

CREATE OR REPLACE VIEW end_session_function_audit AS
SELECT
    s.id,
    s.status,
    s.started_at,
    s.ended_at,
    s.metadata ? 'end_semantics' as has_end_semantics,
    s.metadata->'end_semantics'->>'final_status' as semantic_status,
    s.metadata->'end_semantics'->>'started' as semantic_started,
    s.metadata->'end_semantics'->>'duration_seconds' as semantic_duration,
    s.metadata->'end_semantics'->>'ended_by_role' as ended_by_role,
    s.metadata->'end_semantics'->>'reason' as end_reason,
    CASE
        WHEN s.metadata ? 'end_semantics' THEN 'Used semantic function'
        ELSE 'Direct status update (old method)'
    END as end_method,
    s.updated_at
FROM sessions s
WHERE s.ended_at IS NOT NULL
    AND s.ended_at >= NOW() - INTERVAL '7 days'
ORDER BY s.updated_at DESC;

COMMENT ON VIEW end_session_function_audit IS
    'Tracks which sessions used the new semantic function vs old direct updates';

-- ============================================================================
-- SUMMARY DASHBOARD QUERY
-- ============================================================================

CREATE OR REPLACE FUNCTION session_health_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_result jsonb;
    v_anomaly_count integer;
    v_total_sessions integer;
    v_health_score numeric;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO v_total_sessions
    FROM sessions
    WHERE ended_at >= NOW() - INTERVAL '24 hours';

    SELECT COUNT(*) INTO v_anomaly_count
    FROM (
        SELECT id FROM session_status_anomalies
        UNION
        SELECT id FROM completed_sessions_without_start
        UNION
        SELECT id FROM incorrect_payouts
    ) anomalies;

    -- Calculate health score
    v_health_score := ROUND(
        100 - (v_anomaly_count::numeric / NULLIF(v_total_sessions, 0) * 100),
        2
    );

    -- Build JSON result
    v_result := jsonb_build_object(
        'timestamp', NOW(),
        'period', '24 hours',
        'overall_health_score', v_health_score,
        'overall_status', CASE
            WHEN v_health_score >= 95 THEN 'EXCELLENT'
            WHEN v_health_score >= 85 THEN 'GOOD'
            WHEN v_health_score >= 70 THEN 'NEEDS ATTENTION'
            ELSE 'CRITICAL'
        END,
        'total_sessions', v_total_sessions,
        'anomalies_detected', v_anomaly_count,
        'alerts', jsonb_build_object(
            'incorrect_cancelled', (SELECT COUNT(*) FROM session_status_anomalies),
            'completed_without_start', (SELECT COUNT(*) FROM completed_sessions_without_start),
            'incorrect_payouts', (SELECT COUNT(*) FROM incorrect_payouts)
        ),
        'metrics', (
            SELECT jsonb_build_object(
                'completion_rate', ROUND(
                    COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric /
                    NULLIF(COUNT(*), 0) * 100,
                    2
                ),
                'cancellation_rate', ROUND(
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::numeric /
                    NULLIF(COUNT(*), 0) * 100,
                    2
                ),
                'no_show_rate', ROUND(
                    COUNT(CASE WHEN status = 'cancelled' AND started_at IS NULL THEN 1 END)::numeric /
                    NULLIF(COUNT(CASE WHEN status = 'cancelled' THEN 1 END), 0) * 100,
                    2
                ),
                'avg_duration_minutes', ROUND(
                    AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) / 60,
                    2
                )
            )
            FROM sessions
            WHERE ended_at >= NOW() - INTERVAL '24 hours'
        ),
        'revenue_impact', (
            SELECT jsonb_build_object(
                'sessions_at_risk', COALESCE(COUNT(*), 0),
                'revenue_at_risk_usd', COALESCE(SUM(
                    CASE plan
                        WHEN 'chat10' THEN 9.99
                        WHEN 'video15' THEN 19.99
                        WHEN 'diagnostic' THEN 49.99
                        ELSE 0
                    END
                ), 0)
            )
            FROM sessions
            WHERE status = 'cancelled'
                AND started_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60
                AND ended_at >= NOW() - INTERVAL '24 hours'
        )
    );

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION session_health_dashboard IS
    'Returns complete health dashboard as JSON for monitoring systems';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Check current health status
-- SELECT * FROM session_health_dashboard();

-- Example 2: Get hourly health scores for last 24 hours
-- SELECT * FROM calculate_session_health_score() ORDER BY period_start DESC LIMIT 24;

-- Example 3: Get sessions needing review
-- SELECT * FROM sessions_needing_review;

-- Example 4: Check for any active alerts
-- SELECT
--     'Status Anomalies' as alert_type,
--     COUNT(*) as count
-- FROM session_status_anomalies
-- UNION ALL
-- SELECT
--     'Completed Without Start' as alert_type,
--     COUNT(*) as count
-- FROM completed_sessions_without_start
-- UNION ALL
-- SELECT
--     'Incorrect Payouts' as alert_type,
--     COUNT(*) as count
-- FROM incorrect_payouts;

-- Example 5: Daily completion metrics
-- SELECT * FROM session_completion_metrics_daily ORDER BY date DESC LIMIT 7;

-- ============================================================================
-- END OF MONITORING QUERIES
-- ============================================================================
