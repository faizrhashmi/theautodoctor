-- ============================================
-- PHASE 2: Workshop Compliance Dashboard
-- Created: 2025-12-07
-- Description: Comprehensive compliance monitoring views for workshops
--              and platform administrators to track legal compliance
-- ============================================

-- ============================================
-- 1. MASTER WORKSHOP COMPLIANCE DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW workshop_compliance_dashboard AS
SELECT
  o.id AS workshop_id,
  o.name AS workshop_name,
  o.status AS workshop_status,
  o.created_at AS workshop_joined_date,

  -- BUSINESS REGISTRATION COMPLIANCE
  (o.business_number IS NOT NULL) AS has_business_number,
  (o.tax_id IS NOT NULL) AS gst_hst_registered,
  o.wsib_account_number IS NOT NULL AS has_wsib_registration,
  o.wsib_clearance_expiry,
  CASE
    WHEN o.wsib_clearance_expiry IS NULL THEN NULL
    WHEN o.wsib_clearance_expiry < CURRENT_DATE THEN 'expired'
    WHEN o.wsib_clearance_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS wsib_status,

  -- INSURANCE COMPLIANCE
  (o.insurance_expiry_date IS NOT NULL AND o.insurance_coverage_amount IS NOT NULL) AS has_liability_insurance,
  o.insurance_coverage_amount,
  o.insurance_expiry_date,
  CASE
    WHEN o.insurance_expiry_date IS NULL THEN 'missing'
    WHEN o.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN o.insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    WHEN o.insurance_coverage_amount < 2000000 THEN 'insufficient_coverage'
    ELSE 'valid'
  END AS insurance_status,

  -- OCPA QUOTE COMPLIANCE (from existing view)
  quote_stats.total_quotes,
  quote_stats.compliant_quotes,
  quote_stats.non_compliant_quotes,
  quote_stats.pending_quotes,
  quote_stats.compliance_rate,

  -- VARIANCE COMPLIANCE (10% rule)
  variance_stats.total_variance_requests,
  variance_stats.approved_variance_requests,
  variance_stats.pending_variance_requests,
  variance_stats.violations,

  -- WARRANTY COMPLIANCE
  warranty_stats.total_repairs,
  warranty_stats.total_warranty_claims,
  warranty_stats.warranty_claim_rate,
  warranty_stats.warranty_satisfaction_rate,

  -- MECHANIC EMPLOYMENT COMPLIANCE
  mechanic_stats.total_mechanics,
  mechanic_stats.employees,
  mechanic_stats.contractors,
  mechanic_stats.contractors_with_insurance,
  mechanic_stats.contractors_with_gst_hst,

  -- COMPLIANCE ALERTS
  alert_stats.critical_alerts,
  alert_stats.warning_alerts,
  alert_stats.unresolved_alerts,

  -- OVERALL COMPLIANCE SCORE (0-100)
  (
    -- Insurance: 20 points
    (CASE
      WHEN o.insurance_expiry_date IS NOT NULL
           AND o.insurance_expiry_date > CURRENT_DATE
           AND o.insurance_coverage_amount >= 2000000 THEN 20
      ELSE 0
    END)
    +
    -- Business registration: 15 points
    (CASE
      WHEN o.business_number IS NOT NULL THEN 15
      ELSE 0
    END)
    +
    -- WSIB: 15 points
    (CASE
      WHEN o.wsib_account_number IS NOT NULL
           AND (o.wsib_clearance_expiry IS NULL OR o.wsib_clearance_expiry > CURRENT_DATE) THEN 15
      ELSE 0
    END)
    +
    -- Quote compliance: 30 points
    (CASE
      WHEN quote_stats.total_quotes > 0 THEN
        (quote_stats.compliant_quotes::DECIMAL / quote_stats.total_quotes * 30)
      ELSE 30
    END)
    +
    -- Variance compliance: 10 points
    (CASE
      WHEN variance_stats.total_variance_requests > 0 THEN
        ((variance_stats.total_variance_requests - variance_stats.violations)::DECIMAL /
         variance_stats.total_variance_requests * 10)
      ELSE 10
    END)
    +
    -- Warranty handling: 10 points
    (CASE
      WHEN warranty_stats.total_warranty_claims > 0 THEN
        (warranty_stats.warranty_satisfaction_rate * 0.1)
      ELSE 10
    END)
  ) AS compliance_score_out_of_100,

  -- COMPLIANCE STATUS
  CASE
    WHEN o.insurance_expiry_date IS NULL OR o.insurance_expiry_date < CURRENT_DATE THEN 'non_compliant_insurance'
    WHEN o.business_number IS NULL THEN 'non_compliant_registration'
    WHEN variance_stats.violations > 0 THEN 'ocpa_violations'
    WHEN alert_stats.critical_alerts > 0 THEN 'critical_alerts'
    WHEN alert_stats.warning_alerts > 3 THEN 'multiple_warnings'
    ELSE 'compliant'
  END AS overall_status

