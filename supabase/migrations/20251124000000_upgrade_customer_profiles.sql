-- Upgrade Customer Profiles Table
-- Adds comprehensive address fields, preferences, and location services
-- Migration date: 2025-11-24

DO $$
BEGIN
  -- Address Fields
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

  -- Location Services
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

  -- Preferences
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

  -- Marketing and referral
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

  -- Profile completion tracking
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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS profiles_country_idx ON public.profiles(country);
CREATE INDEX IF NOT EXISTS profiles_city_idx ON public.profiles(city);
CREATE INDEX IF NOT EXISTS profiles_postal_code_idx ON public.profiles(postal_zip_code);
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.address_line1 IS 'Street address (e.g., 123 Main St)';
COMMENT ON COLUMN public.profiles.address_line2 IS 'Apartment, suite, unit, etc. (optional)';
COMMENT ON COLUMN public.profiles.city IS 'City name';
COMMENT ON COLUMN public.profiles.state_province IS 'State or province';
COMMENT ON COLUMN public.profiles.postal_zip_code IS 'Postal or ZIP code';
COMMENT ON COLUMN public.profiles.country IS 'Full country name';
COMMENT ON COLUMN public.profiles.latitude IS 'Geographic latitude for location services';
COMMENT ON COLUMN public.profiles.longitude IS 'Geographic longitude for location services';
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language (ISO 639-1 code)';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone (IANA timezone identifier)';
COMMENT ON COLUMN public.profiles.communication_preferences IS 'User communication channel preferences (email, sms, push)';
COMMENT ON COLUMN public.profiles.newsletter_subscribed IS 'Whether user opted in to newsletter';
COMMENT ON COLUMN public.profiles.referral_source IS 'How the user heard about us';
COMMENT ON COLUMN public.profiles.profile_completed IS 'Whether user completed full profile setup';
COMMENT ON COLUMN public.profiles.profile_completed_at IS 'When user completed profile setup';

-- Verification
SELECT 'Customer profiles upgrade completed successfully!' AS status;
