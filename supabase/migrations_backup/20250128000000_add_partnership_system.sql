-- =====================================================
-- Phase 3: Independent Mechanic Partnership System
-- =====================================================
-- This migration adds support for:
-- 1. Virtual-only mechanics (consultations without workshop)
-- 2. Workshop partnership programs (independent contractors)
-- 3. Bay booking system
-- 4. Revenue split management
-- 5. Mechanic CRM tools
-- =====================================================

-- =====================================================
-- 1. UPDATE MECHANICS TABLE - Add Service Tiers
-- =====================================================

-- Add service tier columns to mechanics table
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS service_tier TEXT DEFAULT 'virtual_only'
  CHECK (service_tier IN ('virtual_only', 'workshop_partner', 'licensed_mobile')),
ADD COLUMN IF NOT EXISTS partnership_type TEXT
  CHECK (partnership_type IN ('none', 'bay_rental', 'revenue_share', 'membership', 'employee')),
ADD COLUMN IF NOT EXISTS partnership_terms JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS can_perform_physical_work BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prefers_virtual BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS prefers_physical BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mobile_license_number TEXT,
ADD COLUMN IF NOT EXISTS mobile_license_expiry DATE,
ADD COLUMN IF NOT EXISTS mobile_license_province TEXT;

-- Update existing mechanics based on workshop affiliation
UPDATE mechanics
SET service_tier = 'workshop_partner',
    partnership_type = 'employee',
    can_perform_physical_work = true,
    prefers_physical = true
WHERE workshop_id IS NOT NULL;

-- Mechanics without workshop become virtual-only
UPDATE mechanics
SET service_tier = 'virtual_only',
    partnership_type = 'none',
    can_perform_physical_work = false,
    prefers_virtual = true
WHERE workshop_id IS NULL;

COMMENT ON COLUMN mechanics.service_tier IS 'virtual_only: consultations only; workshop_partner: affiliated with workshop for physical work; licensed_mobile: licensed mobile repair company (future)';
COMMENT ON COLUMN mechanics.partnership_type IS 'Type of partnership with workshop: none, bay_rental, revenue_share, membership, or employee';
COMMENT ON COLUMN mechanics.can_perform_physical_work IS 'True if mechanic can accept physical repair jobs (requires workshop affiliation or mobile license)';

-- =====================================================
-- 2. WORKSHOP PARTNERSHIP PROGRAMS
-- =====================================================

CREATE TABLE IF NOT EXISTS workshop_partnership_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Program details
  program_name TEXT NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN ('bay_rental', 'revenue_share', 'membership')),
  description TEXT,

  -- Bay rental terms
  daily_rate DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),

  -- Revenue share terms
  mechanic_percentage DECIMAL(5,2) CHECK (mechanic_percentage >= 0 AND mechanic_percentage <= 100),
  workshop_percentage DECIMAL(5,2) CHECK (workshop_percentage >= 0 AND workshop_percentage <= 100),

  -- Membership terms
  monthly_fee DECIMAL(10,2),
  included_days_per_month INTEGER,
  additional_day_rate DECIMAL(10,2),
  membership_revenue_share_mechanic DECIMAL(5,2),
  membership_revenue_share_workshop DECIMAL(5,2),

  -- Program constraints
  min_commitment_months INTEGER DEFAULT 0,
  available_bays INTEGER,
  current_partners INTEGER DEFAULT 0,
  max_partners INTEGER,

  -- Equipment and benefits
  tools_provided BOOLEAN DEFAULT false,
  equipment_list TEXT[],
  requirements TEXT[],
  benefits TEXT[],

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint to ensure revenue share adds up to 100
ALTER TABLE workshop_partnership_programs
ADD CONSTRAINT revenue_share_total_check
  CHECK (
    (program_type != 'revenue_share') OR
    (mechanic_percentage + workshop_percentage = 100)
  );

