-- ============================================
-- BRAND SPECIALIST & SMART MATCHING SYSTEM
-- Migration: 20251025000001
-- Purpose: Add brand specialist differentiation with smart matching
-- ============================================

-- ============================================
-- PART 1: MECHANICS TABLE EXTENSIONS
-- ============================================

-- Add specialist fields to existing mechanics table
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS is_brand_specialist BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS brand_specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS service_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_accept_sessions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS specialist_tier TEXT DEFAULT 'general' CHECK (specialist_tier IN ('general', 'brand', 'master'));

-- Add comments for documentation
COMMENT ON COLUMN mechanics.is_brand_specialist IS 'Whether mechanic is a brand specialist (premium tier)';
COMMENT ON COLUMN mechanics.brand_specializations IS 'Array of brand names the mechanic specializes in (BMW, Tesla, etc.)';
COMMENT ON COLUMN mechanics.service_keywords IS 'Array of service keywords for smart matching (backup camera, brake repair, etc.)';
COMMENT ON COLUMN mechanics.profile_completion_score IS 'Profile completion score 0-100, must be 80+ to accept sessions';
COMMENT ON COLUMN mechanics.can_accept_sessions IS 'Automatically set based on profile_completion_score >= 80';
COMMENT ON COLUMN mechanics.specialist_tier IS 'Tier level: general, brand, or master';

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mechanics_brand_specialist ON mechanics(is_brand_specialist) WHERE is_brand_specialist = true;
CREATE INDEX IF NOT EXISTS idx_mechanics_brands ON mechanics USING GIN(brand_specializations);
CREATE INDEX IF NOT EXISTS idx_mechanics_keywords ON mechanics USING GIN(service_keywords);
CREATE INDEX IF NOT EXISTS idx_mechanics_can_accept ON mechanics(can_accept_sessions) WHERE can_accept_sessions = true;

-- ============================================
-- PART 2: BRAND SPECIALIZATIONS REFERENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS brand_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT UNIQUE NOT NULL,
  brand_logo_url TEXT,
  is_luxury BOOLEAN DEFAULT false,
  requires_certification BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE brand_specializations IS 'Reference table for vehicle brands that mechanics can specialize in';

-- Seed with common brands
INSERT INTO brand_specializations (brand_name, is_luxury, requires_certification) VALUES
  ('BMW', true, true),
  ('Mercedes-Benz', true, true),
  ('Audi', true, true),
  ('Tesla', true, true),
  ('Porsche', true, true),
  ('Lexus', true, false),
  ('Jaguar', true, true),
  ('Land Rover', true, true),
  ('Toyota', false, false),
  ('Honda', false, false),
  ('Ford', false, false),
  ('Chevrolet', false, false),
  ('Nissan', false, false),
  ('Mazda', false, false),
  ('Volkswagen', false, false),
  ('Hyundai', false, false),
  ('Kia', false, false),
  ('Subaru', false, false),
  ('GMC', false, false),
  ('Ram', false, false)
ON CONFLICT (brand_name) DO NOTHING;

-- ============================================
-- PART 3: SERVICE KEYWORDS REFERENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS service_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'diagnostic', 'repair', 'installation', 'maintenance'
  complexity TEXT DEFAULT 'medium', -- 'simple', 'medium', 'complex'
  requires_specialist BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE service_keywords IS 'Reference table for service keywords used in smart matching';

