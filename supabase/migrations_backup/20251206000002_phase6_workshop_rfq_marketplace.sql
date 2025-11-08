-- =====================================================
-- PHASE 6: WORKSHOP-BASED RFQ MARKETPLACE
-- Created: 2025-12-06
-- Purpose: Multi-workshop bidding system for repair quotes
-- Business Model: B2B2C - Workshops compete for customer business
-- Integration: Extends existing workshop_escalation_queue system
-- =====================================================

-- =====================================================
-- BACKGROUND: How This Integrates with Existing System
-- =====================================================
--
-- EXISTING SYSTEM (workshop_escalation_queue):
--   - Virtual mechanic completes diagnostic
--   - Mechanic chooses ONE specific workshop
--   - Workshop receives lead, sends quote
--   - Mechanic earns 5% referral fee
--
-- NEW RFQ MARKETPLACE SYSTEM:
--   - Virtual mechanic/customer posts RFQ to marketplace
--   - MULTIPLE workshops see request and bid
--   - Customer chooses best quote
--   - Mechanic still earns 5% referral fee from winning workshop
--
-- ESCALATION RULES BY MECHANIC TYPE:
--   Employee (partnership_type='employee'):
--     → Can ONLY escalate to own workshop (not RFQ)
--   Partnership Contractor (service_tier='workshop_partner'):
--     → Can escalate to specific workshop OR post to RFQ marketplace
--   Independent Virtual (service_tier='virtual_only'):
--     → Can escalate to specific workshop OR post to RFQ marketplace
-- =====================================================

-- =====================================================
-- 1. EXTEND workshop_escalation_queue FOR RFQ INTEGRATION
-- =====================================================

-- Add RFQ marketplace fields to existing escalation queue
ALTER TABLE workshop_escalation_queue
ADD COLUMN IF NOT EXISTS escalation_type TEXT
  CHECK (escalation_type IN ('direct_assignment', 'rfq_marketplace'))
  DEFAULT 'direct_assignment',

-- RFQ marketplace tracking
ADD COLUMN IF NOT EXISTS rfq_marketplace_id UUID, -- Links to workshop_rfq_marketplace if posted there
ADD COLUMN IF NOT EXISTS rfq_posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rfq_bid_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rfq_bid_count INTEGER DEFAULT 0,

-- Winning bid tracking
ADD COLUMN IF NOT EXISTS winning_workshop_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS winning_bid_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS customer_selected_bid_at TIMESTAMP WITH TIME ZONE;

-- Comments
COMMENT ON COLUMN workshop_escalation_queue.escalation_type IS 'direct_assignment: mechanic chose specific workshop; rfq_marketplace: posted for multiple workshops to bid';
COMMENT ON COLUMN workshop_escalation_queue.rfq_marketplace_id IS 'If posted to RFQ marketplace, links to workshop_rfq_marketplace table';

-- Create index for RFQ marketplace queries
CREATE INDEX IF NOT EXISTS idx_escalation_queue_rfq_type ON workshop_escalation_queue(escalation_type);
CREATE INDEX IF NOT EXISTS idx_escalation_queue_rfq_marketplace ON workshop_escalation_queue(rfq_marketplace_id);