FROM organizations o

-- Join quote compliance stats
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_quotes,
    COUNT(*) FILTER (WHERE compliance_status = 'compliant') AS compliant_quotes,
    COUNT(*) FILTER (WHERE compliance_status = 'violation') AS non_compliant_quotes,
    COUNT(*) FILTER (WHERE compliance_status IN ('pending_acceptance', 'pending_authorization')) AS pending_quotes,
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE compliance_status = 'compliant')::DECIMAL / COUNT(*) * 100)
      ELSE 100
    END AS compliance_rate
  FROM ocpa_quote_compliance_status
  WHERE workshop_id = o.id
) AS quote_stats ON true

-- Join variance stats
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_variance_requests,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved_variance_requests,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_variance_requests,
    COUNT(*) FILTER (WHERE ocpa_compliant = false AND status NOT IN ('pending', 'workshop_absorbed')) AS violations
  FROM quote_variance_requests
  WHERE workshop_id = o.id
) AS variance_stats ON true

-- Join warranty stats
LEFT JOIN LATERAL (
  SELECT
    COUNT(DISTINCT rq.id) AS total_repairs,
    COUNT(DISTINCT wc.id) AS total_warranty_claims,
    CASE
      WHEN COUNT(DISTINCT rq.id) > 0 THEN
        (COUNT(DISTINCT wc.id)::DECIMAL / COUNT(DISTINCT rq.id) * 100)
      ELSE 0
    END AS warranty_claim_rate,
    CASE
      WHEN COUNT(DISTINCT wc.id) FILTER (WHERE wc.customer_satisfied IS NOT NULL) > 0 THEN
        (COUNT(DISTINCT wc.id) FILTER (WHERE wc.customer_satisfied = true)::DECIMAL /
         COUNT(DISTINCT wc.id) FILTER (WHERE wc.customer_satisfied IS NOT NULL) * 100)
      ELSE 100
    END AS warranty_satisfaction_rate
  FROM repair_quotes rq
  LEFT JOIN warranty_claims wc ON wc.original_quote_id = rq.id
  WHERE rq.workshop_id = o.id
    AND rq.work_completed_at >= CURRENT_DATE - INTERVAL '12 months'
) AS warranty_stats ON true

-- Join mechanic employment stats
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_mechanics,
    COUNT(*) FILTER (WHERE m.employment_type = 'employee') AS employees,
    COUNT(*) FILTER (WHERE m.employment_type = 'contractor') AS contractors,
    COUNT(*) FILTER (WHERE m.employment_type = 'contractor' AND m.has_liability_insurance = true) AS contractors_with_insurance,
    COUNT(*) FILTER (WHERE m.employment_type = 'contractor' AND m.gst_hst_registered = true) AS contractors_with_gst_hst
  FROM mechanics m
  INNER JOIN workshop_roles wr ON wr.user_id = m.id
  WHERE wr.workshop_id = o.id
) AS mechanic_stats ON true

