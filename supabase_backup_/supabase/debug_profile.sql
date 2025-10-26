-- Debug: Check if profile exists for your test user
-- Run this in Supabase SQL Editor

-- Step 1: Find your auth user
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'test@example.com'  -- CHANGE THIS to your email
ORDER BY created_at DESC
LIMIT 1;

-- Step 2: Check if profile exists (copy the ID from above)
SELECT *
FROM public.profiles
WHERE id = 'PASTE_USER_ID_HERE';  -- Replace with ID from step 1

-- Step 3: Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 4: If no profile found, create it manually
-- Replace USER_ID_HERE with the ID from step 1

INSERT INTO public.profiles (
  id,
  role,
  email_verified,
  full_name,
  phone,
  is_18_plus,
  waiver_accepted,
  waiver_accepted_at,
  terms_accepted,
  terms_accepted_at,
  account_status
) VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID
  'customer',
  true,
  'Test User',
  '+1 555-123-4567',
  true,
  true,
  now(),
  true,
  now(),
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  email_verified = EXCLUDED.email_verified,
  is_18_plus = EXCLUDED.is_18_plus,
  waiver_accepted = EXCLUDED.waiver_accepted,
  terms_accepted = EXCLUDED.terms_accepted,
  account_status = EXCLUDED.account_status;

-- Step 5: Verify it was created
SELECT
  p.*,
  au.email
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'test@example.com';  -- CHANGE THIS to your email
