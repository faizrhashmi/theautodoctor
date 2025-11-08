-- ============================================================================
-- Workshop Analytics Cron Jobs Configuration
-- Created: 2025-01-25
-- Purpose: Set up automated jobs for metrics and alerts
-- ============================================================================

-- ============================================================================
-- CRON JOB 1: Daily Metrics Aggregation
-- Runs every day at 1 AM UTC
-- ============================================================================

-- First, ensure pg_cron extension is enabled (run in SQL Editor if not enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the daily metrics job
SELECT cron.schedule(
    'workshop-daily-metrics',                           -- job name
    '0 1 * * *',                                        -- cron expression (1 AM UTC daily)
    $$
    -- Calculate daily metrics for yesterday
    INSERT INTO workshop_metrics (
        metric_date,
        metric_type,
        signups_started,
        signups_completed,
        signups_failed,
        signup_conversion_rate,
        applications_pending,
        applications_approved,
        applications_rejected,
        invites_sent,
        invites_accepted,
        invites_expired,
        invite_acceptance_rate,
        emails_sent,
        emails_failed,
        email_success_rate,
        active_workshops,
        pending_workshops,
        workshops_with_mechanics,
        dashboard_logins,
        profile_updates
    )
    SELECT
        CURRENT_DATE - INTERVAL '1 day' as metric_date,
        'daily' as metric_type,

        -- Signup metrics
        COUNT(DISTINCT CASE WHEN event_type = 'workshop_signup_started' THEN workshop_id END) as signups_started,
        COUNT(DISTINCT CASE WHEN event_type = 'workshop_signup_success' THEN workshop_id END) as signups_completed,
        COUNT(DISTINCT CASE WHEN event_type = 'workshop_signup_failed' THEN workshop_id END) as signups_failed,
        CASE
            WHEN COUNT(DISTINCT CASE WHEN event_type = 'workshop_signup_submitted' THEN workshop_id END) > 0
            THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'workshop_signup_success' THEN workshop_id END) /
                      COUNT(DISTINCT CASE WHEN event_type = 'workshop_signup_submitted' THEN workshop_id END), 2)
            ELSE 0
        END as signup_conversion_rate,

        -- Current pending count
        (SELECT COUNT(*) FROM organizations WHERE organization_type = 'workshop' AND status = 'pending') as applications_pending,

        -- Approval metrics
        COUNT(DISTINCT CASE WHEN event_type = 'workshop_approved' THEN workshop_id END) as applications_approved,
        COUNT(DISTINCT CASE WHEN event_type = 'workshop_rejected' THEN workshop_id END) as applications_rejected,

        -- Invitation metrics
        COUNT(DISTINCT CASE WHEN event_type = 'mechanic_invited' THEN metadata->>'inviteCode' END) as invites_sent,
        COUNT(DISTINCT CASE WHEN event_type = 'mechanic_invite_accepted' THEN metadata->>'inviteCode' END) as invites_accepted,
        COUNT(DISTINCT CASE WHEN event_type = 'mechanic_invite_expired' THEN metadata->>'inviteCode' END) as invites_expired,
        CASE
            WHEN COUNT(DISTINCT CASE WHEN event_type = 'mechanic_invited' THEN metadata->>'inviteCode' END) > 0
            THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'mechanic_invite_accepted' THEN metadata->>'inviteCode' END) /
                      COUNT(DISTINCT CASE WHEN event_type = 'mechanic_invited' THEN metadata->>'inviteCode' END), 2)
            ELSE 0
        END as invite_acceptance_rate,

        -- Email metrics
        COUNT(CASE WHEN event_type LIKE 'email_%' AND success = true THEN 1 END) as emails_sent,
        COUNT(CASE WHEN event_type LIKE 'email_%' AND success = false THEN 1 END) as emails_failed,
        CASE
            WHEN COUNT(CASE WHEN event_type LIKE 'email_%' THEN 1 END) > 0
            THEN ROUND(100.0 * COUNT(CASE WHEN event_type LIKE 'email_%' AND success = true THEN 1 END) /
                      COUNT(CASE WHEN event_type LIKE 'email_%' THEN 1 END), 2)
            ELSE 100
        END as email_success_rate,

        -- Workshop health
        (SELECT COUNT(*) FROM organizations WHERE organization_type = 'workshop' AND status = 'active') as active_workshops,
        (SELECT COUNT(*) FROM organizations WHERE organization_type = 'workshop' AND status = 'pending') as pending_workshops,
        (SELECT COUNT(DISTINCT workshop_id) FROM mechanics WHERE workshop_id IS NOT NULL) as workshops_with_mechanics,

        -- Activity metrics
        COUNT(DISTINCT CASE WHEN event_type = 'workshop_dashboard_accessed' THEN workshop_id END) as dashboard_logins,
        COUNT(DISTINCT CASE WHEN event_type = 'workshop_profile_updated' THEN workshop_id END) as profile_updates

    FROM workshop_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE
    ON CONFLICT (metric_date, metric_type)
    DO UPDATE SET
        signups_started = EXCLUDED.signups_started,
        signups_completed = EXCLUDED.signups_completed,
        signups_failed = EXCLUDED.signups_failed,
        signup_conversion_rate = EXCLUDED.signup_conversion_rate,
        applications_pending = EXCLUDED.applications_pending,
        applications_approved = EXCLUDED.applications_approved,
        applications_rejected = EXCLUDED.applications_rejected,
        invites_sent = EXCLUDED.invites_sent,
        invites_accepted = EXCLUDED.invites_accepted,
        invites_expired = EXCLUDED.invites_expired,
        invite_acceptance_rate = EXCLUDED.invite_acceptance_rate,
        emails_sent = EXCLUDED.emails_sent,
        emails_failed = EXCLUDED.emails_failed,
        email_success_rate = EXCLUDED.email_success_rate,
        active_workshops = EXCLUDED.active_workshops,
        pending_workshops = EXCLUDED.pending_workshops,
        workshops_with_mechanics = EXCLUDED.workshops_with_mechanics,
        dashboard_logins = EXCLUDED.dashboard_logins,
        profile_updates = EXCLUDED.profile_updates,
        updated_at = NOW();
    $$
);

