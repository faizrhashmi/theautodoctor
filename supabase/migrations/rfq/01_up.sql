-- ============================================================================
-- Phase 1: Add ENABLE_CUSTOMER_RFQ Feature Flag
-- ============================================================================
-- Purpose: Gate customer-direct RFQ creation feature (additive only)
-- Schema Evidence: feature_flags table has columns:
--   - flag_key (string, unique)
--   - flag_name (string)
--   - is_enabled (boolean)
--   - description (string)
--   - rollout_percentage (number)
--   - enabled_for_roles (object/jsonb)
--   - metadata (object/jsonb)
--   - created_at, updated_at (timestamps)
-- ============================================================================

-- Add ENABLE_CUSTOMER_RFQ flag (default: false)
INSERT INTO feature_flags (
  flag_key,
  flag_name,
  is_enabled,
  description,
  rollout_percentage,
  enabled_for_roles,
  metadata
) VALUES (
  'ENABLE_CUSTOMER_RFQ',
  'Customer Direct RFQ Creation',
  false, -- DEFAULT: Disabled
  'Enable customer-direct RFQ creation (bypasses mechanic escalation). When enabled: customers can create RFQs directly, workshops can bid. When disabled: customer RFQ UI hidden, APIs return 404.',
  0, -- No rollout yet
  '[]'::jsonb, -- No role restrictions
  jsonb_build_object(
    'feature_type', 'customer_feature',
    'phase', 'phase_1',
    'related_flags', jsonb_build_array('ENABLE_WORKSHOP_RFQ'),
    'requires_workshop_rfq', true
  )
)
ON CONFLICT (flag_key) DO UPDATE
SET
  flag_name = EXCLUDED.flag_name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verification
DO $$
DECLARE
  v_flag_exists BOOLEAN;
  v_is_enabled BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM feature_flags WHERE flag_key = 'ENABLE_CUSTOMER_RFQ'
  ) INTO v_flag_exists;

  IF NOT v_flag_exists THEN
    RAISE EXCEPTION 'ENABLE_CUSTOMER_RFQ flag was not created';
  END IF;

  SELECT is_enabled INTO v_is_enabled
  FROM feature_flags
  WHERE flag_key = 'ENABLE_CUSTOMER_RFQ';

  IF v_is_enabled = true THEN
    RAISE WARNING 'ENABLE_CUSTOMER_RFQ is enabled (expected: false by default)';
  END IF;

  RAISE NOTICE 'SUCCESS: ENABLE_CUSTOMER_RFQ flag created (is_enabled: %)', v_is_enabled;
END $$;
