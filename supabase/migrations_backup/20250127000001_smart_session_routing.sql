-- =====================================================
-- Migration: Smart Session Routing (Priority 2)
-- =====================================================
-- Purpose: Enable workshop-preferred session routing
-- Date: 2025-01-27
-- Dependencies: 20250126000001_add_workshop_to_mechanics.sql
-- =====================================================

-- 1. Add workshop tracking to session_requests
-- =====================================================

ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS preferred_workshop_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS routing_type TEXT DEFAULT 'broadcast'
  CHECK (routing_type IN ('workshop_only', 'broadcast', 'hybrid'));

COMMENT ON COLUMN public.session_requests.workshop_id IS 'Workshop that ultimately served this request (set when mechanic accepts)';
COMMENT ON COLUMN public.session_requests.preferred_workshop_id IS 'Workshop customer selected during booking (routing preference)';
COMMENT ON COLUMN public.session_requests.routing_type IS 'Routing strategy: workshop_only (only workshop mechanics), broadcast (all mechanics), hybrid (workshop first, then all)';

-- 2. Add workshop tracking to sessions table
-- =====================================================

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS preferred_workshop_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sessions.workshop_id IS 'Workshop that served this session (from assigned mechanic)';
COMMENT ON COLUMN public.sessions.preferred_workshop_id IS 'Workshop customer requested during booking';

-- 3. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS session_requests_workshop_id_idx
  ON public.session_requests(workshop_id)
  WHERE workshop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS session_requests_preferred_workshop_idx
  ON public.session_requests(preferred_workshop_id)
  WHERE preferred_workshop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS session_requests_routing_type_idx
  ON public.session_requests(routing_type);

CREATE INDEX IF NOT EXISTS sessions_workshop_id_idx
  ON public.sessions(workshop_id)
  WHERE workshop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sessions_preferred_workshop_idx
  ON public.sessions(preferred_workshop_id)
  WHERE preferred_workshop_id IS NOT NULL;

-- 4. Create helper function to get available mechanics for routing
-- =====================================================

CREATE OR REPLACE FUNCTION get_mechanics_for_routing(
  p_workshop_id UUID DEFAULT NULL,
  p_routing_type TEXT DEFAULT 'broadcast'
)
RETURNS TABLE (
  mechanic_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  is_available BOOLEAN,
  rating NUMERIC,
  completed_sessions INTEGER,
  workshop_id UUID,
  workshop_name TEXT,
  priority_score INTEGER
) AS $$
BEGIN
  -- Workshop-only routing: Only mechanics from specific workshop
  IF p_routing_type = 'workshop_only' AND p_workshop_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      m.id,
      m.email,
      m.full_name,
      m.phone,
      m.is_available,
      m.rating,
      m.completed_sessions,
      m.workshop_id,
      o.name as workshop_name,
      100 as priority_score -- Workshop mechanics get highest priority
    FROM public.mechanics m
    LEFT JOIN public.organizations o ON m.workshop_id = o.id
    WHERE m.workshop_id = p_workshop_id
      AND m.application_status = 'approved'
      AND m.is_available = TRUE
    ORDER BY m.rating DESC NULLS LAST, m.completed_sessions DESC;

  -- Hybrid routing: Workshop mechanics first, then all others
  ELSIF p_routing_type = 'hybrid' AND p_workshop_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      m.id,
      m.email,
      m.full_name,
      m.phone,
      m.is_available,
      m.rating,
      m.completed_sessions,
      m.workshop_id,
      o.name as workshop_name,
      CASE
        WHEN m.workshop_id = p_workshop_id THEN 100 -- Preferred workshop mechanics
        WHEN m.workshop_id IS NOT NULL THEN 50      -- Other workshop mechanics
        ELSE 25                                      -- Independent mechanics
      END as priority_score
    FROM public.mechanics m
    LEFT JOIN public.organizations o ON m.workshop_id = o.id
    WHERE m.application_status = 'approved'
      AND m.is_available = TRUE
    ORDER BY priority_score DESC, m.rating DESC NULLS LAST, m.completed_sessions DESC;

  -- Broadcast routing: All available mechanics
  ELSE
    RETURN QUERY
    SELECT
      m.id,
      m.email,
      m.full_name,
      m.phone,
      m.is_available,
      m.rating,
      m.completed_sessions,
      m.workshop_id,
      o.name as workshop_name,
      50 as priority_score -- Equal priority for all
    FROM public.mechanics m
    LEFT JOIN public.organizations o ON m.workshop_id = o.id
    WHERE m.application_status = 'approved'
      AND m.is_available = TRUE
    ORDER BY m.rating DESC NULLS LAST, m.completed_sessions DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_mechanics_for_routing IS 'Returns available mechanics based on routing strategy with priority scoring';