-- Seed with common services
INSERT INTO service_keywords (keyword, category, complexity, requires_specialist) VALUES
  -- Installation services
  ('backup camera installation', 'installation', 'medium', false),
  ('dashcam installation', 'installation', 'simple', false),
  ('remote starter installation', 'installation', 'medium', false),
  ('audio system installation', 'installation', 'medium', false),
  ('GPS tracker installation', 'installation', 'medium', false),
  ('alarm system installation', 'installation', 'medium', false),

  -- Diagnostics
  ('check engine light', 'diagnostic', 'medium', false),
  ('ABS warning', 'diagnostic', 'medium', false),
  ('airbag light', 'diagnostic', 'medium', false),
  ('transmission diagnostic', 'diagnostic', 'complex', false),
  ('electrical diagnostic', 'diagnostic', 'complex', false),
  ('engine diagnostic', 'diagnostic', 'medium', false),
  ('HVAC diagnostic', 'diagnostic', 'medium', false),
  ('battery diagnostic', 'diagnostic', 'simple', false),

  -- Repairs
  ('brake repair', 'repair', 'medium', false),
  ('suspension repair', 'repair', 'complex', false),
  ('engine repair', 'repair', 'complex', false),
  ('transmission repair', 'repair', 'complex', true),
  ('steering repair', 'repair', 'medium', false),
  ('exhaust repair', 'repair', 'medium', false),
  ('cooling system repair', 'repair', 'medium', false),
  ('fuel system repair', 'repair', 'complex', false),

  -- Maintenance
  ('oil change', 'maintenance', 'simple', false),
  ('tire rotation', 'maintenance', 'simple', false),
  ('brake pad replacement', 'maintenance', 'medium', false),
  ('timing belt replacement', 'maintenance', 'complex', false),
  ('air filter replacement', 'maintenance', 'simple', false),
  ('spark plug replacement', 'maintenance', 'medium', false),
  ('coolant flush', 'maintenance', 'simple', false),
  ('transmission fluid change', 'maintenance', 'medium', false),

  -- Brand-specific services
  ('BMW coding', 'diagnostic', 'complex', true),
  ('Tesla diagnostics', 'diagnostic', 'complex', true),
  ('Mercedes STAR diagnostic', 'diagnostic', 'complex', true),
  ('Audi VCDS diagnostic', 'diagnostic', 'complex', true),
  ('Porsche diagnostic', 'diagnostic', 'complex', true)
ON CONFLICT (keyword) DO NOTHING;

-- ============================================
-- PART 4: SESSION REQUESTS EXTENSIONS
-- ============================================

ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'general' CHECK (request_type IN ('general', 'brand_specialist')),
ADD COLUMN IF NOT EXISTS requested_brand TEXT,
ADD COLUMN IF NOT EXISTS extracted_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS matching_score JSONB DEFAULT '{}';

COMMENT ON COLUMN session_requests.request_type IS 'Type of service requested: general or brand_specialist';
COMMENT ON COLUMN session_requests.requested_brand IS 'Brand name if customer requested a brand specialist';
COMMENT ON COLUMN session_requests.extracted_keywords IS 'Keywords extracted from customer description for matching';
COMMENT ON COLUMN session_requests.matching_score IS 'JSON object storing match scores for mechanics';

-- Create index for brand specialist requests
CREATE INDEX IF NOT EXISTS idx_session_requests_type ON session_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_session_requests_brand ON session_requests(requested_brand) WHERE requested_brand IS NOT NULL;

-- ============================================
-- PART 5: PROFILE COMPLETION REQUIREMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS mechanic_profile_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  field_category TEXT NOT NULL, -- 'basic', 'credentials', 'experience', 'preferences'
  weight INTEGER NOT NULL, -- Points toward completion score (total = 100)
  required_for_general BOOLEAN DEFAULT true,
  required_for_specialist BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE mechanic_profile_requirements IS 'Defines which fields are required for profile completion and their weights';

