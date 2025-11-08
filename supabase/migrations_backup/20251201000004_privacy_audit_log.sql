-- ============================================
-- PHASE 3: Privacy Audit Log System
-- Created: 2025-12-01
-- Description: PIPEDA compliance - comprehensive audit trail of all privacy events
-- ============================================

-- ============================================
-- 1. PRIVACY AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  customer_id UUID, -- Don't enforce FK (may be deleted/anonymized)
  performed_by UUID REFERENCES profiles(id), -- Who performed the action (customer, admin, system)
  performed_by_type TEXT NOT NULL CHECK (performed_by_type IN (
    'customer',
    'admin',
    'system',
    'mechanic',
    'workshop'
  )),

  -- What
  event_type TEXT NOT NULL CHECK (event_type IN (
    -- Consent Events
    'consent_granted',
    'consent_withdrawn',
    'consent_updated',

    -- Data Access Events (PIPEDA Right to Access)
    'data_access_requested',
    'data_download_generated',
    'data_correction_requested',
    'data_correction_completed',

    -- Account Events (PIPEDA Right to Erasure)
    'account_deletion_requested',
    'account_deleted',
    'account_anonymized',
    'data_anonymized',

    -- Marketing Events (CASL)
    'marketing_email_sent',
    'marketing_email_opened',
    'marketing_email_clicked',
    'marketing_unsubscribed',

    -- Data Sharing Events
    'data_shared_with_workshop',
    'data_shared_with_mechanic',
    'data_exported',

    -- Privacy Policy Events
    'privacy_policy_viewed',
    'privacy_policy_updated',
    'privacy_policy_accepted',

    -- Security Events
    'data_breach_detected',
    'unauthorized_access_attempt',
    'password_reset_requested',
    'mfa_enabled',
    'mfa_disabled',

    -- Admin Events
    'admin_viewed_customer_data',
    'admin_modified_customer_data',
    'admin_exported_customer_data'
  )),

  -- When
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Where
  ip_address INET,
  user_agent TEXT,
  location_country TEXT,
  location_region TEXT,

  -- Details
  event_details JSONB DEFAULT '{}'::jsonb, -- Flexible storage for event-specific data

  -- Context
  session_id UUID, -- If event occurred during a session
  organization_id UUID, -- If event involves a workshop/organization

  -- Legal Basis (PIPEDA)
  legal_basis TEXT CHECK (legal_basis IN (
    'consent',
    'contract',
    'legal_obligation',
    'vital_interests',
    'public_task',
    'legitimate_interests'
  )),

  -- Data Categories Affected
  data_categories TEXT[], -- e.g., ['profile', 'vehicles', 'payment_info']

  -- Retention
  retention_period_days INTEGER, -- How long to retain this log entry

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_privacy_audit_customer ON privacy_audit_log(customer_id);
CREATE INDEX idx_privacy_audit_performed_by ON privacy_audit_log(performed_by);
CREATE INDEX idx_privacy_audit_event_type ON privacy_audit_log(event_type);
CREATE INDEX idx_privacy_audit_timestamp ON privacy_audit_log(event_timestamp DESC);
CREATE INDEX idx_privacy_audit_session ON privacy_audit_log(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_privacy_audit_organization ON privacy_audit_log(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_privacy_audit_ip ON privacy_audit_log(ip_address);

COMMENT ON TABLE privacy_audit_log IS 'PIPEDA: Comprehensive audit trail of all privacy-related events';
COMMENT ON COLUMN privacy_audit_log.event_details IS 'JSON object with event-specific metadata';
COMMENT ON COLUMN privacy_audit_log.legal_basis IS 'PIPEDA legal basis for processing';

-- ============================================
-- 2. DATA BREACH LOG
-- ============================================

CREATE TABLE IF NOT EXISTS data_breach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Breach Details
  breach_type TEXT NOT NULL CHECK (breach_type IN (
    'unauthorized_access',
    'data_leak',
    'ransomware',
    'phishing',
    'insider_threat',
    'lost_device',
    'misconfiguration',
    'third_party_breach'
  )),

  severity TEXT NOT NULL CHECK (severity IN (
    'low',      -- < 10 customers, non-sensitive data
    'medium',   -- 10-100 customers, some sensitive data
    'high',     -- 100+ customers, sensitive data
    'critical'  -- Mass breach, highly sensitive data
  )),

  -- Discovery
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  discovered_by UUID REFERENCES profiles(id),
  discovery_method TEXT,

  -- Impact
  customers_affected INTEGER DEFAULT 0,
  data_categories_affected TEXT[], -- e.g., ['email', 'payment_info', 'health_data']
  estimated_records_affected INTEGER,

  -- Response
  response_status TEXT NOT NULL DEFAULT 'investigating' CHECK (response_status IN (
    'investigating',
    'contained',
    'remediated',
    'closed'
  )),

  contained_at TIMESTAMP WITH TIME ZONE,
  remediated_at TIMESTAMP WITH TIME ZONE,

  -- Notifications
  privacy_commissioner_notified BOOLEAN DEFAULT false,
  privacy_commissioner_notified_at TIMESTAMP WITH TIME ZONE,

  customers_notified BOOLEAN DEFAULT false,
  customers_notified_at TIMESTAMP WITH TIME ZONE,
  notification_method TEXT, -- e.g., 'email', 'phone', 'mail'

  -- Root Cause Analysis
  root_cause TEXT,
  contributing_factors TEXT[],

  -- Remediation Actions
  actions_taken TEXT[],
  preventive_measures TEXT[],

  -- Documentation
  incident_report_url TEXT,
  external_report_url TEXT, -- If reported to authorities

  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_breach_severity ON data_breach_log(severity);
CREATE INDEX idx_data_breach_status ON data_breach_log(response_status);
CREATE INDEX idx_data_breach_discovered ON data_breach_log(discovered_at DESC);
CREATE INDEX idx_data_breach_assigned ON data_breach_log(assigned_to) WHERE assigned_to IS NOT NULL;

COMMENT ON TABLE data_breach_log IS 'PIPEDA: Track data breaches and response actions';

-- ============================================
-- 3. PRIVACY CONSENT AUDIT VIEW
-- ============================================

CREATE OR REPLACE VIEW privacy_consent_audit AS
SELECT
  pal.id AS audit_id,
  pal.customer_id,
  p.email,
  p.full_name,
  pal.event_type,
  pal.event_timestamp,
  pal.ip_address,
  pal.event_details->>'consent_type' AS consent_type,
  pal.event_details->>'consent_version' AS consent_version,
  pal.event_details->>'consent_method' AS consent_method,
  pal.legal_basis

FROM privacy_audit_log pal
LEFT JOIN profiles p ON p.id = pal.customer_id
WHERE pal.event_type IN ('consent_granted', 'consent_withdrawn', 'consent_updated')
ORDER BY pal.event_timestamp DESC;

COMMENT ON VIEW privacy_consent_audit IS 'Audit trail of consent-related events';

-- ============================================
-- 4. DATA ACCESS REQUEST AUDIT VIEW
-- ============================================

CREATE OR REPLACE VIEW data_access_request_audit AS
SELECT
  pal.id AS audit_id,
  pal.customer_id,
  p.email,
  p.full_name,
  pal.event_type,
  pal.event_timestamp,
  pal.ip_address,
  pal.event_details->>'request_type' AS request_type,
  pal.event_details->>'data_format' AS data_format,
  pal.event_details->>'download_url' AS download_url,

  -- Calculate days since request (PIPEDA 30-day requirement)
  CASE
    WHEN pal.event_type = 'data_access_requested'
    THEN (CURRENT_DATE - pal.event_timestamp::date)
    ELSE NULL
  END AS days_since_request,

  -- PIPEDA compliance flag
  CASE
    WHEN pal.event_type = 'data_access_requested'
         AND (CURRENT_DATE - pal.event_timestamp::date) > 30
    THEN true
    ELSE false
  END AS pipeda_30_day_breach

FROM privacy_audit_log pal
LEFT JOIN profiles p ON p.id = pal.customer_id
WHERE pal.event_type IN (
  'data_access_requested',
  'data_download_generated',
  'data_correction_requested',
  'data_correction_completed'
)
ORDER BY pal.event_timestamp DESC;

COMMENT ON VIEW data_access_request_audit IS 'Track data access requests with PIPEDA 30-day compliance';

-- ============================================
-- 5. MARKETING EMAIL AUDIT VIEW (CASL)
-- ============================================

CREATE OR REPLACE VIEW marketing_email_audit AS
SELECT
  pal.id AS audit_id,
  pal.customer_id,
  p.email,
  p.full_name,
  pal.event_type,
  pal.event_timestamp,
  pal.event_details->>'email_type' AS email_type,
  pal.event_details->>'email_subject' AS email_subject,
  pal.event_details->>'campaign_id' AS campaign_id,

  -- CASL compliance check
  (SELECT check_customer_consent(pal.customer_id, 'marketing_emails')) AS has_marketing_consent,

  -- Engagement
  CASE
    WHEN pal.event_type = 'marketing_email_opened' THEN true
    ELSE false
  END AS opened,

  CASE
    WHEN pal.event_type = 'marketing_email_clicked' THEN true
    ELSE false
  END AS clicked

FROM privacy_audit_log pal
LEFT JOIN profiles p ON p.id = pal.customer_id
WHERE pal.event_type IN (
  'marketing_email_sent',
  'marketing_email_opened',
  'marketing_email_clicked',
  'marketing_unsubscribed'
)
ORDER BY pal.event_timestamp DESC;

COMMENT ON VIEW marketing_email_audit IS 'CASL: Track marketing email compliance';

-- ============================================
-- 6. ADMIN DATA ACCESS AUDIT VIEW
-- ============================================

CREATE OR REPLACE VIEW admin_data_access_audit AS
SELECT
  pal.id AS audit_id,
  pal.customer_id,
  c.email AS customer_email,
  c.full_name AS customer_name,
  pal.performed_by AS admin_id,
  a.email AS admin_email,
  a.full_name AS admin_name,
  pal.event_type,
  pal.event_timestamp,
  pal.ip_address,
  pal.event_details->>'reason' AS access_reason,
  pal.event_details->>'data_viewed' AS data_viewed,
  pal.event_details->>'changes_made' AS changes_made,
  pal.data_categories

FROM privacy_audit_log pal
LEFT JOIN profiles c ON c.id = pal.customer_id
LEFT JOIN profiles a ON a.id = pal.performed_by
WHERE pal.event_type IN (
  'admin_viewed_customer_data',
  'admin_modified_customer_data',
  'admin_exported_customer_data'
)
ORDER BY pal.event_timestamp DESC;

COMMENT ON VIEW admin_data_access_audit IS 'Track admin access to customer data';

-- ============================================
-- 7. DATA BREACH DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW data_breach_dashboard AS
SELECT
  dbl.id AS breach_id,
  dbl.breach_type,
  dbl.severity,
  dbl.discovered_at,
  dbl.response_status,
  dbl.customers_affected,
  dbl.data_categories_affected,

  -- Notification status
  dbl.privacy_commissioner_notified,
  dbl.customers_notified,

  -- Response times
  (dbl.contained_at - dbl.discovered_at) AS time_to_containment,
  (dbl.remediated_at - dbl.discovered_at) AS time_to_remediation,

  -- Assignment
  p.full_name AS assigned_to_name,
  p.email AS assigned_to_email,
  dbl.priority,

  -- Age
  (NOW() - dbl.discovered_at) AS breach_age,

  -- Critical flags
  CASE
    WHEN dbl.severity = 'critical' AND dbl.response_status != 'closed' THEN true
    ELSE false
  END AS requires_immediate_attention

FROM data_breach_log dbl
LEFT JOIN profiles p ON p.id = dbl.assigned_to
WHERE dbl.response_status != 'closed'
ORDER BY
  CASE dbl.severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  dbl.discovered_at DESC;

COMMENT ON VIEW data_breach_dashboard IS 'Active data breach tracking and response';

-- ============================================
-- 8. AUDIT LOG FUNCTIONS
-- ============================================

-- Function: Log Privacy Event
CREATE OR REPLACE FUNCTION log_privacy_event(
  p_customer_id UUID,
  p_event_type TEXT,
  p_performed_by UUID,
  p_performed_by_type TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_event_details JSONB DEFAULT '{}'::jsonb,
  p_legal_basis TEXT DEFAULT 'consent',
  p_data_categories TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO privacy_audit_log (
    customer_id,
    event_type,
    performed_by,
    performed_by_type,
    event_timestamp,
    ip_address,
    user_agent,
    event_details,
    legal_basis,
    data_categories
  ) VALUES (
    p_customer_id,
    p_event_type,
    p_performed_by,
    p_performed_by_type,
    NOW(),
    p_ip_address,
    p_user_agent,
    p_event_details,
    p_legal_basis,
    p_data_categories
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_privacy_event IS 'Log privacy-related event to audit trail';

-- Function: Report Data Breach
CREATE OR REPLACE FUNCTION report_data_breach(
  p_breach_type TEXT,
  p_severity TEXT,
  p_discovered_by UUID,
  p_discovery_method TEXT,
  p_customers_affected INTEGER,
  p_data_categories TEXT[],
  p_estimated_records INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_breach_id UUID;
  v_priority INTEGER;
BEGIN
  -- Set priority based on severity
  v_priority := CASE p_severity
    WHEN 'critical' THEN 5
    WHEN 'high' THEN 4
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 2
    ELSE 1
  END;

  -- Create breach log
  INSERT INTO data_breach_log (
    breach_type,
    severity,
    discovered_at,
    discovered_by,
    discovery_method,
    customers_affected,
    data_categories_affected,
    estimated_records_affected,
    response_status,
    priority
  ) VALUES (
    p_breach_type,
    p_severity,
    NOW(),
    p_discovered_by,
    p_discovery_method,
    p_customers_affected,
    p_data_categories,
    p_estimated_records,
    'investigating',
    v_priority
  )
  RETURNING id INTO v_breach_id;

  -- Log as privacy event
  PERFORM log_privacy_event(
    NULL, -- No specific customer
    'data_breach_detected',
    p_discovered_by,
    'admin',
    NULL,
    NULL,
    jsonb_build_object(
      'breach_id', v_breach_id,
      'severity', p_severity,
      'customers_affected', p_customers_affected
    ),
    'legal_obligation',
    p_data_categories
  );

  RETURN v_breach_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION report_data_breach IS 'Report a data breach incident';

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE privacy_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_log ENABLE ROW LEVEL SECURITY;

-- Customers can view their own privacy audit log
CREATE POLICY "Customers can view own privacy audit"
  ON privacy_audit_log FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can view all privacy audit logs
CREATE POLICY "Admins can view all privacy audits"
  ON privacy_audit_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Data breach log - admins only
CREATE POLICY "Admins can manage data breaches"
  ON data_breach_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Trigger: Auto-log consent events
CREATE OR REPLACE FUNCTION auto_log_consent_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.consent_granted = true THEN
    PERFORM log_privacy_event(
      NEW.customer_id,
      'consent_granted',
      NEW.customer_id,
      'customer',
      NEW.ip_address,
      NEW.user_agent,
      jsonb_build_object(
        'consent_type', NEW.consent_type,
        'consent_version', NEW.consent_version,
        'consent_method', NEW.consent_method
      ),
      'consent',
      ARRAY[NEW.consent_type]
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.withdrawn_at IS NOT NULL AND OLD.withdrawn_at IS NULL THEN
    PERFORM log_privacy_event(
      NEW.customer_id,
      'consent_withdrawn',
      auth.uid(),
      'customer',
      NULL,
      NULL,
      jsonb_build_object(
        'consent_type', NEW.consent_type,
        'consent_version', NEW.consent_version
      ),
      'consent',
      ARRAY[NEW.consent_type]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_consent_audit_trigger
  AFTER INSERT OR UPDATE ON customer_consents
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_consent_event();

-- Trigger: Auto-log account deletion events
CREATE OR REPLACE FUNCTION auto_log_deletion_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_privacy_event(
      NEW.customer_id,
      'account_deletion_requested',
      NEW.requested_by,
      'customer',
      NEW.ip_address,
      NEW.user_agent,
      jsonb_build_object(
        'deletion_reason', NEW.deletion_reason,
        'full_anonymization_date', NEW.full_anonymization_date
      ),
      'consent',
      ARRAY['all_data']
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM log_privacy_event(
      NEW.customer_id,
      'account_deleted',
      NEW.requested_by,
      'system',
      NULL,
      NULL,
      jsonb_build_object(
        'data_deleted', NEW.data_deleted,
        'data_retained', NEW.data_retained
      ),
      'consent',
      ARRAY['all_data']
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_deletion_audit_trigger
  AFTER INSERT OR UPDATE ON account_deletion_queue
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_deletion_event();

-- Trigger: Update data breach timestamp
CREATE OR REPLACE FUNCTION update_breach_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_breach_updated_at
  BEFORE UPDATE ON data_breach_log
  FOR EACH ROW
  EXECUTE FUNCTION update_breach_timestamp();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3: Privacy Audit Log System - Migration Complete';
  RAISE NOTICE '📋 Created Tables:';
  RAISE NOTICE '   - privacy_audit_log (comprehensive audit trail)';
  RAISE NOTICE '   - data_breach_log (breach incident tracking)';
  RAISE NOTICE '📊 Created Views:';
  RAISE NOTICE '   - privacy_consent_audit (consent event tracking)';
  RAISE NOTICE '   - data_access_request_audit (PIPEDA 30-day compliance)';
  RAISE NOTICE '   - marketing_email_audit (CASL compliance)';
  RAISE NOTICE '   - admin_data_access_audit (admin access tracking)';
  RAISE NOTICE '   - data_breach_dashboard (active breach monitoring)';
  RAISE NOTICE '⚙️ Created Functions:';
  RAISE NOTICE '   - log_privacy_event() (log any privacy event)';
  RAISE NOTICE '   - report_data_breach() (report breach incident)';
  RAISE NOTICE '🔔 Automated Triggers:';
  RAISE NOTICE '   - Auto-log consent granted/withdrawn';
  RAISE NOTICE '   - Auto-log account deletion requests';
  RAISE NOTICE '   - Auto-update breach timestamps';
  RAISE NOTICE '📜 Event Types Tracked:';
  RAISE NOTICE '   - Consent: granted, withdrawn, updated';
  RAISE NOTICE '   - Data Access: requested, generated, correction';
  RAISE NOTICE '   - Account: deletion, anonymization';
  RAISE NOTICE '   - Marketing: emails, opens, clicks (CASL)';
  RAISE NOTICE '   - Data Sharing: workshops, mechanics, exports';
  RAISE NOTICE '   - Security: breaches, unauthorized access';
  RAISE NOTICE '   - Admin: data views, modifications, exports';
  RAISE NOTICE '🔐 Row Level Security: ENABLED';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ALL PHASE 3 DATABASE MIGRATIONS COMPLETE';
  RAISE NOTICE '📦 Total Migrations Created: 4';
  RAISE NOTICE '   1. Consent Management System';
  RAISE NOTICE '   2. Account Deletion System';
  RAISE NOTICE '   3. Workshop Agreement System';
  RAISE NOTICE '   4. Privacy Audit Log System';
END $$;
