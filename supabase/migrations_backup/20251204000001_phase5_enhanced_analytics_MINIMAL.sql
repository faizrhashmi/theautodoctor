-- =====================================================
-- PHASE 5: ENHANCED ANALYTICS & REPORTING (MINIMAL)
-- =====================================================
-- Created: 2025-12-04
-- Purpose: Add basic analytics capabilities
-- Features:
--   - Session count analytics
--   - Activity tracking
--   - Basic KPIs

-- =====================================================
-- 1. CUSTOMER ANALYTICS MATERIALIZED VIEW
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.customer_analytics AS
SELECT
  p.id AS customer_id,
  p.full_name AS customer_name,
  p.created_at AS customer_since,

  -- Session Metrics
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelled_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'chat' THEN s.id END) AS chat_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'video' THEN s.id END) AS video_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'diagnostic' THEN s.id END) AS diagnostic_sessions,

  -- Activity Metrics
  MAX(s.created_at) AS last_session_date,
  MIN(s.created_at) AS first_session_date,
  COUNT(DISTINCT v.id) AS total_vehicles,

  -- Engagement Score (0-100)
  LEAST(100,
    (COUNT(DISTINCT s.id) * 10) + -- Sessions contribute
    (CASE WHEN MAX(s.created_at) > NOW() - INTERVAL '30 days' THEN 20 ELSE 0 END) -- Recent activity
  ) AS engagement_score,

  -- Timestamps
  NOW() AS refreshed_at

FROM public.profiles p
LEFT JOIN public.sessions s ON s.customer_user_id = p.id
LEFT JOIN public.vehicles v ON v.user_id = p.id
WHERE p.role = 'customer'
GROUP BY p.id, p.full_name, p.created_at;

-- Create unique index for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_analytics_customer ON public.customer_analytics(customer_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_customer_analytics_engagement ON public.customer_analytics(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_last_session ON public.customer_analytics(last_session_date DESC);

-- =====================================================
-- 2. MECHANIC ANALYTICS MATERIALIZED VIEW
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mechanic_analytics AS
SELECT
  p.id AS mechanic_id,
  p.full_name AS mechanic_name,
  p.created_at AS mechanic_since,

  -- Session Metrics
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelled_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'chat' THEN s.id END) AS chat_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'video' THEN s.id END) AS video_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'diagnostic' THEN s.id END) AS diagnostic_sessions,

  -- Customer Metrics
  COUNT(DISTINCT s.customer_user_id) AS unique_customers,
  COUNT(DISTINCT CASE
    WHEN s.created_at >= NOW() - INTERVAL '30 days'
    THEN s.customer_user_id
  END) AS active_customers_30d,

  -- Activity Metrics
  MAX(s.created_at) AS last_session_date,
  MIN(s.created_at) AS first_session_date,

  -- Performance Score (0-100 based on completion rate)
  LEAST(100,
    (COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END)::DECIMAL /
     NULLIF(COUNT(DISTINCT s.id)::DECIMAL, 0) * 100)
  ) AS performance_score,

  -- Timestamps
  NOW() AS refreshed_at

FROM public.profiles p
LEFT JOIN public.sessions s ON s.mechanic_id = p.id
WHERE p.role = 'mechanic'
GROUP BY p.id, p.full_name, p.created_at;

-- Create unique index for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mechanic_analytics_mechanic ON public.mechanic_analytics(mechanic_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mechanic_analytics_performance ON public.mechanic_analytics(performance_score DESC);

-- =====================================================
-- 3. PLATFORM ANALYTICS MATERIALIZED VIEW
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.platform_analytics AS
SELECT
  -- Time Period
  DATE_TRUNC('day', s.created_at) AS date,

  -- Session Metrics
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelled_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'chat' THEN s.id END) AS chat_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'video' THEN s.id END) AS video_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'diagnostic' THEN s.id END) AS diagnostic_sessions,

  -- Customer Metrics
  COUNT(DISTINCT s.customer_user_id) AS unique_customers,
  COUNT(DISTINCT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.sessions s2
      WHERE s2.customer_user_id = s.customer_user_id
      AND s2.created_at < s.created_at
    ) THEN s.customer_user_id
  END) AS new_customers,

  -- Mechanic Metrics
  COUNT(DISTINCT s.mechanic_id) AS active_mechanics,

  -- Timestamps
  NOW() AS refreshed_at

