-- ============================================
-- LOCATION-BASED MATCHING ENHANCEMENT
-- Migration: 20251025000002
-- Purpose: Add country and city to mechanics for location-based matching
-- ============================================

-- ============================================
-- PART 1: MECHANICS TABLE - LOCATION FIELDS
-- ============================================

ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state_province TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Toronto';

COMMENT ON COLUMN mechanics.country IS 'Country where mechanic is located (e.g., Canada, USA)';
COMMENT ON COLUMN mechanics.city IS 'City where mechanic is located';
COMMENT ON COLUMN mechanics.state_province IS 'State or province';
COMMENT ON COLUMN mechanics.timezone IS 'Timezone for availability scheduling';

-- Create indexes for location-based searches
CREATE INDEX IF NOT EXISTS idx_mechanics_country ON mechanics(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mechanics_city ON mechanics(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mechanics_location ON mechanics(country, city) WHERE country IS NOT NULL;

-- ============================================
-- PART 2: SESSION REQUESTS - CUSTOMER LOCATION
-- ============================================

ALTER TABLE session_requests
ADD COLUMN IF NOT EXISTS customer_country TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS prefer_local_mechanic BOOLEAN DEFAULT true;

COMMENT ON COLUMN session_requests.customer_country IS 'Customer country for location matching';
COMMENT ON COLUMN session_requests.customer_city IS 'Customer city for location matching';
COMMENT ON COLUMN session_requests.prefer_local_mechanic IS 'Whether to prioritize mechanics in same location';

-- ============================================
-- PART 3: UPDATE PROFILE REQUIREMENTS
-- ============================================

-- Add location to profile completion requirements
INSERT INTO mechanic_profile_requirements (field_name, field_category, weight, required_for_general, required_for_specialist) VALUES
  ('country', 'basic', 5, true, true),
  ('city', 'basic', 5, true, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 4: COUNTRIES REFERENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS supported_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_name TEXT UNIQUE NOT NULL,
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2 (CA, US, etc.)
  is_active BOOLEAN DEFAULT true,
  default_timezone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE supported_countries IS 'Countries where TheAutoDoctor operates';

-- Seed with initial countries
INSERT INTO supported_countries (country_name, country_code, default_timezone) VALUES
  ('Canada', 'CA', 'America/Toronto'),
  ('United States', 'US', 'America/New_York')
ON CONFLICT (country_name) DO NOTHING;

-- ============================================
-- PART 5: MAJOR CITIES REFERENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS major_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT NOT NULL,
  state_province TEXT,
  country_code TEXT NOT NULL,
  timezone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(city_name, country_code)
);

COMMENT ON TABLE major_cities IS 'Major cities for quick selection (mechanics can also enter custom city)';

-- Seed with major Canadian cities
INSERT INTO major_cities (city_name, state_province, country_code, timezone) VALUES
  -- Ontario
  ('Toronto', 'Ontario', 'CA', 'America/Toronto'),
  ('Ottawa', 'Ontario', 'CA', 'America/Toronto'),
  ('Mississauga', 'Ontario', 'CA', 'America/Toronto'),
  ('Brampton', 'Ontario', 'CA', 'America/Toronto'),
  ('Hamilton', 'Ontario', 'CA', 'America/Toronto'),
  ('London', 'Ontario', 'CA', 'America/Toronto'),
  ('Markham', 'Ontario', 'CA', 'America/Toronto'),
  ('Vaughan', 'Ontario', 'CA', 'America/Toronto'),

  -- British Columbia
  ('Vancouver', 'British Columbia', 'CA', 'America/Vancouver'),
  ('Surrey', 'British Columbia', 'CA', 'America/Vancouver'),
  ('Burnaby', 'British Columbia', 'CA', 'America/Vancouver'),
  ('Richmond', 'British Columbia', 'CA', 'America/Vancouver'),
  ('Victoria', 'British Columbia', 'CA', 'America/Vancouver'),

  -- Alberta
  ('Calgary', 'Alberta', 'CA', 'America/Edmonton'),
  ('Edmonton', 'Alberta', 'CA', 'America/Edmonton'),
  ('Red Deer', 'Alberta', 'CA', 'America/Edmonton'),

  -- Quebec
  ('Montreal', 'Quebec', 'CA', 'America/Toronto'),
  ('Quebec City', 'Quebec', 'CA', 'America/Toronto'),
  ('Laval', 'Quebec', 'CA', 'America/Toronto'),
  ('Gatineau', 'Quebec', 'CA', 'America/Toronto'),

  -- Manitoba
  ('Winnipeg', 'Manitoba', 'CA', 'America/Winnipeg'),

  -- Saskatchewan
  ('Saskatoon', 'Saskatchewan', 'CA', 'America/Regina'),
  ('Regina', 'Saskatchewan', 'CA', 'America/Regina'),

  -- Nova Scotia
  ('Halifax', 'Nova Scotia', 'CA', 'America/Halifax'),

  -- Other provinces
  ('St. John''s', 'Newfoundland and Labrador', 'CA', 'America/St_Johns'),
  ('Charlottetown', 'Prince Edward Island', 'CA', 'America/Halifax'),
  ('Fredericton', 'New Brunswick', 'CA', 'America/Halifax')
ON CONFLICT (city_name, country_code) DO NOTHING;

-- Seed with major US cities
INSERT INTO major_cities (city_name, state_province, country_code, timezone) VALUES
  ('New York', 'New York', 'US', 'America/New_York'),
  ('Los Angeles', 'California', 'US', 'America/Los_Angeles'),
  ('Chicago', 'Illinois', 'US', 'America/Chicago'),
  ('Houston', 'Texas', 'US', 'America/Chicago'),
  ('Phoenix', 'Arizona', 'US', 'America/Phoenix'),
  ('Philadelphia', 'Pennsylvania', 'US', 'America/New_York'),
  ('San Antonio', 'Texas', 'US', 'America/Chicago'),
  ('San Diego', 'California', 'US', 'America/Los_Angeles'),
  ('Dallas', 'Texas', 'US', 'America/Chicago'),
  ('San Jose', 'California', 'US', 'America/Los_Angeles'),
  ('Austin', 'Texas', 'US', 'America/Chicago'),
  ('Jacksonville', 'Florida', 'US', 'America/New_York'),
  ('Fort Worth', 'Texas', 'US', 'America/Chicago'),
  ('Columbus', 'Ohio', 'US', 'America/New_York'),
  ('Charlotte', 'North Carolina', 'US', 'America/New_York'),
  ('San Francisco', 'California', 'US', 'America/Los_Angeles'),
  ('Indianapolis', 'Indiana', 'US', 'America/New_York'),
  ('Seattle', 'Washington', 'US', 'America/Los_Angeles'),
  ('Denver', 'Colorado', 'US', 'America/Denver'),
  ('Boston', 'Massachusetts', 'US', 'America/New_York'),
  ('Detroit', 'Michigan', 'US', 'America/New_York'),
  ('Miami', 'Florida', 'US', 'America/New_York'),
  ('Atlanta', 'Georgia', 'US', 'America/New_York'),
  ('Las Vegas', 'Nevada', 'US', 'America/Los_Angeles'),
  ('Portland', 'Oregon', 'US', 'America/Los_Angeles')
ON CONFLICT (city_name, country_code) DO NOTHING;

-- ============================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE supported_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_cities ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view supported countries"
  ON supported_countries FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view major cities"
  ON major_cities FOR SELECT
  USING (is_active = true);

-- Admin-only write access
CREATE POLICY "Admin can manage countries"
  ON supported_countries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'admin'
    )
  );

CREATE POLICY "Admin can manage cities"
  ON major_cities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'admin'
    )
  );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Location-based matching migration completed successfully';
  RAISE NOTICE 'Added: country, city, state_province, timezone to mechanics';
  RAISE NOTICE 'Seeded: 2 countries, 50+ major cities';
  RAISE NOTICE 'Location fields now contribute 10 points to profile completion';
END $$;
