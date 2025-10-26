-- Simple admin creation script for Supabase
-- Creates admin@test.com, admin1@test.com, admin2@test.com with password '1234'

-- Delete existing test admins first (optional - uncomment if needed)
-- DELETE FROM auth.users WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com');

-- Create Admin 1
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'admin@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi', -- bcrypt hash of '1234'
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"name":"Test Admin 1","role":"admin","is_admin":true}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@test.com'
);

-- Create Admin 2
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'admin1@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi', -- bcrypt hash of '1234'
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"name":"Test Admin 2","role":"admin","is_admin":true}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin1@test.com'
);

-- Create Admin 3
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'admin2@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi', -- bcrypt hash of '1234'
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"name":"Test Admin 3","role":"admin","is_admin":true}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin2@test.com'
);

-- Update passwords for existing admins (if they already exist)
UPDATE auth.users
SET
    encrypted_password = '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    raw_user_meta_data = '{"name":"Test Admin","role":"admin","is_admin":true}'::jsonb
WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com');

-- Verify creation
SELECT
    email,
    CASE
        WHEN encrypted_password IS NOT NULL THEN '✅ Password Set'
        ELSE '❌ No Password'
    END as password_status,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'is_admin' as is_admin
FROM auth.users
WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com')
ORDER BY email;

-- Display credentials
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM auth.users
    WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com');

    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'ADMIN ACCOUNTS STATUS';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Total admins: %', admin_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '  Email: admin@test.com  | Password: 1234';
    RAISE NOTICE '  Email: admin1@test.com | Password: 1234';
    RAISE NOTICE '  Email: admin2@test.com | Password: 1234';
    RAISE NOTICE '====================================';
END $$;