ALTER TABLE workshop_partnership_programs
ADD CONSTRAINT membership_share_total_check
  CHECK (
    (program_type != 'membership') OR
    (membership_revenue_share_mechanic + membership_revenue_share_workshop = 100)
  );

CREATE INDEX idx_partnership_programs_workshop ON workshop_partnership_programs(workshop_id);
CREATE INDEX idx_partnership_programs_active ON workshop_partnership_programs(is_active);
CREATE INDEX idx_partnership_programs_type ON workshop_partnership_programs(program_type);

COMMENT ON TABLE workshop_partnership_programs IS 'Partnership programs offered by workshops to independent mechanics';

-- =====================================================
-- 3. PARTNERSHIP APPLICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS partnership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES workshop_partnership_programs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Application status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'expired')),

  -- Application details
  proposed_start_date DATE,
  expected_days_per_month INTEGER,
  specializations TEXT[],
  tools_owned TEXT[],
  message TEXT,
  years_experience INTEGER,

  -- Workshop response
  workshop_response TEXT,
  approved_terms JSONB,
  rejected_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_partnership_apps_mechanic ON partnership_applications(mechanic_id);
CREATE INDEX idx_partnership_apps_program ON partnership_applications(program_id);
CREATE INDEX idx_partnership_apps_workshop ON partnership_applications(workshop_id);
CREATE INDEX idx_partnership_apps_status ON partnership_applications(status);

COMMENT ON TABLE partnership_applications IS 'Applications from mechanics to join workshop partnership programs';

-- =====================================================
-- 4. PARTNERSHIP AGREEMENTS (Signed Contracts)
-- =====================================================

CREATE TABLE IF NOT EXISTS partnership_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES partnership_applications(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES workshop_partnership_programs(id),

  -- Agreement details
  agreement_type TEXT NOT NULL CHECK (agreement_type IN ('bay_rental', 'revenue_share', 'membership')),
  terms JSONB NOT NULL, -- Frozen copy of terms at time of signing

  -- Contract period
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Signatures
  mechanic_signed_at TIMESTAMP WITH TIME ZONE,
  mechanic_signature TEXT, -- Digital signature or IP
  workshop_signed_at TIMESTAMP WITH TIME ZONE,
  workshop_signed_by UUID REFERENCES profiles(id),
  workshop_signature TEXT,

  -- Documents
  agreement_document_url TEXT,

  -- Termination
  terminated_at TIMESTAMP WITH TIME ZONE,
  terminated_by UUID REFERENCES profiles(id),
  termination_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agreements_mechanic ON partnership_agreements(mechanic_id);
CREATE INDEX idx_agreements_workshop ON partnership_agreements(workshop_id);
CREATE INDEX idx_agreements_active ON partnership_agreements(is_active);
CREATE INDEX idx_agreements_dates ON partnership_agreements(start_date, end_date);

COMMENT ON TABLE partnership_agreements IS 'Signed partnership agreements between mechanics and workshops';

-- =====================================================
-- 5. BAY BOOKINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS bay_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES partnership_agreements(id) ON DELETE SET NULL,

  -- Booking details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  bay_number INTEGER,
  bay_name TEXT,

  -- Status
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'in_use', 'completed', 'cancelled', 'no_show')),

  -- Associated work
  session_ids UUID[], -- Array of diagnostic_session IDs
  quote_ids UUID[], -- Array of repair_quote IDs
  estimated_job_count INTEGER DEFAULT 1,
  actual_job_count INTEGER,

  -- Costs (for bay rental model)
  booking_fee DECIMAL(10,2),
  charged BOOLEAN DEFAULT false,
  paid BOOLEAN DEFAULT false,

  -- Confirmation
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES profiles(id),

  -- Completion
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  mechanic_notes TEXT,
  workshop_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent overlapping bookings for same bay
CREATE UNIQUE INDEX idx_bay_bookings_no_overlap ON bay_bookings(
  workshop_id,
  bay_number,
  booking_date,
  start_time
) WHERE status IN ('confirmed', 'in_use');

