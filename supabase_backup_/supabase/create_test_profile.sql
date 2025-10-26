-- Create profile for test user manually
-- Run this in Supabase SQL Editor after creating auth user

-- Step 1: Check if user exists
SELECT id, email, email_confirmed_at, raw_user_meta_data
FROM auth.users
WHERE email = 'test@example.com';

-- Step 2: Create profile for this user (replace email if different)
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
  account_status,
  created_at,
  updated_at
)
SELECT
  id,
  'customer',
  true,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'phone',
  true,
  true,
  now(),
  true,
  now(),
  'active',
  now(),
  now()
FROM auth.users
WHERE email = 'test@example.com'
ON CONFLICT (id) DO UPDATE SET
  email_verified = true,
  is_18_plus = true,
  waiver_accepted = true,
  terms_accepted = true;

-- Step 3: Verify profile was created
SELECT
  p.id,
  p.full_name,
  p.email_verified,
  p.role,
  p.waiver_accepted,
  au.email
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'test@example.com';
