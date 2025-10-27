-- SQL to create missing test users in Supabase
-- Run this in Supabase SQL Editor
-- Password for all users: 12345678

-- First, we need to create the auth users
-- Note: This requires using Supabase's auth schema functions

-- Create Customer 1
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();

  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'cust1@test.com',
    crypt('12345678', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}',
    '{"role":"customer","name":"Cust1","email_verified":true}',
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    FALSE,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create profile for customer 1
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    'cust1@test.com',
    'Cust1',
    'customer',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created user: cust1@test.com with ID: %', new_user_id;
END $$;

-- Create Customer 2
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, raw_app_meta_data,
    raw_user_meta_data, is_super_admin, created_at, updated_at,
    phone, phone_change, phone_change_token, email_change_token_current,
    email_change_confirm_status, reauthentication_token, is_sso_user
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated',
    'authenticated', 'cust2@test.com', crypt('12345678', gen_salt('bf')),
    NOW(), '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"role":"customer","name":"Cust2","email_verified":true}',
    FALSE, NOW(), NOW(), NULL, '', '', '', 0, '', FALSE
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (new_user_id, 'cust2@test.com', 'Cust2', 'customer', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created user: cust2@test.com with ID: %', new_user_id;
END $$;

-- Create Admin 1
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, raw_app_meta_data,
    raw_user_meta_data, is_super_admin, created_at, updated_at,
    phone, phone_change, phone_change_token, email_change_token_current,
    email_change_confirm_status, reauthentication_token, is_sso_user
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated',
    'authenticated', 'admin@test.com', crypt('12345678', gen_salt('bf')),
    NOW(), '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin","name":"Admin","email_verified":true}',
    FALSE, NOW(), NOW(), NULL, '', '', '', 0, '', FALSE
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (new_user_id, 'admin@test.com', 'Admin', 'admin', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created user: admin@test.com with ID: %', new_user_id;
END $$;

-- Create Admin 2
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, raw_app_meta_data,
    raw_user_meta_data, is_super_admin, created_at, updated_at,
    phone, phone_change, phone_change_token, email_change_token_current,
    email_change_confirm_status, reauthentication_token, is_sso_user
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated',
    'authenticated', 'admin2@test.com', crypt('12345678', gen_salt('bf')),
    NOW(), '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin","name":"Admin2","email_verified":true}',
    FALSE, NOW(), NOW(), NULL, '', '', '', 0, '', FALSE
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (new_user_id, 'admin2@test.com', 'Admin2', 'admin', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created user: admin2@test.com with ID: %', new_user_id;
END $$;

-- Verify the users were created
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  p.full_name,
  p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('cust1@test.com', 'cust2@test.com', 'admin@test.com', 'admin2@test.com')
ORDER BY u.email;