-- 5. Create trigger to auto-populate workshop_id when mechanic accepts
-- =====================================================

CREATE OR REPLACE FUNCTION auto_populate_session_workshop()
RETURNS TRIGGER AS $$
BEGIN
  -- When a mechanic accepts a request, populate workshop_id from mechanic's workshop
  IF NEW.mechanic_id IS NOT NULL AND OLD.mechanic_id IS NULL THEN
    -- Get the mechanic's workshop
    SELECT workshop_id INTO NEW.workshop_id
    FROM public.mechanics
    WHERE id = NEW.mechanic_id;

    -- Also populate workshop_id on the corresponding session
    IF NEW.workshop_id IS NOT NULL THEN
      UPDATE public.sessions
      SET workshop_id = NEW.workshop_id
      WHERE customer_user_id = NEW.customer_id
        AND status IN ('pending', 'waiting')
        AND created_at >= NOW() - INTERVAL '1 hour';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_request_populate_workshop
  BEFORE UPDATE ON public.session_requests
  FOR EACH ROW
  WHEN (NEW.mechanic_id IS NOT NULL AND OLD.mechanic_id IS NULL)
  EXECUTE FUNCTION auto_populate_session_workshop();

COMMENT ON TRIGGER session_request_populate_workshop ON public.session_requests IS 'Automatically sets workshop_id when mechanic accepts request';

-- 6. Create view for workshop session analytics
-- =====================================================

CREATE OR REPLACE VIEW public.workshop_session_analytics AS
SELECT
  o.id as workshop_id,
  o.name as workshop_name,
  COUNT(DISTINCT sr.id) as total_requests_served,
  COUNT(DISTINCT CASE WHEN sr.preferred_workshop_id = o.id THEN sr.id END) as preferred_requests,
  COUNT(DISTINCT CASE WHEN sr.routing_type = 'workshop_only' THEN sr.id END) as exclusive_requests,
  COUNT(DISTINCT s.id) as total_sessions,
  SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
  AVG(CASE WHEN s.rating IS NOT NULL THEN s.rating END) as avg_session_rating,
  COUNT(DISTINCT sr.mechanic_id) as unique_mechanics_served
FROM public.organizations o
LEFT JOIN public.session_requests sr ON sr.workshop_id = o.id
LEFT JOIN public.sessions s ON s.workshop_id = o.id
WHERE o.organization_type = 'workshop'
GROUP BY o.id, o.name;

COMMENT ON VIEW public.workshop_session_analytics IS 'Analytics for workshop session routing and performance';

-- 7. Create helper function to get workshop directory for customers
-- =====================================================

CREATE OR REPLACE FUNCTION get_workshop_directory(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  workshop_id UUID,
  workshop_name TEXT,
  workshop_email TEXT,
  workshop_status TEXT,
  total_mechanics INTEGER,
  available_mechanics INTEGER,
  avg_rating NUMERIC,
  total_sessions INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.email,
    o.status,
    COUNT(DISTINCT m.id)::INTEGER as total_mechanics,
    COUNT(DISTINCT CASE WHEN m.is_available = TRUE THEN m.id END)::INTEGER as available_mechanics,
    AVG(m.rating) as avg_rating,
    COUNT(DISTINCT s.id)::INTEGER as total_sessions,
    o.created_at
  FROM public.organizations o
  LEFT JOIN public.mechanics m ON m.workshop_id = o.id AND m.application_status = 'approved'
  LEFT JOIN public.sessions s ON s.workshop_id = o.id
  WHERE o.organization_type = 'workshop'
    AND o.status = 'active'
  GROUP BY o.id, o.name, o.email, o.status, o.created_at
  HAVING COUNT(DISTINCT CASE WHEN m.is_available = TRUE THEN m.id END) > 0 -- Only show workshops with available mechanics
  ORDER BY available_mechanics DESC, avg_rating DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_workshop_directory IS 'Returns active workshops with available mechanics for customer selection';

-- 8. Migration complete
-- =====================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE '✅ Smart Session Routing migration complete!';
  RAISE NOTICE 'Added columns: session_requests.workshop_id, session_requests.preferred_workshop_id, session_requests.routing_type';
  RAISE NOTICE 'Added columns: sessions.workshop_id, sessions.preferred_workshop_id';
  RAISE NOTICE 'Created function: get_mechanics_for_routing()';
  RAISE NOTICE 'Created function: get_workshop_directory()';
  RAISE NOTICE 'Created view: workshop_session_analytics';
  RAISE NOTICE 'Created trigger: session_request_populate_workshop';
END $$;
