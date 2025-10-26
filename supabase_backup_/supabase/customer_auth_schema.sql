-- Customer Authentication & Profile Schema with Legal Protection
-- Run this in Supabase SQL Editor

-- Step 1: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Basic info
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',

  -- Vehicle info
  vehicle_info JSONB DEFAULT '{}'::jsonb,

  -- Legal & Age verification
  is_18_plus BOOLEAN NOT NULL DEFAULT false,
  waiver_accepted BOOLEAN NOT NULL DEFAULT false,
  waiver_accepted_at TIMESTAMPTZ,
  waiver_ip_address TEXT,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,

  -- Account status
  email_verified BOOLEAN DEFAULT false,
  account_status TEXT DEFAULT 'active',

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

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
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_email_verified_idx ON public.profiles (email_verified);
CREATE INDEX IF NOT EXISTS profiles_account_status_idx ON public.profiles (account_status);

-- Step 5: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
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

CREATE POLICY "Users can view own waiver acceptances"
  ON public.waiver_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Step 8: Verify setup
SELECT 'Customer authentication schema created successfully!' AS status;

-- Show existing profiles (if any)
SELECT
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE role = 'customer') as customers,
  COUNT(*) FILTER (WHERE role = 'admin') as admins,
  COUNT(*) FILTER (WHERE role = 'mechanic') as mechanics
FROM public.profiles;