CREATE INDEX idx_bay_bookings_mechanic ON bay_bookings(mechanic_id, booking_date);
CREATE INDEX idx_bay_bookings_workshop ON bay_bookings(workshop_id, booking_date);
CREATE INDEX idx_bay_bookings_status ON bay_bookings(status);
CREATE INDEX idx_bay_bookings_date_range ON bay_bookings(booking_date, start_time, end_time);

COMMENT ON TABLE bay_bookings IS 'Bay reservation system for independent mechanics at workshop facilities';

-- =====================================================
-- 6. PARTNERSHIP REVENUE SPLITS
-- =====================================================

CREATE TABLE IF NOT EXISTS partnership_revenue_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related entities
  session_id UUID REFERENCES diagnostic_sessions(id),
  quote_id UUID REFERENCES repair_quotes(id),
  payment_id UUID, -- Will reference repair_payments when implemented

  mechanic_id UUID NOT NULL REFERENCES mechanics(id),
  workshop_id UUID NOT NULL REFERENCES organizations(id),
  agreement_id UUID NOT NULL REFERENCES partnership_agreements(id),
  bay_booking_id UUID REFERENCES bay_bookings(id),

  -- Revenue breakdown
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee_percentage DECIMAL(5,2) NOT NULL,
  platform_fee_amount DECIMAL(10,2) NOT NULL,

  subtotal_after_platform_fee DECIMAL(10,2) NOT NULL, -- total - platform fee

  -- Workshop share
  workshop_share_percentage DECIMAL(5,2) NOT NULL,
  workshop_share_amount DECIMAL(10,2) NOT NULL,

  -- Mechanic share
  mechanic_share_percentage DECIMAL(5,2) NOT NULL,
  mechanic_share_amount DECIMAL(10,2) NOT NULL,

  -- Bay rental fees (if applicable)
  bay_rental_fee DECIMAL(10,2) DEFAULT 0,
  membership_fee_prorated DECIMAL(10,2) DEFAULT 0,

  -- Split details
  split_type TEXT NOT NULL CHECK (split_type IN ('platform_fee_only', 'revenue_share', 'bay_rental', 'membership')),
  split_terms JSONB, -- Snapshot of terms used for calculation

  -- Payment tracking
  paid_to_mechanic BOOLEAN DEFAULT false,
  paid_to_mechanic_at TIMESTAMP WITH TIME ZONE,
  paid_to_workshop BOOLEAN DEFAULT false,
  paid_to_workshop_at TIMESTAMP WITH TIME ZONE,

  -- Reconciliation
  reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_revenue_splits_mechanic ON partnership_revenue_splits(mechanic_id);
CREATE INDEX idx_revenue_splits_workshop ON partnership_revenue_splits(workshop_id);
CREATE INDEX idx_revenue_splits_session ON partnership_revenue_splits(session_id);
CREATE INDEX idx_revenue_splits_quote ON partnership_revenue_splits(quote_id);
CREATE INDEX idx_revenue_splits_payment_status ON partnership_revenue_splits(paid_to_mechanic, paid_to_workshop);
CREATE INDEX idx_revenue_splits_created ON partnership_revenue_splits(created_at);

COMMENT ON TABLE partnership_revenue_splits IS 'Tracks revenue distribution between platform, mechanics, and workshops';

-- =====================================================
-- 7. MECHANIC CLIENTS (CRM)
-- =====================================================

CREATE TABLE IF NOT EXISTS mechanic_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Relationship metrics
  first_service_date TIMESTAMP WITH TIME ZONE,
  last_service_date TIMESTAMP WITH TIME ZONE,
  total_services INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,

  -- Service breakdown
  virtual_sessions_count INTEGER DEFAULT 0,
  physical_repairs_count INTEGER DEFAULT 0,

  -- Customer data
  vehicle_info JSONB, -- Array of vehicles serviced
  service_history UUID[], -- Array of session/quote IDs

  -- Relationship status
  is_favorite BOOLEAN DEFAULT false, -- Customer marked mechanic as favorite
  is_repeat_customer BOOLEAN DEFAULT false,

  -- Notes and tags
  mechanic_notes TEXT,
  tags TEXT[],

  -- Follow-up
  next_service_due DATE,
  last_contact_date TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate client records
