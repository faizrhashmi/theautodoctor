-- =====================================================
-- ADMIN PANEL COMPLETE MIGRATION SCRIPT
-- =====================================================
-- This script creates all tables and configurations needed for the admin panel
-- Run this in your Supabase SQL Editor
-- Date: 2025-10-23

-- =====================================================
-- PART 1: ADMIN LOGS AND MONITORING
-- =====================================================

-- 1.1 Admin Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  source TEXT NOT NULL CHECK (source IN ('api', 'auth', 'session', 'payment', 'database', 'system', 'cleanup', 'livekit', 'email')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_level ON admin_logs(level);
CREATE INDEX IF NOT EXISTS idx_admin_logs_source ON admin_logs(source);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_level_source ON admin_logs(level, source);
CREATE INDEX IF NOT EXISTS idx_admin_logs_message_search ON admin_logs USING gin(to_tsvector('english', message));

-- 1.2 Error Tracking Table
CREATE TABLE IF NOT EXISTS admin_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  source TEXT NOT NULL CHECK (source IN ('api', 'auth', 'session', 'payment', 'database', 'system', 'cleanup', 'livekit', 'email')),
  occurrence_count INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  affected_users TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_errors_type ON admin_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_admin_errors_source ON admin_errors(source);
CREATE INDEX IF NOT EXISTS idx_admin_errors_status ON admin_errors(status);
CREATE INDEX IF NOT EXISTS idx_admin_errors_last_seen ON admin_errors(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_admin_errors_occurrence_count ON admin_errors(occurrence_count DESC);

-- 1.3 System Health Checks Table
CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL CHECK (service_name IN ('supabase', 'livekit', 'stripe', 'email', 'storage')),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_service ON system_health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON system_health_checks(checked_at DESC);

-- 1.4 Cleanup History Table
CREATE TABLE IF NOT EXISTS cleanup_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleanup_type TEXT NOT NULL CHECK (cleanup_type IN ('expired_requests', 'old_sessions', 'orphaned_sessions', 'manual')),
  items_cleaned INTEGER DEFAULT 0,
  preview_mode BOOLEAN DEFAULT false,
  triggered_by TEXT,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cleanup_history_type ON cleanup_history(cleanup_type);
CREATE INDEX IF NOT EXISTS idx_cleanup_history_created_at ON cleanup_history(created_at DESC);

-- 1.5 Saved Queries Table
CREATE TABLE IF NOT EXISTS admin_saved_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  is_public BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_queries_category ON admin_saved_queries(category);
CREATE INDEX IF NOT EXISTS idx_saved_queries_created_by ON admin_saved_queries(created_by);

-- 1.6 Query Execution History Table
CREATE TABLE IF NOT EXISTS admin_query_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  executed_by TEXT,
  execution_time_ms INTEGER,
  rows_returned INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_history_executed_by ON admin_query_history(executed_by);
CREATE INDEX IF NOT EXISTS idx_query_history_executed_at ON admin_query_history(executed_at DESC);

-- =====================================================
-- PART 2: MECHANIC CREDENTIALS & VERIFICATION
-- =====================================================

-- 2.1 Add credential fields to mechanics table
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS red_seal_certified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS red_seal_number TEXT,
ADD COLUMN IF NOT EXISTS red_seal_province TEXT,
ADD COLUMN IF NOT EXISTS red_seal_expiry_date DATE,
ADD COLUMN IF NOT EXISTS certification_documents TEXT[],
ADD COLUMN IF NOT EXISTS other_certifications JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS specializations TEXT[],
ADD COLUMN IF NOT EXISTS shop_affiliation TEXT CHECK (shop_affiliation IN ('independent', 'dealership', 'franchise', 'mobile')),
ADD COLUMN IF NOT EXISTS shop_name TEXT,
ADD COLUMN IF NOT EXISTS shop_address TEXT,
ADD COLUMN IF NOT EXISTS business_license_number TEXT,
ADD COLUMN IF NOT EXISTS business_license_document TEXT,
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Canada',
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS liability_insurance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
ADD COLUMN IF NOT EXISTS insurance_document TEXT,
ADD COLUMN IF NOT EXISTS criminal_record_check BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS crc_date DATE,
ADD COLUMN IF NOT EXISTS crc_document TEXT,
ADD COLUMN IF NOT EXISTS sin_or_business_number TEXT,
ADD COLUMN IF NOT EXISTS banking_info_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'draft' CHECK (application_status IN ('draft', 'pending', 'under_review', 'approved', 'rejected', 'additional_info_required')),
ADD COLUMN IF NOT EXISTS background_check_status TEXT DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'in_progress', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS application_draft JSONB,
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS mechanics_application_status_idx ON public.mechanics(application_status);
CREATE INDEX IF NOT EXISTS mechanics_background_check_status_idx ON public.mechanics(background_check_status);
CREATE INDEX IF NOT EXISTS mechanics_email_idx ON public.mechanics(email);
CREATE INDEX IF NOT EXISTS mechanics_red_seal_number_idx ON public.mechanics(red_seal_number) WHERE red_seal_number IS NOT NULL;

-- 2.2 Mechanic Documents Table
CREATE TABLE IF NOT EXISTS public.mechanic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'red_seal_certificate',
    'other_certification',
    'business_license',
    'insurance_certificate',
    'criminal_record_check',
    'id_verification',
    'other'
  )),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  description TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS mechanic_documents_mechanic_id_idx ON public.mechanic_documents(mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_documents_document_type_idx ON public.mechanic_documents(document_type);
CREATE INDEX IF NOT EXISTS mechanic_documents_verified_idx ON public.mechanic_documents(verified);

-- 2.3 Mechanic Admin Actions Table
CREATE TABLE IF NOT EXISTS public.mechanic_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'application_submitted',
    'under_review',
    'approved',
    'rejected',
    'info_requested',
    'document_verified',
    'note_added'
  )),
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS mechanic_admin_actions_mechanic_id_idx ON public.mechanic_admin_actions(mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_admin_actions_created_at_idx ON public.mechanic_admin_actions(created_at DESC);

-- =====================================================
-- PART 3: CORPORATE BUSINESS INTEGRATION
-- =====================================================

-- 3.1 Corporate Businesses Table
CREATE TABLE IF NOT EXISTS public.corporate_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL UNIQUE,
  company_phone TEXT,
  company_website TEXT,
  industry TEXT,
  business_type TEXT NOT NULL CHECK (business_type IN ('fleet', 'dealership', 'repair_shop', 'rental', 'taxi_service', 'trucking', 'other')),
  street_address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',
  billing_email TEXT,
  billing_contact_name TEXT,
  billing_contact_phone TEXT,
  billing_address_same_as_company BOOLEAN DEFAULT true,
  billing_street_address TEXT,
  billing_city TEXT,
  billing_province TEXT,
  billing_postal_code TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise', 'custom')),
  contract_start_date DATE,
  contract_end_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users (id),
  rejection_reason TEXT,
  assigned_account_manager_id UUID REFERENCES auth.users (id),
  fleet_size INTEGER,
  monthly_session_limit INTEGER,
  current_month_sessions INTEGER DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  custom_rate_per_session DECIMAL(10,2),
  payment_terms TEXT DEFAULT 'net_30',
  primary_contact_name TEXT NOT NULL,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT,
  primary_contact_title TEXT,
  business_registration_number TEXT,
  tax_id TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS corporate_businesses_company_email_idx ON public.corporate_businesses (company_email);
CREATE INDEX IF NOT EXISTS corporate_businesses_approval_status_idx ON public.corporate_businesses (approval_status);
CREATE INDEX IF NOT EXISTS corporate_businesses_is_active_idx ON public.corporate_businesses (is_active);
CREATE INDEX IF NOT EXISTS corporate_businesses_assigned_manager_idx ON public.corporate_businesses (assigned_account_manager_id);
CREATE INDEX IF NOT EXISTS corporate_businesses_business_type_idx ON public.corporate_businesses (business_type);

-- 3.2 Corporate Employees Table
CREATE TABLE IF NOT EXISTS public.corporate_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  corporate_id UUID NOT NULL REFERENCES public.corporate_businesses (id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  employee_role TEXT NOT NULL CHECK (employee_role IN ('driver', 'fleet_manager', 'admin', 'technician', 'supervisor')),
  employee_number TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users (id),
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES auth.users (id),
  total_sessions INTEGER DEFAULT 0,
  last_session_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE (corporate_id, employee_user_id)
);

CREATE INDEX IF NOT EXISTS corporate_employees_corporate_idx ON public.corporate_employees (corporate_id);
CREATE INDEX IF NOT EXISTS corporate_employees_user_idx ON public.corporate_employees (employee_user_id);
CREATE INDEX IF NOT EXISTS corporate_employees_role_idx ON public.corporate_employees (employee_role);
CREATE INDEX IF NOT EXISTS corporate_employees_is_active_idx ON public.corporate_employees (is_active);

-- 3.3 Corporate Invoices Table
CREATE TABLE IF NOT EXISTS public.corporate_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invoice_number TEXT NOT NULL UNIQUE,
  corporate_id UUID NOT NULL REFERENCES public.corporate_businesses (id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  session_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  sent_at TIMESTAMPTZ,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  stripe_invoice_id TEXT,
  pdf_url TEXT,
  notes TEXT,
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS corporate_invoices_corporate_idx ON public.corporate_invoices (corporate_id);
CREATE INDEX IF NOT EXISTS corporate_invoices_invoice_number_idx ON public.corporate_invoices (invoice_number);
CREATE INDEX IF NOT EXISTS corporate_invoices_status_idx ON public.corporate_invoices (status);
CREATE INDEX IF NOT EXISTS corporate_invoices_billing_period_idx ON public.corporate_invoices (billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS corporate_invoices_due_date_idx ON public.corporate_invoices (due_date);

-- 3.4 Corporate Vehicles Table
CREATE TABLE IF NOT EXISTS public.corporate_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  corporate_id UUID NOT NULL REFERENCES public.corporate_businesses (id) ON DELETE CASCADE,
  vehicle_number TEXT,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  assigned_to_employee_id UUID REFERENCES public.corporate_employees (id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  last_service_date DATE,
  next_service_date DATE,
  total_sessions INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS corporate_vehicles_corporate_idx ON public.corporate_vehicles (corporate_id);
CREATE INDEX IF NOT EXISTS corporate_vehicles_assigned_to_idx ON public.corporate_vehicles (assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS corporate_vehicles_vin_idx ON public.corporate_vehicles (vin);
CREATE INDEX IF NOT EXISTS corporate_vehicles_license_plate_idx ON public.corporate_vehicles (license_plate);

-- =====================================================
-- PART 4: CUSTOMER PROFILES UPGRADE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN address_line1 TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN address_line2 TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN city TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'state_province'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN state_province TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'postal_zip_code'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN postal_zip_code TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN country TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN latitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN longitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_language TEXT DEFAULT 'en';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'communication_preferences'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN communication_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'newsletter_subscribed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN newsletter_subscribed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referral_source TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN profile_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_completed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN profile_completed_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_country_idx ON public.profiles(country);
CREATE INDEX IF NOT EXISTS profiles_city_idx ON public.profiles(city);
CREATE INDEX IF NOT EXISTS profiles_postal_code_idx ON public.profiles(postal_zip_code);
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =====================================================
-- PART 5: WAIVER SIGNATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS waiver_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES intakes(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  waiver_version VARCHAR(20) DEFAULT '1.0' NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_waiver_signatures_user_id ON waiver_signatures(user_id);
CREATE INDEX idx_waiver_signatures_intake_id ON waiver_signatures(intake_id);
CREATE INDEX idx_waiver_signatures_signed_at ON waiver_signatures(signed_at DESC);
CREATE INDEX idx_waiver_signatures_is_valid ON waiver_signatures(is_valid);

-- =====================================================
-- PART 6: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Admin tables - service role only
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_query_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to admin_logs" ON admin_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to admin_errors" ON admin_errors FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to system_health_checks" ON system_health_checks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to cleanup_history" ON cleanup_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to admin_saved_queries" ON admin_saved_queries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access to admin_query_history" ON admin_query_history FOR ALL USING (auth.role() = 'service_role');

-- Mechanic documents
ALTER TABLE public.mechanic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanics can view own documents" ON public.mechanic_documents FOR SELECT USING (mechanic_id IN (SELECT id FROM public.mechanics WHERE id = mechanic_id));
CREATE POLICY "Mechanics can insert own documents" ON public.mechanic_documents FOR INSERT WITH CHECK (mechanic_id IN (SELECT id FROM public.mechanics WHERE id = mechanic_id));

-- Corporate tables
ALTER TABLE public.corporate_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_vehicles ENABLE ROW LEVEL SECURITY;

-- Waiver signatures
ALTER TABLE waiver_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waiver signatures" ON waiver_signatures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own waiver signatures" ON waiver_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all waiver signatures" ON waiver_signatures FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update waiver signatures" ON waiver_signatures FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- =====================================================
-- PART 7: HELPER FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_errors_updated_at BEFORE UPDATE ON admin_errors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_saved_queries_updated_at BEFORE UPDATE ON admin_saved_queries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_mechanic_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mechanics_last_updated ON public.mechanics;
CREATE TRIGGER update_mechanics_last_updated BEFORE UPDATE ON public.mechanics FOR EACH ROW EXECUTE FUNCTION update_mechanic_last_updated();

-- Corporate triggers
CREATE OR REPLACE FUNCTION public.handle_corporate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS corporate_businesses_updated_at ON public.corporate_businesses;
CREATE TRIGGER corporate_businesses_updated_at BEFORE UPDATE ON public.corporate_businesses FOR EACH ROW EXECUTE FUNCTION public.handle_corporate_updated_at();

DROP TRIGGER IF EXISTS corporate_employees_updated_at ON public.corporate_employees;
CREATE TRIGGER corporate_employees_updated_at BEFORE UPDATE ON public.corporate_employees FOR EACH ROW EXECUTE FUNCTION public.handle_corporate_updated_at();

DROP TRIGGER IF EXISTS corporate_invoices_updated_at ON public.corporate_invoices;
CREATE TRIGGER corporate_invoices_updated_at BEFORE UPDATE ON public.corporate_invoices FOR EACH ROW EXECUTE FUNCTION public.handle_corporate_updated_at();

DROP TRIGGER IF EXISTS corporate_vehicles_updated_at ON public.corporate_vehicles;
CREATE TRIGGER corporate_vehicles_updated_at BEFORE UPDATE ON public.corporate_vehicles FOR EACH ROW EXECUTE FUNCTION public.handle_corporate_updated_at();

-- Waiver updated_at
CREATE OR REPLACE FUNCTION update_waiver_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waiver_signatures_updated_at BEFORE UPDATE ON waiver_signatures FOR EACH ROW EXECUTE FUNCTION update_waiver_signatures_updated_at();

-- =====================================================
-- PART 8: SEED DATA
-- =====================================================

-- Insert some common saved queries
INSERT INTO admin_saved_queries (name, description, query, category, is_public) VALUES
  ('Active Sessions', 'Get all currently active sessions', 'SELECT * FROM sessions WHERE status = ''active'' ORDER BY created_at DESC LIMIT 50', 'sessions', true),
  ('Recent Errors (24h)', 'Get error logs from last 24 hours', 'SELECT * FROM admin_logs WHERE level = ''error'' AND created_at > NOW() - INTERVAL ''24 hours'' ORDER BY created_at DESC', 'monitoring', true),
  ('Pending Session Requests', 'Get all pending session requests', 'SELECT sr.*, p.email as customer_email FROM session_requests sr LEFT JOIN profiles p ON sr.customer_id = p.id WHERE sr.status = ''pending'' ORDER BY sr.created_at DESC', 'sessions', true),
  ('User Activity Summary', 'Get user registration and activity stats', 'SELECT DATE(created_at) as date, COUNT(*) as registrations FROM profiles GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30', 'users', true),
  ('Mechanic Availability', 'Show mechanics and their availability', 'SELECT id, name, email, status, available_for_sessions FROM mechanics ORDER BY name', 'mechanics', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

SELECT 'Admin panel migration completed successfully!' AS status;
SELECT 'Please proceed with creating storage buckets (see storage-buckets-setup.sql)' AS next_step;
