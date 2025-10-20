-- Customer Authentication & Profile Schema with Legal Protection
-- SAFE MIGRATION - Handles existing profiles table
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns to existing profiles table (if they don't exist)
DO $$
BEGIN
  -- Add full_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
  END IF;

  -- Add phone if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;

  -- Add role if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'customer';
  END IF;

  -- Add vehicle_info if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'vehicle_info'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN vehicle_info JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add is_18_plus if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_18_plus'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_18_plus BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add waiver_accepted if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'waiver_accepted'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN waiver_accepted BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add waiver_accepted_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'waiver_accepted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN waiver_accepted_at TIMESTAMPTZ;
  END IF;

  -- Add waiver_ip_address if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'waiver_ip_address'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN waiver_ip_address TEXT;
  END IF;

  -- Add terms_accepted if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_accepted'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN terms_accepted BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add terms_accepted_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN terms_accepted_at TIMESTAMPTZ;
  END IF;

  -- Add email_verified if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;

  -- Add account_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN account_status TEXT DEFAULT 'active';
  END IF;

  -- Add metadata if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add created_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Step 2: Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Step 3: Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = NEW.email_confirmed_at IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_email_verified_idx ON public.profiles (email_verified);
CREATE INDEX IF NOT EXISTS profiles_account_status_idx ON public.profiles (account_status);

-- Step 5: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create/Update RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 7: Create waiver acceptance log table
CREATE TABLE IF NOT EXISTS public.waiver_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  waiver_version TEXT NOT NULL DEFAULT 'v1.0',
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS waiver_acceptances_user_idx ON public.waiver_acceptances (user_id);

ALTER TABLE public.waiver_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own waiver acceptances" ON public.waiver_acceptances;
CREATE POLICY "Users can view own waiver acceptances"
  ON public.waiver_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Step 8: Create profiles for existing auth users who don't have one
INSERT INTO public.profiles (id, role, email_verified, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'role', 'customer'),
  au.email_confirmed_at IS NOT NULL,
  COALESCE(au.created_at, now()),
  now()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 9: Verify setup
SELECT 'Customer authentication schema migration completed successfully!' AS status;

-- Show profile statistics
SELECT
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE role = 'customer') as customers,
  COUNT(*) FILTER (WHERE role = 'admin') as admins,
  COUNT(*) FILTER (WHERE role = 'mechanic') as mechanics,
  COUNT(*) FILTER (WHERE email_verified = true) as verified_emails,
  COUNT(*) FILTER (WHERE waiver_accepted = true) as waiver_accepted
FROM public.profiles;
