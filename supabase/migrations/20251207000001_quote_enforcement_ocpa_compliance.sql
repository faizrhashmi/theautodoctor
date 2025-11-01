-- ============================================
-- PHASE 2: Quote Enforcement System (OCPA Compliance)
-- Created: 2025-12-07
-- Description: Enforce Ontario Consumer Protection Act requirements
--              for written estimates before repair work begins
--              FIXED: Now uses existing repair_quotes schema
-- ============================================

-- ============================================
-- 1. EXTEND REPAIR_QUOTES TABLE WITH OCPA COMPLIANCE
-- ============================================

-- Note: repair_quotes already has these columns:
-- - work_started_at, work_completed_at (existing)
-- - customer_responded_at (existing)
-- - customer_response, customer_notes (existing)
-- - warranty_days, warranty_expires_at (existing)
-- - parts_cost, labor_cost, subtotal, customer_total (existing)
-- - diagnostic_session_id (existing)

ALTER TABLE repair_quotes
-- OCPA compliance fields
ADD COLUMN IF NOT EXISTS quote_type TEXT
  CHECK (quote_type IN ('diagnostic_only', 'repair_estimate', 'final_quote'))
  DEFAULT 'repair_estimate',
ADD COLUMN IF NOT EXISTS written_estimate_provided_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS customer_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS customer_acceptance_method TEXT
  CHECK (customer_acceptance_method IN ('digital_signature', 'email_confirmation', 'phone_verbal', 'in_person')),
ADD COLUMN IF NOT EXISTS customer_acceptance_ip_address INET,

-- Extended breakdown fields (existing line_items JSONB can store details)
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2), -- HST 13%

-- Warranty disclosure (OCPA requirement) - extend existing warranty_days
ADD COLUMN IF NOT EXISTS warranty_type TEXT
  CHECK (warranty_type IN ('parts_and_labor', 'parts_only', 'labor_only', 'no_warranty'))
  DEFAULT 'parts_and_labor',
ADD COLUMN IF NOT EXISTS warranty_exclusions TEXT,
ADD COLUMN IF NOT EXISTS warranty_disclosure_accepted BOOLEAN DEFAULT false,

-- Quote expiry (protect workshop from price changes)
ADD COLUMN IF NOT EXISTS quote_valid_until DATE,

-- Work authorization
ADD COLUMN IF NOT EXISTS work_authorized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS work_authorized_at TIMESTAMP WITH TIME ZONE,

-- Customer contact confirmation (OCPA requires attempt to contact customer)
ADD COLUMN IF NOT EXISTS customer_contacted_for_quote BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_contact_method TEXT
  CHECK (customer_contact_method IN ('phone', 'email', 'sms', 'in_person', 'platform_notification')),
ADD COLUMN IF NOT EXISTS customer_contact_timestamp TIMESTAMP WITH TIME ZONE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repair_quotes_work_authorized ON repair_quotes(work_authorized);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_customer_accepted ON repair_quotes(customer_accepted_at);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_valid_until ON repair_quotes(quote_valid_until);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_quote_type ON repair_quotes(quote_type);

COMMENT ON COLUMN repair_quotes.written_estimate_provided_at IS 'OCPA: When workshop provided written estimate to customer';
COMMENT ON COLUMN repair_quotes.customer_accepted_at IS 'OCPA: When customer accepted the quote';
COMMENT ON COLUMN repair_quotes.work_authorized IS 'OCPA: Customer explicitly authorized work to begin';
COMMENT ON COLUMN repair_quotes.quote_valid_until IS 'Protects workshop from part price increases';
COMMENT ON COLUMN repair_quotes.warranty_disclosure_accepted IS 'OCPA: Customer acknowledged warranty terms';

