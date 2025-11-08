-- ============================================
-- PHASE 2: 10% Variance Protection (OCPA Compliance)
-- Created: 2025-12-07
-- Description: Enforce Ontario Consumer Protection Act 10% variance rule
--              (O. Reg. 17/05, s. 56(3)): Final cost cannot exceed estimate
--              by more than 10% without written customer approval
--              FIXED: Now uses existing repair_quotes schema
-- ============================================

-- Note: Using existing columns:
-- - customer_total (NOT total_cost_with_tax)
-- - diagnostic_session_id (NOT session_request_id)

-- ============================================
-- 1. QUOTE VARIANCE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS quote_variance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  original_quote_id UUID NOT NULL REFERENCES repair_quotes(id) ON DELETE CASCADE,
  revised_quote_id UUID REFERENCES repair_quotes(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES organizations(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  diagnostic_session_id UUID REFERENCES diagnostic_sessions(id),

  -- Original vs Revised amounts
  original_total_cost DECIMAL(10,2) NOT NULL,
  revised_total_cost DECIMAL(10,2) NOT NULL,
  variance_amount DECIMAL(10,2) GENERATED ALWAYS AS (revised_total_cost - original_total_cost) STORED,
  variance_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN original_total_cost > 0 THEN
        ((revised_total_cost - original_total_cost) / original_total_cost) * 100
      ELSE 0
    END
  ) STORED,

  -- OCPA 10% threshold check
  exceeds_10_percent BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN original_total_cost > 0 THEN
        ((revised_total_cost - original_total_cost) / original_total_cost) * 100 > 10
      ELSE false
    END
  ) STORED,

  -- Reason for variance
  variance_reason TEXT NOT NULL CHECK (variance_reason IN (
    'additional_parts_needed',
    'additional_labor_required',
    'unforeseen_damage_discovered',
    'part_price_increase',
    'customer_requested_additional_work',
    'diagnostic_revealed_more_issues',
    'other'
  )),
  detailed_explanation TEXT NOT NULL,

  -- Parts and labor breakdown (itemized changes)
  additional_parts_cost DECIMAL(10,2),
  additional_labor_cost DECIMAL(10,2),
  parts_breakdown_changes JSONB DEFAULT '[]'::jsonb,
  labor_breakdown_changes JSONB DEFAULT '[]'::jsonb,

  -- Workshop attempt to contact customer (OCPA requirement)
  workshop_contacted_customer BOOLEAN DEFAULT false,
  contact_method TEXT CHECK (contact_method IN ('phone', 'email', 'sms', 'in_person', 'platform_notification')),
  contact_timestamp TIMESTAMP WITH TIME ZONE,
  contact_notes TEXT,

  -- Customer response
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Awaiting customer response
    'approved',          -- Customer approved variance
    'declined',          -- Customer declined, work stops
    'negotiating',       -- Customer wants to negotiate
    'expired',           -- Customer didn't respond within timeframe
    'workshop_absorbed'  -- Workshop agreed to absorb cost overrun
  )),

  customer_response_at TIMESTAMP WITH TIME ZONE,
  customer_approval_method TEXT CHECK (customer_approval_method IN (
    'digital_signature',
    'email_confirmation',
    'phone_verbal',
    'in_person',
    'sms_confirmation'
  )),
  customer_approval_ip_address INET,
  customer_approval_user_agent TEXT,

  -- Customer decision details
  customer_notes TEXT,
  customer_authorized_amount DECIMAL(10,2), -- If customer approves partial increase

  -- Compliance tracking
  ocpa_compliant BOOLEAN GENERATED ALWAYS AS (
    CASE
      -- If variance <= 10%, no approval needed
      WHEN ((revised_total_cost - original_total_cost) / NULLIF(original_total_cost, 0)) * 100 <= 10 THEN true
      -- If variance > 10%, customer approval required
      WHEN ((revised_total_cost - original_total_cost) / NULLIF(original_total_cost, 0)) * 100 > 10
           AND status = 'approved' THEN true
      -- If workshop absorbed cost, compliant
      WHEN status = 'workshop_absorbed' THEN true
      ELSE false
    END
  ) STORED,

  -- Resolution
  work_can_proceed BOOLEAN DEFAULT false,
  final_approved_cost DECIMAL(10,2),
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- How long customer has to respond

  CONSTRAINT variance_amount_positive CHECK (revised_total_cost > original_total_cost)
);

