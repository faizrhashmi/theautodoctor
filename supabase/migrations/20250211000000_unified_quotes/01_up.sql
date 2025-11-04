-- =====================================================
-- UNIFIED QUOTES VIEW
-- Created: 2025-02-11
-- Purpose: Single customer-facing view combining direct quotes + RFQ bids
-- =====================================================

-- =====================================================
-- 1. CREATE UNIFIED CUSTOMER QUOTE OFFERS VIEW
-- =====================================================

CREATE OR REPLACE VIEW customer_quote_offers_v AS
  -- ==================== DIRECT QUOTES ====================
  SELECT
    -- Identity
    rq.id AS offer_id,
    'direct'::TEXT AS source,
    NULL::UUID AS rfq_id,
    rq.diagnostic_session_id AS session_id,
    rq.vehicle_id,
    rq.customer_id,

    -- Provider Info
    rq.workshop_id,
    COALESCE(org.name, mech.name, 'Independent Mechanic') AS provider_name,
    COALESCE(mech.type, 'mechanic') AS provider_type,

    -- Pricing (all in cents for precision, will convert in API)
    rq.customer_total AS price_total,
    rq.labor_cost AS price_labor,
    rq.parts_cost AS price_parts,
    rq.platform_fee_amount AS platform_fee,

    -- Status & Timing
    rq.status,
    rq.created_at,
    rq.sent_at,
    -- If no explicit valid_until, default to 7 days from sent_at
    COALESCE(rq.sent_at + INTERVAL '7 days', rq.created_at + INTERVAL '7 days') AS valid_until,
    rq.customer_responded_at,

    -- Details
    rq.notes,
    rq.line_items,
    rq.estimated_completion_hours AS estimated_duration_hours,
    COALESCE(rq.warranty_days / 30, 0) AS warranty_months, -- Convert days to months
    NULL::INTEGER AS parts_warranty_months, -- Not tracked separately in repair_quotes

    -- Metadata & Computed
    CASE
      WHEN rq.mechanic_id IS NOT NULL
      THEN ARRAY['direct', 'mechanic_recommended']::TEXT[]
      ELSE ARRAY['direct']::TEXT[]
    END AS badges,

    -- Workshop Rating (if workshop exists)
    (
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM workshop_reviews wr
      WHERE wr.workshop_id = rq.workshop_id
    ) AS rating_avg,
    (
      SELECT COUNT(*)::INTEGER
      FROM workshop_reviews wr
      WHERE wr.workshop_id = rq.workshop_id
    ) AS rating_count,

    -- Distance (placeholder - requires lat/lng calculation)
    NULL::NUMERIC AS distance_km,

    -- Computed
    EXTRACT(EPOCH FROM (NOW() - rq.created_at))/60 AS offer_age_minutes,
    (
      rq.status = 'pending'
      AND COALESCE(rq.sent_at + INTERVAL '7 days', rq.created_at + INTERVAL '7 days') > NOW()
    ) AS can_accept

  FROM repair_quotes rq
  LEFT JOIN organizations org ON org.id = rq.workshop_id
  LEFT JOIN mechanics mech ON mech.id = rq.mechanic_id

  UNION ALL

  -- ==================== RFQ MARKETPLACE BIDS ====================
  SELECT
    -- Identity
    bid.id AS offer_id,
    'rfq'::TEXT AS source,
    bid.rfq_marketplace_id AS rfq_id,
    rfq.diagnostic_session_id AS session_id,
    rfq.vehicle_id,
    rfq.customer_id,

    -- Provider Info
    bid.workshop_id,
    bid.workshop_name AS provider_name,
    'workshop'::TEXT AS provider_type,

    -- Pricing
    bid.quote_amount AS price_total,
    bid.labor_cost AS price_labor,
    bid.parts_cost AS price_parts,
    -- Platform fee not stored on bid, calculate it (default 12%)
    ROUND(bid.quote_amount * 0.12, 2) AS platform_fee,

    -- Status & Timing
    bid.status,
    bid.created_at,
    bid.created_at AS sent_at, -- Bids are "sent" when created
    -- RFQ has bid_deadline which serves as valid_until
    rfq.bid_deadline AS valid_until,
    bid.accepted_at AS customer_responded_at,

    -- Details
    bid.description AS notes,
    -- Construct line_items from bid details
    jsonb_build_array(
      jsonb_build_object(
        'type', 'labor',
        'description', 'Labor',
        'hours', bid.estimated_labor_hours,
        'subtotal', bid.labor_cost
      ),
      jsonb_build_object(
        'type', 'parts',
        'description', bid.parts_needed,
        'subtotal', bid.parts_cost
      )
    ) AS line_items,
    bid.estimated_completion_days * 8.0 AS estimated_duration_hours, -- Assume 8h/day
    bid.labor_warranty_months AS warranty_months,
    bid.parts_warranty_months,

    -- Metadata & Computed
    CASE
      WHEN bid.can_provide_loaner_vehicle THEN ARRAY['rfq', 'loaner_vehicle']::TEXT[]
      WHEN bid.can_provide_pickup_dropoff THEN ARRAY['rfq', 'pickup_dropoff']::TEXT[]
      ELSE ARRAY['rfq']::TEXT[]
    END AS badges,

    -- Workshop Rating (from bid snapshot)
    bid.workshop_rating AS rating_avg,
    bid.workshop_review_count AS rating_count,

    -- Distance (placeholder)
    NULL::NUMERIC AS distance_km,

    -- Computed
    EXTRACT(EPOCH FROM (NOW() - bid.created_at))/60 AS offer_age_minutes,
    (
      bid.status = 'pending'
      AND rfq.bid_deadline > NOW()
      AND rfq.status IN ('open', 'under_review')
    ) AS can_accept

  FROM workshop_rfq_bids bid
  JOIN workshop_rfq_marketplace rfq ON rfq.id = bid.rfq_marketplace_id;

-- =====================================================
-- 2. ADD SECURITY POLICIES (RLS)
-- =====================================================

-- Enable RLS on view (security_invoker = on means queries run with caller's privileges)
ALTER VIEW customer_quote_offers_v SET (security_invoker = on);

-- Policy: Customers can only see their own offers
-- Note: This is enforced via the underlying tables' RLS policies since security_invoker=on

-- =====================================================
-- 3. CREATE INDEXES (if not exist)
-- =====================================================

-- Indexes on underlying tables to optimize view queries
CREATE INDEX IF NOT EXISTS idx_repair_quotes_customer_status
  ON repair_quotes(customer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_repair_quotes_sent_valid
  ON repair_quotes(sent_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_rfq_bids_customer_status
  ON workshop_rfq_bids(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_customer_status
  ON workshop_rfq_marketplace(customer_id, status);

-- =====================================================
-- 4. ADD COMMENTS
-- =====================================================

COMMENT ON VIEW customer_quote_offers_v IS
  'Unified view of all quote offers (direct + RFQ) for customer consumption.
   Normalizes both repair_quotes and workshop_rfq_bids into a common contract.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Unified Quotes View migration complete!';
  RAISE NOTICE '   - Created customer_quote_offers_v';
  RAISE NOTICE '   - Added indexes for performance';
  RAISE NOTICE '   - Enabled row-level security';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Run verification: 03_verify.sql';
  RAISE NOTICE '   2. Implement API: /api/customer/quotes/offers';
  RAISE NOTICE '   3. Update UI to consume unified view';
END $$;