-- Define completion requirements (total = 100 points)
INSERT INTO mechanic_profile_requirements (field_name, field_category, weight, required_for_general, required_for_specialist) VALUES
  -- Basic Information (40 points total)
  ('full_name', 'basic', 10, true, true),
  ('email', 'basic', 10, true, true),
  ('phone', 'basic', 10, true, true),
  ('profile_photo', 'basic', 10, false, true),

  -- Credentials (30 points total)
  ('years_experience', 'credentials', 10, true, true),
  ('red_seal_certified', 'credentials', 10, false, true),
  ('certifications_uploaded', 'credentials', 10, false, true),

  -- Experience (20 points total)
  ('specializations', 'experience', 10, true, true),
  ('service_keywords', 'experience', 10, false, true),

  -- Preferences (10 points total)
  ('availability_set', 'preferences', 5, true, true),
  ('stripe_connected', 'preferences', 5, true, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 6: PRICING TIERS
-- ============================================

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code TEXT UNIQUE NOT NULL,
  tier_name TEXT NOT NULL,
  mechanic_type TEXT NOT NULL, -- 'general' or 'brand_specialist'
  duration_minutes INTEGER NOT NULL,
  base_price_cents INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE pricing_tiers IS 'Pricing structure for different service types and mechanic tiers';

-- Seed pricing tiers
INSERT INTO pricing_tiers (tier_code, tier_name, mechanic_type, duration_minutes, base_price_cents, description, is_active) VALUES
  -- General mechanics
  ('general_quick', 'Quick Chat', 'general', 30, 2999, '30-min chat with certified mechanic', true),
  ('general_video', 'Video Diagnostic', 'general', 45, 4999, '45-min video diagnostic session', true),

  -- Brand specialists
  ('specialist_quick', 'Quick Chat - Specialist', 'brand_specialist', 30, 4999, '30-min chat with brand specialist', true),
  ('specialist_video', 'Video Diagnostic - Specialist', 'brand_specialist', 45, 6999, '45-min video with brand expert', true)
ON CONFLICT (tier_code) DO NOTHING;

-- ============================================
-- PART 7: FEATURE FLAGS
-- ============================================

-- Check if feature_flags table exists, if not create it
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add brand specialist feature flags
INSERT INTO feature_flags (flag_name, description, enabled) VALUES
  ('enable_brand_specialist_matching', 'Enable brand specialist vs general mechanic selection in intake', false),
  ('show_specialist_pricing', 'Show premium pricing for brand specialists in UI', false),
  ('require_profile_completion', 'Require 80% profile completion before accepting sessions', true),
  ('keyword_extraction_enabled', 'Enable automatic keyword extraction from customer intake', false),
  ('smart_matching_enabled', 'Enable smart matching algorithm for mechanic selection', false)
ON CONFLICT (flag_name) DO UPDATE SET
  description = EXCLUDED.description;

-- ============================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE brand_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_profile_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Public read access for reference tables
CREATE POLICY "Public can view brand specializations"
  ON brand_specializations FOR SELECT
  USING (active = true);

CREATE POLICY "Public can view service keywords"
  ON service_keywords FOR SELECT
  USING (active = true);

CREATE POLICY "Public can view pricing tiers"
  ON pricing_tiers FOR SELECT
  USING (is_active = true);

-- Admin-only write access
CREATE POLICY "Admin can manage brand specializations"
  ON brand_specializations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'admin'
    )
  );

CREATE POLICY "Admin can manage service keywords"
  ON service_keywords FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'admin'
    )
  );

CREATE POLICY "Admin can manage pricing tiers"
  ON pricing_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'admin'
    )
  );

-- Public read for requirements (needed for UI)
CREATE POLICY "Public can view profile requirements"
  ON mechanic_profile_requirements FOR SELECT
  USING (true);

-- ============================================
-- PART 9: HELPER FUNCTIONS
-- ============================================

-- Function to automatically update can_accept_sessions based on profile score
CREATE OR REPLACE FUNCTION update_mechanic_session_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile completion score is 80 or above, allow session acceptance
  IF NEW.profile_completion_score >= 80 THEN
    NEW.can_accept_sessions := true;
  ELSE
    NEW.can_accept_sessions := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update can_accept_sessions
DROP TRIGGER IF EXISTS trigger_update_session_acceptance ON mechanics;
CREATE TRIGGER trigger_update_session_acceptance
  BEFORE INSERT OR UPDATE OF profile_completion_score ON mechanics
  FOR EACH ROW
  EXECUTE FUNCTION update_mechanic_session_acceptance();

-- ============================================
-- PART 10: UPDATE EXISTING MECHANICS
-- ============================================

-- Set existing approved mechanics to can_accept_sessions = true temporarily
-- (They'll need to complete profile properly, but this prevents breaking existing flow)
UPDATE mechanics
SET
  can_accept_sessions = true,
  profile_completion_score = 75 -- Set to 75 to indicate "needs completion soon"
WHERE
  status = 'approved'
  AND can_accept_sessions IS NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Brand Specialist Matching System migration completed successfully';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Mechanics can update their profiles with brand specializations';
  RAISE NOTICE '2. Enable feature flags when ready to launch';
  RAISE NOTICE '3. Existing approved mechanics set to 75%% completion - encourage profile updates';
END $$;
