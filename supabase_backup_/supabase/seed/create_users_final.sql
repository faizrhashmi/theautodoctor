-- FINAL WORKING SCRIPT - Run this in Supabase SQL Editor
-- This will create test users that WORK with signInWithPassword()

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete old test users to start fresh (optional)
DELETE FROM auth.users WHERE email IN (
    'admin@test.com', 'admin1@test.com', 'admin2@test.com',
    'cust@test.com', 'cust1@test.com', 'cust2@test.com'
);

-- Create Admin Users
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES
-- Admin 1
(
    gen_random_uuid(),
    'admin@test.com',
    crypt('1234', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin"}'::jsonb
),
-- Admin 2
(
    gen_random_uuid(),
    'admin1@test.com',
    crypt('1234', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin"}'::jsonb
),
-- Admin 3
(
    gen_random_uuid(),
    'admin2@test.com',
    crypt('1234', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin"}'::jsonb
);

-- Create Customer Users
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES
-- Customer 1
(
    gen_random_uuid(),
    'cust@test.com',
    crypt('1234', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"customer"}'::jsonb
),
-- Customer 2
(
    gen_random_uuid(),
    'cust1@test.com',
    crypt('1234', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"customer"}'::jsonb
),
-- Customer 3
(
    gen_random_uuid(),
    'cust2@test.com',
    crypt('1234', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"customer"}'::jsonb
);

-- Verify users were created
SELECT
    email,
    raw_user_meta_data->>'role' as role,
    CASE
        WHEN encrypted_password IS NOT NULL THEN '✅ Ready to login'
        ELSE '❌ No password'
    END as status
FROM auth.users
WHERE email LIKE '%@test.com'
ORDER BY email;

-- Show summary
SELECT
    '✅ USERS CREATED SUCCESSFULLY!' as message,
    'Password for all: 1234' as password,
    COUNT(*) as total_users_created
FROM auth.users
WHERE email LIKE '%@test.com';