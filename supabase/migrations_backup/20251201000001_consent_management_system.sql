-- ============================================
-- PHASE 3: Consent Management System
-- Created: 2025-12-01
-- Description: PIPEDA and CASL compliant consent tracking
-- ============================================

-- ============================================
-- 1. CUSTOMER CONSENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS customer_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Consent Type
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'terms_of_service',
    'privacy_policy',
    'marketplace_understanding',
    'marketing_emails',
    'analytics_cookies',
    'product_improvement',
    'data_sharing_workshops'
  )),

  -- Consent Details
  consent_granted BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL, -- Track which version was accepted
  consent_text TEXT, -- Store the actual text shown to customer

  -- Audit Trail (PIPEDA requirement)
  granted_at TIMESTAMP WITH TIME ZONE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,

  -- Method of consent
  consent_method TEXT CHECK (consent_method IN (
    'signup',
    'settings_page',
    'quote_acceptance',
    'session_booking',
    'escalation'
  )),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_consents_customer ON customer_consents(customer_id);
CREATE INDEX idx_customer_consents_type ON customer_consents(consent_type);
CREATE INDEX idx_customer_consents_granted ON customer_consents(consent_granted);
CREATE INDEX idx_customer_consents_created ON customer_consents(created_at DESC);

-- Unique constraint: one active consent per customer per type
CREATE UNIQUE INDEX idx_customer_consents_unique_active
  ON customer_consents(customer_id, consent_type)
  WHERE withdrawn_at IS NULL;

COMMENT ON TABLE customer_consents IS 'PIPEDA/CASL: Track all customer consent decisions with audit trail';
COMMENT ON COLUMN customer_consents.consent_version IS 'Version of terms/policy accepted (e.g., "2025-01-15")';
COMMENT ON COLUMN customer_consents.ip_address IS 'IP address for audit trail (PIPEDA requirement)';

-- ============================================
-- 2. MARKETING CONSENT LOG (CASL)
-- ============================================

CREATE TABLE IF NOT EXISTS marketing_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- CASL Requirements
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'email_marketing',
    'sms_marketing',
    'phone_marketing',
    'promotional_offers',
    'newsletter'
  )),

  -- Consent Status
  opt_in BOOLEAN NOT NULL,
  opt_in_date TIMESTAMP WITH TIME ZONE,
  opt_out_date TIMESTAMP WITH TIME ZONE,

  -- CASL Audit Trail
  ip_address INET NOT NULL,
  user_agent TEXT,
  consent_language TEXT DEFAULT 'en', -- Language consent was given in

  -- Method
  method TEXT CHECK (method IN (
    'signup_checkbox',
    'settings_update',
    'email_preference_center',
    'unsubscribe_link'
  )),

  -- Evidence
  evidence_url TEXT, -- Link to screenshot/record of consent form
  consent_text TEXT, -- Exact wording shown to customer

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_consent_customer ON marketing_consent_log(customer_id);
CREATE INDEX idx_marketing_consent_type ON marketing_consent_log(consent_type);
CREATE INDEX idx_marketing_consent_status ON marketing_consent_log(opt_in);
CREATE INDEX idx_marketing_consent_date ON marketing_consent_log(created_at DESC);

COMMENT ON TABLE marketing_consent_log IS 'CASL: Track marketing consent with audit trail for compliance';
COMMENT ON COLUMN marketing_consent_log.evidence_url IS 'CASL: Link to evidence of consent';
COMMENT ON COLUMN marketing_consent_log.consent_text IS 'CASL: Exact wording shown when consent was obtained';

-- ============================================
-- 3. DATA SHARING CONSENT (PIPEDA)
-- ============================================

CREATE TABLE IF NOT EXISTS data_sharing_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Sharing Details
  shared_with_type TEXT NOT NULL CHECK (shared_with_type IN (
    'workshop',
    'independent_mechanic',
    'payment_processor',
    'third_party_service'
  )),
  shared_with_id UUID, -- ID of workshop/mechanic
  shared_with_name TEXT, -- Name for audit trail

  -- Consent
  consent_granted BOOLEAN NOT NULL DEFAULT false,
  consent_granted_at TIMESTAMP WITH TIME ZONE,
  consent_withdrawn_at TIMESTAMP WITH TIME ZONE,

  -- Data Shared (PIPEDA transparency requirement)
  data_types_shared TEXT[] NOT NULL, -- ['name', 'email', 'phone', 'vehicle_info']
  purpose TEXT NOT NULL, -- Why data was shared

  -- Session/Quote Context
  session_id UUID REFERENCES diagnostic_sessions(id),
  quote_id UUID REFERENCES repair_quotes(id),

  -- Audit Trail
  ip_address INET,
  user_agent TEXT,
  disclosure_text TEXT, -- What we told the customer

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_sharing_customer ON data_sharing_consent_log(customer_id);
CREATE INDEX idx_data_sharing_workshop ON data_sharing_consent_log(shared_with_id);
CREATE INDEX idx_data_sharing_session ON data_sharing_consent_log(session_id);
CREATE INDEX idx_data_sharing_granted ON data_sharing_consent_log(consent_granted);

COMMENT ON TABLE data_sharing_consent_log IS 'PIPEDA: Track consent for sharing customer data with third parties';
COMMENT ON COLUMN data_sharing_consent_log.data_types_shared IS 'PIPEDA: List of data types shared for transparency';
COMMENT ON COLUMN data_sharing_consent_log.purpose IS 'PIPEDA: Purpose for sharing data';

-- ============================================
-- 4. CONSENT WITHDRAWAL LOG
-- ============================================

CREATE TABLE IF NOT EXISTS consent_withdrawal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Withdrawal Details
  consent_type TEXT NOT NULL,
  original_consent_id UUID, -- Reference to original consent

  -- Withdrawal Metadata
  withdrawal_reason TEXT,
  withdrawal_method TEXT CHECK (withdrawal_method IN (
    'settings_page',
    'email_unsubscribe',
    'support_request',
    'account_deletion'
  )),

  -- Audit Trail
  withdrawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consent_withdrawal_customer ON consent_withdrawal_log(customer_id);
CREATE INDEX idx_consent_withdrawal_type ON consent_withdrawal_log(consent_type);
CREATE INDEX idx_consent_withdrawal_processed ON consent_withdrawal_log(processed);

COMMENT ON TABLE consent_withdrawal_log IS 'Track consent withdrawals for PIPEDA compliance';

-- ============================================
-- 5. CONSENT MANAGEMENT FUNCTIONS
-- ============================================

-- Function: Grant Consent
CREATE OR REPLACE FUNCTION grant_customer_consent(
  p_customer_id UUID,
  p_consent_type TEXT,
  p_consent_version TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_consent_method TEXT,
  p_consent_text TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_consent_id UUID;
BEGIN
  -- Withdraw any existing active consent of same type
  UPDATE customer_consents
  SET withdrawn_at = NOW(),
      updated_at = NOW()
  WHERE customer_id = p_customer_id
    AND consent_type = p_consent_type
    AND withdrawn_at IS NULL;

  -- Insert new consent
  INSERT INTO customer_consents (
    customer_id,
    consent_type,
    consent_granted,
    consent_version,
    consent_text,
    granted_at,
    ip_address,
    user_agent,
    consent_method
  ) VALUES (
    p_customer_id,
    p_consent_type,
    true,
    p_consent_version,
    p_consent_text,
    NOW(),
    p_ip_address,
    p_user_agent,
    p_consent_method
  )
  RETURNING id INTO v_consent_id;

  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION grant_customer_consent IS 'Record customer consent with full audit trail';

-- Function: Withdraw Consent
CREATE OR REPLACE FUNCTION withdraw_customer_consent(
  p_customer_id UUID,
  p_consent_type TEXT,
  p_ip_address INET,
  p_withdrawal_reason TEXT DEFAULT NULL,
  p_withdrawal_method TEXT DEFAULT 'settings_page'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_consent_id UUID;
BEGIN
  -- Find active consent
  SELECT id INTO v_consent_id
  FROM customer_consents
  WHERE customer_id = p_customer_id
    AND consent_type = p_consent_type
    AND withdrawn_at IS NULL
  LIMIT 1;

  IF v_consent_id IS NULL THEN
    RETURN false; -- No active consent to withdraw
  END IF;

  -- Mark consent as withdrawn
  UPDATE customer_consents
  SET withdrawn_at = NOW(),
      updated_at = NOW()
  WHERE id = v_consent_id;

  -- Log withdrawal
  INSERT INTO consent_withdrawal_log (
    customer_id,
    consent_type,
    original_consent_id,
    withdrawal_reason,
    withdrawal_method,
    ip_address
  ) VALUES (
    p_customer_id,
    p_consent_type,
    v_consent_id,
    p_withdrawal_reason,
    p_withdrawal_method,
    p_ip_address
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION withdraw_customer_consent IS 'Allow customers to withdraw consent (PIPEDA right)';

-- Function: Check Consent Status
CREATE OR REPLACE FUNCTION check_customer_consent(
  p_customer_id UUID,
  p_consent_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_consent BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM customer_consents
    WHERE customer_id = p_customer_id
      AND consent_type = p_consent_type
      AND consent_granted = true
      AND withdrawn_at IS NULL
  ) INTO v_has_consent;

  RETURN COALESCE(v_has_consent, false);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_customer_consent IS 'Check if customer has active consent for specific type';

-- ============================================
-- 6. CONSENT SUMMARY VIEW
-- ============================================

CREATE OR REPLACE VIEW customer_consent_summary AS
SELECT
  p.id AS customer_id,
  p.email,
  p.full_name,

  -- Required Consents
  check_customer_consent(p.id, 'terms_of_service') AS has_terms_consent,
  check_customer_consent(p.id, 'privacy_policy') AS has_privacy_consent,
  check_customer_consent(p.id, 'marketplace_understanding') AS has_marketplace_consent,

  -- Optional Consents
  check_customer_consent(p.id, 'marketing_emails') AS has_marketing_consent,
  check_customer_consent(p.id, 'analytics_cookies') AS has_analytics_consent,

  -- Overall Status
  CASE
    WHEN check_customer_consent(p.id, 'terms_of_service') = true
         AND check_customer_consent(p.id, 'privacy_policy') = true
         AND check_customer_consent(p.id, 'marketplace_understanding') = true
      THEN true
    ELSE false
  END AS has_all_required_consents,

  -- Consent Counts
  (SELECT COUNT(*) FROM customer_consents WHERE customer_id = p.id AND consent_granted = true AND withdrawn_at IS NULL) AS total_active_consents,
  (SELECT COUNT(*) FROM consent_withdrawal_log WHERE customer_id = p.id) AS total_withdrawals,

  -- Latest Consent
  (SELECT MAX(granted_at) FROM customer_consents WHERE customer_id = p.id AND consent_granted = true) AS latest_consent_date

FROM profiles p
WHERE p.role = 'customer';

COMMENT ON VIEW customer_consent_summary IS 'Quick overview of customer consent status';

-- ============================================
-- 7. MARKETING CONSENT VIEW (CASL)
-- ============================================

CREATE OR REPLACE VIEW active_marketing_consents AS
SELECT DISTINCT ON (customer_id, consent_type)
  customer_id,
  consent_type,
  opt_in,
  opt_in_date,
  opt_out_date,
  ip_address,
  created_at
FROM marketing_consent_log
WHERE opt_in = true
  AND opt_out_date IS NULL
ORDER BY customer_id, consent_type, created_at DESC;

COMMENT ON VIEW active_marketing_consents IS 'CASL: Active marketing consents for email campaigns';

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE customer_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sharing_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_withdrawal_log ENABLE ROW LEVEL SECURITY;

-- Customers can view/manage their own consents
CREATE POLICY "Customers can view own consents"
  ON customer_consents FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert own consents"
  ON customer_consents FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Admins can view all consents
CREATE POLICY "Admins can view all consents"
  ON customer_consents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Similar policies for other tables
CREATE POLICY "Customers can view own marketing consent"
  ON marketing_consent_log FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can view own data sharing consent"
  ON data_sharing_consent_log FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can view own withdrawal log"
  ON consent_withdrawal_log FOR SELECT
  USING (customer_id = auth.uid());

-- ============================================
-- 9. AUTOMATED TRIGGERS
-- ============================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_consents_updated_at
  BEFORE UPDATE ON customer_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_consents_updated_at();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3: Consent Management System - Migration Complete';
  RAISE NOTICE '📋 Created Tables:';
  RAISE NOTICE '   - customer_consents (PIPEDA consent tracking)';
  RAISE NOTICE '   - marketing_consent_log (CASL marketing consent)';
  RAISE NOTICE '   - data_sharing_consent_log (PIPEDA data sharing)';
  RAISE NOTICE '   - consent_withdrawal_log (consent withdrawal tracking)';
  RAISE NOTICE '📊 Created Views:';
  RAISE NOTICE '   - customer_consent_summary';
  RAISE NOTICE '   - active_marketing_consents';
  RAISE NOTICE '⚙️ Created Functions:';
  RAISE NOTICE '   - grant_customer_consent()';
  RAISE NOTICE '   - withdraw_customer_consent()';
  RAISE NOTICE '   - check_customer_consent()';
  RAISE NOTICE '🔐 Row Level Security: ENABLED';
END $$;
