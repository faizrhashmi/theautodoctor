-- ============================================
-- PHASE 3: Workshop Agreement Signing System
-- Created: 2025-12-01
-- Description: Digital agreement acceptance for independent contractor compliance
-- ============================================

-- ============================================
-- 1. WORKSHOP AGREEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workshop_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Agreement Details
  agreement_version TEXT NOT NULL DEFAULT 'v1.0.0',
  agreement_type TEXT NOT NULL DEFAULT 'independent_contractor' CHECK (agreement_type IN (
    'independent_contractor',  -- Main IC agreement
    'privacy_acknowledgment',  -- PIPEDA compliance
    'ocpa_compliance',        -- Ontario Consumer Protection Act
    'terms_of_service'        -- Platform terms
  )),

  -- Signing Information
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signed_by UUID REFERENCES profiles(id), -- Workshop admin who signed
  electronic_signature TEXT NOT NULL, -- Typed name

  -- Audit Trail
  ip_address INET NOT NULL,
  user_agent TEXT,

  -- Agreement Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',      -- Currently valid
    'superseded',  -- Replaced by newer version
    'revoked'      -- Revoked by platform
  )),

  -- Section Acceptance
  sections_accepted JSONB NOT NULL DEFAULT '{}'::jsonb, -- Track which sections were accepted

  -- Insurance Verification (for independent contractor agreement)
  insurance_verified BOOLEAN DEFAULT false,
  insurance_certificate_url TEXT,
  insurance_expiry_date DATE,
  insurance_coverage_amount DECIMAL(12,2),
  insurance_provider TEXT,

  -- Business Registration (for independent contractor agreement)
  business_registration_verified BOOLEAN DEFAULT false,
  business_number TEXT, -- CRA Business Number
  gst_hst_number TEXT,

  -- WSIB Verification (if employing workers)
  wsib_required BOOLEAN DEFAULT false,
  wsib_verified BOOLEAN DEFAULT false,
  wsib_account_number TEXT,
  wsib_clearance_certificate_url TEXT,

  -- PDF Copy
  agreement_pdf_url TEXT, -- Signed PDF copy

  -- Admin Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workshop_agreements_org ON workshop_agreements(organization_id);
CREATE INDEX idx_workshop_agreements_status ON workshop_agreements(status);
CREATE INDEX idx_workshop_agreements_type ON workshop_agreements(agreement_type);
CREATE INDEX idx_workshop_agreements_signed ON workshop_agreements(signed_at DESC);
CREATE INDEX idx_workshop_agreements_insurance_expiry ON workshop_agreements(insurance_expiry_date)
  WHERE insurance_verified = true;

COMMENT ON TABLE workshop_agreements IS 'Digital agreements signed by workshops for legal compliance';
COMMENT ON COLUMN workshop_agreements.electronic_signature IS 'Typed name as electronic signature';
COMMENT ON COLUMN workshop_agreements.sections_accepted IS 'JSON object tracking checkbox acceptance of each section';

-- ============================================
-- 2. AGREEMENT SECTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS agreement_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES workshop_agreements(id) ON DELETE CASCADE,

  -- Section Details
  section_key TEXT NOT NULL, -- e.g., 'independent_contractor', 'insurance', 'ocpa_compliance'
  section_title TEXT NOT NULL,
  section_content TEXT NOT NULL, -- Full text of the section

  -- Acceptance
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Order
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agreement_sections_agreement ON agreement_sections(agreement_id);
CREATE INDEX idx_agreement_sections_key ON agreement_sections(section_key);

COMMENT ON TABLE agreement_sections IS 'Individual sections of workshop agreements requiring acceptance';

-- ============================================
-- 3. INSURANCE VERIFICATION LOG
-- ============================================