FROM public.sessions s
GROUP BY DATE_TRUNC('day', s.created_at);

-- Create unique index for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_analytics_date ON public.platform_analytics(date DESC);

-- =====================================================
-- 4. SESSION ANALYTICS TABLE (MINIMAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,

  -- Session Details
  session_type TEXT NOT NULL,
  session_status TEXT NOT NULL,
  session_plan TEXT NOT NULL,

  -- Participants (no FK constraints to allow orphaned references)
  customer_id UUID,
  mechanic_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_analytics_session ON public.session_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_customer ON public.session_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_mechanic ON public.session_analytics(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_created ON public.session_analytics(created_at DESC);

-- =====================================================
-- 5. ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.customer_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mechanic_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.platform_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer session trend (last 12 months)
CREATE OR REPLACE FUNCTION get_customer_session_trend(p_customer_id UUID)
RETURNS TABLE (
  month TEXT,
  session_count INTEGER,
  completed_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', s.created_at), 'YYYY-MM') AS month,
    COUNT(*)::INTEGER AS session_count,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::INTEGER AS completed_count
  FROM public.sessions s
  WHERE s.customer_user_id = p_customer_id
    AND s.created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', s.created_at)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get mechanic activity trend (last 12 months)
CREATE OR REPLACE FUNCTION get_mechanic_activity_trend(p_mechanic_id UUID)
RETURNS TABLE (
  month TEXT,
  session_count INTEGER,
  completed_count INTEGER,
  unique_customers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', s.created_at), 'YYYY-MM') AS month,
    COUNT(*)::INTEGER AS session_count,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::INTEGER AS completed_count,
    COUNT(DISTINCT s.customer_user_id)::INTEGER AS unique_customers
  FROM public.sessions s
  WHERE s.mechanic_id = p_mechanic_id
    AND s.created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', s.created_at)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get platform KPIs for date range
CREATE OR REPLACE FUNCTION get_platform_kpis(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_sessions INTEGER,
  completed_sessions INTEGER,
  total_customers INTEGER,
  new_customers INTEGER,
  active_mechanics INTEGER,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_sessions,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::INTEGER AS completed_sessions,
    COUNT(DISTINCT s.customer_user_id)::INTEGER AS total_customers,
    COUNT(DISTINCT CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM public.sessions s2
        WHERE s2.customer_user_id = s.customer_user_id
        AND s2.created_at < s.created_at
        AND s2.created_at < p_start_date
      ) THEN s.customer_user_id
    END)::INTEGER AS new_customers,
    COUNT(DISTINCT s.mechanic_id)::INTEGER AS active_mechanics,
    (COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::DECIMAL /
     NULLIF(COUNT(*)::DECIMAL, 0) * 100)::DECIMAL AS completion_rate
  FROM public.sessions s
  WHERE s.created_at >= p_start_date
    AND s.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. AUTOMATIC ANALYTICS SNAPSHOT TRIGGER
-- =====================================================

-- Create snapshot when session completes
CREATE OR REPLACE FUNCTION create_session_analytics_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create snapshot when session is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Insert analytics snapshot
    INSERT INTO public.session_analytics (
      session_id,
      session_type,
      session_status,
      session_plan,
      customer_id,
      mechanic_id,
      metadata
    )
    VALUES (
      NEW.id,
      NEW.type,
      NEW.status,
      NEW."plan",
      NEW.customer_user_id,
      NEW.mechanic_id,
      NEW.metadata
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_session_analytics ON public.sessions;
CREATE TRIGGER trigger_create_session_analytics
  AFTER INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_session_analytics_snapshot();

-- =====================================================
-- 7. INITIAL DATA LOAD
-- =====================================================

-- Refresh materialized views with existing data
SELECT refresh_all_analytics();

-- Backfill session analytics for completed sessions
INSERT INTO public.session_analytics (
  session_id,
  session_type,
  session_status,
  session_plan,
  customer_id,
  mechanic_id,
  metadata
)
SELECT
  s.id,
  s.type,
  s.status,
  s."plan",
  s.customer_user_id,
  s.mechanic_id,
  s.metadata
FROM public.sessions s
WHERE s.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.session_analytics sa
    WHERE sa.session_id = s.id
  );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
