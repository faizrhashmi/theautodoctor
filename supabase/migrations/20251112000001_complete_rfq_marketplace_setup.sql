-- =====================================================
-- Complete RFQ Marketplace Setup
-- Created: 2025-11-12
-- Purpose: Complete the RFQ marketplace tables setup (tables already exist, adding missing indexes/functions)
-- =====================================================

-- =====================================================
-- 1. Ensure all indexes exist (using IF NOT EXISTS)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_customer ON workshop_rfq_marketplace(customer_id);
CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_session ON workshop_rfq_marketplace(diagnostic_session_id);
CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_mechanic ON workshop_rfq_marketplace(escalating_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_status ON workshop_rfq_marketplace(status);
CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_created ON workshop_rfq_marketplace(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_location ON workshop_rfq_marketplace(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_category ON workshop_rfq_marketplace(issue_category);
CREATE INDEX IF NOT EXISTS idx_rfq_marketplace_deadline ON workshop_rfq_marketplace(bid_deadline) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_rfq_bids_marketplace ON workshop_rfq_bids(rfq_marketplace_id);
CREATE INDEX IF NOT EXISTS idx_rfq_bids_workshop ON workshop_rfq_bids(workshop_id);
CREATE INDEX IF NOT EXISTS idx_rfq_bids_status ON workshop_rfq_bids(status);
CREATE INDEX IF NOT EXISTS idx_rfq_bids_created ON workshop_rfq_bids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_bids_amount ON workshop_rfq_bids(quote_amount);

CREATE INDEX IF NOT EXISTS idx_rfq_views_marketplace ON workshop_rfq_views(rfq_marketplace_id);
CREATE INDEX IF NOT EXISTS idx_rfq_views_workshop ON workshop_rfq_views(workshop_id);

-- =====================================================
-- 2. Ensure foreign key exists for accepted_bid_id
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_accepted_bid'
        AND conrelid = 'workshop_rfq_marketplace'::regclass
    ) THEN
        ALTER TABLE workshop_rfq_marketplace
        ADD CONSTRAINT fk_accepted_bid
        FOREIGN KEY (accepted_bid_id)
        REFERENCES workshop_rfq_bids(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 3. Ensure trigger functions exist
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rfq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_rfq_marketplace_updated_at ON workshop_rfq_marketplace;
DROP TRIGGER IF EXISTS trigger_update_rfq_bids_updated_at ON workshop_rfq_bids;

-- Recreate triggers
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

DROP TRIGGER IF EXISTS trigger_increment_rfq_view_count ON workshop_rfq_views;

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

DROP TRIGGER IF EXISTS trigger_update_rfq_bid_count ON workshop_rfq_bids;

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

DROP TRIGGER IF EXISTS trigger_sync_rfq_to_escalation_queue ON workshop_rfq_marketplace;

CREATE TRIGGER trigger_sync_rfq_to_escalation_queue
AFTER UPDATE ON workshop_rfq_marketplace
FOR EACH ROW
EXECUTE FUNCTION sync_rfq_to_escalation_queue();

-- =====================================================
-- 4. Helper Functions
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
  SET status = 'declined'
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
    'mechanic_id', v_mechanic_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_workshop_rfq_bid IS 'Customer accepts a workshop bid from RFQ marketplace';

-- =====================================================
-- 5. Enable RLS on tables
-- =====================================================

ALTER TABLE workshop_rfq_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_rfq_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_rfq_views ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. Analytics Views
-- =====================================================

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

-- =====================================================
-- Migration Complete
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RFQ Marketplace Setup Complete';
  RAISE NOTICE '📊 All tables, indexes, and functions are now in place';
END $$;
