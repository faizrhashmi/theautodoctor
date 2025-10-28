-- ============================================================================
-- REQUEST TIMEOUT MECHANISM
-- ============================================================================
-- Purpose: Add automatic expiration for unanswered session requests
-- Priority: P0 - Prevents orphaned requests from staying in pending state
-- Date: 2025-10-28
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD expires_at COLUMN
-- ============================================================================

DO $$
BEGIN
  -- Add expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'session_requests'
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.session_requests
      ADD COLUMN expires_at TIMESTAMPTZ;

    RAISE NOTICE '✓ Added expires_at column to session_requests';
  ELSE
    RAISE NOTICE '✓ expires_at column already exists';
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: SET EXPIRATION FOR EXISTING PENDING REQUESTS
-- ============================================================================

-- Set expiration for existing pending requests (15 minutes from creation)
UPDATE public.session_requests
SET expires_at = created_at + INTERVAL '15 minutes'
WHERE status = 'pending'
  AND expires_at IS NULL
  AND mechanic_id IS NULL;

-- ============================================================================
-- SECTION 3: CREATE AUTOMATIC EXPIRATION FUNCTION
-- ============================================================================

-- Function to expire old pending requests
CREATE OR REPLACE FUNCTION public.expire_old_session_requests()
RETURNS TABLE (
  expired_count INTEGER,
  expired_request_ids TEXT[]
) AS $$
DECLARE
  v_expired_count INTEGER;
  v_expired_ids TEXT[];
BEGIN
  -- Update expired requests
  WITH updated AS (
    UPDATE public.session_requests
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
      AND mechanic_id IS NULL
    RETURNING id
  )
  SELECT
    COUNT(*)::INTEGER,
    ARRAY_AGG(id::TEXT)
  INTO v_expired_count, v_expired_ids
  FROM updated;

  -- Return results
  RETURN QUERY SELECT
    COALESCE(v_expired_count, 0),
    COALESCE(v_expired_ids, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.expire_old_session_requests() IS
  'Automatically marks pending session requests as expired if they have passed their expires_at timestamp';

-- ============================================================================
-- SECTION 4: CREATE INDEX FOR EFFICIENT EXPIRATION QUERIES
-- ============================================================================

-- Index to efficiently find expired requests
CREATE INDEX IF NOT EXISTS idx_session_requests_expiration
  ON public.session_requests(status, expires_at)
  WHERE status = 'pending' AND expires_at IS NOT NULL;

COMMENT ON INDEX idx_session_requests_expiration IS
  'Optimizes queries for finding expired pending session requests';

-- ============================================================================
-- SECTION 5: CREATE TRIGGER TO AUTO-SET expires_at ON INSERT
-- ============================================================================

-- Function to automatically set expires_at when request is created
CREATE OR REPLACE FUNCTION public.set_session_request_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set expires_at for pending requests without an expiration
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    -- Set expiration to 15 minutes from creation
    NEW.expires_at := NEW.created_at + INTERVAL '15 minutes';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_session_request_expiration ON public.session_requests;

-- Create trigger
CREATE TRIGGER trigger_set_session_request_expiration
  BEFORE INSERT ON public.session_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_session_request_expiration();

COMMENT ON TRIGGER trigger_set_session_request_expiration ON public.session_requests IS
  'Automatically sets expires_at to 15 minutes from creation for new pending requests';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  pending_count INTEGER;
  expired_count INTEGER;
  without_expiration INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================== REQUEST TIMEOUT VERIFICATION ====================';

  -- Count pending requests
  SELECT COUNT(*) INTO pending_count
  FROM public.session_requests
  WHERE status = 'pending';

  -- Count expired requests
  SELECT COUNT(*) INTO expired_count
  FROM public.session_requests
  WHERE status = 'expired';

  -- Count requests without expiration
  SELECT COUNT(*) INTO without_expiration
  FROM public.session_requests
  WHERE status = 'pending' AND expires_at IS NULL;

  RAISE NOTICE 'Current request counts:';
  RAISE NOTICE '  - Pending requests: %', pending_count;
  RAISE NOTICE '  - Expired requests: %', expired_count;
  RAISE NOTICE '  - Pending without expiration: %', without_expiration;

  IF without_expiration > 0 THEN
    RAISE WARNING '⚠ Found % pending requests without expiration timestamp!', without_expiration;
  ELSE
    RAISE NOTICE '✓ All pending requests have expiration timestamps';
  END IF;

  RAISE NOTICE '======================================================================';
END $$;

-- Test the expiration function
DO $$
DECLARE
  result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================== TESTING EXPIRATION FUNCTION ====================';

  SELECT * INTO result FROM public.expire_old_session_requests();

  RAISE NOTICE 'Expired % old requests', result.expired_count;
  IF result.expired_count > 0 THEN
    RAISE NOTICE 'Expired request IDs: %', result.expired_request_ids;
  END IF;

  RAISE NOTICE '======================================================================';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Request timeout mechanism successfully deployed!
--
-- Features added:
-- 1. expires_at column for tracking request expiration
-- 2. Automatic expiration function (expire_old_session_requests)
-- 3. Trigger to auto-set expires_at on new requests (15 minute timeout)
-- 4. Index for efficient expiration queries
--
-- Usage:
-- - Call SELECT * FROM expire_old_session_requests(); to manually expire old requests
-- - Or set up a cron job to call this function periodically (recommended: every 1-5 minutes)
-- ============================================================================
