-- ============================================
-- PHASE 4: Monitoring & Enforcement Infrastructure
-- Created: 2025-12-02
-- Description: Views and functions for admin compliance monitoring
-- ============================================

-- ============================================
-- 1. ADMIN PRIVACY DASHBOARD SUMMARY VIEW
-- ============================================

CREATE OR REPLACE VIEW admin_privacy_dashboard_summary AS
SELECT
  -- Customer Consent Metrics
  (SELECT COUNT(DISTINCT customer_id)
   FROM customer_consents
   WHERE consent_granted = true AND withdrawn_at IS NULL) AS total_customers_with_consents,

  (SELECT COUNT(*)
   FROM customer_consent_summary
   WHERE has_all_required_consents = true) AS customers_fully_compliant,

  (SELECT COUNT(*)
   FROM customer_consent_summary
   WHERE has_marketing_consent = true) AS customers_opted_in_marketing,

  -- Data Access Requests
  (SELECT COUNT(*)
   FROM privacy_audit_log
   WHERE event_type = 'data_access_requested'
     AND event_timestamp >= NOW() - INTERVAL '30 days') AS data_access_requests_30_days,

  (SELECT COUNT(*)
   FROM privacy_audit_log
   WHERE event_type = 'data_access_requested'
     AND event_timestamp < NOW() - INTERVAL '30 days'
     AND NOT EXISTS (
       SELECT 1 FROM privacy_audit_log pal2
       WHERE pal2.customer_id = privacy_audit_log.customer_id
         AND pal2.event_type = 'data_download_generated'
         AND pal2.event_timestamp > privacy_audit_log.event_timestamp
     )) AS data_access_requests_overdue,

  -- Account Deletions
  (SELECT COUNT(*)
   FROM account_deletion_queue
   WHERE status = 'pending') AS pending_deletion_requests,

  (SELECT COUNT(*)
   FROM account_deletion_queue
   WHERE status = 'completed'
     AND completed_at >= NOW() - INTERVAL '30 days') AS deletions_completed_30_days,

  -- Data Breaches
  (SELECT COUNT(*)
   FROM data_breach_log
   WHERE response_status != 'closed') AS active_data_breaches,

  (SELECT COUNT(*)
   FROM data_breach_log
   WHERE severity IN ('critical', 'high')
     AND response_status != 'closed') AS critical_high_breaches,

  -- Privacy Audit Log Activity
  (SELECT COUNT(*)
   FROM privacy_audit_log
   WHERE event_timestamp >= NOW() - INTERVAL '24 hours') AS privacy_events_24_hours,

  (SELECT COUNT(*)
   FROM privacy_audit_log
   WHERE event_type IN ('consent_withdrawn', 'marketing_unsubscribed')
     AND event_timestamp >= NOW() - INTERVAL '7 days') AS opt_outs_7_days;

COMMENT ON VIEW admin_privacy_dashboard_summary IS 'Admin: Overall privacy compliance metrics for dashboard';

-- ============================================
-- 2. WORKSHOP COMPLIANCE SUMMARY VIEW
-- ============================================

CREATE OR REPLACE VIEW workshop_compliance_summary AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.organization_type,
  o.email AS contact_email,
  o.phone AS contact_phone,

  -- Agreement Status
  wa.id AS agreement_id,
  wa.agreement_version,
  wa.signed_at,
  wa.status AS agreement_status,

  -- Insurance Status
  wa.insurance_verified,
  wa.insurance_expiry_date,
  wa.insurance_coverage_amount,
  wa.insurance_provider,

  CASE
    WHEN wa.insurance_expiry_date IS NULL THEN 'no_insurance'
    WHEN wa.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_critical'
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_warning'
    WHEN wa.insurance_verified = true THEN 'valid'
    ELSE 'pending_verification'
  END AS insurance_status,

  -- Days until expiry
  CASE
    WHEN wa.insurance_expiry_date IS NOT NULL
    THEN (wa.insurance_expiry_date - CURRENT_DATE)
    ELSE NULL
  END AS days_until_insurance_expiry,

  -- Business Registration
  wa.business_registration_verified,
  wa.business_number,
  wa.gst_hst_number,

  -- Overall Compliance
  (wa.status = 'active'
   AND wa.insurance_verified = true
   AND wa.insurance_expiry_date > CURRENT_DATE) AS is_compliant,

  -- Workshop Status
  o.status AS workshop_status

FROM organizations o
LEFT JOIN workshop_agreements wa ON wa.organization_id = o.id
  AND wa.agreement_type = 'independent_contractor'
  AND wa.status = 'active'