CREATE TABLE IF NOT EXISTS insurance_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES workshop_agreements(id),

  -- Verification Details
  verification_type TEXT NOT NULL CHECK (verification_type IN (
    'initial',        -- First upload
    'renewal',        -- Insurance renewed
    'updated',        -- Certificate updated
    'expired_alert',  -- Expiry notification sent
    'revoked'         -- Insurance revoked
  )),

  -- Certificate Details
  certificate_url TEXT,
  provider TEXT,
  policy_number TEXT,
  coverage_amount DECIMAL(12,2),
  effective_date DATE,
  expiry_date DATE,

  -- Verification Status
  verified_by UUID REFERENCES profiles(id), -- Admin who verified
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_status TEXT CHECK (verification_status IN (
    'pending',
    'approved',
    'rejected',
    'expired'
  )),
  rejection_reason TEXT,

  -- Audit
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insurance_log_org ON insurance_verification_log(organization_id);
CREATE INDEX idx_insurance_log_agreement ON insurance_verification_log(agreement_id);
CREATE INDEX idx_insurance_log_expiry ON insurance_verification_log(expiry_date);
CREATE INDEX idx_insurance_log_status ON insurance_verification_log(verification_status);

COMMENT ON TABLE insurance_verification_log IS 'Audit trail of insurance certificate uploads and verifications';

-- ============================================
-- 4. AGREEMENT FUNCTIONS
-- ============================================

-- Function: Sign Workshop Agreement
CREATE OR REPLACE FUNCTION sign_workshop_agreement(
  p_organization_id UUID,
  p_signed_by UUID,
  p_electronic_signature TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_agreement_type TEXT,
  p_agreement_version TEXT,
  p_sections_accepted JSONB
)
RETURNS UUID AS $$
DECLARE
  v_agreement_id UUID;
  v_required_sections TEXT[] := ARRAY['independent_contractor', 'insurance', 'ocpa_compliance', 'privacy'];
  v_section TEXT;
BEGIN
  -- Validate all required sections are accepted
  FOREACH v_section IN ARRAY v_required_sections
  LOOP
    IF NOT (p_sections_accepted->>v_section)::boolean THEN
      RAISE EXCEPTION 'Required section "%" must be accepted', v_section;
    END IF;
  END LOOP;

  -- Validate signature is not empty
  IF p_electronic_signature IS NULL OR LENGTH(TRIM(p_electronic_signature)) < 2 THEN
    RAISE EXCEPTION 'Electronic signature must be at least 2 characters';
  END IF;

  -- Supersede any existing active agreements of same type
  UPDATE workshop_agreements
  SET status = 'superseded',
      updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND agreement_type = p_agreement_type
    AND status = 'active';

  -- Create new agreement
  INSERT INTO workshop_agreements (
    organization_id,
    signed_by,
    electronic_signature,
    ip_address,
    user_agent,
    agreement_type,
    agreement_version,
    sections_accepted,
    status
  ) VALUES (
    p_organization_id,
    p_signed_by,
    p_electronic_signature,
    p_ip_address,
    p_user_agent,
    p_agreement_type,
    p_agreement_version,
    p_sections_accepted,
    'active'
  )
  RETURNING id INTO v_agreement_id;

  RETURN v_agreement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sign_workshop_agreement IS 'Record digital acceptance of workshop agreement';

