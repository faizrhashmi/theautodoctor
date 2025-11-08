-- ============================================
-- PHASE 2: Warranty Disclosure System (Simplified)
-- Created: 2025-12-07
-- Description: Warranty tracking system (simplified for existing schema)
--              FIXED: Uses existing warranty_days, warranty_expires_at
-- ============================================

-- Note: repair_quotes already has:
-- - warranty_days (existing)
-- - warranty_expires_at (existing)
-- We extend with warranty claims and disclosure tracking

-- ============================================
-- 1. WARRANTY CLAIMS
-- ============================================

CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  original_quote_id UUID NOT NULL REFERENCES repair_quotes(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES organizations(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),

  -- Claim details
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'part_failure',
    'labor_defect',
    'incomplete_repair',
    'same_problem_recurring',
    'other'
  )),

  issue_description TEXT NOT NULL,
  issue_photos JSONB DEFAULT '[]'::jsonb,

  -- Dates
  repair_completion_date DATE NOT NULL,
  issue_discovered_date DATE NOT NULL,
  claim_filed_date DATE DEFAULT CURRENT_DATE,
  days_since_repair INTEGER,

  -- Warranty coverage check
  within_warranty_period BOOLEAN,
  warranty_valid BOOLEAN,

  -- Claim status
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'under_review',
    'approved',
    'declined',
    'resolved'
  )),

  -- Workshop response
  workshop_response TEXT,
  workshop_response_date TIMESTAMP WITH TIME ZONE,

  decline_reason TEXT CHECK (decline_reason IN (
    'outside_warranty_period',
    'customer_caused_damage',
    'normal_wear_and_tear',
    'not_covered_by_warranty',
    'other'
  )),

  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN (
    'free_repair',
    'partial_cost_repair',
    'full_refund',
    'declined'
  )),

  resolution_completed_date DATE,

  -- Customer satisfaction
  customer_satisfied BOOLEAN,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_warranty_claims_quote ON warranty_claims(original_quote_id);
CREATE INDEX idx_warranty_claims_workshop ON warranty_claims(workshop_id);
CREATE INDEX idx_warranty_claims_customer ON warranty_claims(customer_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(status);

COMMENT ON TABLE warranty_claims IS 'OCPA: Track warranty claims and resolutions';

-- ============================================
-- 2. WARRANTY DISCLOSURE ACKNOWLEDGMENT
-- ============================================

CREATE TABLE IF NOT EXISTS warranty_disclosure_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  quote_id UUID NOT NULL REFERENCES repair_quotes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  workshop_id UUID REFERENCES organizations(id),

  -- What was disclosed
  warranty_terms_shown TEXT NOT NULL,
  warranty_days_shown INTEGER,

  -- Customer acknowledgment
  customer_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledgment_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_warranty_disclosure_quote ON warranty_disclosure_acknowledgments(quote_id);

COMMENT ON TABLE warranty_disclosure_acknowledgments IS 'OCPA: Proof that warranty terms were disclosed';

-- ============================================
-- 3. WARRANTY VALIDATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION validate_warranty_claim(
  p_claim_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_claim RECORD;
  v_quote RECORD;
  v_is_valid BOOLEAN := false;
BEGIN
  -- Get claim details
  SELECT * INTO v_claim
  FROM warranty_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warranty claim not found';
  END IF;

  -- Get original quote warranty details
  SELECT * INTO v_quote
  FROM repair_quotes
  WHERE id = v_claim.original_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original quote not found';
  END IF;

  -- Check if claim is within warranty period
  IF v_quote.warranty_expires_at IS NOT NULL
     AND v_claim.claim_filed_date <= v_quote.warranty_expires_at::DATE THEN
    v_is_valid := true;
  END IF;

  -- Update claim with validation results
  UPDATE warranty_claims
  SET
    days_since_repair = v_claim.claim_filed_date - v_claim.repair_completion_date,
    within_warranty_period = (v_quote.warranty_expires_at >= v_claim.claim_filed_date::TIMESTAMP WITH TIME ZONE),
    warranty_valid = v_is_valid
  WHERE id = p_claim_id;

  RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_warranty_claim IS 'Validate if warranty claim falls within warranty terms';

-- ============================================
-- 4. CUSTOMER WARRANTY CLAIM FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION file_warranty_claim(
  p_quote_id UUID,
  p_customer_id UUID,
  p_claim_type TEXT,
  p_issue_description TEXT,
  p_issue_discovered_date DATE,
  p_issue_photos JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_quote RECORD;
  v_claim_id UUID;
  v_is_valid BOOLEAN;
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

  -- Verify work was completed
  IF v_quote.work_completed_at IS NULL THEN
    RAISE EXCEPTION 'Cannot file warranty claim: repair work not yet completed';
  END IF;

  -- Create warranty claim
  INSERT INTO warranty_claims (
    original_quote_id,
    workshop_id,
    customer_id,
    claim_type,
    issue_description,
    issue_photos,
    repair_completion_date,
    issue_discovered_date,
    status
  ) VALUES (
    p_quote_id,
    v_quote.workshop_id,
    p_customer_id,
    p_claim_type,
    p_issue_description,
    p_issue_photos,
    v_quote.work_completed_at::DATE,
    p_issue_discovered_date,
    'submitted'
  ) RETURNING id INTO v_claim_id;

  -- Validate claim
  v_is_valid := validate_warranty_claim(v_claim_id);

  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION file_warranty_claim IS 'Customer function to file warranty claim';