-- Join alert stats
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'violation') AS critical_alerts,
    COUNT(*) FILTER (WHERE severity = 'warning') AS warning_alerts,
    COUNT(*) FILTER (WHERE resolved = false) AS unresolved_alerts
  FROM ocpa_compliance_alerts
  WHERE workshop_id = o.id
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
) AS alert_stats ON true

WHERE o.organization_type = 'workshop';

COMMENT ON VIEW workshop_compliance_dashboard IS 'Master compliance dashboard for all workshops';

-- ============================================
-- 2. PLATFORM-WIDE COMPLIANCE SUMMARY
-- ============================================

CREATE OR REPLACE VIEW platform_compliance_summary AS
SELECT
  -- Total workshops
  COUNT(*) AS total_workshops,
  COUNT(*) FILTER (WHERE overall_status = 'compliant') AS compliant_workshops,
  COUNT(*) FILTER (WHERE overall_status != 'compliant') AS non_compliant_workshops,

  -- Insurance compliance
  COUNT(*) FILTER (WHERE insurance_status = 'valid') AS workshops_with_valid_insurance,
  COUNT(*) FILTER (WHERE insurance_status = 'expired') AS workshops_with_expired_insurance,
  COUNT(*) FILTER (WHERE insurance_status = 'expiring_soon') AS workshops_insurance_expiring_soon,

  -- Business registration
  COUNT(*) FILTER (WHERE has_business_number = true) AS workshops_with_business_number,
  COUNT(*) FILTER (WHERE gst_hst_registered = true) AS workshops_gst_hst_registered,

  -- WSIB compliance
  COUNT(*) FILTER (WHERE has_wsib_registration = true) AS workshops_with_wsib,
  COUNT(*) FILTER (WHERE wsib_status = 'expired') AS workshops_wsib_expired,

  -- Quote compliance
  SUM(total_quotes) AS total_platform_quotes,
  SUM(compliant_quotes) AS total_compliant_quotes,
  SUM(non_compliant_quotes) AS total_non_compliant_quotes,
  CASE
    WHEN SUM(total_quotes) > 0 THEN
      (SUM(compliant_quotes)::DECIMAL / SUM(total_quotes) * 100)
    ELSE 100
  END AS platform_quote_compliance_rate,

  -- Variance compliance
  SUM(total_variance_requests) AS total_variance_requests,
  SUM(violations) AS total_variance_violations,

  -- Warranty stats
  SUM(total_warranty_claims) AS total_warranty_claims,
  AVG(warranty_claim_rate) AS avg_warranty_claim_rate,
  AVG(warranty_satisfaction_rate) AS avg_warranty_satisfaction_rate,

  -- Alerts
  SUM(critical_alerts) AS total_critical_alerts,
  SUM(warning_alerts) AS total_warning_alerts,
  SUM(unresolved_alerts) AS total_unresolved_alerts,

  -- Overall platform compliance score
  AVG(compliance_score_out_of_100) AS platform_avg_compliance_score

FROM workshop_compliance_dashboard;

COMMENT ON VIEW platform_compliance_summary IS 'Platform-wide compliance metrics for administrators';

-- ============================================
-- 3. COMPLIANCE ALERT DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW compliance_alert_dashboard AS
SELECT
  oca.id AS alert_id,
  oca.workshop_id,
  o.name AS workshop_name,
  oca.quote_id,

  oca.alert_type,
  oca.severity,
  oca.alert_message,

  oca.resolved,
  oca.resolved_at,
  oca.created_at,

  -- Time since alert created
  EXTRACT(EPOCH FROM (NOW() - oca.created_at)) / 3600 AS hours_since_alert,

  -- Priority (higher = more urgent)
  CASE
    WHEN oca.severity = 'violation' AND oca.resolved = false THEN 100
    WHEN oca.severity = 'critical' AND oca.resolved = false THEN 90
    WHEN oca.severity = 'warning' AND oca.resolved = false
         AND EXTRACT(EPOCH FROM (NOW() - oca.created_at)) / 3600 > 48 THEN 70
    WHEN oca.severity = 'warning' AND oca.resolved = false THEN 50
    ELSE 10
  END AS priority_score,

  -- Workshop compliance score (for context)
  wcd.compliance_score_out_of_100 AS workshop_compliance_score,
  wcd.overall_status AS workshop_overall_status

