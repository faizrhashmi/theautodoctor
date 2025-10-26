-- Minimal test admins creation for TheAutoDoctor
-- Creates admin@test.com, admin1@test.com, admin2@test.com with password '1234'

-- First, check what admin table exists and its columns
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('admins', 'admin_users', 'admin', 'administrators')
LIMIT 1;

-- Check the columns in the admins table (adjust table name if different)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'admins'
ORDER BY ordinal_position;

-- Create test admins with minimal fields
-- Password hash for '1234': $2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi

-- Admin 1
INSERT INTO public.admins (
    id,
    email,
    password_hash,
    created_at
) VALUES (
    gen_random_uuid(),
    'admin@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW()
) ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- Admin 2
INSERT INTO public.admins (
    id,
    email,
    password_hash,
    created_at
) VALUES (
    gen_random_uuid(),
    'admin1@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW()
) ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- Admin 3
INSERT INTO public.admins (
    id,
    email,
    password_hash,
    created_at
) VALUES (
    gen_random_uuid(),
    'admin2@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW()
) ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- Verify creation
SELECT email, created_at
FROM public.admins
WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com')
ORDER BY email;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Test admins created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin Credentials:';
    RAISE NOTICE '  Email: admin@test.com  | Password: 1234';
    RAISE NOTICE '  Email: admin1@test.com | Password: 1234';
    RAISE NOTICE '  Email: admin2@test.com | Password: 1234';
    RAISE NOTICE '';
END $$;