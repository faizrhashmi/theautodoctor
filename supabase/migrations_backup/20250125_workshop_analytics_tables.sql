-- ============================================================================
-- Workshop Analytics Tables Migration
-- Created: 2025-01-25
-- Purpose: Analytics and monitoring for workshop features
-- ============================================================================

-- ============================================================================
-- TABLE 1: workshop_events
-- Captures all workshop-related events for detailed tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS workshop_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event identification
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL, -- 'signup', 'approval', 'invitation', 'email', 'activity'

  -- Entity references
  workshop_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mechanic_id UUID,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event metadata (flexible JSON for additional context)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Session tracking
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Outcome tracking
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Performance tracking
  duration_ms INTEGER,

  -- Soft delete support
  deleted_at TIMESTAMPTZ
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_workshop_events_type ON workshop_events(event_type);
CREATE INDEX IF NOT EXISTS idx_workshop_events_category ON workshop_events(event_category);
CREATE INDEX IF NOT EXISTS idx_workshop_events_workshop ON workshop_events(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_events_created ON workshop_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_events_success ON workshop_events(success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_events_category_success ON workshop_events(event_category, success);

-- Comment for documentation
COMMENT ON TABLE workshop_events IS 'Tracks all workshop-related events for analytics and monitoring';
COMMENT ON COLUMN workshop_events.event_type IS 'Specific event (e.g., workshop_signup_submitted, workshop_approved)';
COMMENT ON COLUMN workshop_events.event_category IS 'Event category for grouping (signup, approval, invitation, email, activity)';
COMMENT ON COLUMN workshop_events.metadata IS 'Flexible JSON field for event-specific data';

-- ============================================================================
-- TABLE 2: workshop_metrics
-- Aggregated daily/weekly/monthly metrics and KPIs
-- ============================================================================

CREATE TABLE IF NOT EXISTS workshop_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Time period
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'

  -- Signup funnel metrics
  signups_started INTEGER DEFAULT 0,
  signups_completed INTEGER DEFAULT 0,
  signups_failed INTEGER DEFAULT 0,
  signup_conversion_rate DECIMAL(5,2),

  -- Approval metrics
  applications_pending INTEGER DEFAULT 0,
  applications_approved INTEGER DEFAULT 0,
  applications_rejected INTEGER DEFAULT 0,
  avg_approval_time_hours DECIMAL(10,2),
  median_approval_time_hours DECIMAL(10,2),

  -- Invitation metrics
  invites_sent INTEGER DEFAULT 0,
  invites_accepted INTEGER DEFAULT 0,
  invites_expired INTEGER DEFAULT 0,
  invite_acceptance_rate DECIMAL(5,2),

  -- Email metrics
  emails_sent INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,
  email_success_rate DECIMAL(5,2),
  email_approval_sent INTEGER DEFAULT 0,
  email_rejection_sent INTEGER DEFAULT 0,
  email_invite_sent INTEGER DEFAULT 0,

  -- Workshop health
  active_workshops INTEGER DEFAULT 0,
  pending_workshops INTEGER DEFAULT 0,
  rejected_workshops INTEGER DEFAULT 0,
  suspended_workshops INTEGER DEFAULT 0,
  workshops_with_mechanics INTEGER DEFAULT 0,
  total_mechanics_invited INTEGER DEFAULT 0,
  total_mechanics_active INTEGER DEFAULT 0,
  avg_mechanics_per_workshop DECIMAL(5,2),

  -- Activity metrics
  dashboard_logins INTEGER DEFAULT 0,
  profile_updates INTEGER DEFAULT 0,

  -- Performance metrics
  avg_page_load_ms INTEGER,
  api_errors INTEGER DEFAULT 0,
  api_success_rate DECIMAL(5,2),

  -- Additional context
  notes TEXT,

  CONSTRAINT unique_metric_date_type UNIQUE(metric_date, metric_type)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_workshop_metrics_date ON workshop_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_metrics_type ON workshop_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_workshop_metrics_date_type ON workshop_metrics(metric_date DESC, metric_type);

-- Comment for documentation
COMMENT ON TABLE workshop_metrics IS 'Aggregated metrics and KPIs for workshop analytics';
COMMENT ON COLUMN workshop_metrics.metric_type IS 'Aggregation period: daily, weekly, or monthly';

-- ============================================================================
-- TABLE 3: workshop_alerts
-- Automated alerts for workshop issues and milestones
-- ============================================================================

CREATE TABLE IF NOT EXISTS workshop_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Alert identification
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),

  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related entities
  workshop_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Alert lifecycle
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Action taken
  action_taken TEXT,
  action_taken_at TIMESTAMPTZ,

  -- Auto-resolve
  auto_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_workshop_alerts_unacknowledged ON workshop_alerts(acknowledged, created_at DESC) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_workshop_alerts_severity ON workshop_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_alerts_type ON workshop_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_workshop_alerts_workshop ON workshop_alerts(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_alerts_created ON workshop_alerts(created_at DESC);

-- Comment for documentation
COMMENT ON TABLE workshop_alerts IS 'Automated alerts for workshop issues and milestones';
COMMENT ON COLUMN workshop_alerts.severity IS 'Alert severity: critical, warning, or info';
COMMENT ON COLUMN workshop_alerts.alert_type IS 'Type of alert (e.g., application_stuck, email_failure, workshop_churn)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workshop_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Admin full access to workshop_events
CREATE POLICY "Admin full access to workshop_events"
  ON workshop_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Workshops can view their own events
CREATE POLICY "Workshops can view their own events"
  ON workshop_events
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Policy: Admin full access to workshop_metrics
CREATE POLICY "Admin full access to workshop_metrics"
  ON workshop_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admin full access to workshop_alerts
CREATE POLICY "Admin full access to workshop_alerts"
  ON workshop_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Workshops can view their own alerts
CREATE POLICY "Workshops can view their own alerts"
  ON workshop_alerts
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workshop_metrics
DROP TRIGGER IF EXISTS update_workshop_metrics_updated_at ON workshop_metrics;
CREATE TRIGGER update_workshop_metrics_updated_at
  BEFORE UPDATE ON workshop_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for workshop_alerts
DROP TRIGGER IF EXISTS update_workshop_alerts_updated_at ON workshop_alerts;
CREATE TRIGGER update_workshop_alerts_updated_at
  BEFORE UPDATE ON workshop_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA / SAMPLE ALERT TYPES
-- ============================================================================

-- Document common alert types in a comment for reference
COMMENT ON COLUMN workshop_alerts.alert_type IS 'Common types: application_stuck, email_failure, workshop_churn, low_invite_acceptance, approval_backlog, beta_milestone, workshop_thriving';

-- ============================================================================
-- GRANTS (if needed for service role)
-- ============================================================================

-- Grant usage to authenticated users (RLS policies will control access)
GRANT SELECT ON workshop_events TO authenticated;
GRANT SELECT ON workshop_metrics TO authenticated;
GRANT SELECT ON workshop_alerts TO authenticated;

-- Grant full access to service_role (for cron jobs and admin operations)
GRANT ALL ON workshop_events TO service_role;
GRANT ALL ON workshop_metrics TO service_role;
GRANT ALL ON workshop_alerts TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Workshop analytics tables migration completed successfully';
  RAISE NOTICE 'Created tables: workshop_events, workshop_metrics, workshop_alerts';
  RAISE NOTICE 'Created indexes for performance optimization';
  RAISE NOTICE 'Enabled RLS policies for security';
END $$;