FROM ocpa_compliance_alerts oca
LEFT JOIN organizations o ON o.id = oca.workshop_id
LEFT JOIN workshop_compliance_dashboard wcd ON wcd.workshop_id = oca.workshop_id

WHERE oca.created_at >= CURRENT_DATE - INTERVAL '90 days'

ORDER BY priority_score DESC, oca.created_at DESC;

COMMENT ON VIEW compliance_alert_dashboard IS 'All compliance alerts with priority scoring';

-- ============================================
-- 4. WORKSHOPS REQUIRING IMMEDIATE ATTENTION
-- ============================================

CREATE OR REPLACE VIEW workshops_requiring_attention AS
SELECT
  workshop_id,
  workshop_name,
  workshop_status,

  -- Reasons for attention
  ARRAY_REMOVE(ARRAY[
    CASE WHEN insurance_status = 'expired' THEN 'insurance_expired' END,
    CASE WHEN insurance_status = 'expiring_soon' THEN 'insurance_expiring_soon' END,
    CASE WHEN insurance_status = 'insufficient_coverage' THEN 'insurance_insufficient' END,
    CASE WHEN wsib_status = 'expired' THEN 'wsib_expired' END,
    CASE WHEN wsib_status = 'expiring_soon' THEN 'wsib_expiring_soon' END,
    CASE WHEN NOT has_business_number THEN 'missing_business_number' END,
    CASE WHEN violations > 0 THEN 'ocpa_violations' END,
    CASE WHEN critical_alerts > 0 THEN 'critical_alerts' END,
    CASE WHEN compliance_score_out_of_100 < 60 THEN 'low_compliance_score' END
  ], NULL) AS attention_reasons,

  compliance_score_out_of_100,
  overall_status,

  critical_alerts,
  violations,

  insurance_status,
  insurance_expiry_date,

  wsib_status,
  wsib_clearance_expiry,

  -- Priority level
  CASE
    WHEN insurance_status = 'expired' OR violations > 0 THEN 'critical'
    WHEN insurance_status = 'expiring_soon' OR wsib_status = 'expired' OR critical_alerts > 0 THEN 'high'
    WHEN compliance_score_out_of_100 < 70 THEN 'medium'
    ELSE 'low'
  END AS priority_level

FROM workshop_compliance_dashboard

WHERE overall_status != 'compliant'
   OR insurance_status IN ('expired', 'expiring_soon', 'insufficient_coverage')
   OR wsib_status IN ('expired', 'expiring_soon')
   OR violations > 0
   OR critical_alerts > 0
   OR compliance_score_out_of_100 < 70

ORDER BY
  CASE
    WHEN insurance_status = 'expired' OR violations > 0 THEN 1
    WHEN insurance_status = 'expiring_soon' OR wsib_status = 'expired' THEN 2
    WHEN compliance_score_out_of_100 < 60 THEN 3
    ELSE 4
  END,
  compliance_score_out_of_100 ASC;

COMMENT ON VIEW workshops_requiring_attention IS 'Workshops with compliance issues requiring immediate action';

-- ============================================
-- 5. MECHANIC COMPLIANCE TRACKING
-- ============================================

