-- ============================================================================
-- Add Missing Columns to session_requests Table
-- ============================================================================
-- This migration adds columns that the application code expects but are missing
-- from the session_requests table schema
-- Date: 2025-10-30
-- ============================================================================

-- Add parent_session_id to link session_request to the created session
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS session_requests_parent_session_idx
ON public.session_requests(parent_session_id);

COMMENT ON COLUMN public.session_requests.parent_session_id IS 'Links the session_request to the pre-created session';

-- Add is_urgent flag for priority handling
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS session_requests_urgent_idx
ON public.session_requests(is_urgent)
WHERE is_urgent = TRUE;

COMMENT ON COLUMN public.session_requests.is_urgent IS 'Whether this is an urgent/priority request';

-- Add request_type for routing strategy
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'general'
  CHECK (request_type IN ('general', 'brand_specialist'));

CREATE INDEX IF NOT EXISTS session_requests_request_type_idx
ON public.session_requests(request_type);

COMMENT ON COLUMN public.session_requests.request_type IS 'Type of request: general or brand_specialist';

-- Add requested_brand for brand specialist routing
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS requested_brand TEXT;

CREATE INDEX IF NOT EXISTS session_requests_brand_idx
ON public.session_requests(requested_brand)
WHERE requested_brand IS NOT NULL;

COMMENT ON COLUMN public.session_requests.requested_brand IS 'Specific brand requested for brand specialist routing';

-- Add extracted_keywords for smart matching
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS extracted_keywords TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS session_requests_keywords_idx
ON public.session_requests USING GIN(extracted_keywords);

COMMENT ON COLUMN public.session_requests.extracted_keywords IS 'Keywords extracted from customer concern for matching';

-- Add matching_score for routing algorithms
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS matching_score JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.session_requests.matching_score IS 'Scores for matching mechanics to requests';

-- Add location fields for location-based routing
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS customer_country TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS prefer_local_mechanic BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS session_requests_location_idx
ON public.session_requests(customer_country, customer_city)
WHERE customer_country IS NOT NULL;

COMMENT ON COLUMN public.session_requests.customer_country IS 'Customer location country for local routing';
COMMENT ON COLUMN public.session_requests.customer_city IS 'Customer location city for local routing';
COMMENT ON COLUMN public.session_requests.prefer_local_mechanic IS 'Whether customer prefers local mechanics';

-- Add expiration tracking
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS session_requests_expires_idx
ON public.session_requests(expires_at)
WHERE expires_at IS NOT NULL AND status = 'pending';

COMMENT ON COLUMN public.session_requests.expires_at IS 'When this pending request expires if not accepted';

-- Add is_follow_up and follow_up_type columns (parent_session_id already added above)
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS follow_up_type TEXT CHECK (follow_up_type IN ('continuation', 're-diagnosis', 'additional_work'));

CREATE INDEX IF NOT EXISTS session_requests_follow_up_idx
ON public.session_requests(is_follow_up, parent_session_id)
WHERE is_follow_up = TRUE;

COMMENT ON COLUMN public.session_requests.is_follow_up IS 'Whether this is a follow-up request from a previous session';
COMMENT ON COLUMN public.session_requests.follow_up_type IS 'Type of follow-up: continuation, re-diagnosis, or additional_work';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Added missing columns to session_requests table';
  RAISE NOTICE '   - parent_session_id (UUID)';
  RAISE NOTICE '   - is_urgent (BOOLEAN)';
  RAISE NOTICE '   - request_type (TEXT)';
  RAISE NOTICE '   - requested_brand (TEXT)';
  RAISE NOTICE '   - extracted_keywords (TEXT[])';
  RAISE NOTICE '   - matching_score (JSONB)';
  RAISE NOTICE '   - customer_country, customer_city (TEXT)';
  RAISE NOTICE '   - prefer_local_mechanic (BOOLEAN)';
  RAISE NOTICE '   - expires_at (TIMESTAMPTZ)';
  RAISE NOTICE '   - is_follow_up, follow_up_type (BOOLEAN, TEXT)';
END $$;
