-- =====================================================
-- PHASE 5: ENHANCED ANALYTICS & REPORTING
-- =====================================================
-- Created: 2025-12-04
-- Purpose: Add comprehensive analytics and reporting capabilities
-- Features:
--   - Customer session analytics and engagement insights
--   - Mechanic performance metrics and activity tracking
--   - Admin platform analytics and KPIs
--   - Materialized views for performance
--   - Time-series data aggregation

-- =====================================================
-- 1. CUSTOMER ANALYTICS MATERIALIZED VIEW
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.customer_analytics AS
SELECT
  p.id AS customer_id,
  p.full_name AS customer_name,
  p.email AS customer_email,
  p.created_at AS customer_since,

  -- Session Metrics
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelled_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'chat' THEN s.id END) AS chat_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'video' THEN s.id END) AS video_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'diagnostic' THEN s.id END) AS diagnostic_sessions,

  -- Plan Distribution
  COUNT(DISTINCT CASE WHEN s."plan" LIKE '%quick%' OR s."plan" LIKE '%chat10%' THEN s.id END) AS quick_sessions,
  COUNT(DISTINCT CASE WHEN s."plan" LIKE '%standard%' OR s."plan" LIKE '%chat30%' THEN s.id END) AS standard_sessions,
  COUNT(DISTINCT CASE WHEN s."plan" LIKE '%premium%' OR s."plan" LIKE '%diagnostic%' THEN s.id END) AS premium_sessions,

  -- Subscription Metrics
  (SELECT current_credits FROM public.customer_subscriptions
   WHERE customer_id = p.id AND status = 'active' LIMIT 1) AS current_credits,
  (SELECT credits_used FROM public.customer_subscriptions
   WHERE customer_id = p.id AND status = 'active' LIMIT 1) AS credits_used,

  -- Rating Metrics
  COALESCE(AVG(s.rating), 0) AS avg_rating_given,
  COUNT(DISTINCT CASE WHEN s.rating IS NOT NULL THEN s.id END) AS total_reviews_given,

  -- Activity Metrics
  MAX(s.created_at) AS last_session_date,
  MIN(s.created_at) AS first_session_date,
  COUNT(DISTINCT v.id) AS total_vehicles,
  COALESCE(SUM(s.duration_minutes), 0) AS total_session_minutes,

  -- Engagement Score (0-100)
  LEAST(100,
    (COUNT(DISTINCT s.id) * 10) + -- Sessions contribute
    (COUNT(DISTINCT CASE WHEN s.rating IS NOT NULL THEN s.id END) * 5) + -- Reviews contribute
    (CASE WHEN MAX(s.created_at) > NOW() - INTERVAL '30 days' THEN 20 ELSE 0 END) -- Recent activity
  ) AS engagement_score,

  -- Timestamps
  NOW() AS refreshed_at

FROM public.profiles p
LEFT JOIN public.sessions s ON s.customer_user_id = p.id
LEFT JOIN public.vehicles v ON v.user_id = p.id
WHERE p.role = 'customer'
GROUP BY p.id, p.full_name, p.email, p.created_at;

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
  p.email AS mechanic_email,
  p.created_at AS mechanic_since,

  -- Session Metrics
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelled_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'chat' THEN s.id END) AS chat_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'video' THEN s.id END) AS video_sessions,
  COUNT(DISTINCT CASE WHEN s.type = 'diagnostic' THEN s.id END) AS diagnostic_sessions,

  -- Time Metrics
  COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.duration_minutes END), 0) AS total_session_minutes,
  COALESCE(AVG(CASE WHEN s.status = 'completed' THEN s.duration_minutes END), 0) AS avg_session_duration,
  COALESCE(SUM(CASE
    WHEN s.status = 'completed' AND s.created_at >= DATE_TRUNC('month', NOW())
    THEN s.duration_minutes
  END), 0) AS current_month_minutes,

  -- Rating Metrics
  COALESCE(AVG(s.rating), 0) AS avg_rating,
  COUNT(DISTINCT CASE WHEN s.rating IS NOT NULL THEN s.id END) AS total_reviews,
  COUNT(DISTINCT CASE WHEN s.rating = 5 THEN s.id END) AS five_star_reviews,
  COUNT(DISTINCT CASE WHEN s.rating >= 4 THEN s.id END) AS four_plus_reviews,

  -- Customer Metrics
  COUNT(DISTINCT s.customer_user_id) AS unique_customers,
  COUNT(DISTINCT CASE
    WHEN s.created_at >= NOW() - INTERVAL '30 days'
    THEN s.customer_user_id
  END) AS active_customers_30d,

  -- Activity Metrics
  MAX(s.created_at) AS last_session_date,
  MIN(s.created_at) AS first_session_date,

  -- Performance Score (0-100)
  LEAST(100,
    (COALESCE(AVG(s.rating), 0) * 15) + -- Rating contributes 0-75 points
    (COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END)::DECIMAL /
     NULLIF(COUNT(DISTINCT s.id)::DECIMAL, 0) * 25) -- Completion rate 0-25 points
  ) AS performance_score,

  -- Timestamps
  NOW() AS refreshed_at