-- ============================================
-- 2. QUOTE ACCEPTANCE ENFORCEMENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS quote_acceptance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES repair_quotes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  workshop_id UUID REFERENCES organizations(id),

  -- Acceptance details
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acceptance_method TEXT NOT NULL
    CHECK (acceptance_method IN ('digital_signature', 'email_confirmation', 'phone_verbal', 'in_person')),
  ip_address INET,
  user_agent TEXT,

  -- What was accepted (snapshot in case quote changes later)
  accepted_total_cost DECIMAL(10,2) NOT NULL,
  accepted_parts_cost DECIMAL(10,2),
  accepted_labor_cost DECIMAL(10,2),
  accepted_tax DECIMAL(10,2),
  accepted_quote_snapshot JSONB, -- Full quote details at time of acceptance

  -- Consent checkboxes (OCPA compliance)
  customer_confirmed_parts_breakdown BOOLEAN NOT NULL DEFAULT false,
  customer_confirmed_labor_breakdown BOOLEAN NOT NULL DEFAULT false,
  customer_acknowledged_warranty BOOLEAN NOT NULL DEFAULT false,
  customer_acknowledged_10_percent_rule BOOLEAN NOT NULL DEFAULT false, -- OCPA 10% variance

  -- Legal confirmation text shown to customer
  terms_shown_to_customer TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quote_acceptance_quote ON quote_acceptance_log(quote_id);
CREATE INDEX idx_quote_acceptance_customer ON quote_acceptance_log(customer_id);
CREATE INDEX idx_quote_acceptance_workshop ON quote_acceptance_log(workshop_id);
CREATE INDEX idx_quote_acceptance_date ON quote_acceptance_log(accepted_at);

COMMENT ON TABLE quote_acceptance_log IS 'OCPA: Audit trail of customer quote acceptances';
COMMENT ON COLUMN quote_acceptance_log.customer_acknowledged_10_percent_rule IS 'Customer acknowledged that final cost may exceed estimate by up to 10%';

-- ============================================
-- 3. WORK AUTHORIZATION ENFORCEMENT
-- ============================================

-- Prevent work from starting without accepted quote
CREATE OR REPLACE FUNCTION enforce_quote_acceptance_before_work()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce for repair quotes (not diagnostic-only quotes)
  IF NEW.quote_type = 'repair_estimate' OR NEW.quote_type = 'final_quote' THEN
    -- If trying to mark work as started, ensure quote was accepted
    IF NEW.work_started_at IS NOT NULL AND OLD.work_started_at IS NULL
       AND NEW.customer_accepted_at IS NULL THEN
      RAISE EXCEPTION 'OCPA Violation: Cannot start work without customer acceptance of written estimate (O. Reg. 17/05, s. 56(1))';
    END IF;

    -- If trying to authorize work, ensure quote was accepted
    IF NEW.work_authorized = true AND NEW.customer_accepted_at IS NULL THEN
      RAISE EXCEPTION 'OCPA Violation: Cannot authorize work without customer acceptance of written estimate';
    END IF;

    -- Ensure quote hasn't expired
    IF NEW.work_started_at IS NOT NULL AND OLD.work_started_at IS NULL
       AND NEW.quote_valid_until IS NOT NULL
       AND NEW.quote_valid_until < CURRENT_DATE THEN
      RAISE EXCEPTION 'Cannot start work on expired quote. Please provide updated estimate to customer.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_quote_acceptance
BEFORE UPDATE ON repair_quotes
FOR EACH ROW
EXECUTE FUNCTION enforce_quote_acceptance_before_work();

COMMENT ON FUNCTION enforce_quote_acceptance_before_work IS 'OCPA: Prevents work from starting without customer acceptance';

-- ============================================
-- 4. COMPLIANCE REPORTING VIEW
-- ============================================