WHERE o.organization_type IN ('workshop', 'mobile_mechanic')
ORDER BY
  CASE
    WHEN wa.insurance_expiry_date IS NULL THEN 1
    WHEN wa.insurance_expiry_date < CURRENT_DATE THEN 2
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 3
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 4
    ELSE 5
  END,
  wa.insurance_expiry_date ASC NULLS LAST;

COMMENT ON VIEW workshop_compliance_summary IS 'Admin: Workshop agreement and insurance compliance status';

-- ============================================
-- 3. CONSENT STATISTICS VIEW
-- ============================================

CREATE OR REPLACE VIEW consent_statistics AS
SELECT
  consent_type,

  -- Overall Counts
  COUNT(*) AS total_consent_records,
  COUNT(*) FILTER (WHERE consent_granted = true AND withdrawn_at IS NULL) AS active_consents,
  COUNT(*) FILTER (WHERE withdrawn_at IS NOT NULL) AS withdrawn_consents,

  -- By Method
  COUNT(*) FILTER (WHERE consent_method = 'signup') AS granted_at_signup,
  COUNT(*) FILTER (WHERE consent_method = 'settings_page') AS granted_in_settings,
  COUNT(*) FILTER (WHERE consent_method = 'quote_acceptance') AS granted_at_quote,

  -- Opt-in Rate (active / total unique customers)
  ROUND(
    100.0 * COUNT(DISTINCT customer_id) FILTER (WHERE consent_granted = true AND withdrawn_at IS NULL)
    / NULLIF(COUNT(DISTINCT customer_id), 0),
    2
  ) AS opt_in_percentage,

  -- Withdrawal Rate
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE withdrawn_at IS NOT NULL)
    / NULLIF(COUNT(*), 0),
    2
  ) AS withdrawal_percentage,

  -- Recent Activity (last 30 days)
  COUNT(*) FILTER (WHERE granted_at >= NOW() - INTERVAL '30 days') AS granted_30_days,
  COUNT(*) FILTER (WHERE withdrawn_at >= NOW() - INTERVAL '30 days') AS withdrawn_30_days

FROM customer_consents
GROUP BY consent_type
ORDER BY consent_type;

COMMENT ON VIEW consent_statistics IS 'Admin: Consent opt-in/opt-out statistics by type';

-- ============================================
-- 4. DATA ACCESS REQUESTS PENDING VIEW
-- ============================================

CREATE OR REPLACE VIEW data_access_requests_pending AS
SELECT
  pal.id AS request_id,
  pal.customer_id,
  p.email,
  p.full_name,
  pal.event_timestamp AS requested_at,
  (CURRENT_DATE - pal.event_timestamp::date) AS days_pending,

  -- PIPEDA 30-day compliance
  CASE
    WHEN (CURRENT_DATE - pal.event_timestamp::date) > 30 THEN 'overdue'
    WHEN (CURRENT_DATE - pal.event_timestamp::date) > 25 THEN 'urgent'
    WHEN (CURRENT_DATE - pal.event_timestamp::date) > 20 THEN 'warning'
    ELSE 'on_track'
  END AS status,

  -- Check if download was generated
  EXISTS (
    SELECT 1 FROM privacy_audit_log pal2
    WHERE pal2.customer_id = pal.customer_id
      AND pal2.event_type = 'data_download_generated'
      AND pal2.event_timestamp > pal.event_timestamp
  ) AS download_generated,

  pal.ip_address,
  pal.event_details

FROM privacy_audit_log pal
INNER JOIN profiles p ON p.id = pal.customer_id
WHERE pal.event_type = 'data_access_requested'
  AND NOT EXISTS (
    SELECT 1 FROM privacy_audit_log pal2
    WHERE pal2.customer_id = pal.customer_id
      AND pal2.event_type = 'data_download_generated'
      AND pal2.event_timestamp > pal.event_timestamp
  )
ORDER BY pal.event_timestamp ASC;

COMMENT ON VIEW data_access_requests_pending IS 'Admin: PIPEDA data access requests pending response (30-day tracking)';

-- ============================================
-- 5. INSURANCE EXPIRY UPCOMING VIEW
-- ============================================

CREATE OR REPLACE VIEW insurance_expiry_upcoming AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.email AS contact_email,
  o.phone AS contact_phone,
  wa.insurance_expiry_date,
  wa.insurance_provider,
  wa.insurance_coverage_amount,
  (wa.insurance_expiry_date - CURRENT_DATE) AS days_until_expiry,

  CASE
    WHEN wa.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days' THEN 'urgent'
    WHEN wa.insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
  END AS alert_level,

  -- Last notification sent
  (SELECT MAX(created_at)
   FROM insurance_verification_log
   WHERE organization_id = o.id
     AND verification_type = 'expired_alert') AS last_alert_sent

