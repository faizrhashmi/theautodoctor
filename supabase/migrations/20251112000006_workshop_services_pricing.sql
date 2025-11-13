-- =====================================================
-- Workshop Services and Flexible Pricing System
-- Created: 2025-11-12
-- Purpose: Allow workshops to set their own prices for services
--          while maintaining consistent platform commission
-- =====================================================

-- =====================================================
-- STEP 1: Create service_catalog table (platform-defined services)
-- =====================================================

CREATE TABLE IF NOT EXISTS service_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name VARCHAR(100) NOT NULL UNIQUE,
  service_category VARCHAR(50) NOT NULL, -- 'maintenance', 'repair', 'diagnostic', 'inspection'
  description TEXT,
  requires_diagnostic BOOLEAN NOT NULL DEFAULT false,
  typical_duration_minutes INTEGER,
  platform_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,

  -- Suggested pricing (for workshop reference)
  suggested_price_min DECIMAL(10,2),
  suggested_price_max DECIMAL(10,2),

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CHECK (service_category IN ('maintenance', 'repair', 'diagnostic', 'inspection', 'other')),
  CHECK (platform_commission_percent >= 0 AND platform_commission_percent <= 100),
  CHECK (suggested_price_min IS NULL OR suggested_price_min >= 0),
  CHECK (suggested_price_max IS NULL OR suggested_price_max >= suggested_price_min)
);

CREATE INDEX idx_service_catalog_category ON service_catalog(service_category);
CREATE INDEX idx_service_catalog_active ON service_catalog(is_active);

COMMENT ON TABLE service_catalog IS 'Platform-defined service types that workshops can offer with their own pricing';
COMMENT ON COLUMN service_catalog.requires_diagnostic IS 'Whether this service requires a diagnostic inspection first';
COMMENT ON COLUMN service_catalog.platform_commission_percent IS 'Platform commission percentage for this service type (15% for repairs, 30% for diagnostics)';

-- =====================================================
-- STEP 2: Create workshop_services table (workshop pricing)
-- =====================================================

CREATE TABLE IF NOT EXISTS workshop_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_catalog_id UUID NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,

  -- Workshop's custom pricing
  price DECIMAL(10,2) NOT NULL,
  estimated_duration_minutes INTEGER,

  -- Workshop can add custom notes
  workshop_notes TEXT,

  -- Availability
  is_offered BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One service per workshop
  UNIQUE(workshop_id, service_catalog_id),

  CHECK (price > 0),
  CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0)
);

CREATE INDEX idx_workshop_services_workshop_id ON workshop_services(workshop_id);
CREATE INDEX idx_workshop_services_service_catalog_id ON workshop_services(service_catalog_id);
CREATE INDEX idx_workshop_services_offered ON workshop_services(is_offered);

COMMENT ON TABLE workshop_services IS 'Workshop-specific pricing for platform services. Each workshop sets their own prices.';
COMMENT ON COLUMN workshop_services.price IS 'Workshop''s price for this service (customer-facing). Platform commission is calculated separately.';

-- =====================================================
-- STEP 3: Add payment tracking to workshop_appointments
-- =====================================================