CREATE OR REPLACE VIEW mechanic_contractor_compliance AS
SELECT
  m.id AS mechanic_id,
  m.name AS mechanic_name,
  m.employment_type,

  -- Workshop affiliations
  ARRAY_AGG(DISTINCT o.name) AS affiliated_workshops,
  COUNT(DISTINCT wr.workshop_id) AS workshop_count,

  -- Tax compliance (for contractors)
  CASE
    WHEN m.employment_type = 'contractor' THEN
      CASE
        WHEN m.annual_revenue_estimate > 30000 AND (m.gst_hst_registered = false OR m.business_number IS NULL) THEN 'non_compliant_gst'
        WHEN m.annual_revenue_estimate > 30000 AND m.gst_hst_registered = true THEN 'compliant'
        WHEN m.annual_revenue_estimate <= 30000 THEN 'exempt_below_threshold'
        ELSE 'unknown'
      END
    ELSE 'not_applicable'
  END AS tax_compliance_status,

  -- Insurance compliance (for contractors)
  CASE
    WHEN m.employment_type = 'contractor' THEN
      CASE
        WHEN m.has_liability_insurance = false THEN 'no_insurance'
        WHEN m.insurance_expiry_date < CURRENT_DATE THEN 'expired'
        WHEN m.insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        WHEN m.insurance_coverage_amount < 2000000 THEN 'insufficient_coverage'
        ELSE 'compliant'
      END
    ELSE 'not_applicable'
  END AS insurance_compliance_status,

  -- Independence test (CRA contractor classification)
  CASE
    WHEN m.employment_type = 'contractor' THEN
      CASE
        WHEN m.can_refuse_work = true
             AND m.sets_own_schedule = true
             AND m.works_for_multiple_clients = true THEN 'independent'
        ELSE 'potentially_misclassified'
      END
    ELSE 'not_applicable'
  END AS contractor_independence_status,

  -- T4A tracking
  m.t4a_issued_years,
  CASE
    WHEN m.employment_type = 'contractor'
         AND EXTRACT(YEAR FROM m.created_at) < EXTRACT(YEAR FROM CURRENT_DATE)
         AND NOT (EXTRACT(YEAR FROM CURRENT_DATE) - 1 = ANY(m.t4a_issued_years)) THEN 'missing_t4a'
    ELSE 'ok'
  END AS t4a_compliance_status,

  -- Overall contractor compliance
  CASE
    WHEN m.employment_type = 'employee' THEN 'not_applicable'
    WHEN m.employment_type = 'contractor' THEN
      CASE
        WHEN (m.annual_revenue_estimate > 30000 AND (m.gst_hst_registered = false OR m.business_number IS NULL))
             OR m.has_liability_insurance = false
             OR m.insurance_expiry_date < CURRENT_DATE
             OR (m.can_refuse_work = false OR m.sets_own_schedule = false OR m.works_for_multiple_clients = false)
          THEN 'non_compliant'
        WHEN m.insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'compliant'
      END
    ELSE 'unknown'
  END AS overall_compliance_status

FROM mechanics m
LEFT JOIN workshop_roles wr ON wr.user_id = m.id
LEFT JOIN organizations o ON o.id = wr.workshop_id

WHERE m.employment_type = 'contractor'

GROUP BY m.id, m.name, m.employment_type, m.annual_revenue_estimate, m.gst_hst_registered,
         m.business_number, m.has_liability_insurance, m.insurance_expiry_date,
         m.insurance_coverage_amount, m.can_refuse_work, m.sets_own_schedule,
         m.works_for_multiple_clients, m.t4a_issued_years, m.created_at;

COMMENT ON VIEW mechanic_contractor_compliance IS 'Track contractor compliance (tax, insurance, CRA independence test)';

-- ============================================
-- 6. COMPLIANCE TREND ANALYSIS
-- ============================================