-- Function: Upload Insurance Certificate
CREATE OR REPLACE FUNCTION upload_insurance_certificate(
  p_organization_id UUID,
  p_uploaded_by UUID,
  p_certificate_url TEXT,
  p_provider TEXT,
  p_policy_number TEXT,
  p_coverage_amount DECIMAL,
  p_effective_date DATE,
  p_expiry_date DATE,
  p_ip_address INET
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_agreement_id UUID;
BEGIN
  -- Validate coverage amount meets minimum ($2M)
  IF p_coverage_amount < 2000000 THEN
    RAISE EXCEPTION 'Insurance coverage must be at least $2,000,000 CAD';
  END IF;

  -- Validate dates
  IF p_expiry_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'Insurance certificate is already expired';
  END IF;

  IF p_effective_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Insurance certificate is not yet effective';
  END IF;

  -- Get current active agreement
  SELECT id INTO v_agreement_id
  FROM workshop_agreements
  WHERE organization_id = p_organization_id
    AND agreement_type = 'independent_contractor'
    AND status = 'active'
  ORDER BY signed_at DESC
  LIMIT 1;

  -- Create verification log entry
  INSERT INTO insurance_verification_log (
    organization_id,
    agreement_id,
    verification_type,
    certificate_url,
    provider,
    policy_number,
    coverage_amount,
    effective_date,
    expiry_date,
    uploaded_by,
    uploaded_at,
    ip_address,
    verification_status
  ) VALUES (
    p_organization_id,
    v_agreement_id,
    'initial',
    p_certificate_url,
    p_provider,
    p_policy_number,
    p_coverage_amount,
    p_effective_date,
    p_expiry_date,
    p_uploaded_by,
    NOW(),
    p_ip_address,
    'pending'
  )
  RETURNING id INTO v_log_id;

  -- Update agreement with insurance details
  IF v_agreement_id IS NOT NULL THEN
    UPDATE workshop_agreements
    SET
      insurance_certificate_url = p_certificate_url,
      insurance_expiry_date = p_expiry_date,
      insurance_coverage_amount = p_coverage_amount,
      insurance_provider = p_provider,
      updated_at = NOW()
    WHERE id = v_agreement_id;
  END IF;

  -- Update organization insurance details
  UPDATE organizations
  SET
    insurance_expiry_date = p_expiry_date,
    insurance_coverage_amount = p_coverage_amount,
    insurance_provider = p_provider,
    updated_at = NOW()
  WHERE id = p_organization_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upload_insurance_certificate IS 'Upload and validate insurance certificate for workshop';

-- Function: Verify Insurance Certificate (Admin)
CREATE OR REPLACE FUNCTION verify_insurance_certificate(
  p_log_id UUID,
  p_verified_by UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_organization_id UUID;
  v_agreement_id UUID;
BEGIN
  -- Get organization and agreement IDs
  SELECT organization_id, agreement_id INTO v_organization_id, v_agreement_id
  FROM insurance_verification_log
  WHERE id = p_log_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Insurance verification log not found';
  END IF;

  -- Update verification log
  UPDATE insurance_verification_log
  SET
    verified_by = p_verified_by,
    verified_at = NOW(),
    verification_status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    rejection_reason = p_rejection_reason
  WHERE id = p_log_id;

  -- If approved, update agreement
  IF p_approved AND v_agreement_id IS NOT NULL THEN
    UPDATE workshop_agreements
    SET
      insurance_verified = true,
      reviewed_by = p_verified_by,
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_agreement_id;
  END IF;

  RETURN p_approved;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_insurance_certificate IS 'Admin verifies uploaded insurance certificate';

-- Function: Check Agreement Compliance
CREATE OR REPLACE FUNCTION check_workshop_agreement_compliance(
  p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_has_active_agreement BOOLEAN;
  v_insurance_valid BOOLEAN;
  v_insurance_expiring_soon BOOLEAN;
  v_insurance_expiry DATE;
BEGIN
  -- Check for active independent contractor agreement
  SELECT EXISTS (
    SELECT 1 FROM workshop_agreements
    WHERE organization_id = p_organization_id
      AND agreement_type = 'independent_contractor'
      AND status = 'active'
  ) INTO v_has_active_agreement;

  v_result := jsonb_set(v_result, '{has_active_agreement}', to_jsonb(v_has_active_agreement));

  -- Check insurance status
  SELECT
    insurance_expiry_date,
    (insurance_verified = true AND insurance_expiry_date > CURRENT_DATE),
    (insurance_expiry_date IS NOT NULL AND insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')
  INTO v_insurance_expiry, v_insurance_valid, v_insurance_expiring_soon
  FROM workshop_agreements
  WHERE organization_id = p_organization_id
    AND agreement_type = 'independent_contractor'
    AND status = 'active'
  ORDER BY signed_at DESC
  LIMIT 1;

  v_result := jsonb_set(v_result, '{insurance_valid}', to_jsonb(COALESCE(v_insurance_valid, false)));
  v_result := jsonb_set(v_result, '{insurance_expiring_soon}', to_jsonb(COALESCE(v_insurance_expiring_soon, false)));
  v_result := jsonb_set(v_result, '{insurance_expiry_date}', to_jsonb(v_insurance_expiry));

  -- Overall compliance
  v_result := jsonb_set(v_result, '{compliant}',
    to_jsonb(v_has_active_agreement AND COALESCE(v_insurance_valid, false))
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_workshop_agreement_compliance IS 'Check if workshop meets all agreement requirements';

-- ============================================
-- 5. AGREEMENT VIEWS
-- ============================================

CREATE OR REPLACE VIEW workshop_agreement_status AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.organization_type,

  -- Agreement Status
  wa.id AS agreement_id,
  wa.agreement_version,
  wa.signed_at,
  wa.status AS agreement_status,
  p.full_name AS signed_by_name,
  p.email AS signed_by_email,

  -- Insurance Status
  wa.insurance_verified,
  wa.insurance_expiry_date,
  wa.insurance_coverage_amount,
  wa.insurance_provider,
  CASE
    WHEN wa.insurance_expiry_date IS NULL THEN 'not_uploaded'
    WHEN wa.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    WHEN wa.insurance_verified = true THEN 'valid'
    ELSE 'pending_verification'
  END AS insurance_status,

  -- Business Registration
  wa.business_registration_verified,
  wa.business_number,
  wa.gst_hst_number,

  -- WSIB
  wa.wsib_required,
  wa.wsib_verified,
  wa.wsib_account_number,

  -- Compliance Check
  (wa.status = 'active'
   AND wa.insurance_verified = true
   AND wa.insurance_expiry_date > CURRENT_DATE) AS is_compliant,

  -- Days until insurance expiry
  CASE
    WHEN wa.insurance_expiry_date IS NOT NULL
    THEN (wa.insurance_expiry_date - CURRENT_DATE)
    ELSE NULL
  END AS days_until_insurance_expiry

FROM organizations o
LEFT JOIN workshop_agreements wa ON wa.organization_id = o.id
  AND wa.agreement_type = 'independent_contractor'
  AND wa.status = 'active'
LEFT JOIN profiles p ON p.id = wa.signed_by
WHERE o.organization_type IN ('workshop', 'mobile_mechanic')
ORDER BY o.name;

COMMENT ON VIEW workshop_agreement_status IS 'Current agreement and insurance status for all workshops';

CREATE OR REPLACE VIEW expiring_insurance_alerts AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.email AS contact_email,
  wa.insurance_expiry_date,
  (wa.insurance_expiry_date - CURRENT_DATE) AS days_until_expiry,
  CASE
    WHEN wa.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
  END AS alert_level

FROM organizations o
INNER JOIN workshop_agreements wa ON wa.organization_id = o.id
  AND wa.agreement_type = 'independent_contractor'
  AND wa.status = 'active'
WHERE wa.insurance_verified = true
  AND wa.insurance_expiry_date IS NOT NULL
  AND wa.insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY wa.insurance_expiry_date ASC;

COMMENT ON VIEW expiring_insurance_alerts IS 'Workshops with expiring or expired insurance';

CREATE OR REPLACE VIEW pending_insurance_verifications AS
SELECT
  ivl.id AS verification_id,
  ivl.organization_id,
  o.name AS organization_name,
  ivl.verification_type,
  ivl.certificate_url,
  ivl.provider,
  ivl.coverage_amount,
  ivl.effective_date,
  ivl.expiry_date,
  ivl.uploaded_at,
  p.full_name AS uploaded_by_name,
  p.email AS uploaded_by_email,

  -- Days pending
  (CURRENT_DATE - ivl.uploaded_at::date) AS days_pending

FROM insurance_verification_log ivl
INNER JOIN organizations o ON o.id = ivl.organization_id
LEFT JOIN profiles p ON p.id = ivl.uploaded_by
WHERE ivl.verification_status = 'pending'
ORDER BY ivl.uploaded_at ASC;

COMMENT ON VIEW pending_insurance_verifications IS 'Admin queue for insurance certificate verification';

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workshop_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_verification_log ENABLE ROW LEVEL SECURITY;

-- Workshops can view their own agreements
CREATE POLICY "Workshops can view own agreements"
  ON workshop_agreements FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Workshops can create agreements (during onboarding)
CREATE POLICY "Workshops can create agreements"
  ON workshop_agreements FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can view all agreements
CREATE POLICY "Admins can view all agreements"
  ON workshop_agreements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Agreement sections follow same RLS as agreements
CREATE POLICY "Users can view sections of viewable agreements"
  ON agreement_sections FOR SELECT
  USING (
    agreement_id IN (
      SELECT id FROM workshop_agreements
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Insurance log - workshops can view own, admins can view all
CREATE POLICY "Workshops can view own insurance log"
  ON insurance_verification_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workshops can create insurance uploads"
  ON insurance_verification_log FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage insurance verifications"
  ON insurance_verification_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 7. TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_agreement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workshop_agreements_updated_at
  BEFORE UPDATE ON workshop_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_agreement_timestamp();

-- Trigger: Alert on Insurance Expiry
CREATE OR REPLACE FUNCTION check_insurance_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- If insurance is about to expire, log an alert
  IF NEW.insurance_expiry_date IS NOT NULL
     AND NEW.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN

    -- Insert alert into insurance verification log
    INSERT INTO insurance_verification_log (
      organization_id,
      agreement_id,
      verification_type,
      expiry_date,
      verification_status
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'expired_alert',
      NEW.insurance_expiry_date,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER insurance_expiry_alert
  AFTER INSERT OR UPDATE OF insurance_expiry_date ON workshop_agreements
  FOR EACH ROW
  WHEN (NEW.insurance_verified = true)
  EXECUTE FUNCTION check_insurance_expiry();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3: Workshop Agreement System - Migration Complete';
  RAISE NOTICE '📋 Created Tables:';
  RAISE NOTICE '   - workshop_agreements (digital agreement tracking)';
  RAISE NOTICE '   - agreement_sections (section-by-section acceptance)';
  RAISE NOTICE '   - insurance_verification_log (certificate audit trail)';
  RAISE NOTICE '📊 Created Views:';
  RAISE NOTICE '   - workshop_agreement_status (compliance dashboard)';
  RAISE NOTICE '   - expiring_insurance_alerts (renewal reminders)';
  RAISE NOTICE '   - pending_insurance_verifications (admin queue)';
  RAISE NOTICE '⚙️ Created Functions:';
  RAISE NOTICE '   - sign_workshop_agreement() (digital signature)';
  RAISE NOTICE '   - upload_insurance_certificate() (certificate upload)';
  RAISE NOTICE '   - verify_insurance_certificate() (admin verification)';
  RAISE NOTICE '   - check_workshop_agreement_compliance() (compliance check)';
  RAISE NOTICE '📄 Agreement Types:';
  RAISE NOTICE '   - Independent Contractor (with IC acknowledgment)';
  RAISE NOTICE '   - Privacy Acknowledgment (PIPEDA)';
  RAISE NOTICE '   - OCPA Compliance (Consumer Protection)';
  RAISE NOTICE '   - Terms of Service';
  RAISE NOTICE '💼 Insurance Requirements:';
  RAISE NOTICE '   - Minimum $2M liability coverage';
  RAISE NOTICE '   - Certificate upload and admin verification';
  RAISE NOTICE '   - 30-day expiry alerts';
  RAISE NOTICE '🔐 Row Level Security: ENABLED';
END $$;