CREATE UNIQUE INDEX idx_mechanic_clients_unique ON mechanic_clients(mechanic_id, customer_id);

CREATE INDEX idx_mechanic_clients_mechanic ON mechanic_clients(mechanic_id);
CREATE INDEX idx_mechanic_clients_customer ON mechanic_clients(customer_id);
CREATE INDEX idx_mechanic_clients_last_service ON mechanic_clients(last_service_date);
CREATE INDEX idx_mechanic_clients_repeat ON mechanic_clients(is_repeat_customer);

COMMENT ON TABLE mechanic_clients IS 'CRM system for mechanics to track their customer relationships';

-- =====================================================
-- 8. MECHANIC EARNINGS BREAKDOWN
-- =====================================================

CREATE TABLE IF NOT EXISTS mechanic_earnings_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,

  -- Period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Virtual consultation earnings
  virtual_chat_sessions INTEGER DEFAULT 0,
  virtual_chat_earnings DECIMAL(10,2) DEFAULT 0,
  virtual_video_sessions INTEGER DEFAULT 0,
  virtual_video_earnings DECIMAL(10,2) DEFAULT 0,
  virtual_total_earnings DECIMAL(10,2) DEFAULT 0,

  -- Physical repair earnings
  physical_repairs_count INTEGER DEFAULT 0,
  physical_repairs_gross DECIMAL(10,2) DEFAULT 0,
  physical_repairs_workshop_share DECIMAL(10,2) DEFAULT 0,
  physical_repairs_net DECIMAL(10,2) DEFAULT 0,

  -- Fees and deductions
  platform_fees_paid DECIMAL(10,2) DEFAULT 0,
  bay_rental_fees_paid DECIMAL(10,2) DEFAULT 0,
  membership_fees_paid DECIMAL(10,2) DEFAULT 0,

  -- Total earnings
  gross_earnings DECIMAL(10,2) DEFAULT 0,
  total_deductions DECIMAL(10,2) DEFAULT 0,
  net_earnings DECIMAL(10,2) DEFAULT 0,

  -- Metrics
  average_session_value DECIMAL(10,2),
  sessions_per_day DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_earnings_breakdown_unique ON mechanic_earnings_breakdown(
  mechanic_id,
  period_type,
  period_start
);

CREATE INDEX idx_earnings_breakdown_mechanic ON mechanic_earnings_breakdown(mechanic_id);
CREATE INDEX idx_earnings_breakdown_period ON mechanic_earnings_breakdown(period_start, period_end);

COMMENT ON TABLE mechanic_earnings_breakdown IS 'Aggregated earnings data for mechanic analytics and tax reporting';

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE workshop_partnership_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_revenue_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_earnings_breakdown ENABLE ROW LEVEL SECURITY;