CREATE OR REPLACE VIEW compliance_trend_monthly AS
SELECT
  DATE_TRUNC('month', created_at) AS month,

  -- Quote compliance trend
  COUNT(*) FILTER (WHERE entity_type = 'quote' AND compliance_type IN ('privacy_consent_obtained')) AS quotes_with_consent,
  COUNT(*) FILTER (WHERE entity_type = 'quote' AND compliance_status = 'compliant') AS compliant_quotes,
  COUNT(*) FILTER (WHERE entity_type = 'quote' AND compliance_status = 'non_compliant') AS non_compliant_quotes,

  -- Insurance compliance events
  COUNT(*) FILTER (WHERE compliance_type = 'insurance_verified') AS insurance_verifications,
  COUNT(*) FILTER (WHERE compliance_type = 'insurance_expired') AS insurance_expirations,

  -- Employment status changes
  COUNT(*) FILTER (WHERE compliance_type = 'employment_status_changed') AS employment_status_changes,

  -- T4A tracking
  COUNT(*) FILTER (WHERE compliance_type = 't4a_issued') AS t4a_issued_count,

  -- Overall events
  COUNT(*) AS total_compliance_events

FROM legal_compliance_audit_log

WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'

GROUP BY DATE_TRUNC('month', created_at)

ORDER BY month DESC;

COMMENT ON VIEW compliance_trend_monthly IS 'Monthly compliance trend analysis';

-- ============================================
-- 7. CUSTOMER DATA PRIVACY COMPLIANCE
-- ============================================

CREATE OR REPLACE VIEW customer_data_privacy_compliance AS
SELECT
  sr.customer_id,
  p.full_name AS customer_name,

  -- Session data
  COUNT(DISTINCT sr.id) AS total_sessions,
  MAX(sr.created_at) AS last_session_date,

  -- Consent tracking
  COUNT(DISTINCT sr.id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM workshop_escalation_queue weq
      WHERE weq.diagnostic_session_id = sr.id
        AND weq.customer_consent_to_share_info = true
    )
  ) AS sessions_with_consent,

  -- Referral disclosure
  COUNT(DISTINCT sr.id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM workshop_escalation_queue weq
      WHERE weq.diagnostic_session_id = sr.id
        AND weq.customer_notified_of_referral = true
    )
  ) AS sessions_with_referral_disclosure,

  -- Quote acceptances with consent
  COUNT(DISTINCT qa.id) AS total_quote_acceptances,

  -- Data retention check (PIPEDA: delete after 7 years unless legally required)
  MIN(sr.created_at) AS oldest_session_date,
  CASE
    WHEN MIN(sr.created_at) < CURRENT_DATE - INTERVAL '7 years' THEN 'retention_review_required'
    ELSE 'within_retention_period'
  END AS data_retention_status

FROM session_requests sr
LEFT JOIN profiles p ON p.id = sr.customer_id
LEFT JOIN quote_acceptance_log qa ON qa.customer_id = sr.customer_id

GROUP BY sr.customer_id, p.full_name

ORDER BY MIN(sr.created_at) ASC;

COMMENT ON VIEW customer_data_privacy_compliance IS 'PIPEDA: Track customer data privacy compliance and retention';

-- ============================================
-- 8. COMPLIANCE SCORE CALCULATION FUNCTION
-- ============================================

-- Function to recalculate compliance scores (can be run on schedule)
CREATE OR REPLACE FUNCTION refresh_compliance_scores()
RETURNS TABLE (
  workshop_id UUID,
  workshop_name TEXT,
  previous_score DECIMAL,
  new_score DECIMAL,
  score_change DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wcd.workshop_id,
    wcd.workshop_name,
    NULL::DECIMAL AS previous_score, -- Would store historical scores in separate table
    wcd.compliance_score_out_of_100 AS new_score,
    NULL::DECIMAL AS score_change
  FROM workshop_compliance_dashboard wcd
  ORDER BY wcd.compliance_score_out_of_100 ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_compliance_scores IS 'Recalculate and return updated compliance scores for all workshops';
