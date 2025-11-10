-- Add location fields to profiles table
-- These are needed for customer location pre-fill in booking wizard

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add index for location-based queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(country, province, city);

-- Add comment
COMMENT ON COLUMN profiles.country IS 'Customer country for location-based mechanic matching';
COMMENT ON COLUMN profiles.province IS 'Customer province/state for location-based mechanic matching';
COMMENT ON COLUMN profiles.postal_code IS 'Customer postal code for precise location matching';