FROM organizations o
INNER JOIN workshop_agreements wa ON wa.organization_id = o.id
  AND wa.agreement_type = 'independent_contractor'
  AND wa.status = 'active'
WHERE wa.insurance_verified = true
  AND wa.insurance_expiry_date IS NOT NULL
  AND wa.insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY wa.insurance_expiry_date ASC;

COMMENT ON VIEW insurance_expiry_upcoming IS 'Admin: Workshops with expiring or expired insurance (30-day window)';

-- ============================================
-- 6. OUTDATED CONSENT VERSIONS VIEW
-- ============================================

CREATE OR REPLACE VIEW outdated_consent_versions AS
SELECT
  cc.customer_id,
  p.email,
  p.full_name,
  cc.consent_type,
  cc.consent_version,
  cc.granted_at,
  'v1.0.0' AS current_version, -- Update this when consent version changes

  CASE
    WHEN cc.consent_version != 'v1.0.0' THEN true
    ELSE false
  END AS needs_update

FROM customer_consents cc
INNER JOIN profiles p ON p.id = cc.customer_id
WHERE cc.consent_granted = true
  AND cc.withdrawn_at IS NULL
  AND cc.consent_type IN ('terms_of_service', 'privacy_policy', 'marketplace_understanding')
  AND cc.consent_version != 'v1.0.0' -- Current version
ORDER BY cc.granted_at ASC;

COMMENT ON VIEW outdated_consent_versions IS 'Admin: Customers with outdated consent versions';

-- ============================================
-- 7. FUNCTIONS FOR MONITORING
-- ============================================

-- Function: Get Privacy Compliance Score
CREATE OR REPLACE FUNCTION get_privacy_compliance_score()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_total_customers INTEGER;
  v_compliant_customers INTEGER;
  v_score NUMERIC;
