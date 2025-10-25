-- Minimal test mechanics creation for TheAutoDoctor
-- This version uses only the most essential columns
-- Run this if the previous script fails due to missing columns

-- First, let's see exactly what columns you have
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'mechanics'
ORDER BY ordinal_position;

-- Create test mechanics with absolute minimum fields
-- Password hash for '1234': $2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi

-- Test Mechanic 1
INSERT INTO public.mechanics (
    id,
    name,
    email,
    password_hash,
    created_at
) VALUES (
    gen_random_uuid(),
    'Test Mechanic 1',
    'mech@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW()
) ON CONFLICT (email) DO UPDATE
SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash;

-- Test Mechanic 2
INSERT INTO public.mechanics (
    id,
    name,
    email,
    password_hash,
    created_at
) VALUES (
    gen_random_uuid(),
    'Test Mechanic 2',
    'mech1@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW()
) ON CONFLICT (email) DO UPDATE
SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash;

-- Test Mechanic 3
INSERT INTO public.mechanics (
    id,
    name,
    email,
    password_hash,
    created_at
) VALUES (
    gen_random_uuid(),
    'Test Mechanic 3',
    'mech2@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW()
) ON CONFLICT (email) DO UPDATE
SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash;

-- Verify creation
SELECT email, name, created_at
FROM public.mechanics
WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com');

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Test mechanics created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Credentials:';
    RAISE NOTICE '  Email: mech@test.com  | Password: 1234';
    RAISE NOTICE '  Email: mech1@test.com | Password: 1234';
    RAISE NOTICE '  Email: mech2@test.com | Password: 1234';
    RAISE NOTICE '';
END $$;