-- =====================================================
-- Customer Quote Offers Unified View
-- Created: 2025-11-12
-- Purpose: Single view combining direct quotes + RFQ bids for customer
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS customer_quote_offers_v CASCADE;

-- Create unified view
CREATE VIEW customer_quote_offers_v AS
-- Direct quotes from repair_quotes table
SELECT
  rq.id as offer_id,
  'direct' as source,
  NULL::UUID as rfq_id,
  rq.diagnostic_session_id as session_id,
  rq.customer_id,
  rq.vehicle_id,

  -- Workshop/Provider info
  rq.workshop_id,
  rq.mechanic_id,
  o.name as workshop_name,
  o.city as workshop_city,
  NULL::DECIMAL(3,2) as workshop_rating,
  NULL::INTEGER as workshop_years_in_business,

  -- Pricing
  rq.customer_total as price_total,
  rq.labor_cost as price_labor,
  rq.parts_cost as price_parts,
  rq.subtotal as price_subtotal,
  rq.platform_fee_amount as platform_fee,
  rq.platform_fee_percent,

  -- Service details
  rq.line_items,
  rq.notes as description,
  rq.warranty_days,
  NULL::INTEGER as warranty_months_parts,
  NULL::INTEGER as warranty_months_labor,
  rq.estimated_completion_hours,
  NULL::INTEGER as estimated_completion_days,
  NULL::DATE as earliest_availability_date,

  -- Status
  rq.status,
  rq.customer_response,

  -- Timestamps
  rq.created_at,
  rq.sent_at,
  rq.viewed_at,
  rq.customer_responded_at,

  -- Additional info
  NULL::BOOLEAN as can_provide_loaner_vehicle,
  NULL::BOOLEAN as can_provide_pickup_dropoff,
  NULL::TEXT as alternative_options

FROM repair_quotes rq
LEFT JOIN organizations o ON o.id = rq.workshop_id
WHERE rq.status IS NOT NULL

UNION ALL

-- RFQ marketplace bids from workshop_rfq_bids table
SELECT
  wrb.id as offer_id,
  'rfq' as source,
  wrb.rfq_marketplace_id as rfq_id,
  wrm.diagnostic_session_id as session_id,
  wrm.customer_id,
  wrm.vehicle_id,

  -- Workshop/Provider info
  wrb.workshop_id,
  NULL::UUID as mechanic_id,
  wrb.workshop_name,
  wrb.workshop_city,
  wrb.workshop_rating,
  wrb.workshop_years_in_business,

  -- Pricing
  wrb.quote_amount as price_total,
  wrb.labor_cost as price_labor,
  wrb.parts_cost as price_parts,
  (wrb.labor_cost + wrb.parts_cost) as price_subtotal,
  NULL::DECIMAL(10,2) as platform_fee,
  NULL::DECIMAL(5,2) as platform_fee_percent,

  -- Service details
  NULL::JSONB as line_items,
  wrb.description,
  NULL::INTEGER as warranty_days,
  wrb.parts_warranty_months as warranty_months_parts,
  wrb.labor_warranty_months as warranty_months_labor,
  wrb.estimated_labor_hours as estimated_completion_hours,
  wrb.estimated_completion_days,
  wrb.earliest_availability_date,

  -- Status
  wrb.status,
  NULL::TEXT as customer_response,

  -- Timestamps
  wrb.created_at,
  wrb.created_at as sent_at,
  CASE WHEN wrb.viewed_by_customer THEN wrb.first_viewed_at ELSE NULL END as viewed_at,
  wrb.accepted_at as customer_responded_at,

  -- Additional info
  wrb.can_provide_loaner_vehicle,
  wrb.can_provide_pickup_dropoff,
  wrb.alternative_options

FROM workshop_rfq_bids wrb
JOIN workshop_rfq_marketplace wrm ON wrm.id = wrb.rfq_marketplace_id
WHERE wrb.status IS NOT NULL;

-- Add comments
COMMENT ON VIEW customer_quote_offers_v IS
'Unified view of all pricing offers available to customers: direct repair quotes and RFQ marketplace bids';

-- Enable RLS on the view
ALTER VIEW customer_quote_offers_v SET (security_invoker = on);

-- Grant access
GRANT SELECT ON customer_quote_offers_v TO authenticated;

-- =====================================================
-- Helper function to get customer offers
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_offers(
  p_customer_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  offer_id UUID,
  source TEXT,
  rfq_id UUID,
  workshop_name TEXT,
  price_total DECIMAL,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cqo.offer_id,
    cqo.source,
    cqo.rfq_id,
    cqo.workshop_name,
    cqo.price_total,
    cqo.status,
    cqo.created_at
  FROM customer_quote_offers_v cqo
  WHERE cqo.customer_id = p_customer_id
    AND (p_status IS NULL OR cqo.status = p_status)
  ORDER BY cqo.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_customer_offers IS
'Get all pricing offers (quotes + RFQ bids) for a specific customer';

-- =====================================================
-- Migration Complete
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Customer Quote Offers View Created';
  RAISE NOTICE '📊 Combines repair_quotes and workshop_rfq_bids into single view';
  RAISE NOTICE '🔍 Use customer_quote_offers_v to query all customer offers';
END $$;
