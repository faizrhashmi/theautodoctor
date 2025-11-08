-- Corporate Business Integration System
-- Creates tables for corporate accounts, employees, and invoicing
-- Enables B2B fleet management and multi-user corporate accounts

-- Step 1: Create corporate_businesses table
CREATE TABLE IF NOT EXISTS public.corporate_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Company information
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL UNIQUE,
  company_phone TEXT,
  company_website TEXT,

  -- Business classification
  industry TEXT, -- automotive, transportation, logistics, etc.
  business_type TEXT NOT NULL CHECK (business_type IN ('fleet', 'dealership', 'repair_shop', 'rental', 'taxi_service', 'trucking', 'other')),

  -- Address information
  street_address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',

  -- Billing information
  billing_email TEXT,
  billing_contact_name TEXT,
  billing_contact_phone TEXT,
  billing_address_same_as_company BOOLEAN DEFAULT true,
  billing_street_address TEXT,
  billing_city TEXT,
  billing_province TEXT,
  billing_postal_code TEXT,

  -- Subscription details
  subscription_tier TEXT NOT NULL DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise', 'custom')),
  contract_start_date DATE,
  contract_end_date DATE,
  auto_renew BOOLEAN DEFAULT true,

  -- Status and approval
  is_active BOOLEAN DEFAULT false,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users (id),
  rejection_reason TEXT,

  -- Account management
  assigned_account_manager_id UUID REFERENCES auth.users (id),

  -- Fleet and usage limits
  fleet_size INTEGER,
  monthly_session_limit INTEGER,
  current_month_sessions INTEGER DEFAULT 0,

  -- Pricing and discounts
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  custom_rate_per_session DECIMAL(10,2),
  payment_terms TEXT DEFAULT 'net_30', -- net_30, net_60, prepaid, etc.

  -- Contact person (primary)
  primary_contact_name TEXT NOT NULL,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT,
  primary_contact_title TEXT,

  -- Additional details
  business_registration_number TEXT,
  tax_id TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for corporate_businesses
CREATE INDEX IF NOT EXISTS corporate_businesses_company_email_idx ON public.corporate_businesses (company_email);
CREATE INDEX IF NOT EXISTS corporate_businesses_approval_status_idx ON public.corporate_businesses (approval_status);
CREATE INDEX IF NOT EXISTS corporate_businesses_is_active_idx ON public.corporate_businesses (is_active);
CREATE INDEX IF NOT EXISTS corporate_businesses_assigned_manager_idx ON public.corporate_businesses (assigned_account_manager_id);
CREATE INDEX IF NOT EXISTS corporate_businesses_business_type_idx ON public.corporate_businesses (business_type);

-- Step 2: Create corporate_employees table
CREATE TABLE IF NOT EXISTS public.corporate_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Link to corporate account and user
  corporate_id UUID NOT NULL REFERENCES public.corporate_businesses (id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

  -- Employee details
  employee_role TEXT NOT NULL CHECK (employee_role IN ('driver', 'fleet_manager', 'admin', 'technician', 'supervisor')),
  employee_number TEXT,
  department TEXT,

  -- Employee status
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users (id),
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES auth.users (id),

  -- Usage tracking
  total_sessions INTEGER DEFAULT 0,
  last_session_at TIMESTAMPTZ,

  -- Additional details
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Ensure unique employee per corporate account
  UNIQUE (corporate_id, employee_user_id)
);

-- Indexes for corporate_employees
CREATE INDEX IF NOT EXISTS corporate_employees_corporate_idx ON public.corporate_employees (corporate_id);
CREATE INDEX IF NOT EXISTS corporate_employees_user_idx ON public.corporate_employees (employee_user_id);
CREATE INDEX IF NOT EXISTS corporate_employees_role_idx ON public.corporate_employees (employee_role);
CREATE INDEX IF NOT EXISTS corporate_employees_is_active_idx ON public.corporate_employees (is_active);

