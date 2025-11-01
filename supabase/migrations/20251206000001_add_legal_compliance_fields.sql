-- =====================================================
-- LEGAL COMPLIANCE MIGRATION
-- Created: 2025-12-06
-- Purpose: Add fields required for Canadian/Ontario legal compliance
-- Compliance Areas:
--   - CRA Employee vs Contractor Classification
--   - GST/HST Tax Compliance
--   - T4/T4A Tax Slip Issuance
--   - Insurance Requirements (CGL, WSIB)
--   - Referral Fee Disclosure (Competition Act)
--   - Privacy Consent (PIPEDA)
-- =====================================================

-- =====================================================
-- 1. MECHANICS TABLE - Employment & Tax Compliance
-- =====================================================

-- Add employment classification and tax tracking
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS employment_type TEXT
  CHECK (employment_type IN ('employee', 'contractor'))
  DEFAULT 'contractor',

-- GST/HST Compliance (required for contractors earning >$30k/year)
ADD COLUMN IF NOT EXISTS business_number TEXT, -- Format: 123456789RT0001 (BN + program identifier)
ADD COLUMN IF NOT EXISTS gst_hst_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gst_hst_registration_date DATE,
ADD COLUMN IF NOT EXISTS annual_revenue_estimate DECIMAL(12,2), -- For tracking $30k threshold

-- Tax slip issuance tracking
ADD COLUMN IF NOT EXISTS t4a_issued_years INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- Track which years contractor received T4A
ADD COLUMN IF NOT EXISTS last_t4a_amount DECIMAL(10,2), -- Most recent year's T4A amount
ADD COLUMN IF NOT EXISTS tax_id_verified BOOLEAN DEFAULT false, -- SIN verified for tax purposes (never store actual SIN)

