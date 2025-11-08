-- ============================================================================
-- Phase 1 Rollback: Remove ENABLE_CUSTOMER_RFQ Feature Flag
-- ============================================================================
-- Purpose: Rollback customer RFQ feature flag
-- SAFE: No data loss (only removes feature flag)
-- ============================================================================

-- Remove ENABLE_CUSTOMER_RFQ flag
DELETE FROM feature_flags
WHERE flag_key = 'ENABLE_CUSTOMER_RFQ';

-- Verification
DO $$
DECLARE
  v_flag_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM feature_flags WHERE flag_key = 'ENABLE_CUSTOMER_RFQ'
  ) INTO v_flag_exists;

  IF v_flag_exists THEN
    RAISE EXCEPTION 'ENABLE_CUSTOMER_RFQ flag still exists after deletion';
  END IF;

  RAISE NOTICE 'SUCCESS: ENABLE_CUSTOMER_RFQ flag removed';
END $$;