-- Step 3: Create corporate_invoices table
CREATE TABLE IF NOT EXISTS public.corporate_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE,
  corporate_id UUID NOT NULL REFERENCES public.corporate_businesses (id) ON DELETE CASCADE,

  -- Billing period
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  -- Amounts
  subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Sessions included
  sessions_count INTEGER NOT NULL DEFAULT 0,
  session_ids JSONB DEFAULT '[]'::jsonb,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  sent_at TIMESTAMPTZ,
  due_date DATE,
  paid_at TIMESTAMPTZ,

  -- Payment details
  payment_method TEXT,
  payment_reference TEXT,
  stripe_invoice_id TEXT,

  -- Invoice file
  pdf_url TEXT,

  -- Additional details
  notes TEXT,
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for corporate_invoices
CREATE INDEX IF NOT EXISTS corporate_invoices_corporate_idx ON public.corporate_invoices (corporate_id);
CREATE INDEX IF NOT EXISTS corporate_invoices_invoice_number_idx ON public.corporate_invoices (invoice_number);
CREATE INDEX IF NOT EXISTS corporate_invoices_status_idx ON public.corporate_invoices (status);
CREATE INDEX IF NOT EXISTS corporate_invoices_billing_period_idx ON public.corporate_invoices (billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS corporate_invoices_due_date_idx ON public.corporate_invoices (due_date);

-- Step 4: Create corporate_vehicles table (for fleet management)
CREATE TABLE IF NOT EXISTS public.corporate_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Link to corporate account
  corporate_id UUID NOT NULL REFERENCES public.corporate_businesses (id) ON DELETE CASCADE,

  -- Vehicle details
  vehicle_number TEXT, -- internal fleet number
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,

  -- Assignment
  assigned_to_employee_id UUID REFERENCES public.corporate_employees (id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Service tracking
  last_service_date DATE,
  next_service_date DATE,
  total_sessions INTEGER DEFAULT 0,

  -- Additional details
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for corporate_vehicles
CREATE INDEX IF NOT EXISTS corporate_vehicles_corporate_idx ON public.corporate_vehicles (corporate_id);
CREATE INDEX IF NOT EXISTS corporate_vehicles_assigned_to_idx ON public.corporate_vehicles (assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS corporate_vehicles_vin_idx ON public.corporate_vehicles (vin);
CREATE INDEX IF NOT EXISTS corporate_vehicles_license_plate_idx ON public.corporate_vehicles (license_plate);

-- Step 5: Link sessions to corporate accounts
DO $$
BEGIN
  -- Add corporate_id to sessions table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'corporate_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN corporate_id UUID REFERENCES public.corporate_businesses (id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS sessions_corporate_idx ON public.sessions (corporate_id);
  END IF;

  -- Add corporate_employee_id to sessions table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'corporate_employee_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN corporate_employee_id UUID REFERENCES public.corporate_employees (id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS sessions_corporate_employee_idx ON public.sessions (corporate_employee_id);
  END IF;

  -- Add corporate_vehicle_id to sessions table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'corporate_vehicle_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN corporate_vehicle_id UUID REFERENCES public.corporate_vehicles (id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS sessions_corporate_vehicle_idx ON public.sessions (corporate_vehicle_id);
  END IF;
END $$;

-- Step 6: Enable RLS on corporate tables
ALTER TABLE public.corporate_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_vehicles ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for corporate_businesses
-- Admins can see all corporate accounts
DROP POLICY IF EXISTS "Admins can view all corporate accounts" ON public.corporate_businesses;
CREATE POLICY "Admins can view all corporate accounts"
  ON public.corporate_businesses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admins can manage all corporate accounts
DROP POLICY IF EXISTS "Admins can manage corporate accounts" ON public.corporate_businesses;
CREATE POLICY "Admins can manage corporate accounts"
  ON public.corporate_businesses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Corporate employees can view their own corporate account
DROP POLICY IF EXISTS "Corporate employees can view their account" ON public.corporate_businesses;
CREATE POLICY "Corporate employees can view their account"
  ON public.corporate_businesses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.corporate_employees
      WHERE corporate_employees.corporate_id = corporate_businesses.id
        AND corporate_employees.employee_user_id = auth.uid()
        AND corporate_employees.is_active = true
    )
  );

-- Step 8: RLS Policies for corporate_employees
-- Admins can view all corporate employees
DROP POLICY IF EXISTS "Admins can view all corporate employees" ON public.corporate_employees;
CREATE POLICY "Admins can view all corporate employees"
  ON public.corporate_employees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Corporate admins can manage employees in their organization
DROP POLICY IF EXISTS "Corporate admins can manage employees" ON public.corporate_employees;
CREATE POLICY "Corporate admins can manage employees"
  ON public.corporate_employees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.corporate_employees ce
      WHERE ce.corporate_id = corporate_employees.corporate_id
        AND ce.employee_user_id = auth.uid()
        AND ce.employee_role IN ('admin', 'fleet_manager')
        AND ce.is_active = true
    )
  );

-- Employees can view themselves
DROP POLICY IF EXISTS "Employees can view themselves" ON public.corporate_employees;
CREATE POLICY "Employees can view themselves"
  ON public.corporate_employees
  FOR SELECT
  USING (employee_user_id = auth.uid());

-- Step 9: RLS Policies for corporate_invoices
-- Admins can view all invoices
DROP POLICY IF EXISTS "Admins can view all corporate invoices" ON public.corporate_invoices;
CREATE POLICY "Admins can view all corporate invoices"
  ON public.corporate_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Corporate admins can view their invoices
DROP POLICY IF EXISTS "Corporate admins can view their invoices" ON public.corporate_invoices;
CREATE POLICY "Corporate admins can view their invoices"
  ON public.corporate_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.corporate_employees ce
      WHERE ce.corporate_id = corporate_invoices.corporate_id
        AND ce.employee_user_id = auth.uid()
        AND ce.employee_role IN ('admin', 'fleet_manager')
        AND ce.is_active = true
    )
  );

