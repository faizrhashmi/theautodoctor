-- SIMPLE FIX for infinite recursion in profiles RLS policies
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 2: Don't recreate it - admins can use the service role key to bypass RLS
-- Regular users can still view and update their own profiles with existing policies

-- Alternative: If you still need admins to view all profiles through the app,
-- create a separate admin_users table or use a database function
-- For now, the existing policies are sufficient:
-- - "Users can view own profile" - users can SELECT their own row
-- - "Users can update own profile" - users can UPDATE their own row
-- - "Users can insert own profile" - allow profile creation

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Verify current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