CREATE INDEX idx_variance_requests_original_quote ON quote_variance_requests(original_quote_id);
CREATE INDEX idx_variance_requests_workshop ON quote_variance_requests(workshop_id);
CREATE INDEX idx_variance_requests_customer ON quote_variance_requests(customer_id);
CREATE INDEX idx_variance_requests_status ON quote_variance_requests(status);
CREATE INDEX idx_variance_requests_exceeds_10 ON quote_variance_requests(exceeds_10_percent);
CREATE INDEX idx_variance_requests_compliant ON quote_variance_requests(ocpa_compliant);

COMMENT ON TABLE quote_variance_requests IS 'OCPA 10% Rule: Track quote variances requiring customer approval (O. Reg. 17/05, s. 56(3))';
COMMENT ON COLUMN quote_variance_requests.exceeds_10_percent IS 'OCPA: Whether variance exceeds 10% threshold requiring customer approval';
COMMENT ON COLUMN quote_variance_requests.ocpa_compliant IS 'Whether this variance request complies with OCPA 10% rule';

-- ============================================
-- 2. VARIANCE APPROVAL AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS quote_variance_approval_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variance_request_id UUID NOT NULL REFERENCES quote_variance_requests(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL CHECK (action_type IN (
    'variance_requested',
    'customer_notified',
    'customer_approved',
    'customer_declined',
    'customer_negotiated',
    'workshop_absorbed_cost',
    'variance_expired',
    'work_stopped',
    'work_continued'
  )),

  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT CHECK (actor_role IN ('customer', 'workshop', 'service_advisor', 'system')),

  action_details JSONB,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_variance_approval_log_request ON quote_variance_approval_log(variance_request_id);
CREATE INDEX idx_variance_approval_log_action ON quote_variance_approval_log(action_type);
CREATE INDEX idx_variance_approval_log_created ON quote_variance_approval_log(created_at);

COMMENT ON TABLE quote_variance_approval_log IS 'OCPA: Audit trail of variance request actions';

-- ============================================
-- 3. ENFORCE 10% RULE BEFORE WORK CONTINUES
-- ============================================

-- Function to check if work can proceed with cost increase
CREATE OR REPLACE FUNCTION can_proceed_with_cost_increase(
  p_original_quote_id UUID,
  p_revised_cost DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_original_cost DECIMAL;
  v_variance_percent DECIMAL;
  v_pending_approval BOOLEAN;
BEGIN
  -- Get original quote amount
  SELECT customer_total INTO v_original_cost
  FROM repair_quotes
  WHERE id = p_original_quote_id;

  IF v_original_cost IS NULL THEN
    RAISE EXCEPTION 'Original quote not found';
  END IF;

  -- Calculate variance
  v_variance_percent := ((p_revised_cost - v_original_cost) / v_original_cost) * 100;

  -- If variance <= 10%, work can proceed
  IF v_variance_percent <= 10 THEN
    RETURN true;
  END IF;

  -- If variance > 10%, check if customer approved
  SELECT EXISTS (
    SELECT 1
    FROM quote_variance_requests
    WHERE original_quote_id = p_original_quote_id
      AND status = 'approved'
      AND revised_total_cost = p_revised_cost
  ) INTO v_pending_approval;

  RETURN v_pending_approval;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_proceed_with_cost_increase IS 'OCPA: Check if work can proceed with cost increase';

-- ============================================
-- 4. AUTOMATIC VARIANCE DETECTION
-- ============================================

-- Trigger to detect when actual costs exceed estimate by >10%
CREATE OR REPLACE FUNCTION detect_quote_variance_violation()
RETURNS TRIGGER AS $$
DECLARE
  v_original_quote RECORD;
  v_variance_percent DECIMAL;
  v_has_approval BOOLEAN;
BEGIN
  -- Only check when work is being completed
  IF NEW.work_completed_at IS NOT NULL AND OLD.work_completed_at IS NULL THEN

    -- Get original accepted quote amount
    IF NEW.customer_accepted_at IS NOT NULL THEN
      -- Find the accepted quote snapshot from quote_acceptance_log
      SELECT accepted_total_cost INTO v_original_quote
      FROM quote_acceptance_log
      WHERE quote_id = NEW.id
      ORDER BY accepted_at ASC
      LIMIT 1;

      IF FOUND THEN
        -- Calculate variance between original accepted cost and current cost
        v_variance_percent := ((NEW.customer_total - v_original_quote.accepted_total_cost)
                               / v_original_quote.accepted_total_cost) * 100;

        -- If variance > 10%, check for approval
        IF v_variance_percent > 10 THEN
          SELECT EXISTS (
            SELECT 1
            FROM quote_variance_requests
            WHERE original_quote_id = NEW.id
              AND status = 'approved'
              AND revised_total_cost >= NEW.customer_total
          ) INTO v_has_approval;

          -- Block completion if no approval
          IF NOT v_has_approval THEN
            RAISE EXCEPTION 'OCPA VIOLATION: Final cost exceeds estimate by %.2f%% (>10%%) without customer approval (O. Reg. 17/05, s. 56(3))', v_variance_percent;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_variance_violation
BEFORE UPDATE ON repair_quotes
FOR EACH ROW
EXECUTE FUNCTION detect_quote_variance_violation();

COMMENT ON FUNCTION detect_quote_variance_violation IS 'OCPA: Prevent work completion if cost exceeds estimate by >10% without approval';

-- ============================================
-- 5. CUSTOMER VARIANCE APPROVAL FUNCTION
-- ============================================

-- Function for customer to approve variance
CREATE OR REPLACE FUNCTION approve_quote_variance(
  p_variance_request_id UUID,
  p_customer_id UUID,
  p_approval_method TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_variance_request RECORD;
  v_revised_quote_id UUID;
BEGIN
  -- Get variance request
  SELECT * INTO v_variance_request
  FROM quote_variance_requests
  WHERE id = p_variance_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variance request not found';
  END IF;

  -- Verify customer owns this request
  IF v_variance_request.customer_id != p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: Customer does not own this variance request';
  END IF;

  -- Verify request is pending
  IF v_variance_request.status != 'pending' THEN
    RAISE EXCEPTION 'Variance request is not pending (current status: %)', v_variance_request.status;
  END IF;

  -- Update variance request
  UPDATE quote_variance_requests
  SET
    status = 'approved',
    customer_response_at = NOW(),
    customer_approval_method = p_approval_method,
    customer_approval_ip_address = p_ip_address,
    customer_approval_user_agent = p_user_agent,
    customer_notes = p_customer_notes,
    work_can_proceed = true,
    final_approved_cost = revised_total_cost,
    updated_at = NOW()
  WHERE id = p_variance_request_id;

  -- Log approval
  INSERT INTO quote_variance_approval_log (
    variance_request_id,
    action_type,
    actor_id,
    actor_role,
    action_details,
    notes
  ) VALUES (
    p_variance_request_id,
    'customer_approved',
    p_customer_id,
    'customer',
    jsonb_build_object(
      'approval_method', p_approval_method,
      'ip_address', p_ip_address,
      'approved_cost', v_variance_request.revised_total_cost,
      'variance_percent', v_variance_request.variance_percent
    ),
    p_customer_notes
  );

  -- Update revised quote to mark as accepted
  IF v_variance_request.revised_quote_id IS NOT NULL THEN
    UPDATE repair_quotes
    SET
      customer_accepted_at = NOW(),
      customer_acceptance_method = p_approval_method,
      work_authorized = true,
      status = 'approved',
      customer_responded_at = NOW(),
      customer_response = 'approved',
      updated_at = NOW()
    WHERE id = v_variance_request.revised_quote_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_quote_variance IS 'OCPA: Record customer approval of quote variance >10%';

-- ============================================
-- 6. CUSTOMER VARIANCE DECLINE FUNCTION
-- ============================================

-- Function for customer to decline variance
CREATE OR REPLACE FUNCTION decline_quote_variance(
  p_variance_request_id UUID,
  p_customer_id UUID,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_variance_request RECORD;
BEGIN
  -- Get variance request
  SELECT * INTO v_variance_request
  FROM quote_variance_requests
  WHERE id = p_variance_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variance request not found';
  END IF;

  -- Verify customer owns this request
  IF v_variance_request.customer_id != p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: Customer does not own this variance request';
  END IF;

  -- Update variance request
  UPDATE quote_variance_requests
  SET
    status = 'declined',
    customer_response_at = NOW(),
    customer_notes = p_customer_notes,
    work_can_proceed = false,
    updated_at = NOW()
  WHERE id = p_variance_request_id;

  -- Log decline
  INSERT INTO quote_variance_approval_log (
    variance_request_id,
    action_type,
    actor_id,
    actor_role,
    notes
  ) VALUES (
    p_variance_request_id,
    'customer_declined',
    p_customer_id,
    'customer',
    p_customer_notes
  );

  -- Update original quote to mark work cannot proceed
  UPDATE repair_quotes
  SET
    work_authorized = false,
    status = 'declined',
    customer_responded_at = NOW(),
    customer_response = 'declined',
    decline_reason = 'Cost variance exceeded 10% and customer declined additional cost',
    customer_notes = p_customer_notes,
    updated_at = NOW()
  WHERE id = v_variance_request.original_quote_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION decline_quote_variance IS 'OCPA: Record customer decline of quote variance';

-- ============================================
-- 7. VARIANCE COMPLIANCE MONITORING VIEW
-- ============================================

CREATE OR REPLACE VIEW quote_variance_compliance_status AS
SELECT
  qvr.id AS variance_request_id,
  qvr.original_quote_id,
  qvr.workshop_id,
  o.name AS workshop_name,
  qvr.customer_id,

  qvr.original_total_cost,
  qvr.revised_total_cost,
  qvr.variance_amount,
  qvr.variance_percent,
  qvr.exceeds_10_percent,

  qvr.variance_reason,
  qvr.status,
  qvr.ocpa_compliant,
  qvr.work_can_proceed,

  qvr.created_at AS variance_requested_at,
  qvr.customer_response_at,

  -- Compliance status
  CASE
    WHEN qvr.exceeds_10_percent = false THEN 'not_required'
    WHEN qvr.status = 'approved' THEN 'compliant'
    WHEN qvr.status = 'declined' THEN 'work_stopped'
    WHEN qvr.status = 'workshop_absorbed' THEN 'compliant'
    WHEN qvr.status = 'pending' AND qvr.expires_at < NOW() THEN 'expired_violation'
    WHEN qvr.status = 'pending' THEN 'pending_approval'
    ELSE 'unknown'
  END AS compliance_status,

  -- Time since request
  EXTRACT(EPOCH FROM (NOW() - qvr.created_at)) / 3600 AS hours_since_request

FROM quote_variance_requests qvr
LEFT JOIN organizations o ON o.id = qvr.workshop_id
WHERE qvr.created_at >= CURRENT_DATE - INTERVAL '90 days';

COMMENT ON VIEW quote_variance_compliance_status IS 'OCPA: Monitor 10% variance rule compliance';

-- ============================================
-- 8. AUTOMATED VARIANCE ALERTS
-- ============================================

-- Trigger to create alert when variance > 10% is detected
CREATE OR REPLACE FUNCTION create_variance_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Alert if variance exceeds 10% and no approval yet
  IF NEW.exceeds_10_percent = true AND NEW.status = 'pending' THEN
    INSERT INTO ocpa_compliance_alerts (
      quote_id,
      workshop_id,
      alert_type,
      severity,
      alert_message
    ) VALUES (
      NEW.original_quote_id,
      NEW.workshop_id,
      'quote_expiring_soon', -- Using existing alert_type
      'critical',
      'OCPA: Cost increase of ' || NEW.variance_percent::TEXT || '% exceeds 10% threshold. Customer approval required before work continues (O. Reg. 17/05, s. 56(3))'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_variance_alert
AFTER INSERT ON quote_variance_requests
FOR EACH ROW
EXECUTE FUNCTION create_variance_alert();

COMMENT ON FUNCTION create_variance_alert IS 'OCPA: Alert when variance exceeds 10%';