-- Step 10: RLS Policies for corporate_vehicles
-- Admins can view all vehicles
DROP POLICY IF EXISTS "Admins can view all corporate vehicles" ON public.corporate_vehicles;
CREATE POLICY "Admins can view all corporate vehicles"
  ON public.corporate_vehicles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Corporate employees can view vehicles in their organization
DROP POLICY IF EXISTS "Corporate employees can view their vehicles" ON public.corporate_vehicles;
CREATE POLICY "Corporate employees can view their vehicles"
  ON public.corporate_vehicles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.corporate_employees ce
      WHERE ce.corporate_id = corporate_vehicles.corporate_id
        AND ce.employee_user_id = auth.uid()
        AND ce.is_active = true
    )
  );

-- Corporate admins can manage vehicles
DROP POLICY IF EXISTS "Corporate admins can manage vehicles" ON public.corporate_vehicles;
CREATE POLICY "Corporate admins can manage vehicles"
  ON public.corporate_vehicles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.corporate_employees ce
      WHERE ce.corporate_id = corporate_vehicles.corporate_id
        AND ce.employee_user_id = auth.uid()
        AND ce.employee_role IN ('admin', 'fleet_manager')
        AND ce.is_active = true
    )
  );

-- Step 11: Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_corporate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS corporate_businesses_updated_at ON public.corporate_businesses;
CREATE TRIGGER corporate_businesses_updated_at
  BEFORE UPDATE ON public.corporate_businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_corporate_updated_at();

DROP TRIGGER IF EXISTS corporate_employees_updated_at ON public.corporate_employees;
CREATE TRIGGER corporate_employees_updated_at
  BEFORE UPDATE ON public.corporate_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_corporate_updated_at();

DROP TRIGGER IF EXISTS corporate_invoices_updated_at ON public.corporate_invoices;
CREATE TRIGGER corporate_invoices_updated_at
  BEFORE UPDATE ON public.corporate_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_corporate_updated_at();

DROP TRIGGER IF EXISTS corporate_vehicles_updated_at ON public.corporate_vehicles;
CREATE TRIGGER corporate_vehicles_updated_at
  BEFORE UPDATE ON public.corporate_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_corporate_updated_at();

-- Step 12: Function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_corporate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  invoice_count INTEGER;
  year_suffix TEXT;
  month_suffix TEXT;
BEGIN
  -- Get current count of invoices for this month
  SELECT COUNT(*) INTO invoice_count
  FROM public.corporate_invoices
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE);

  -- Format: INV-YYYY-MM-NNNN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
  month_suffix := TO_CHAR(CURRENT_DATE, 'MM');

  RETURN 'INV-' || year_suffix || '-' || month_suffix || '-' || LPAD((invoice_count + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Step 13: Function to update corporate session count
CREATE OR REPLACE FUNCTION public.increment_corporate_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.corporate_id IS NOT NULL THEN
    -- Update corporate business monthly session count
    UPDATE public.corporate_businesses
    SET current_month_sessions = current_month_sessions + 1
    WHERE id = NEW.corporate_id;

    -- Update corporate employee total sessions
    IF NEW.corporate_employee_id IS NOT NULL THEN
      UPDATE public.corporate_employees
      SET total_sessions = total_sessions + 1,
          last_session_at = NEW.created_at
      WHERE id = NEW.corporate_employee_id;
    END IF;

    -- Update corporate vehicle total sessions
    IF NEW.corporate_vehicle_id IS NOT NULL THEN
      UPDATE public.corporate_vehicles
      SET total_sessions = total_sessions + 1
      WHERE id = NEW.corporate_vehicle_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_increment_corporate_count ON public.sessions;
CREATE TRIGGER sessions_increment_corporate_count
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_corporate_session_count();

-- Step 14: Function to reset monthly session counts
CREATE OR REPLACE FUNCTION public.reset_corporate_monthly_counts()
RETURNS void AS $$
BEGIN
  UPDATE public.corporate_businesses
  SET current_month_sessions = 0
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Verification
SELECT 'Corporate business integration system created successfully!' AS status;

-- Show stats
SELECT
  (SELECT COUNT(*) FROM public.corporate_businesses) as total_corporate_accounts,
  (SELECT COUNT(*) FROM public.corporate_businesses WHERE approval_status = 'pending') as pending_approvals,
  (SELECT COUNT(*) FROM public.corporate_businesses WHERE is_active = true) as active_accounts,
  (SELECT COUNT(*) FROM public.corporate_employees) as total_employees,
  (SELECT COUNT(*) FROM public.corporate_invoices) as total_invoices,
  (SELECT COUNT(*) FROM public.corporate_vehicles) as total_vehicles;
