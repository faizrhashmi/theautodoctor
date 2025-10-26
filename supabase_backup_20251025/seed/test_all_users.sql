-- Complete test users script for TheAutoDoctor
-- Creates all test accounts: Customers, Mechanics, and Admins with password '1234'

-- ==================================
-- SECTION 1: CUSTOMERS
-- ==================================

-- Customer 1
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'cust@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    '{"name":"Test Customer 1","role":"customer","is_admin":false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cust@test.com');

-- Customer 2
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'cust1@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    '{"name":"Test Customer 2","role":"customer","is_admin":false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cust1@test.com');

-- Customer 3
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'cust2@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    '{"name":"Test Customer 3","role":"customer","is_admin":false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cust2@test.com');

-- Update existing customers
UPDATE auth.users
SET
    encrypted_password = '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    raw_user_meta_data = '{"name":"Test Customer","role":"customer","is_admin":false}'::jsonb
WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com');

-- ==================================
-- SECTION 2: MECHANICS
-- ==================================

DO $$
DECLARE
    mech1_id UUID := gen_random_uuid();
    mech2_id UUID := gen_random_uuid();
    mech3_id UUID := gen_random_uuid();
BEGIN
    -- Mechanic 1: Independent, Available
    INSERT INTO public.mechanics (
        id, created_at, name, email, phone, password_hash,
        is_available, rating, completed_sessions,
        account_type, workshop_id, application_status, last_updated
    ) VALUES (
        mech1_id, NOW(), 'Test Mechanic 1', 'mech@test.com', '+1234567890',
        '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
        true, 4.5, 10, 'independent', NULL, 'approved', NOW()
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
        is_available = EXCLUDED.is_available, rating = EXCLUDED.rating,
        completed_sessions = EXCLUDED.completed_sessions,
        account_type = EXCLUDED.account_type, application_status = EXCLUDED.application_status,
        last_updated = NOW();

    -- Mechanic 2: Workshop, Available
    INSERT INTO public.mechanics (
        id, created_at, name, email, phone, password_hash,
        is_available, rating, completed_sessions,
        account_type, workshop_id, application_status, last_updated
    ) VALUES (
        mech2_id, NOW(), 'Test Mechanic 2', 'mech1@test.com', '+1234567891',
        '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
        true, 4.8, 25, 'workshop', NULL, 'approved', NOW()
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
        is_available = EXCLUDED.is_available, rating = EXCLUDED.rating,
        completed_sessions = EXCLUDED.completed_sessions,
        account_type = EXCLUDED.account_type, application_status = EXCLUDED.application_status,
        last_updated = NOW();

    -- Mechanic 3: Independent, Not Available
    INSERT INTO public.mechanics (
        id, created_at, name, email, phone, password_hash,
        is_available, rating, completed_sessions,
        account_type, workshop_id, application_status, last_updated
    ) VALUES (
        mech3_id, NOW(), 'Test Mechanic 3', 'mech2@test.com', '+1234567892',
        '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
        false, 4.2, 5, 'independent', NULL, 'approved', NOW()
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
        is_available = EXCLUDED.is_available, rating = EXCLUDED.rating,
        completed_sessions = EXCLUDED.completed_sessions,
        account_type = EXCLUDED.account_type, application_status = EXCLUDED.application_status,
        last_updated = NOW();

    RAISE NOTICE '✅ Mechanics created/updated';
END $$;

-- ==================================
-- SECTION 3: ADMINS
-- ==================================

-- Admin 1
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'admin@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"name":"Test Admin 1","role":"admin","is_admin":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@test.com');

-- Admin 2
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'admin1@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"name":"Test Admin 2","role":"admin","is_admin":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@test.com');

-- Admin 3
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'admin2@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"name":"Test Admin 3","role":"admin","is_admin":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin2@test.com');

-- Update existing admins
UPDATE auth.users
SET
    encrypted_password = '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    raw_user_meta_data = '{"name":"Test Admin","role":"admin","is_admin":true}'::jsonb
WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com');

-- ==================================
-- VERIFICATION & SUMMARY
-- ==================================

DO $$
DECLARE
    customer_count INTEGER;
    mechanic_count INTEGER;
    admin_count INTEGER;
BEGIN
    -- Count customers
    SELECT COUNT(*) INTO customer_count
    FROM auth.users
    WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com');

    -- Count mechanics
    SELECT COUNT(*) INTO mechanic_count
    FROM public.mechanics
    WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com');

    -- Count admins
    SELECT COUNT(*) INTO admin_count
    FROM auth.users
    WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com');

    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '         ALL TEST ACCOUNTS CREATED SUCCESSFULLY!        ';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 SUMMARY:';
    RAISE NOTICE '  • Customers: % created', customer_count;
    RAISE NOTICE '  • Mechanics: % created', mechanic_count;
    RAISE NOTICE '  • Admins:    % created', admin_count;
    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '🔑 LOGIN CREDENTIALS (All use password: 1234)';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE '👤 CUSTOMERS:';
    RAISE NOTICE '  • cust@test.com  - Test Customer 1';
    RAISE NOTICE '  • cust1@test.com - Test Customer 2';
    RAISE NOTICE '  • cust2@test.com - Test Customer 3';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 MECHANICS:';
    RAISE NOTICE '  • mech@test.com  - Independent, Available, ⭐4.5';
    RAISE NOTICE '  • mech1@test.com - Workshop, Available, ⭐4.8';
    RAISE NOTICE '  • mech2@test.com - Independent, Unavailable, ⭐4.2';
    RAISE NOTICE '';
    RAISE NOTICE '👨‍💼 ADMINS:';
    RAISE NOTICE '  • admin@test.com  - Test Admin 1';
    RAISE NOTICE '  • admin1@test.com - Test Admin 2';
    RAISE NOTICE '  • admin2@test.com - Test Admin 3';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '✅ All test accounts ready for testing!';
    RAISE NOTICE '========================================================';
END $$;