CREATE OR REPLACE VIEW ocpa_quote_compliance_status AS
SELECT
  rq.id AS quote_id,
  rq.created_at AS quote_created_at,
  rq.workshop_id,
  o.name AS workshop_name,
  rq.customer_id,
  rq.diagnostic_session_id,

  -- OCPA compliance checks
  CASE
    WHEN rq.quote_type = 'diagnostic_only' THEN true -- Diagnostic quotes don't require itemization
    WHEN rq.parts_cost IS NOT NULL AND rq.labor_cost IS NOT NULL THEN true
    ELSE false
  END AS has_itemized_breakdown,

  (rq.warranty_days IS NOT NULL OR rq.warranty_type IS NOT NULL) AS has_warranty_disclosure,

  (rq.customer_accepted_at IS NOT NULL) AS customer_accepted,

  (rq.work_authorized = true) AS work_authorized,

  (rq.work_started_at IS NOT NULL AND rq.customer_accepted_at IS NULL) AS ocpa_violation_work_without_acceptance,

  (rq.quote_valid_until IS NOT NULL AND rq.quote_valid_until < CURRENT_DATE AND rq.work_started_at IS NOT NULL) AS work_started_on_expired_quote,

  -- Overall compliance status
  CASE
    WHEN rq.quote_type = 'diagnostic_only' THEN 'not_applicable'
    WHEN rq.work_started_at IS NOT NULL AND rq.customer_accepted_at IS NULL THEN 'violation'
    WHEN rq.parts_cost IS NULL OR rq.labor_cost IS NULL THEN 'incomplete'
    WHEN rq.warranty_days IS NULL AND rq.warranty_type IS NULL THEN 'incomplete'
    WHEN rq.customer_accepted_at IS NOT NULL AND rq.work_authorized = true THEN 'compliant'
    WHEN rq.customer_accepted_at IS NOT NULL THEN 'pending_authorization'
    ELSE 'pending_acceptance'
  END AS compliance_status

FROM repair_quotes rq
LEFT JOIN organizations o ON o.id = rq.workshop_id
WHERE rq.created_at >= CURRENT_DATE - INTERVAL '90 days'; -- Last 90 days

CREATE INDEX IF NOT EXISTS idx_ocpa_compliance_workshop ON repair_quotes(workshop_id);
CREATE INDEX IF NOT EXISTS idx_ocpa_compliance_created ON repair_quotes(created_at);

COMMENT ON VIEW ocpa_quote_compliance_status IS 'OCPA: Real-time compliance monitoring for quotes';

-- ============================================
-- 5. AUTOMATED COMPLIANCE ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS ocpa_compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES repair_quotes(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES organizations(id),

  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'missing_itemized_breakdown',
    'missing_warranty_disclosure',
    'quote_expiring_soon',
    'work_started_without_acceptance',
    'expired_quote_in_use'
  )),

  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'violation')),

  alert_message TEXT NOT NULL,

  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ocpa_alerts_workshop ON ocpa_compliance_alerts(workshop_id);
CREATE INDEX idx_ocpa_alerts_resolved ON ocpa_compliance_alerts(resolved);
CREATE INDEX idx_ocpa_alerts_severity ON ocpa_compliance_alerts(severity);

COMMENT ON TABLE ocpa_compliance_alerts IS 'OCPA: Automated compliance alerts for workshops';