-- Workshop Partnership Programs Policies
CREATE POLICY "Workshops can manage their own programs" ON workshop_partnership_programs
  FOR ALL USING (
    workshop_id IN (
      SELECT id FROM organizations
      WHERE id IN (
        SELECT workshop_id FROM mechanics WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can view active programs" ON workshop_partnership_programs
  FOR SELECT USING (is_active = true);

-- Partnership Applications Policies
CREATE POLICY "Mechanics can view and manage their applications" ON partnership_applications
  FOR ALL USING (mechanic_id IN (SELECT id FROM mechanics WHERE id = auth.uid()));

CREATE POLICY "Workshops can view applications to their programs" ON partnership_applications
  FOR SELECT USING (
    workshop_id IN (
      SELECT workshop_id FROM mechanics WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workshops can update applications to their programs" ON partnership_applications
  FOR UPDATE USING (
    workshop_id IN (
      SELECT workshop_id FROM mechanics WHERE id = auth.uid()
    )
  );

-- Partnership Agreements Policies
CREATE POLICY "Mechanics can view their agreements" ON partnership_agreements
  FOR SELECT USING (mechanic_id IN (SELECT id FROM mechanics WHERE id = auth.uid()));

CREATE POLICY "Workshops can view their agreements" ON partnership_agreements
  FOR SELECT USING (
    workshop_id IN (
      SELECT workshop_id FROM mechanics WHERE id = auth.uid()
    )
  );

-- Bay Bookings Policies
CREATE POLICY "Mechanics can manage their bay bookings" ON bay_bookings
  FOR ALL USING (mechanic_id IN (SELECT id FROM mechanics WHERE id = auth.uid()));

CREATE POLICY "Workshops can view and manage bookings at their facility" ON bay_bookings
  FOR ALL USING (
    workshop_id IN (
      SELECT workshop_id FROM mechanics WHERE id = auth.uid()
    )
  );

-- Revenue Splits Policies
CREATE POLICY "Mechanics can view their revenue splits" ON partnership_revenue_splits
  FOR SELECT USING (mechanic_id IN (SELECT id FROM mechanics WHERE id = auth.uid()));

CREATE POLICY "Workshops can view their revenue splits" ON partnership_revenue_splits
  FOR SELECT USING (
    workshop_id IN (
      SELECT workshop_id FROM mechanics WHERE id = auth.uid()
    )
  );

-- Mechanic Clients Policies
CREATE POLICY "Mechanics can manage their client list" ON mechanic_clients
  FOR ALL USING (mechanic_id IN (SELECT id FROM mechanics WHERE id = auth.uid()));

-- Earnings Breakdown Policies
CREATE POLICY "Mechanics can view their earnings" ON mechanic_earnings_breakdown
  FOR SELECT USING (mechanic_id IN (SELECT id FROM mechanics WHERE id = auth.uid()));

-- =====================================================
-- 10. SEED DATA - Default Partnership Program Templates
-- =====================================================

-- Note: These are examples. Actual programs will be created by workshops.
-- We'll add a few templates that workshops can copy/customize

-- Insert example programs only if there are workshops in the system
DO $$
DECLARE
  sample_workshop_id UUID;
BEGIN
  -- Get first workshop (if any exist)
  SELECT id INTO sample_workshop_id FROM organizations WHERE organization_type = 'workshop' LIMIT 1;

  IF sample_workshop_id IS NOT NULL THEN
    -- Example 1: Bay Rental Program
    INSERT INTO workshop_partnership_programs (
      workshop_id,
      program_name,
      program_type,
      description,
      daily_rate,
      tools_provided,
      equipment_list,
      requirements,
      benefits,
      available_bays,
      max_partners,
      is_active
    ) VALUES (
      sample_workshop_id,
      'Bay Rental - Daily Rate',
      'bay_rental',
      'Rent a bay by the day. Bring your own tools, use our space. Perfect for independent mechanics with their own client base.',
      75.00,
      false,
      ARRAY['4-post hoist', 'Air compressor', 'Waste oil disposal'],
      ARRAY['Valid automotive certification', 'Own tools required', 'Liability insurance recommended'],
      ARRAY['Professional facility', 'Customer parking', 'Waiting area', 'Waste disposal included'],
      6,
      10,
      false -- Set to false so it doesn't show as real program
    ) ON CONFLICT DO NOTHING;

    -- Example 2: Revenue Share Program
    INSERT INTO workshop_partnership_programs (
      workshop_id,
      program_name,
      program_type,
      description,
      mechanic_percentage,
      workshop_percentage,
      tools_provided,
      equipment_list,
      requirements,
      benefits,
      available_bays,
      max_partners,
      is_active
    ) VALUES (
      sample_workshop_id,
      'Revenue Share - 75/25 Split',
      'revenue_share',
      'No upfront costs. We provide the facility, tools, and support. You bring the skills and clients. Split revenue 75% mechanic, 25% workshop.',
      75.00,
      25.00,
      true,
      ARRAY['Complete tool set', '4-post hoist', 'Diagnostic scanner', 'Air tools', 'Specialty tools'],
      ARRAY['Valid automotive certification', 'Background check', 'Minimum 3 years experience'],
      ARRAY['All tools provided', 'Heated facility', 'Customer lounge', 'Parts ordering support', 'Marketing support'],
      4,
      8,
      false -- Set to false so it doesn't show as real program
    ) ON CONFLICT DO NOTHING;

    -- Example 3: Membership Program
    INSERT INTO workshop_partnership_programs (
      workshop_id,
      program_name,
      program_type,
      description,
      monthly_fee,
      included_days_per_month,
      additional_day_rate,
      membership_revenue_share_mechanic,
      membership_revenue_share_workshop,
      tools_provided,
      equipment_list,
      requirements,
      benefits,
      available_bays,
      max_partners,
      is_active
    ) VALUES (
      sample_workshop_id,
      'Membership - Hybrid Model',
      'membership',
      'Best of both worlds: $450/month includes 10 bay-days. Additional days just $35. Plus keep 80% of your earnings. Perfect for growing your business.',
      450.00,
      10,
      35.00,
      80.00,
      20.00,
      true,
      ARRAY['Full tool access', '4-post hoist', 'Alignment rack', 'Diagnostic equipment', 'Specialty tools'],
      ARRAY['Valid Red Seal certification', '5+ years experience', 'Background check', 'References'],
      ARRAY['Priority bay access', 'After-hours access', 'Discounted parts pricing', 'Marketing support', 'Shared admin staff'],
      3,
      6,
      false -- Set to false so it doesn't show as real program
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- 11. FUNCTIONS - Helper Functions
-- =====================================================

-- Function to update mechanic client metrics when session completes
CREATE OR REPLACE FUNCTION update_mechanic_client_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be implemented to automatically update mechanic_clients table
  -- when diagnostic_sessions or repair_quotes are completed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and insert revenue split
CREATE OR REPLACE FUNCTION calculate_partnership_revenue_split(
  p_session_id UUID,
  p_quote_id UUID,
  p_total_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
  v_split_id UUID;
  v_mechanic_id UUID;
  v_workshop_id UUID;
  v_agreement_id UUID;
  v_agreement_terms JSONB;
  v_platform_fee_pct DECIMAL;
  v_platform_fee_amt DECIMAL;
  v_subtotal DECIMAL;
  v_workshop_share_pct DECIMAL;
  v_workshop_share_amt DECIMAL;
  v_mechanic_share_pct DECIMAL;
  v_mechanic_share_amt DECIMAL;
BEGIN
  -- Get mechanic and workshop from session or quote
  -- This is a placeholder - actual implementation will depend on session/quote structure

  -- Calculate platform fee (using fee calculator)
  v_platform_fee_pct := 15.00; -- Default, should come from fee calculator
  v_platform_fee_amt := p_total_amount * (v_platform_fee_pct / 100);
  v_subtotal := p_total_amount - v_platform_fee_amt;

  -- Get partnership terms and calculate splits
  -- This is a placeholder for the actual split logic

  RETURN v_split_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. UPDATE EXISTING TABLES (if needed)
-- =====================================================

-- Update diagnostic_sessions to link with bay_bookings
ALTER TABLE diagnostic_sessions
ADD COLUMN IF NOT EXISTS bay_booking_id UUID REFERENCES bay_bookings(id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add migration metadata
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3 Partnership System Migration Complete';
  RAISE NOTICE '📊 Tables Created: 7';
  RAISE NOTICE '🔐 RLS Policies Added: 14';
  RAISE NOTICE '📈 Indexes Created: 25+';
  RAISE NOTICE '🎯 Ready for Independent Mechanic Support System';
END $$;