-- Add payment-related columns to workshop_appointments
DO $$
BEGIN
    -- Total amount (workshop's price)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN total_amount DECIMAL(10,2);
    END IF;

    -- Deposit amount (25% for services, 100% for diagnostics)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'deposit_amount'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN deposit_amount DECIMAL(10,2);
    END IF;

    -- Remaining balance
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'remaining_amount'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN remaining_amount DECIMAL(10,2);
    END IF;

    -- Platform commission (calculated from service catalog)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'platform_commission_percent'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN platform_commission_percent DECIMAL(5,2) DEFAULT 15.00;
    END IF;

    -- Payment status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending',
        ADD CONSTRAINT chk_payment_status CHECK (payment_status IN ('pending', 'deposit_paid', 'paid_full', 'refunded', 'cancelled'));
    END IF;

    -- Stripe payment intent IDs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'deposit_payment_intent_id'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN deposit_payment_intent_id VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'final_payment_intent_id'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN final_payment_intent_id VARCHAR(255);
    END IF;

    -- Service catalog reference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'service_catalog_id'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN service_catalog_id UUID REFERENCES service_catalog(id);
    END IF;

    -- Workshop service reference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'workshop_service_id'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN workshop_service_id UUID REFERENCES workshop_services(id);
    END IF;

    -- Payment timestamps
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'deposit_paid_at'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN deposit_paid_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'final_paid_at'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN final_paid_at TIMESTAMP WITH TIME ZONE;
    END IF;

    RAISE NOTICE '✅ Added payment tracking columns to workshop_appointments';
END $$;

-- =====================================================
-- STEP 4: Insert common services into service_catalog
-- =====================================================

INSERT INTO service_catalog (service_name, service_category, description, requires_diagnostic, typical_duration_minutes, platform_commission_percent, suggested_price_min, suggested_price_max)
VALUES
  -- Maintenance services (15% commission)
  ('Oil Change', 'maintenance', 'Standard oil and filter change', false, 30, 15.00, 40.00, 80.00),
  ('Tire Rotation', 'maintenance', 'Rotate tires to ensure even wear', false, 30, 15.00, 30.00, 60.00),
  ('Tire Swap (Seasonal)', 'maintenance', 'Swap between winter and summer tires', false, 60, 15.00, 60.00, 150.00),
  ('Brake Fluid Flush', 'maintenance', 'Replace brake fluid', false, 45, 15.00, 80.00, 150.00),
  ('Coolant Flush', 'maintenance', 'Drain and replace coolant', false, 45, 15.00, 80.00, 150.00),
  ('Air Filter Replacement', 'maintenance', 'Replace engine air filter', false, 15, 15.00, 20.00, 50.00),

  -- Repair services (15% commission)
  ('Brake Pad Replacement', 'repair', 'Replace front or rear brake pads', true, 120, 15.00, 150.00, 400.00),
  ('Battery Replacement', 'repair', 'Replace vehicle battery', false, 30, 15.00, 100.00, 300.00),
  ('Alternator Replacement', 'repair', 'Replace alternator', true, 180, 15.00, 300.00, 800.00),
  ('Starter Replacement', 'repair', 'Replace starter motor', true, 120, 15.00, 200.00, 600.00),
  ('Wheel Alignment', 'repair', 'Adjust wheel alignment', true, 60, 15.00, 80.00, 200.00),

  -- Diagnostic services (30% commission)
  ('Diagnostic Inspection', 'diagnostic', 'Comprehensive vehicle diagnostic inspection with report', false, 60, 30.00, 50.00, 100.00),
  ('Check Engine Light Diagnosis', 'diagnostic', 'Diagnose check engine light issue', false, 45, 30.00, 50.00, 100.00),
  ('Pre-Purchase Inspection', 'inspection', 'Comprehensive inspection before buying used vehicle', false, 90, 30.00, 100.00, 200.00),
  ('Safety Inspection', 'inspection', 'Provincial safety certification inspection', false, 60, 30.00, 50.00, 150.00)
ON CONFLICT (service_name) DO NOTHING;

-- =====================================================
-- STEP 5: Create helper function to calculate commission split
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_service_commission_split(
  p_total_amount DECIMAL,
  p_commission_percent DECIMAL
) RETURNS TABLE (
  workshop_amount DECIMAL,
  platform_commission DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(p_total_amount * (1 - p_commission_percent / 100), 2) AS workshop_amount,
    ROUND(p_total_amount * (p_commission_percent / 100), 2) AS platform_commission;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_service_commission_split IS 'Calculate workshop payout and platform commission based on total amount and commission percentage';

-- =====================================================
-- STEP 6: Create view for customer service browsing
-- =====================================================

CREATE OR REPLACE VIEW available_workshop_services AS
SELECT
  ws.id AS workshop_service_id,
  ws.workshop_id,
  o.name AS workshop_name,
  o.city AS workshop_city,
  o.province AS workshop_province,
  sc.id AS service_catalog_id,
  sc.service_name,
  sc.service_category,
  sc.description,
  sc.requires_diagnostic,
  ws.price,
  ws.estimated_duration_minutes,
  ws.workshop_notes,
  sc.platform_commission_percent,
  -- Calculate commission split (for internal use only)
  ROUND(ws.price * (1 - sc.platform_commission_percent / 100), 2) AS workshop_payout,
  ROUND(ws.price * (sc.platform_commission_percent / 100), 2) AS platform_commission
FROM workshop_services ws
JOIN service_catalog sc ON ws.service_catalog_id = sc.id
JOIN organizations o ON ws.workshop_id = o.id
WHERE ws.is_offered = true
  AND sc.is_active = true;

COMMENT ON VIEW available_workshop_services IS 'Customer-facing view of available services with pricing. Commission split is calculated but should not be shown to customers.';

-- =====================================================
-- STEP 7: RLS Policies for new tables
-- =====================================================

-- Service catalog is publicly readable
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service catalog is publicly readable"
  ON service_catalog FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can modify service catalog"
  ON service_catalog FOR ALL
  USING (false); -- Managed by platform admins only (via admin panel or migrations)

-- Workshop services
ALTER TABLE workshop_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop services are publicly readable"
  ON workshop_services FOR SELECT
  USING (is_offered = true);

CREATE POLICY "Workshop owners can manage their services"
  ON workshop_services FOR ALL
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- =====================================================
-- STEP 8: Create trigger to auto-set commission percent
-- =====================================================

CREATE OR REPLACE FUNCTION set_appointment_commission_percent()
RETURNS TRIGGER AS $$
BEGIN
  -- If service_catalog_id is provided, set commission percent from catalog
  IF NEW.service_catalog_id IS NOT NULL THEN
    SELECT platform_commission_percent
    INTO NEW.platform_commission_percent
    FROM service_catalog
    WHERE id = NEW.service_catalog_id;
  END IF;

  -- If workshop_service_id is provided, get total_amount from workshop service
  IF NEW.workshop_service_id IS NOT NULL AND NEW.total_amount IS NULL THEN
    SELECT price
    INTO NEW.total_amount
    FROM workshop_services
    WHERE id = NEW.workshop_service_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_appointment_commission_percent
  BEFORE INSERT OR UPDATE ON workshop_appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_appointment_commission_percent();

-- =====================================================
-- Migration Complete
-- =====================================================

DO $$
DECLARE
  service_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO service_count FROM service_catalog;

  RAISE NOTICE '✅ Workshop Services Pricing System Created';
  RAISE NOTICE '📋 % platform services available in catalog', service_count;
  RAISE NOTICE '💰 Workshops can now set their own prices for each service';
  RAISE NOTICE '🔒 Platform commission auto-calculated (15 percent repairs, 30 percent diagnostics)';
  RAISE NOTICE '💳 Payment tracking added to workshop_appointments table';
END $$;