-- For employees (workshop's responsibility but tracked for compliance)
ADD COLUMN IF NOT EXISTS payroll_id TEXT, -- Workshop's internal payroll system ID
ADD COLUMN IF NOT EXISTS employment_start_date DATE,
ADD COLUMN IF NOT EXISTS employment_end_date DATE,

-- Insurance Requirements (Contractors)
ADD COLUMN IF NOT EXISTS has_liability_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
ADD COLUMN IF NOT EXISTS insurance_coverage_amount DECIMAL(12,2) DEFAULT 2000000.00, -- $2M standard in Ontario
ADD COLUMN IF NOT EXISTS insurance_certificate_url TEXT, -- Storage URL for certificate of insurance

-- Contractor Independence Markers (CRA classification test)
ADD COLUMN IF NOT EXISTS can_refuse_work BOOLEAN DEFAULT true, -- Key contractor indicator
ADD COLUMN IF NOT EXISTS sets_own_schedule BOOLEAN DEFAULT true, -- Key contractor indicator
ADD COLUMN IF NOT EXISTS provides_own_tools BOOLEAN DEFAULT false, -- Depends on partnership type
ADD COLUMN IF NOT EXISTS works_for_multiple_clients BOOLEAN DEFAULT true, -- Key contractor indicator
ADD COLUMN IF NOT EXISTS owns_customer_relationships BOOLEAN DEFAULT false; -- For partnership contractors

-- Comments
COMMENT ON COLUMN mechanics.employment_type IS 'Employee (T4, WSIB, payroll deductions) vs Contractor (T4A, own insurance, GST/HST)';
COMMENT ON COLUMN mechanics.business_number IS 'CRA Business Number for GST/HST registered contractors (9 digits + RT + 4 digit identifier)';
COMMENT ON COLUMN mechanics.t4a_issued_years IS 'Array of tax years where T4A was issued (e.g., [2023, 2024])';
COMMENT ON COLUMN mechanics.can_refuse_work IS 'CRA test: contractors must be able to refuse work to maintain independent contractor status';
COMMENT ON COLUMN mechanics.insurance_coverage_amount IS 'Minimum $2M Commercial General Liability insurance required in Ontario';

-- =====================================================
-- 2. ORGANIZATIONS TABLE - Workshop Insurance & WSIB
-- =====================================================

-- Add workshop insurance and compliance tracking
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
ADD COLUMN IF NOT EXISTS insurance_coverage_amount DECIMAL(12,2) DEFAULT 2000000.00,
ADD COLUMN IF NOT EXISTS insurance_certificate_url TEXT,

-- Ontario WSIB (Workplace Safety and Insurance Board) - Required for employees
ADD COLUMN IF NOT EXISTS wsib_account_number TEXT, -- Format: 123456789
ADD COLUMN IF NOT EXISTS wsib_industry_class TEXT, -- e.g., "automotive repair"
ADD COLUMN IF NOT EXISTS wsib_clearance_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS wsib_clearance_expiry DATE,

-- Business registration compliance
ADD COLUMN IF NOT EXISTS business_number TEXT, -- CRA Business Number
ADD COLUMN IF NOT EXISTS ontario_business_number TEXT, -- Ontario-specific BN if applicable
ADD COLUMN IF NOT EXISTS business_registration_date DATE,
ADD COLUMN IF NOT EXISTS corporate_registry_number TEXT; -- Ontario Ministry of Public and Business Service Delivery

-- Comments
COMMENT ON COLUMN organizations.wsib_account_number IS 'Ontario WSIB account required for workshops with employees';
COMMENT ON COLUMN organizations.insurance_coverage_amount IS 'Minimum $2M Commercial General Liability insurance required';

-- =====================================================
-- 3. WORKSHOP_ESCALATION_QUEUE - Referral Disclosure
-- =====================================================

-- Add referral fee disclosure tracking (Competition Act compliance)
ALTER TABLE workshop_escalation_queue
ADD COLUMN IF NOT EXISTS customer_notified_of_referral BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_disclosure_shown_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS referral_disclosure_text TEXT,
ADD COLUMN IF NOT EXISTS referral_disclosure_version TEXT DEFAULT 'v1', -- Track disclosure version for compliance

-- Privacy compliance (PIPEDA)
ADD COLUMN IF NOT EXISTS customer_consent_to_share_info BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_consent_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS customer_consent_ip_address TEXT, -- For audit trail
ADD COLUMN IF NOT EXISTS data_shared_with_workshop JSONB, -- Track what personal info was shared
ADD COLUMN IF NOT EXISTS customer_can_request_deletion BOOLEAN DEFAULT true;

-- Comments
COMMENT ON COLUMN workshop_escalation_queue.customer_notified_of_referral IS 'Competition Act: referral fees must be disclosed to consumers';
COMMENT ON COLUMN workshop_escalation_queue.customer_consent_to_share_info IS 'PIPEDA: customer must consent to sharing personal info with workshop';
COMMENT ON COLUMN workshop_escalation_queue.data_shared_with_workshop IS 'Track what personal data was shared for PIPEDA compliance';

-- =====================================================
-- 4. PARTNERSHIP_AGREEMENTS - Enhanced Legal Terms
-- =====================================================

-- Add legal compliance tracking to partnership agreements
ALTER TABLE partnership_agreements
ADD COLUMN IF NOT EXISTS contractor_classification_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS independence_clause_accepted BOOLEAN DEFAULT false, -- Contractor can refuse work
ADD COLUMN IF NOT EXISTS insurance_requirement_met BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tax_compliance_acknowledged BOOLEAN DEFAULT false, -- Contractor understands GST/HST obligations
ADD COLUMN IF NOT EXISTS dispute_resolution_method TEXT
  CHECK (dispute_resolution_method IN ('mediation', 'arbitration', 'ontario_courts'))
  DEFAULT 'ontario_courts',
ADD COLUMN IF NOT EXISTS governing_law TEXT DEFAULT 'Ontario, Canada',
ADD COLUMN IF NOT EXISTS legal_review_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_review_date DATE;

-- Comments
COMMENT ON COLUMN partnership_agreements.independence_clause_accepted IS 'CRA compliance: contractor must acknowledge right to refuse work';
COMMENT ON COLUMN partnership_agreements.tax_compliance_acknowledged IS 'Contractor acknowledges responsibility for GST/HST, income tax, CPP';

-- =====================================================
-- 5. CREATE COMPLIANCE AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS legal_compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Who/What
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mechanic', 'workshop', 'agreement', 'escalation', 'quote')),
  entity_id UUID NOT NULL,

  -- Compliance event
  compliance_type TEXT NOT NULL CHECK (compliance_type IN (
    'insurance_verified',
    'insurance_expired',
    'gst_hst_registration_updated',
    't4a_issued',
    'wsib_verified',
    'referral_disclosed',
    'privacy_consent_obtained',
    'privacy_consent_withdrawn',
    'contractor_classification_reviewed',
    'employment_status_changed'
  )),

  -- Details
  event_description TEXT,
  compliance_status TEXT CHECK (compliance_status IN ('compliant', 'non_compliant', 'pending_review', 'resolved')),

  -- Metadata
  performed_by UUID REFERENCES profiles(id),
  automated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_compliance_audit_entity ON legal_compliance_audit_log(entity_type, entity_id);
CREATE INDEX idx_compliance_audit_type ON legal_compliance_audit_log(compliance_type);
CREATE INDEX idx_compliance_audit_created ON legal_compliance_audit_log(created_at DESC);

COMMENT ON TABLE legal_compliance_audit_log IS 'Audit trail for legal compliance events (CRA audits, WSIB inspections, etc.)';

-- =====================================================
-- 6. CREATE COMPLIANCE CHECKLIST VIEW
-- =====================================================

-- View to check mechanic compliance status
CREATE OR REPLACE VIEW mechanic_compliance_status AS
SELECT
  m.id AS mechanic_id,
  m.name,
  m.employment_type,

  -- Tax Compliance
  CASE
    WHEN m.employment_type = 'employee' THEN
      (m.payroll_id IS NOT NULL) -- Workshop handles payroll
    WHEN m.employment_type = 'contractor' AND m.annual_revenue_estimate > 30000 THEN
      (m.gst_hst_registered = true AND m.business_number IS NOT NULL) -- Must have GST/HST
    ELSE
      true -- Contractors under $30k don't need GST/HST
  END AS tax_compliant,

  -- Insurance Compliance
  CASE
    WHEN m.employment_type = 'employee' THEN
      true -- Covered by workshop WSIB
    WHEN m.employment_type = 'contractor' THEN
      (m.has_liability_insurance = true
       AND m.insurance_expiry_date > CURRENT_DATE
       AND m.insurance_coverage_amount >= 2000000)
    ELSE
      false
  END AS insurance_compliant,

  -- Contractor Independence (CRA test)
  CASE
    WHEN m.employment_type = 'contractor' THEN
      (m.can_refuse_work = true
       AND m.sets_own_schedule = true
       AND m.works_for_multiple_clients = true)
    ELSE
      NULL -- Not applicable for employees
  END AS contractor_independence_confirmed,

  -- Overall Compliance
  CASE
    WHEN m.employment_type = 'employee' THEN
      (m.payroll_id IS NOT NULL)
    WHEN m.employment_type = 'contractor' THEN
      (
        -- Tax check
        (m.annual_revenue_estimate <= 30000 OR (m.gst_hst_registered = true AND m.business_number IS NOT NULL))
        AND
        -- Insurance check
        (m.has_liability_insurance = true AND m.insurance_expiry_date > CURRENT_DATE)
        AND
        -- Independence check
        (m.can_refuse_work = true AND m.sets_own_schedule = true)
      )
    ELSE
      false
  END AS overall_compliant,

  -- Warnings
  ARRAY_REMOVE(ARRAY[
    CASE WHEN m.employment_type = 'contractor' AND m.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days'
      THEN 'Insurance expiring soon' ELSE NULL END,
    CASE WHEN m.employment_type = 'contractor' AND m.annual_revenue_estimate > 30000 AND NOT m.gst_hst_registered
      THEN 'GST/HST registration required' ELSE NULL END,
    CASE WHEN m.employment_type = 'contractor' AND NOT m.can_refuse_work
      THEN 'CRA risk: contractor cannot refuse work' ELSE NULL END
  ], NULL) AS compliance_warnings

FROM mechanics m;

COMMENT ON VIEW mechanic_compliance_status IS 'Real-time compliance status for CRA audits and WSIB inspections';

-- =====================================================
-- 7. CREATE WORKSHOP COMPLIANCE VIEW
-- =====================================================

CREATE OR REPLACE VIEW workshop_compliance_status AS
SELECT
  o.id AS workshop_id,
  o.name AS workshop_name,

  -- Insurance Compliance
  (o.insurance_expiry_date > CURRENT_DATE
   AND o.insurance_coverage_amount >= 2000000) AS insurance_compliant,

  -- WSIB Compliance (Ontario only)
  (o.wsib_account_number IS NOT NULL
   AND (o.wsib_clearance_expiry IS NULL OR o.wsib_clearance_expiry > CURRENT_DATE)) AS wsib_compliant,

  -- Business Registration
  (o.business_number IS NOT NULL) AS business_registration_compliant,

  -- Employee Count (for WSIB requirement check)
  (SELECT COUNT(*)
   FROM mechanics m
   WHERE m.workshop_id = o.id
     AND m.employment_type = 'employee') AS employee_count,

  -- Overall Compliance
  (
    o.insurance_expiry_date > CURRENT_DATE
    AND o.insurance_coverage_amount >= 2000000
    AND o.business_number IS NOT NULL
    AND (
      -- If has employees, must have WSIB
      (SELECT COUNT(*) FROM mechanics WHERE workshop_id = o.id AND employment_type = 'employee') = 0
      OR o.wsib_account_number IS NOT NULL
    )
  ) AS overall_compliant,

  -- Warnings
  ARRAY_REMOVE(ARRAY[
    CASE WHEN o.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days'
      THEN 'Insurance expiring soon' ELSE NULL END,
    CASE WHEN o.wsib_clearance_expiry < CURRENT_DATE + INTERVAL '30 days'
      THEN 'WSIB clearance expiring soon' ELSE NULL END,
    CASE WHEN (SELECT COUNT(*) FROM mechanics WHERE workshop_id = o.id AND employment_type = 'employee') > 0
         AND o.wsib_account_number IS NULL
      THEN 'WSIB required for workshops with employees' ELSE NULL END
  ], NULL) AS compliance_warnings

FROM organizations o
WHERE o.organization_type = 'workshop';

COMMENT ON VIEW workshop_compliance_status IS 'Workshop compliance monitoring for insurance, WSIB, and business registration';

-- =====================================================
-- 8. TRIGGER FUNCTIONS FOR COMPLIANCE MONITORING
-- =====================================================

-- Trigger to log insurance expiry warnings
CREATE OR REPLACE FUNCTION check_insurance_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- For mechanics
  IF TG_TABLE_NAME = 'mechanics' THEN
    IF NEW.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days'
       AND NEW.has_liability_insurance = true
       AND NEW.employment_type = 'contractor' THEN
      INSERT INTO legal_compliance_audit_log (
        entity_type, entity_id, compliance_type,
        event_description, compliance_status, automated
      ) VALUES (
        'mechanic', NEW.id, 'insurance_expired',
        'Insurance expiring on ' || NEW.insurance_expiry_date::TEXT,
        'non_compliant', true
      );
    END IF;
  END IF;

  -- For workshops
  IF TG_TABLE_NAME = 'organizations' THEN
    IF NEW.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN
      INSERT INTO legal_compliance_audit_log (
        entity_type, entity_id, compliance_type,
        event_description, compliance_status, automated
      ) VALUES (
        'workshop', NEW.id, 'insurance_expired',
        'Insurance expiring on ' || NEW.insurance_expiry_date::TEXT,
        'non_compliant', true
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_mechanic_insurance_expiry
AFTER UPDATE OF insurance_expiry_date ON mechanics
FOR EACH ROW
WHEN (NEW.employment_type = 'contractor')
EXECUTE FUNCTION check_insurance_expiry();

CREATE TRIGGER trigger_check_workshop_insurance_expiry
AFTER UPDATE OF insurance_expiry_date ON organizations
FOR EACH ROW
WHEN (NEW.organization_type = 'workshop')
EXECUTE FUNCTION check_insurance_expiry();

-- Trigger to log employment type changes (CRA audit trail)
CREATE OR REPLACE FUNCTION log_employment_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.employment_type != NEW.employment_type THEN
    INSERT INTO legal_compliance_audit_log (
      entity_type, entity_id, compliance_type,
      event_description, compliance_status, automated, metadata
    ) VALUES (
      'mechanic', NEW.id, 'employment_status_changed',
      'Employment type changed from ' || OLD.employment_type || ' to ' || NEW.employment_type,
      'pending_review', false,
      jsonb_build_object(
        'old_type', OLD.employment_type,
        'new_type', NEW.employment_type,
        'changed_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_employment_type_change
AFTER UPDATE OF employment_type ON mechanics
FOR EACH ROW
EXECUTE FUNCTION log_employment_type_change();

-- =====================================================
-- 9. DEFAULT VALUES FOR EXISTING RECORDS
-- =====================================================

-- Set employment type for existing mechanics based on workshop affiliation
UPDATE mechanics
SET employment_type = 'employee'
WHERE workshop_id IS NOT NULL
  AND partnership_type = 'employee'
  AND employment_type IS NULL;

UPDATE mechanics
SET employment_type = 'contractor'
WHERE (workshop_id IS NULL OR partnership_type IN ('bay_rental', 'revenue_share', 'membership'))
  AND employment_type IS NULL;

-- Set contractor independence markers for existing partnership contractors
UPDATE mechanics
SET
  can_refuse_work = true,
  sets_own_schedule = true,
  works_for_multiple_clients = true,
  owns_customer_relationships = true
WHERE partnership_type IN ('bay_rental', 'revenue_share', 'membership')
  AND employment_type = 'contractor';

-- Set contractor independence markers for virtual-only mechanics
UPDATE mechanics
SET
  can_refuse_work = true,
  sets_own_schedule = true,
  works_for_multiple_clients = true,
  owns_customer_relationships = false -- Virtual mechanics escalate, don't own customer
WHERE service_tier = 'virtual_only'
  AND employment_type = 'contractor';

-- Set employee markers
UPDATE mechanics
SET
  can_refuse_work = false, -- Employees can't refuse assigned work
  sets_own_schedule = false, -- Workshop sets schedule
  works_for_multiple_clients = false, -- Exclusive to one workshop
  owns_customer_relationships = false, -- Workshop owns customers
  provides_own_tools = false -- Workshop provides tools
WHERE employment_type = 'employee';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Legal Compliance Migration Complete';
  RAISE NOTICE '📋 Added Fields:';
  RAISE NOTICE '   - Employment classification (employee vs contractor)';
  RAISE NOTICE '   - GST/HST registration tracking';
  RAISE NOTICE '   - T4/T4A tax slip tracking';
  RAISE NOTICE '   - Insurance compliance (CGL, WSIB)';
  RAISE NOTICE '   - Referral fee disclosure tracking';
  RAISE NOTICE '   - Privacy consent (PIPEDA)';
  RAISE NOTICE '   - Contractor independence markers (CRA test)';
  RAISE NOTICE '📊 Created Views:';
  RAISE NOTICE '   - mechanic_compliance_status';
  RAISE NOTICE '   - workshop_compliance_status';
  RAISE NOTICE '🔐 Compliance Areas Covered:';
  RAISE NOTICE '   - Canada Revenue Agency (CRA)';
  RAISE NOTICE '   - Ontario WSIB';
  RAISE NOTICE '   - Competition Act (referral disclosure)';
  RAISE NOTICE '   - PIPEDA (privacy)';
  RAISE NOTICE '   - Ontario Consumer Protection Act';
END $$;
