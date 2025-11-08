-- =====================================================
-- SIMPLIFIED UNIFIED AUTH MIGRATION
-- =====================================================
-- Purpose: Add user_id to mechanics and update RLS policies
-- Date: 2025-10-29
-- Impact: Minimal - just adds a column and updates policies
-- =====================================================

-- 1. Update mechanics table for unified auth
-- =====================================================

DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.mechanics
      ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added user_id column to mechanics table';
  END IF;

  -- Make password_hash nullable (deprecated - using Supabase Auth now)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics'
    AND column_name = 'password_hash'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.mechanics ALTER COLUMN password_hash DROP NOT NULL;
    RAISE NOTICE 'Made password_hash column nullable (deprecated)';
  END IF;

  -- Make email nullable too (will come from auth.users)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics'
    AND column_name = 'email'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.mechanics ALTER COLUMN email DROP NOT NULL;
    RAISE NOTICE 'Made email column nullable';
  END IF;
END $$;

-- 2. Update RLS policies for session_requests ONLY
-- =====================================================

-- Drop and recreate ONLY session_requests policies
DROP POLICY IF EXISTS "Mechanics can view pending requests" ON public.session_requests;
DROP POLICY IF EXISTS "Mechanics can accept requests" ON public.session_requests;

-- Create new policies that check Supabase Auth
CREATE POLICY "Mechanics can view pending requests"
  ON public.session_requests
  FOR SELECT
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'mechanic'
    )
  );

CREATE POLICY "Mechanics can accept requests"
  ON public.session_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND mechanic_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'mechanic'
    )
  )
  WITH CHECK (
    mechanic_id = auth.uid()
    AND status = 'accepted'
  );

-- 3. Add RLS policies for mechanics table
-- =====================================================

ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Mechanics can view own profile" ON public.mechanics;
DROP POLICY IF EXISTS "Mechanics can update own profile" ON public.mechanics;
DROP POLICY IF EXISTS "Admin can view all mechanics" ON public.mechanics;

-- Mechanics can view their own profile
CREATE POLICY "Mechanics can view own profile"
  ON public.mechanics
  FOR SELECT
  USING (user_id = auth.uid());

-- Mechanics can update their own profile
CREATE POLICY "Mechanics can update own profile"
  ON public.mechanics
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can view all mechanics (for admin panel)
CREATE POLICY "Admin can view all mechanics"
  ON public.mechanics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Create helper function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_mechanic()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  email TEXT,
  stripe_account_id TEXT,
  stripe_payouts_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.name,
    m.email,
    m.stripe_account_id,
    m.stripe_payouts_enabled
  FROM public.mechanics m
  WHERE m.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_current_mechanic IS 'Get current authenticated mechanics profile';

-- 5. Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS mechanics_user_id_idx ON public.mechanics(user_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role) WHERE role IS NOT NULL;

-- 6. Migration complete
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ UNIFIED AUTH MIGRATION COMPLETE!';
  RAISE NOTICE '- Added mechanics.user_id column';
  RAISE NOTICE '- Updated session_requests RLS policies';
  RAISE NOTICE '- Added mechanics RLS policies';
  RAISE NOTICE '- Created helper function get_current_mechanic()';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '1. Create Supabase Auth user for mechanic';
  RAISE NOTICE '2. Set user_id in mechanics table';
  RAISE NOTICE '3. Set role=mechanic in profiles table';
END $$;