-- Trigger to create alerts when quote violations occur
CREATE OR REPLACE FUNCTION create_ocpa_compliance_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Alert if work started without acceptance
  IF NEW.work_started_at IS NOT NULL AND OLD.work_started_at IS NULL
     AND NEW.customer_accepted_at IS NULL THEN
    INSERT INTO ocpa_compliance_alerts (quote_id, workshop_id, alert_type, severity, alert_message)
    VALUES (
      NEW.id,
      NEW.workshop_id,
      'work_started_without_acceptance',
      'violation',
      'OCPA VIOLATION: Work started on quote ' || NEW.id || ' without customer acceptance of written estimate (O. Reg. 17/05, s. 56(1))'
    );
  END IF;

  -- Alert if quote is missing itemized breakdown
  IF (NEW.parts_cost IS NULL OR NEW.labor_cost IS NULL)
     AND NEW.quote_type IN ('repair_estimate', 'final_quote')
     AND OLD.parts_cost IS NULL THEN
    INSERT INTO ocpa_compliance_alerts (quote_id, workshop_id, alert_type, severity, alert_message)
    VALUES (
      NEW.id,
      NEW.workshop_id,
      'missing_itemized_breakdown',
      'warning',
      'Quote ' || NEW.id || ' is missing itemized parts and labor breakdown (OCPA requirement)'
    );
  END IF;

  -- Alert if warranty disclosure is missing
  IF (NEW.warranty_days IS NULL AND NEW.warranty_type IS NULL)
     AND NEW.quote_type IN ('repair_estimate', 'final_quote')
     AND (OLD.warranty_days IS NULL OR OLD.id IS NULL) THEN
    INSERT INTO ocpa_compliance_alerts (quote_id, workshop_id, alert_type, severity, alert_message)
    VALUES (
      NEW.id,
      NEW.workshop_id,
      'missing_warranty_disclosure',
      'warning',
      'Quote ' || NEW.id || ' is missing warranty disclosure (OCPA requirement)'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_ocpa_alerts
AFTER INSERT OR UPDATE ON repair_quotes
FOR EACH ROW
EXECUTE FUNCTION create_ocpa_compliance_alerts();

COMMENT ON FUNCTION create_ocpa_compliance_alerts IS 'OCPA: Auto-generate compliance alerts';

-- ============================================
-- 6. CUSTOMER QUOTE ACCEPTANCE FUNCTION
-- ============================================

-- Function to record customer quote acceptance
CREATE OR REPLACE FUNCTION record_quote_acceptance(
  p_quote_id UUID,
  p_customer_id UUID,
  p_acceptance_method TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_confirmed_parts BOOLEAN,
  p_confirmed_labor BOOLEAN,
  p_acknowledged_warranty BOOLEAN,
  p_acknowledged_10_percent BOOLEAN
)
RETURNS UUID AS $$
DECLARE
  v_quote RECORD;
  v_acceptance_id UUID;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM repair_quotes
  WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Verify customer owns this quote
  IF v_quote.customer_id != p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: Customer does not own this quote';
  END IF;

  -- Verify all required confirmations
  IF NOT (p_confirmed_parts AND p_confirmed_labor AND p_acknowledged_warranty AND p_acknowledged_10_percent) THEN
    RAISE EXCEPTION 'All confirmations required: parts breakdown, labor breakdown, warranty acknowledgment, 10%% rule';
  END IF;

  -- Record acceptance in audit log
  INSERT INTO quote_acceptance_log (
    quote_id,
    customer_id,
    workshop_id,
    acceptance_method,
    ip_address,
    user_agent,
    accepted_total_cost,
    accepted_parts_cost,
    accepted_labor_cost,
    accepted_tax,
    accepted_quote_snapshot,
    customer_confirmed_parts_breakdown,
    customer_confirmed_labor_breakdown,
    customer_acknowledged_warranty,
    customer_acknowledged_10_percent_rule,
    terms_shown_to_customer
  ) VALUES (
    p_quote_id,
    p_customer_id,
    v_quote.workshop_id,
    p_acceptance_method,
    p_ip_address,
    p_user_agent,
    v_quote.customer_total,
    v_quote.parts_cost,
    v_quote.labor_cost,
    v_quote.customer_total - v_quote.subtotal, -- Tax = total - subtotal
    row_to_json(v_quote)::jsonb,
    p_confirmed_parts,
    p_confirmed_labor,
    p_acknowledged_warranty,
    p_acknowledged_10_percent,
    'Ontario Consumer Protection Act (O. Reg. 17/05) requires written estimates before repair work. Final cost cannot exceed this estimate by more than 10% without your written approval.'
  ) RETURNING id INTO v_acceptance_id;

  -- Update quote record
  UPDATE repair_quotes
  SET
    customer_accepted_at = NOW(),
    customer_acceptance_method = p_acceptance_method,
    customer_acceptance_ip_address = p_ip_address,
    warranty_disclosure_accepted = p_acknowledged_warranty,
    work_authorized = true,
    work_authorized_at = NOW(),
    status = 'approved',
    customer_responded_at = NOW(),
    customer_response = 'approved',
    updated_at = NOW()
  WHERE id = p_quote_id;

  RETURN v_acceptance_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_quote_acceptance IS 'OCPA: Record customer quote acceptance with full audit trail';