-- ============================================================================
-- CRON JOB 2: Hourly Alert Checks
-- Runs every hour
-- ============================================================================

SELECT cron.schedule(
    'workshop-hourly-alerts',                          -- job name
    '0 * * * *',                                       -- cron expression (every hour)
    $$
    -- Check for stuck applications (pending > 48 hours)
    INSERT INTO workshop_alerts (alert_type, severity, title, message, workshop_id, metadata)
    SELECT
        'application_stuck' as alert_type,
        'critical' as severity,
        'Application Stuck' as title,
        'Workshop application has been pending for ' ||
        EXTRACT(DAY FROM (NOW() - created_at)) || ' days' as message,
        id as workshop_id,
        jsonb_build_object(
            'workshopName', name,
            'workshopEmail', email,
            'daysPending', EXTRACT(DAY FROM (NOW() - created_at))
        ) as metadata
    FROM organizations
    WHERE organization_type = 'workshop'
      AND status = 'pending'
      AND created_at < NOW() - INTERVAL '48 hours'
      AND NOT EXISTS (
          SELECT 1 FROM workshop_alerts wa
          WHERE wa.workshop_id = organizations.id
            AND wa.alert_type = 'application_stuck'
            AND wa.acknowledged = false
      );

    -- Check for approval backlog
    INSERT INTO workshop_alerts (alert_type, severity, title, message, metadata)
    SELECT
        'approval_backlog' as alert_type,
        'warning' as severity,
        'Approval Backlog' as title,
        COUNT(*) || ' workshop applications pending approval' as message,
        jsonb_build_object('pendingCount', COUNT(*)) as metadata
    FROM organizations
    WHERE organization_type = 'workshop'
      AND status = 'pending'
    GROUP BY 1,2,3
    HAVING COUNT(*) > 5
      AND NOT EXISTS (
          SELECT 1 FROM workshop_alerts wa
          WHERE wa.alert_type = 'approval_backlog'
            AND wa.acknowledged = false
            AND wa.created_at > NOW() - INTERVAL '24 hours'
      );

    -- Check for inactive workshops (no activity in 14 days)
    INSERT INTO workshop_alerts (alert_type, severity, title, message, workshop_id, metadata)
    SELECT
        'workshop_churned' as alert_type,
        'critical' as severity,
        'Workshop Inactive' as title,
        'Workshop "' || o.name || '" has been inactive for 14+ days' as message,
        o.id as workshop_id,
        jsonb_build_object(
            'workshopName', o.name,
            'workshopEmail', o.email,
            'lastActivity', MAX(we.created_at)
        ) as metadata
    FROM organizations o
    LEFT JOIN workshop_events we ON we.workshop_id = o.id
        AND we.event_type = 'workshop_dashboard_accessed'
    WHERE o.organization_type = 'workshop'
      AND o.status = 'active'
    GROUP BY o.id, o.name, o.email
    HAVING MAX(we.created_at) < NOW() - INTERVAL '14 days'
       OR MAX(we.created_at) IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM workshop_alerts wa
          WHERE wa.workshop_id = o.id
            AND wa.alert_type = 'workshop_churned'
            AND wa.acknowledged = false
      );

    -- Mark expired invitations
    UPDATE organization_members
    SET status = 'expired'
    WHERE status = 'pending'
      AND invite_expires_at < NOW()
      AND invite_email IS NOT NULL;
    $$
);

