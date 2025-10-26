-- Admin Logs and Monitoring Tables Migration
-- Created: 2025-10-23
-- Purpose: Create tables for comprehensive admin logging and monitoring

-- =====================================================
-- 1. ADMIN LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  source TEXT NOT NULL CHECK (source IN ('api', 'auth', 'session', 'payment', 'database', 'system', 'cleanup', 'livekit', 'email')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_logs_level ON admin_logs(level);
CREATE INDEX IF NOT EXISTS idx_admin_logs_source ON admin_logs(source);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_level_source ON admin_logs(level, source);
CREATE INDEX IF NOT EXISTS idx_admin_logs_message_search ON admin_logs USING gin(to_tsvector('english', message));

-- Add comments
COMMENT ON TABLE admin_logs IS 'Centralized logging for admin panel and system monitoring';
COMMENT ON COLUMN admin_logs.level IS 'Log level: error, warn, info, debug';
COMMENT ON COLUMN admin_logs.source IS 'Log source: api, auth, session, payment, database, system, cleanup, livekit, email';
COMMENT ON COLUMN admin_logs.metadata IS 'Additional structured data (user_id, session_id, error_stack, etc.)';

-- =====================================================
-- 2. ERROR TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  source TEXT NOT NULL CHECK (source IN ('api', 'auth', 'session', 'payment', 'database', 'system', 'cleanup', 'livekit', 'email')),
  occurrence_count INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  affected_users TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_errors_type ON admin_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_admin_errors_source ON admin_errors(source);
CREATE INDEX IF NOT EXISTS idx_admin_errors_status ON admin_errors(status);
CREATE INDEX IF NOT EXISTS idx_admin_errors_last_seen ON admin_errors(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_admin_errors_occurrence_count ON admin_errors(occurrence_count DESC);

-- Add comments
COMMENT ON TABLE admin_errors IS 'Error tracking and grouping for admin monitoring';
COMMENT ON COLUMN admin_errors.occurrence_count IS 'Number of times this error has occurred';
COMMENT ON COLUMN admin_errors.affected_users IS 'Array of user IDs affected by this error';
COMMENT ON COLUMN admin_errors.status IS 'Current status: open, investigating, resolved, ignored';

-- =====================================================
-- 3. SYSTEM HEALTH CHECKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL CHECK (service_name IN ('supabase', 'livekit', 'stripe', 'email', 'storage')),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_checks_service ON system_health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON system_health_checks(checked_at DESC);

-- Add comments
COMMENT ON TABLE system_health_checks IS 'System health monitoring and service status tracking';
COMMENT ON COLUMN system_health_checks.response_time_ms IS 'Response time in milliseconds';

-- =====================================================
-- 4. CLEANUP HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cleanup_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleanup_type TEXT NOT NULL CHECK (cleanup_type IN ('expired_requests', 'old_sessions', 'orphaned_sessions', 'manual')),
  items_cleaned INTEGER DEFAULT 0,
  preview_mode BOOLEAN DEFAULT false,
  triggered_by TEXT, -- admin user ID or 'automated'
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cleanup_history_type ON cleanup_history(cleanup_type);
CREATE INDEX IF NOT EXISTS idx_cleanup_history_created_at ON cleanup_history(created_at DESC);

-- Add comments
COMMENT ON TABLE cleanup_history IS 'History of cleanup operations performed';
COMMENT ON COLUMN cleanup_history.preview_mode IS 'Whether this was a dry-run preview';
COMMENT ON COLUMN cleanup_history.summary IS 'Detailed summary of what was cleaned';

-- =====================================================
-- 5. SAVED QUERIES TABLE (for database query tool)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_saved_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  is_public BOOLEAN DEFAULT false,
  created_by TEXT, -- admin user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_queries_category ON admin_saved_queries(category);
CREATE INDEX IF NOT EXISTS idx_saved_queries_created_by ON admin_saved_queries(created_by);

-- Add comments
COMMENT ON TABLE admin_saved_queries IS 'Library of saved SQL queries for admin database tool';

-- =====================================================
-- 6. QUERY EXECUTION HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_query_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  executed_by TEXT, -- admin user ID
  execution_time_ms INTEGER,
  rows_returned INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_query_history_executed_by ON admin_query_history(executed_by);
CREATE INDEX IF NOT EXISTS idx_query_history_executed_at ON admin_query_history(executed_at DESC);

-- Add comments
COMMENT ON TABLE admin_query_history IS 'History of SQL queries executed through admin panel';

-- =====================================================
-- 7. RLS POLICIES (Admin-only access)
-- =====================================================

-- Note: These tables should only be accessible to service role or authenticated admin users
-- For now, we'll disable RLS since admin panel uses service role key
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_query_history ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to admin_logs" ON admin_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to admin_errors" ON admin_errors
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to system_health_checks" ON system_health_checks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to cleanup_history" ON cleanup_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to admin_saved_queries" ON admin_saved_queries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to admin_query_history" ON admin_query_history
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for admin_errors
CREATE TRIGGER update_admin_errors_updated_at
  BEFORE UPDATE ON admin_errors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for admin_saved_queries
CREATE TRIGGER update_admin_saved_queries_updated_at
  BEFORE UPDATE ON admin_saved_queries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. INSERT SOME COMMON SAVED QUERIES
-- =====================================================

INSERT INTO admin_saved_queries (name, description, query, category, is_public) VALUES
  ('Active Sessions', 'Get all currently active sessions', 'SELECT * FROM sessions WHERE status = ''active'' ORDER BY created_at DESC LIMIT 50', 'sessions', true),
  ('Recent Errors (24h)', 'Get error logs from last 24 hours', 'SELECT * FROM admin_logs WHERE level = ''error'' AND created_at > NOW() - INTERVAL ''24 hours'' ORDER BY created_at DESC', 'monitoring', true),
  ('Pending Session Requests', 'Get all pending session requests', 'SELECT sr.*, p.email as customer_email FROM session_requests sr LEFT JOIN profiles p ON sr.customer_id = p.id WHERE sr.status = ''pending'' ORDER BY sr.created_at DESC', 'sessions', true),
  ('User Activity Summary', 'Get user registration and activity stats', 'SELECT DATE(created_at) as date, COUNT(*) as registrations FROM profiles GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30', 'users', true),
  ('Payment Transactions', 'Get recent payment transactions', 'SELECT * FROM session_requests WHERE stripe_payment_intent_id IS NOT NULL ORDER BY created_at DESC LIMIT 50', 'payments', true),
  ('Database Table Sizes', 'Show size of all tables', 'SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||''.''||tablename)) AS size FROM pg_tables WHERE schemaname NOT IN (''pg_catalog'', ''information_schema'') ORDER BY pg_total_relation_size(schemaname||''.''||tablename) DESC', 'database', true),
  ('Session Duration Stats', 'Average session duration by status', 'SELECT status, COUNT(*) as count, AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - created_at))/60) as avg_minutes FROM sessions GROUP BY status', 'analytics', true),
  ('Mechanic Availability', 'Show mechanics and their availability', 'SELECT id, name, email, status, available_for_sessions FROM mechanics ORDER BY name', 'mechanics', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. ANALYTICS VIEWS
-- =====================================================

-- View for error frequency analysis
CREATE OR REPLACE VIEW error_frequency_by_hour AS
SELECT
  date_trunc('hour', created_at) as hour,
  level,
  source,
  COUNT(*) as count
FROM admin_logs
WHERE level IN ('error', 'warn')
GROUP BY date_trunc('hour', created_at), level, source
ORDER BY hour DESC;

-- View for system health summary
CREATE OR REPLACE VIEW system_health_summary AS
SELECT
  service_name,
  status,
  AVG(response_time_ms) as avg_response_time,
  MAX(checked_at) as last_checked
FROM system_health_checks
WHERE checked_at > NOW() - INTERVAL '1 hour'
GROUP BY service_name, status;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