-- =====================================================
-- 2. WORKSHOP RFQ MARKETPLACE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS workshop_rfq_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Linked to escalation queue (one-to-one relationship)
  escalation_queue_id UUID NOT NULL REFERENCES workshop_escalation_queue(id) ON DELETE CASCADE UNIQUE,

  -- Customer & Session Info (denormalized for performance)
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  diagnostic_session_id UUID NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  escalating_mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,

  -- RFQ Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  issue_category TEXT, -- 'engine', 'brakes', 'electrical', 'suspension', 'transmission', 'other'
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),

  -- Vehicle Info (snapshot)
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_mileage INTEGER,
  vehicle_vin TEXT,

  -- Location (for workshop matching)
  customer_city TEXT,
  customer_province TEXT,
  customer_postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Mechanic Diagnosis (passed to workshops)
  diagnosis_summary TEXT NOT NULL,
  recommended_services TEXT[],
  diagnostic_photos JSONB DEFAULT '[]'::jsonb,
  mechanic_notes TEXT,

  -- Attachments (customer can add more)
  additional_photos TEXT[], -- Storage URLs
  additional_videos TEXT[], -- Storage URLs
  additional_documents TEXT[], -- Storage URLs

  -- Customer Budget Expectations (optional)
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),

  -- Bidding Settings
  bid_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_bids INTEGER DEFAULT 10,
  auto_expire_hours INTEGER DEFAULT 72,

  -- Workshop Filtering (optional - customer can limit who can bid)
  min_workshop_rating DECIMAL(3,2), -- e.g., 4.0 minimum
  required_certifications TEXT[], -- e.g., ['ASE', 'Red Seal']
  preferred_cities TEXT[], -- Limit to specific cities
  max_distance_km INTEGER, -- Maximum distance from customer

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN (
    'draft',           -- Being created by mechanic/customer
    'open',            -- Published, accepting bids
    'under_review',    -- Customer reviewing bids
    'bid_accepted',    -- Customer accepted a bid
    'quote_sent',      -- Winning workshop sent formal quote
    'converted',       -- Customer booked repair
    'expired',         -- Deadline passed or no bids
    'cancelled'        -- Cancelled by customer/mechanic
  )),

  -- Metrics
  view_count INTEGER DEFAULT 0,
  bid_count INTEGER DEFAULT 0,
  total_workshops_viewed INTEGER DEFAULT 0,

  -- Winning Bid
  accepted_bid_id UUID, -- Links to workshop_rfq_bids
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Legal Compliance
  customer_consent_to_share_info BOOLEAN NOT NULL DEFAULT false,
  customer_consent_timestamp TIMESTAMP WITH TIME ZONE,
  referral_fee_disclosed BOOLEAN NOT NULL DEFAULT false,
  referral_disclosure_text TEXT,
  privacy_policy_version TEXT DEFAULT 'v1',

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_rfq_marketplace_customer ON workshop_rfq_marketplace(customer_id);
CREATE INDEX idx_rfq_marketplace_session ON workshop_rfq_marketplace(diagnostic_session_id);
CREATE INDEX idx_rfq_marketplace_mechanic ON workshop_rfq_marketplace(escalating_mechanic_id);
CREATE INDEX idx_rfq_marketplace_status ON workshop_rfq_marketplace(status);
CREATE INDEX idx_rfq_marketplace_created ON workshop_rfq_marketplace(created_at DESC);
CREATE INDEX idx_rfq_marketplace_location ON workshop_rfq_marketplace(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_rfq_marketplace_category ON workshop_rfq_marketplace(issue_category);
CREATE INDEX idx_rfq_marketplace_deadline ON workshop_rfq_marketplace(bid_deadline) WHERE status = 'open';

COMMENT ON TABLE workshop_rfq_marketplace IS 'RFQ marketplace where multiple workshops compete for customer repairs';
COMMENT ON COLUMN workshop_rfq_marketplace.escalation_queue_id IS 'Links to workshop_escalation_queue - all RFQ marketplace posts create an escalation record';
COMMENT ON COLUMN workshop_rfq_marketplace.customer_consent_to_share_info IS 'PIPEDA compliance: customer must consent to sharing info with workshops';

-- =====================================================
-- 3. WORKSHOP RFQ BIDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS workshop_rfq_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- References
  rfq_marketplace_id UUID NOT NULL REFERENCES workshop_rfq_marketplace(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Workshop Info Snapshot (for customer review)
  workshop_name TEXT NOT NULL,
  workshop_city TEXT,
  workshop_rating DECIMAL(3,2),
  workshop_review_count INTEGER,
  workshop_certifications TEXT[],
  workshop_years_in_business INTEGER,

  -- Bid Details
  quote_amount DECIMAL(10,2) NOT NULL,
  parts_cost DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  shop_supplies_fee DECIMAL(10,2),
  environmental_fee DECIMAL(10,2),
  tax_amount DECIMAL(10,2),

  -- Service Details
  estimated_completion_days INTEGER,
  estimated_labor_hours DECIMAL(5,2),
  parts_warranty_months INTEGER,
  labor_warranty_months INTEGER,
  warranty_info TEXT,

  -- Proposal
  description TEXT NOT NULL,
  parts_needed TEXT,
  repair_plan TEXT,
  alternative_options TEXT, -- e.g., "repair vs replace"

  -- Availability
  earliest_availability_date DATE,
  can_provide_loaner_vehicle BOOLEAN DEFAULT false,
  can_provide_pickup_dropoff BOOLEAN DEFAULT false,
  after_hours_service_available BOOLEAN DEFAULT false,

  -- Who submitted bid (service advisor or owner)
  submitted_by_user_id UUID REFERENCES profiles(id),
  submitted_by_role TEXT, -- 'owner', 'admin', 'service_advisor'

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Submitted, awaiting customer review
    'accepted',     -- Customer accepted this bid
    'rejected',     -- Customer chose different bid
    'withdrawn',    -- Workshop withdrew bid
    'expired'       -- RFQ expired before customer chose
  )),

  -- Timestamps
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  withdrawn_reason TEXT,

  -- View tracking (did customer view this bid?)
  viewed_by_customer BOOLEAN DEFAULT false,
  first_viewed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  UNIQUE(rfq_marketplace_id, workshop_id), -- One bid per workshop per RFQ

  -- Ontario Consumer Protection Act compliance
  CONSTRAINT quote_breakdown_required CHECK (
    parts_cost IS NOT NULL AND labor_cost IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_rfq_bids_marketplace ON workshop_rfq_bids(rfq_marketplace_id);
CREATE INDEX idx_rfq_bids_workshop ON workshop_rfq_bids(workshop_id);
CREATE INDEX idx_rfq_bids_status ON workshop_rfq_bids(status);
CREATE INDEX idx_rfq_bids_created ON workshop_rfq_bids(created_at DESC);
CREATE INDEX idx_rfq_bids_amount ON workshop_rfq_bids(quote_amount);

COMMENT ON TABLE workshop_rfq_bids IS 'Workshop bids on RFQ marketplace requests';
COMMENT ON CONSTRAINT quote_breakdown_required ON workshop_rfq_bids IS 'Ontario Consumer Protection Act: must provide parts and labor breakdown';

-- Add foreign key for accepted_bid_id
ALTER TABLE workshop_rfq_marketplace
ADD CONSTRAINT fk_accepted_bid
FOREIGN KEY (accepted_bid_id)
REFERENCES workshop_rfq_bids(id)
ON DELETE SET NULL;

-- =====================================================
-- 4. RFQ VIEWS TRACKING (for analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS workshop_rfq_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  rfq_marketplace_id UUID NOT NULL REFERENCES workshop_rfq_marketplace(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Track multiple views
  view_count INTEGER DEFAULT 1,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Did workshop submit bid after viewing?
  submitted_bid BOOLEAN DEFAULT false,

  UNIQUE(rfq_marketplace_id, workshop_id)
);

CREATE INDEX idx_rfq_views_marketplace ON workshop_rfq_views(rfq_marketplace_id);
CREATE INDEX idx_rfq_views_workshop ON workshop_rfq_views(workshop_id);

COMMENT ON TABLE workshop_rfq_views IS 'Track which workshops viewed each RFQ (for conversion analytics)';

-- =====================================================
-- 5. TRIGGER FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rfq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rfq_marketplace_updated_at
BEFORE UPDATE ON workshop_rfq_marketplace
FOR EACH ROW
EXECUTE FUNCTION update_rfq_updated_at();

CREATE TRIGGER trigger_update_rfq_bids_updated_at
BEFORE UPDATE ON workshop_rfq_bids
FOR EACH ROW
EXECUTE FUNCTION update_rfq_updated_at();

-- Increment view count when workshop views RFQ
CREATE OR REPLACE FUNCTION increment_rfq_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workshop_rfq_marketplace
  SET view_count = view_count + 1,
      total_workshops_viewed = (
        SELECT COUNT(DISTINCT workshop_id)
        FROM workshop_rfq_views
        WHERE rfq_marketplace_id = NEW.rfq_marketplace_id
      )
  WHERE id = NEW.rfq_marketplace_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_rfq_view_count
AFTER INSERT OR UPDATE ON workshop_rfq_views
FOR EACH ROW
EXECUTE FUNCTION increment_rfq_view_count();

-- Update bid count on workshop_rfq_marketplace
CREATE OR REPLACE FUNCTION update_rfq_bid_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE workshop_rfq_marketplace
    SET bid_count = bid_count + 1
    WHERE id = NEW.rfq_marketplace_id;

    -- Also update escalation queue
    UPDATE workshop_escalation_queue
    SET rfq_bid_count = rfq_bid_count + 1
    WHERE rfq_marketplace_id = NEW.rfq_marketplace_id;

    -- Mark that workshop submitted bid after viewing
    UPDATE workshop_rfq_views
    SET submitted_bid = true
    WHERE rfq_marketplace_id = NEW.rfq_marketplace_id
      AND workshop_id = NEW.workshop_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE workshop_rfq_marketplace
    SET bid_count = bid_count - 1
    WHERE id = OLD.rfq_marketplace_id;

    UPDATE workshop_escalation_queue
    SET rfq_bid_count = rfq_bid_count - 1
    WHERE rfq_marketplace_id = OLD.rfq_marketplace_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rfq_bid_count
AFTER INSERT OR DELETE ON workshop_rfq_bids
FOR EACH ROW
EXECUTE FUNCTION update_rfq_bid_count();

-- Sync RFQ status to escalation queue
CREATE OR REPLACE FUNCTION sync_rfq_to_escalation_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Update escalation queue when RFQ status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    UPDATE workshop_escalation_queue
    SET
      status = CASE NEW.status
        WHEN 'open' THEN 'pending'
        WHEN 'under_review' THEN 'pending'
        WHEN 'bid_accepted' THEN 'accepted'
        WHEN 'quote_sent' THEN 'quote_sent'
        WHEN 'converted' THEN 'quote_sent'
        WHEN 'expired' THEN 'declined'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE status
      END,
      winning_workshop_id = NEW.accepted_bid_id,
      customer_selected_bid_at = NEW.accepted_at,
      updated_at = NOW()
    WHERE rfq_marketplace_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_rfq_to_escalation_queue
AFTER UPDATE ON workshop_rfq_marketplace
FOR EACH ROW
EXECUTE FUNCTION sync_rfq_to_escalation_queue();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to auto-expire old RFQs
CREATE OR REPLACE FUNCTION auto_expire_rfq_marketplace()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE workshop_rfq_marketplace
    SET status = 'expired'
    WHERE status = 'open'
      AND bid_deadline < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  -- Also update escalation queue
  UPDATE workshop_escalation_queue
  SET status = 'declined', escalation_status = 'declined'
  WHERE rfq_marketplace_id IN (
    SELECT id FROM workshop_rfq_marketplace WHERE status = 'expired'
  );

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_expire_rfq_marketplace IS 'Auto-expire RFQs past bid deadline (run via cron job)';

-- Function to accept workshop bid
CREATE OR REPLACE FUNCTION accept_workshop_rfq_bid(
  p_rfq_id UUID,
  p_bid_id UUID,
  p_customer_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_rfq workshop_rfq_marketplace;
  v_bid workshop_rfq_bids;
  v_escalation_id UUID;
  v_mechanic_id UUID;
  v_result JSONB;
BEGIN
  -- Lock and verify RFQ ownership
  SELECT * INTO v_rfq
  FROM workshop_rfq_marketplace
  WHERE id = p_rfq_id
    AND customer_id = p_customer_id
    AND status IN ('open', 'under_review')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RFQ not found or not eligible for bid acceptance'
    );
  END IF;

  -- Verify bid exists and is pending
  SELECT * INTO v_bid
  FROM workshop_rfq_bids
  WHERE id = p_bid_id
    AND rfq_marketplace_id = p_rfq_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bid not found or not pending'
    );
  END IF;

  -- Accept the bid
  UPDATE workshop_rfq_bids
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE id = p_bid_id;

  -- Reject all other bids
  UPDATE workshop_rfq_bids
  SET status = 'rejected',
      rejected_at = NOW()
  WHERE rfq_marketplace_id = p_rfq_id
    AND id != p_bid_id
    AND status = 'pending';

  -- Update RFQ status
  UPDATE workshop_rfq_marketplace
  SET status = 'bid_accepted',
      accepted_bid_id = p_bid_id,
      accepted_at = NOW()
  WHERE id = p_rfq_id;

  -- Update escalation queue to assign winning workshop
  UPDATE workshop_escalation_queue
  SET
    assigned_workshop_id = v_bid.workshop_id,
    winning_workshop_id = v_bid.workshop_id,
    winning_bid_amount = v_bid.quote_amount,
    customer_selected_bid_at = NOW(),
    status = 'accepted',
    escalation_status = 'accepted',
    accepted_at = NOW()
  WHERE rfq_marketplace_id = p_rfq_id
  RETURNING id, escalating_mechanic_id INTO v_escalation_id, v_mechanic_id;

  RETURN jsonb_build_object(
    'success', true,
    'rfq_id', p_rfq_id,
    'bid_id', p_bid_id,
    'workshop_id', v_bid.workshop_id,
    'quote_amount', v_bid.quote_amount,
    'escalation_id', v_escalation_id,
    'mechanic_id', v_mechanic_id,
    'referral_fee_percent', 5.00
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_workshop_rfq_bid IS 'Customer accepts a workshop bid from RFQ marketplace';

-- Function to find matching workshops for RFQ
CREATE OR REPLACE FUNCTION find_workshops_for_rfq(
  p_rfq_id UUID
)
RETURNS TABLE (
  workshop_id UUID,
  workshop_name TEXT,
  workshop_city TEXT,
  workshop_rating DECIMAL,
  distance_km INTEGER,
  match_score INTEGER,
  can_bid BOOLEAN
) AS $$
DECLARE
  v_rfq workshop_rfq_marketplace;
BEGIN
  -- Get RFQ details
  SELECT * INTO v_rfq
  FROM workshop_rfq_marketplace
  WHERE id = p_rfq_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id AS workshop_id,
    o.name AS workshop_name,
    o.city AS workshop_city,
    o.rating AS workshop_rating,
    NULL::INTEGER AS distance_km, -- TODO: Calculate using PostGIS
    (
      -- Rating score (0-50)
      (COALESCE(o.rating, 3.0) * 10)::INTEGER +
      -- Location score (0-30)
      CASE
        WHEN o.city = v_rfq.customer_city THEN 30
        WHEN o.province = v_rfq.customer_province THEN 15
        ELSE 0
      END +
      -- Accepting new customers (0-20)
      CASE
        WHEN wep.accepting_new_customers THEN 20
        ELSE 0
      END
    ) AS match_score,
    (
      -- Can bid if:
      -- 1. Workshop is active
      o.status = 'active' AND
      -- 2. Meets minimum rating requirement (if set)
      (v_rfq.min_workshop_rating IS NULL OR o.rating >= v_rfq.min_workshop_rating) AND
      -- 3. Accepts this service type
      (v_rfq.issue_category IS NULL OR v_rfq.issue_category = ANY(wep.accepted_service_types)) AND
      -- 4. Within preferred cities (if set)
      (v_rfq.preferred_cities IS NULL OR o.city = ANY(v_rfq.preferred_cities)) AND
      -- 5. Hasn't already bid
      NOT EXISTS (
        SELECT 1 FROM workshop_rfq_bids
        WHERE rfq_marketplace_id = p_rfq_id
          AND workshop_id = o.id
      )
    ) AS can_bid
  FROM organizations o
  LEFT JOIN workshop_escalation_preferences wep ON wep.workshop_id = o.id
  WHERE o.organization_type = 'workshop'
    AND o.status = 'active'
  ORDER BY match_score DESC, o.rating DESC NULLS LAST
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_workshops_for_rfq IS 'Find matching workshops that can bid on RFQ';

-- =====================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE workshop_rfq_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_rfq_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_rfq_views ENABLE ROW LEVEL SECURITY;

-- RFQ Marketplace Policies
CREATE POLICY "Customers can view own RFQs"
ON workshop_rfq_marketplace FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create RFQs"
ON workshop_rfq_marketplace FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own RFQs"
ON workshop_rfq_marketplace FOR UPDATE
USING (auth.uid() = customer_id);

CREATE POLICY "Mechanics can view RFQs they escalated"
ON workshop_rfq_marketplace FOR SELECT
USING (
  escalating_mechanic_id IN (
    SELECT id FROM mechanics WHERE id = auth.uid()
  )
);

CREATE POLICY "Workshops can view open RFQs they can bid on"
ON workshop_rfq_marketplace FOR SELECT
USING (
  status = 'open' AND (
    -- Workshop admin/owner can view
    EXISTS (
      SELECT 1 FROM workshop_roles wr
      WHERE wr.user_id = auth.uid()
        AND wr.workshop_id IN (
          SELECT id FROM organizations
          WHERE organization_type = 'workshop'
            AND status = 'active'
        )
        AND wr.role IN ('owner', 'admin', 'service_advisor')
        AND wr.can_send_quotes = true
    )
  )
);

-- RFQ Bids Policies
CREATE POLICY "Workshops can view own bids"
ON workshop_rfq_bids FOR SELECT
USING (
  workshop_id IN (
    SELECT wr.workshop_id
    FROM workshop_roles wr
    WHERE wr.user_id = auth.uid()
  )
);

CREATE POLICY "Workshops can create bids"
ON workshop_rfq_bids FOR INSERT
WITH CHECK (
  workshop_id IN (
    SELECT wr.workshop_id
    FROM workshop_roles wr
    WHERE wr.user_id = auth.uid()
      AND wr.can_send_quotes = true
      AND wr.role IN ('owner', 'admin', 'service_advisor')
  )
);

CREATE POLICY "Workshops can update own bids"
ON workshop_rfq_bids FOR UPDATE
USING (
  workshop_id IN (
    SELECT wr.workshop_id
    FROM workshop_roles wr
    WHERE wr.user_id = auth.uid()
  ) AND status = 'pending'
);

CREATE POLICY "Customers can view bids on their RFQs"
ON workshop_rfq_bids FOR SELECT
USING (
  rfq_marketplace_id IN (
    SELECT id FROM workshop_rfq_marketplace
    WHERE customer_id = auth.uid()
  )
);

-- RFQ Views Policies
CREATE POLICY "Workshops can insert views"
ON workshop_rfq_views FOR INSERT
WITH CHECK (
  workshop_id IN (
    SELECT wr.workshop_id
    FROM workshop_roles wr
    WHERE wr.user_id = auth.uid()
  )
);

CREATE POLICY "Workshops can update own views"
ON workshop_rfq_views FOR UPDATE
USING (
  workshop_id IN (
    SELECT wr.workshop_id
    FROM workshop_roles wr
    WHERE wr.user_id = auth.uid()
  )
);

-- =====================================================
-- 8. CREATE ANALYTICS VIEWS
-- =====================================================

-- RFQ conversion analytics
CREATE OR REPLACE VIEW rfq_marketplace_analytics AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  COUNT(*) AS total_rfqs,
  COUNT(*) FILTER (WHERE status = 'bid_accepted') AS rfqs_with_accepted_bid,
  COUNT(*) FILTER (WHERE status = 'converted') AS rfqs_converted_to_repair,
  COUNT(*) FILTER (WHERE status = 'expired') AS rfqs_expired,
  AVG(bid_count) AS avg_bids_per_rfq,
  AVG(view_count) AS avg_workshop_views_per_rfq,
  AVG(
    EXTRACT(EPOCH FROM (accepted_at - created_at)) / 3600
  ) FILTER (WHERE accepted_at IS NOT NULL) AS avg_hours_to_acceptance
FROM workshop_rfq_marketplace
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Workshop bidding analytics
CREATE OR REPLACE VIEW workshop_bidding_analytics AS
SELECT
  w.id AS workshop_id,
  w.name AS workshop_name,
  COUNT(b.id) AS total_bids_submitted,
  COUNT(b.id) FILTER (WHERE b.status = 'accepted') AS bids_won,
  COUNT(b.id) FILTER (WHERE b.status = 'rejected') AS bids_lost,
  AVG(b.quote_amount) AS avg_bid_amount,
  (COUNT(b.id) FILTER (WHERE b.status = 'accepted')::DECIMAL /
   NULLIF(COUNT(b.id), 0) * 100) AS win_rate_percent,
  SUM(b.quote_amount) FILTER (WHERE b.status = 'accepted') AS total_won_value
FROM organizations w
LEFT JOIN workshop_rfq_bids b ON b.workshop_id = w.id
WHERE w.organization_type = 'workshop'
GROUP BY w.id, w.name
ORDER BY bids_won DESC;

COMMENT ON VIEW rfq_marketplace_analytics IS 'RFQ marketplace conversion metrics';
COMMENT ON VIEW workshop_bidding_analytics IS 'Workshop performance in RFQ marketplace';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 6: Workshop RFQ Marketplace Migration Complete';
  RAISE NOTICE '📊 Tables Created:';
  RAISE NOTICE '   - workshop_rfq_marketplace';
  RAISE NOTICE '   - workshop_rfq_bids';
  RAISE NOTICE '   - workshop_rfq_views';
  RAISE NOTICE '🔗 Integration:';
  RAISE NOTICE '   - Extended workshop_escalation_queue with RFQ fields';
  RAISE NOTICE '   - Dual-mode: direct assignment OR marketplace bidding';
  RAISE NOTICE '🎯 Business Model:';
  RAISE NOTICE '   - Workshops (not mechanics) submit bids';
  RAISE NOTICE '   - Customer chooses winning quote';
  RAISE NOTICE '   - Mechanic earns 5%% referral fee regardless of escalation type';
  RAISE NOTICE '⚖️  Legal Compliance:';
  RAISE NOTICE '   - PIPEDA: Customer consent tracking';
  RAISE NOTICE '   - Competition Act: Referral fee disclosure';
  RAISE NOTICE '   - Ontario Consumer Protection: Quote breakdown required';
END $$;