BEGIN
  -- Total customers with accounts
  SELECT COUNT(*) INTO v_total_customers
  FROM profiles
  WHERE role = 'customer';

  -- Customers with all required consents
  SELECT COUNT(*) INTO v_compliant_customers
  FROM customer_consent_summary
  WHERE has_all_required_consents = true;

  -- Calculate score (percentage)
  IF v_total_customers > 0 THEN
    v_score := ROUND((v_compliant_customers::numeric / v_total_customers::numeric) * 100, 2);
  ELSE
    v_score := 0;
  END IF;

  v_result := jsonb_build_object(
    'total_customers', v_total_customers,
    'compliant_customers', v_compliant_customers,
    'non_compliant_customers', v_total_customers - v_compliant_customers,
    'compliance_score', v_score,
    'compliance_grade', CASE
      WHEN v_score >= 95 THEN 'A+'
      WHEN v_score >= 90 THEN 'A'
      WHEN v_score >= 85 THEN 'B+'
      WHEN v_score >= 80 THEN 'B'
      WHEN v_score >= 75 THEN 'C+'
      WHEN v_score >= 70 THEN 'C'
      ELSE 'F'
    END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_privacy_compliance_score IS 'Admin: Calculate overall PIPEDA compliance score';

-- Function: Get Consent Statistics for Date Range
CREATE OR REPLACE FUNCTION get_consent_statistics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  consent_type TEXT,
  granted_count INTEGER,
  withdrawn_count INTEGER,
  net_change INTEGER,
  opt_in_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.consent_type,
    COUNT(*) FILTER (WHERE cc.granted_at::date BETWEEN p_start_date AND p_end_date)::INTEGER AS granted_count,
    COUNT(*) FILTER (WHERE cc.withdrawn_at::date BETWEEN p_start_date AND p_end_date)::INTEGER AS withdrawn_count,
    (COUNT(*) FILTER (WHERE cc.granted_at::date BETWEEN p_start_date AND p_end_date) -
     COUNT(*) FILTER (WHERE cc.withdrawn_at::date BETWEEN p_start_date AND p_end_date))::INTEGER AS net_change,
    ROUND(
      100.0 * COUNT(DISTINCT cc.customer_id) FILTER (WHERE cc.consent_granted = true AND cc.withdrawn_at IS NULL)
      / NULLIF(COUNT(DISTINCT cc.customer_id), 0),
      2
    ) AS opt_in_rate
  FROM customer_consents cc
  GROUP BY cc.consent_type;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_consent_statistics IS 'Admin: Consent statistics for date range';

-- Function: Suspend Workshop
CREATE OR REPLACE FUNCTION suspend_workshop(
  p_organization_id UUID,
  p_reason TEXT,
  p_suspended_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update organization status
  UPDATE organizations
  SET
    status = 'suspended',
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- Log the suspension
  PERFORM log_privacy_event(
    NULL, -- No specific customer
    'admin_modified_customer_data',
    p_suspended_by,
    'admin',
    NULL,
    NULL,
    jsonb_build_object(
      'action', 'suspend_workshop',
      'organization_id', p_organization_id,
      'reason', p_reason
    ),
    'legal_obligation',
    ARRAY['workshop_status']
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION suspend_workshop IS 'Admin: Suspend workshop for non-compliance';

-- Function: Activate Workshop
CREATE OR REPLACE FUNCTION activate_workshop(
  p_organization_id UUID,
  p_activated_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if workshop meets compliance requirements
  IF NOT EXISTS (
    SELECT 1 FROM workshop_compliance_summary
    WHERE organization_id = p_organization_id
      AND is_compliant = true
  ) THEN
    RAISE EXCEPTION 'Workshop does not meet compliance requirements (active agreement + valid insurance)';
  END IF;

  -- Update organization status
  UPDATE organizations
  SET
    status = 'active',
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- Log the activation
  PERFORM log_privacy_event(
    NULL,
    'admin_modified_customer_data',
    p_activated_by,
    'admin',
    NULL,
    NULL,
    jsonb_build_object(
      'action', 'activate_workshop',
      'organization_id', p_organization_id
    ),
    'legal_obligation',
    ARRAY['workshop_status']
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_workshop IS 'Admin: Re-activate suspended workshop';

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

-- Privacy audit log indexes
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_event_type_timestamp
  ON privacy_audit_log(event_type, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_customer_event_timestamp
  ON privacy_audit_log(customer_id, event_timestamp DESC);

-- Consent indexes
CREATE INDEX IF NOT EXISTS idx_customer_consents_type_status
  ON customer_consents(consent_type, consent_granted, withdrawn_at);

CREATE INDEX IF NOT EXISTS idx_customer_consents_granted_at
  ON customer_consents(granted_at DESC) WHERE consent_granted = true;

CREATE INDEX IF NOT EXISTS idx_customer_consents_withdrawn_at
  ON customer_consents(withdrawn_at DESC) WHERE withdrawn_at IS NOT NULL;

-- Workshop agreement indexes
CREATE INDEX IF NOT EXISTS idx_workshop_agreements_org_status
  ON workshop_agreements(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_workshop_agreements_insurance_expiry
  ON workshop_agreements(insurance_expiry_date)
  WHERE insurance_verified = true AND status = 'active';

-- Account deletion queue indexes
CREATE INDEX IF NOT EXISTS idx_account_deletion_queue_status
  ON account_deletion_queue(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_deletion_queue_customer
  ON account_deletion_queue(customer_id, status);

-- Data breach log indexes
CREATE INDEX IF NOT EXISTS idx_data_breach_log_status_severity
  ON data_breach_log(response_status, severity);

CREATE INDEX IF NOT EXISTS idx_data_breach_log_discovered_at
  ON data_breach_log(discovered_at DESC);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 4: Monitoring Infrastructure - Migration Complete';
  RAISE NOTICE '📊 Created Views:';
  RAISE NOTICE '   - admin_privacy_dashboard_summary (overall metrics)';
  RAISE NOTICE '   - workshop_compliance_summary (workshop status)';
  RAISE NOTICE '   - consent_statistics (opt-in/opt-out rates)';
  RAISE NOTICE '   - data_access_requests_pending (PIPEDA 30-day tracking)';
  RAISE NOTICE '   - insurance_expiry_upcoming (expiry alerts)';
  RAISE NOTICE '   - outdated_consent_versions (version tracking)';
  RAISE NOTICE '⚙️ Created Functions:';
  RAISE NOTICE '   - get_privacy_compliance_score() (PIPEDA score)';
  RAISE NOTICE '   - get_consent_statistics(date_range) (consent analytics)';
  RAISE NOTICE '   - suspend_workshop(org_id, reason, admin) (enforcement)';
  RAISE NOTICE '   - activate_workshop(org_id, admin) (enforcement)';
  RAISE NOTICE '🔍 Created Indexes: 10 performance indexes';
  RAISE NOTICE '📈 Ready for Admin Monitoring Dashboards';
END $$;
