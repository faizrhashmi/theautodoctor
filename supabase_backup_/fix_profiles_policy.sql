-- Fix infinite recursion in profiles RLS policies
-- The issue: "Admins can view all profiles" policy queries profiles table within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate without recursion - use user_metadata from auth.users instead
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Check if the current user has admin role in their JWT claims
    (auth.jwt() ->> 'role') = 'admin'
    OR
    -- Or check directly in auth.users metadata (no recursion)
    (
      SELECT (raw_user_meta_data ->> 'role') = 'admin'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Also add INSERT policy for users to create their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Add DELETE policy for admins only (using same non-recursive approach)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR
    (
      SELECT (raw_user_meta_data ->> 'role') = 'admin'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Add admin UPDATE policy (non-recursive)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR
    (
      SELECT (raw_user_meta_data ->> 'role') = 'admin'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );
