-- ============================================================================
-- Phase 1 Verification: ENABLE_CUSTOMER_RFQ Flag Status
-- ============================================================================
-- Purpose: Verify ENABLE_CUSTOMER_RFQ flag exists and is configured correctly
-- ============================================================================

SELECT
  flag_key,
  flag_name,
  is_enabled,
  description,
  rollout_percentage,
  created_at,
  updated_at
FROM feature_flags
WHERE flag_key IN ('ENABLE_CUSTOMER_RFQ', 'ENABLE_WORKSHOP_RFQ')
ORDER BY flag_key;

-- Verify flag exists and defaults to false
DO $$
DECLARE
  v_customer_rfq_enabled BOOLEAN;
  v_workshop_rfq_enabled BOOLEAN;
BEGIN
  -- Check ENABLE_CUSTOMER_RFQ
  SELECT is_enabled INTO v_customer_rfq_enabled
  FROM feature_flags
  WHERE flag_key = 'ENABLE_CUSTOMER_RFQ';

  IF v_customer_rfq_enabled IS NULL THEN
    RAISE EXCEPTION 'FAIL: ENABLE_CUSTOMER_RFQ flag does not exist';
  END IF;

  IF v_customer_rfq_enabled = true THEN
    RAISE WARNING 'WARN: ENABLE_CUSTOMER_RFQ is enabled (expected: false by default)';
  ELSE
    RAISE NOTICE 'PASS: ENABLE_CUSTOMER_RFQ is disabled (default: false)';
  END IF;

  -- Check ENABLE_WORKSHOP_RFQ is untouched
  SELECT is_enabled INTO v_workshop_rfq_enabled
  FROM feature_flags
  WHERE flag_key = 'ENABLE_WORKSHOP_RFQ';

  IF v_workshop_rfq_enabled IS NULL THEN
    RAISE WARNING 'WARN: ENABLE_WORKSHOP_RFQ flag does not exist (customer RFQ requires it)';
  ELSE
    RAISE NOTICE 'PASS: ENABLE_WORKSHOP_RFQ exists (is_enabled: %)', v_workshop_rfq_enabled;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Phase 1 Verification: PASSED';
  RAISE NOTICE 'ENABLE_CUSTOMER_RFQ: % (default: false)', v_customer_rfq_enabled;
  RAISE NOTICE 'ENABLE_WORKSHOP_RFQ: % (unchanged)', v_workshop_rfq_enabled;
  RAISE NOTICE '============================================';
END $$;