-- ============================================================================
-- CRON JOB 3: Weekly Metrics Aggregation
-- Runs every Monday at 2 AM UTC
-- ============================================================================

SELECT cron.schedule(
    'workshop-weekly-metrics',                         -- job name
    '0 2 * * 1',                                       -- cron expression (Monday 2 AM UTC)
    $$
    -- Calculate weekly metrics for last week
    INSERT INTO workshop_metrics (
        metric_date,
        metric_type,
        signups_started,
        signups_completed,
        signups_failed,
        signup_conversion_rate,
        applications_approved,
        applications_rejected,
        invites_sent,
        invites_accepted,
        emails_sent,
        emails_failed,
        email_success_rate,
        active_workshops,
        workshops_with_mechanics,
        dashboard_logins
    )
    SELECT
        DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')::date as metric_date,
        'weekly' as metric_type,
        SUM(signups_started) as signups_started,
        SUM(signups_completed) as signups_completed,
        SUM(signups_failed) as signups_failed,
        CASE
            WHEN SUM(signups_started) > 0
            THEN ROUND(100.0 * SUM(signups_completed) / SUM(signups_started), 2)
            ELSE 0
        END as signup_conversion_rate,
        SUM(applications_approved) as applications_approved,
        SUM(applications_rejected) as applications_rejected,
        SUM(invites_sent) as invites_sent,
        SUM(invites_accepted) as invites_accepted,
        SUM(emails_sent) as emails_sent,
        SUM(emails_failed) as emails_failed,
        CASE
            WHEN SUM(emails_sent) + SUM(emails_failed) > 0
            THEN ROUND(100.0 * SUM(emails_sent) / (SUM(emails_sent) + SUM(emails_failed)), 2)
            ELSE 100
        END as email_success_rate,
        MAX(active_workshops) as active_workshops,
        MAX(workshops_with_mechanics) as workshops_with_mechanics,
        SUM(dashboard_logins) as dashboard_logins
    FROM workshop_metrics
    WHERE metric_type = 'daily'
      AND metric_date >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
      AND metric_date < DATE_TRUNC('week', CURRENT_DATE)
    ON CONFLICT (metric_date, metric_type)
    DO UPDATE SET
        signups_started = EXCLUDED.signups_started,
        signups_completed = EXCLUDED.signups_completed,
        signups_failed = EXCLUDED.signups_failed,
        signup_conversion_rate = EXCLUDED.signup_conversion_rate,
        applications_approved = EXCLUDED.applications_approved,
        applications_rejected = EXCLUDED.applications_rejected,
        invites_sent = EXCLUDED.invites_sent,
        invites_accepted = EXCLUDED.invites_accepted,
        emails_sent = EXCLUDED.emails_sent,
        emails_failed = EXCLUDED.emails_failed,
        email_success_rate = EXCLUDED.email_success_rate,
        active_workshops = EXCLUDED.active_workshops,
        workshops_with_mechanics = EXCLUDED.workshops_with_mechanics,
        dashboard_logins = EXCLUDED.dashboard_logins,
        updated_at = NOW();
    $$
);

-- ============================================================================
-- VIEW SCHEDULED JOBS
-- ============================================================================

-- To view all scheduled cron jobs:
-- SELECT * FROM cron.job;

-- To view job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ============================================================================
-- MANAGING JOBS
-- ============================================================================

-- To unschedule a job:
-- SELECT cron.unschedule('workshop-daily-metrics');

-- To update a job's schedule:
-- SELECT cron.alter_job(job_id, schedule := '0 2 * * *');

-- To manually run a job:
-- SELECT cron.run_job(job_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Workshop cron jobs migration completed successfully';
  RAISE NOTICE 'Created jobs: workshop-daily-metrics, workshop-hourly-alerts, workshop-weekly-metrics';
  RAISE NOTICE 'Jobs will run automatically based on their schedules';
END $$;