FROM public.profiles p
LEFT JOIN public.sessions s ON s.mechanic_id = p.id
WHERE p.role = 'mechanic'
GROUP BY p.id, p.full_name, p.email, p.created_at;

-- Create unique index for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mechanic_analytics_mechanic ON public.mechanic_analytics(mechanic_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mechanic_analytics_performance ON public.mechanic_analytics(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_mechanic_analytics_rating ON public.mechanic_analytics(avg_rating DESC);

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

  -- Time Metrics
  COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.duration_minutes END), 0) AS daily_session_minutes,
  COALESCE(AVG(CASE WHEN s.status = 'completed' THEN s.duration_minutes END), 0) AS avg_session_duration,

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

  -- Performance Metrics
  COALESCE(AVG(s.rating), 0) AS avg_platform_rating,
  COUNT(DISTINCT CASE WHEN s.rating IS NOT NULL THEN s.id END) AS total_reviews,

  -- Timestamps
  NOW() AS refreshed_at

FROM public.sessions s
GROUP BY DATE_TRUNC('day', s.created_at);

-- Create unique index for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_analytics_date ON public.platform_analytics(date DESC);

-- =====================================================
-- 4. SESSION ANALYTICS TABLE
-- =====================================================

-- Store detailed session analytics snapshots
CREATE TABLE IF NOT EXISTS public.session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,

  -- Session Details
  session_type TEXT NOT NULL,
  session_status TEXT NOT NULL,
  session_plan TEXT NOT NULL,
  session_duration_minutes INTEGER,

  -- Participants
  customer_id UUID REFERENCES auth.users(id),
  mechanic_id UUID REFERENCES auth.users(id),

  -- Ratings & Feedback
  customer_rating INTEGER,
  customer_review TEXT,
  mechanic_notes TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
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
  completed_count INTEGER,
  total_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', s.created_at), 'YYYY-MM') AS month,
    COUNT(*)::INTEGER AS session_count,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::INTEGER AS completed_count,
    COALESCE(SUM(s.duration_minutes), 0)::INTEGER AS total_minutes
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
  unique_customers INTEGER,
  avg_rating DECIMAL,
  total_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', s.created_at), 'YYYY-MM') AS month,
    COUNT(*)::INTEGER AS session_count,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::INTEGER AS completed_count,
    COUNT(DISTINCT s.customer_user_id)::INTEGER AS unique_customers,
    COALESCE(AVG(s.rating), 0)::DECIMAL AS avg_rating,
    COALESCE(SUM(s.duration_minutes), 0)::INTEGER AS total_minutes
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
  avg_rating DECIMAL,
  completion_rate DECIMAL,
  total_session_minutes INTEGER
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
    COALESCE(AVG(s.rating), 0)::DECIMAL AS avg_rating,
    (COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::DECIMAL /
     NULLIF(COUNT(*)::DECIMAL, 0) * 100)::DECIMAL AS completion_rate,
    COALESCE(SUM(s.duration_minutes), 0)::INTEGER AS total_session_minutes
  FROM public.sessions s
  WHERE s.created_at >= p_start_date
    AND s.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer session distribution
CREATE OR REPLACE FUNCTION get_customer_session_distribution(p_customer_id UUID)
RETURNS TABLE (
  session_type TEXT,
  count INTEGER,
  percentage DECIMAL,
  total_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH totals AS (
    SELECT COUNT(*)::DECIMAL AS total_count
    FROM public.sessions
    WHERE customer_user_id = p_customer_id
      AND status = 'completed'
  )
  SELECT
    s.type AS session_type,
    COUNT(*)::INTEGER AS count,
    (COUNT(*)::DECIMAL / NULLIF(t.total_count, 0) * 100)::DECIMAL AS percentage,
    COALESCE(SUM(s.duration_minutes), 0)::INTEGER AS total_minutes
  FROM public.sessions s, totals t
  WHERE s.customer_user_id = p_customer_id
    AND s.status = 'completed'
  GROUP BY s.type, t.total_count
  ORDER BY count DESC;
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
      session_duration_minutes,
      customer_id,
      mechanic_id,
      customer_rating,
      customer_review,
      mechanic_notes,
      started_at,
      completed_at,
      metadata
    )
    VALUES (
      NEW.id,
      NEW.type,
      NEW.status,
      NEW."plan",
      NEW.duration_minutes,
      NEW.customer_user_id,
      NEW.mechanic_id,
      NEW.rating,
      NEW.review,
      NEW.session_notes,
      NEW.started_at,
      NEW.ended_at,
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
  session_duration_minutes,
  customer_id,
  mechanic_id,
  customer_rating,
  customer_review,
  mechanic_notes,
  started_at,
  completed_at,
  metadata
)
SELECT
  s.id,
  s.type,
  s.status,
  s."plan",
  s.duration_minutes,
  s.customer_user_id,
  s.mechanic_id,
  s.rating,
  s.review,
  s.session_notes,
  s.started_at,
  s.ended_at,
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
