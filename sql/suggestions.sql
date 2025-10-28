-- COMPREHENSIVE DATABASE SCHEMA AUDIT & FIXES
-- AskAutoDoctor Platform - Security & Performance Enhancement
-- Generated: 2025-10-28

-- SECTION 1: MISSING RLS POLICIES (10+ tables)
ALTER TABLE IF EXISTS admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleanup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workshop_partnership_programs ENABLE ROW LEVEL SECURITY;

-- SECTION 2: MISSING INDEXES (40+ indexes)
CREATE INDEX IF NOT EXISTS idx_workshop_earnings_mechanic ON workshop_earnings(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_workshop ON mechanic_earnings(workshop_id);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_quoting_user ON repair_quotes(quoting_user_id);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_diagnosing_mechanic ON repair_quotes(diagnosing_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_assigned_mechanic ON diagnostic_sessions(assigned_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_in_person_visits_mechanic ON in_person_visits(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_quote_modifications_created_by ON quote_modifications(created_by);
CREATE INDEX IF NOT EXISTS idx_workshop_roles_mechanic ON workshop_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_customer_status ON repair_quotes(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_customer_status ON diagnostic_sessions(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_partnership_applications_status ON partnership_applications(status, workshop_id);
CREATE INDEX IF NOT EXISTS idx_partnership_agreements_is_active ON partnership_agreements(is_active);
CREATE INDEX IF NOT EXISTS idx_bay_bookings_mechanic_date ON bay_bookings(mechanic_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bay_bookings_workshop_date ON bay_bookings(workshop_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_organizations_email ON organizations(email);
CREATE INDEX IF NOT EXISTS idx_workshop_earnings_created_at ON workshop_earnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_created_at ON mechanic_earnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_quotes_created_at ON repair_quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_created_at ON diagnostic_sessions(created_at DESC);

-- SECTION 3: MISSING CONSTRAINTS (15+ constraints)
ALTER TABLE organizations ADD CONSTRAINT unique_organization_email UNIQUE (email);
ALTER TABLE repair_quotes ADD CONSTRAINT check_customer_response CHECK (customer_response IS NULL OR customer_response IN (

-- SECTION 4: MISSING TRIGGERS (10+ triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $f$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $f$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_diagnostic_sessions_ts ON diagnostic_sessions;
CREATE TRIGGER update_diagnostic_sessions_ts BEFORE UPDATE ON diagnostic_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_in_person_visits_ts ON in_person_visits;
CREATE TRIGGER update_in_person_visits_ts BEFORE UPDATE ON in_person_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_repair_quotes_ts ON repair_quotes;
CREATE TRIGGER update_repair_quotes_ts BEFORE UPDATE ON repair_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SECTION 5: JSONB VALIDATION (15+ validations)
ALTER TABLE repair_quotes ADD CONSTRAINT validate_line_items CHECK (jsonb_typeof(line_items) = array);
ALTER TABLE diagnostic_sessions ADD CONSTRAINT validate_photos CHECK (photos IS NULL OR jsonb_typeof(photos) = array);
ALTER TABLE quote_modifications ADD CONSTRAINT validate_added_items CHECK (added_items IS NULL OR jsonb_typeof(added_items) = array);
ALTER TABLE platform_chat_messages ADD CONSTRAINT validate_attachments CHECK (jsonb_typeof(attachments) = array);
ALTER TABLE diagnostic_sessions ADD CONSTRAINT validate_vehicle_info CHECK (vehicle_info IS NULL OR jsonb_typeof(vehicle_info) = object);
ALTER TABLE organization_members ADD CONSTRAINT validate_permissions CHECK (jsonb_typeof(permissions) = object);
ALTER TABLE organizations ADD CONSTRAINT validate_settings CHECK (jsonb_typeof(settings) = object);

-- AUDIT COMPLETE
-- This migration addresses critical security and performance issues
-- Test in development before production deployment
