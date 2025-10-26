-- WORKING Test User Creation Script for TheAutoDoctor
-- This creates test users that WILL work with Supabase Auth signInWithPassword()

-- ============================================
-- STEP 1: ENABLE REQUIRED EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- STEP 2: DELETE OLD TEST USERS (OPTIONAL)
-- ============================================
-- Uncomment if you want to start fresh:
-- DELETE FROM auth.users WHERE email LIKE '%@test.com';

-- ============================================
-- STEP 3: CREATE ADMINS WITH PROPER PASSWORD HASHING
-- ============================================
DO $$
DECLARE
    hashed_password TEXT;
BEGIN
    -- Hash the password '1234' properly for Supabase
    hashed_password := crypt('1234', gen_salt('bf'));

    -- Admin 1
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, aud, role,
        raw_app_meta_data, raw_user_meta_data
    )
    SELECT
        gen_random_uuid(),
        'admin@test.com',
        hashed_password,
        NOW(), NOW(), NOW(),
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Admin 1","role":"admin"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@test.com');

    -- Admin 2
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, aud, role,
        raw_app_meta_data, raw_user_meta_data
    )
    SELECT
        gen_random_uuid(),
        'admin1@test.com',
        hashed_password,
        NOW(), NOW(), NOW(),
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Admin 2","role":"admin"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@test.com');

    -- Admin 3
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, aud, role,
        raw_app_meta_data, raw_user_meta_data
    )
    SELECT
        gen_random_uuid(),
        'admin2@test.com',
        hashed_password,
        NOW(), NOW(), NOW(),
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Admin 3","role":"admin"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin2@test.com');

    -- Update passwords for existing admin users
    UPDATE auth.users
    SET
        encrypted_password = hashed_password,
        updated_at = NOW()
    WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com');

    RAISE NOTICE '✅ Admin accounts created/updated with password: 1234';
END $$;

-- ============================================
-- STEP 4: CREATE CUSTOMERS WITH PROPER PASSWORD HASHING
-- ============================================
DO $$
DECLARE
    hashed_password TEXT;
    user_id UUID;
BEGIN
    -- Hash the password '1234' properly for Supabase
    hashed_password := crypt('1234', gen_salt('bf'));

    -- Customer 1
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, aud, role,
        raw_app_meta_data, raw_user_meta_data
    )
    SELECT
        gen_random_uuid(),
        'cust@test.com',
        hashed_password,
        NOW(), NOW(), NOW(),
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Customer 1","role":"customer"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cust@test.com')
    RETURNING id INTO user_id;

    -- If customer was created and customers table exists, add to customers table
    IF user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) THEN
        INSERT INTO public.customers (id, email, full_name, created_at)
        VALUES (user_id, 'cust@test.com', 'Test Customer 1', NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Customer 2
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, aud, role,
        raw_app_meta_data, raw_user_meta_data
    )
    SELECT
        gen_random_uuid(),
        'cust1@test.com',
        hashed_password,
        NOW(), NOW(), NOW(),
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Customer 2","role":"customer"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cust1@test.com')
    RETURNING id INTO user_id;

    -- If customer was created and customers table exists, add to customers table
    IF user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) THEN
        INSERT INTO public.customers (id, email, full_name, created_at)
        VALUES (user_id, 'cust1@test.com', 'Test Customer 2', NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Customer 3
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, aud, role,
        raw_app_meta_data, raw_user_meta_data
    )
    SELECT
        gen_random_uuid(),
        'cust2@test.com',
        hashed_password,
        NOW(), NOW(), NOW(),
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Customer 3","role":"customer"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cust2@test.com')
    RETURNING id INTO user_id;

    -- If customer was created and customers table exists, add to customers table
    IF user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) THEN
        INSERT INTO public.customers (id, email, full_name, created_at)
        VALUES (user_id, 'cust2@test.com', 'Test Customer 3', NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Update passwords for existing customer users
    UPDATE auth.users
    SET
        encrypted_password = hashed_password,
        updated_at = NOW()
    WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com');

    RAISE NOTICE '✅ Customer accounts created/updated with password: 1234';
END $$;

-- ============================================
-- STEP 5: CREATE MECHANICS (Already done separately)
-- ============================================
-- Mechanics use a different table and authentication method

-- ============================================
-- STEP 6: CREATE/UPDATE PROFILES IF TABLE EXISTS
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Create profiles for all test users
        INSERT INTO public.profiles (id, email, full_name)
        SELECT
            id,
            email,
            COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
        FROM auth.users
        WHERE email LIKE '%@test.com'
        ON CONFLICT (id) DO UPDATE
        SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name;

        RAISE NOTICE '✅ Profiles created/updated';
    END IF;
END $$;

-- ============================================
-- STEP 7: VERIFY ALL USERS
-- ============================================
SELECT
    email,
    CASE
        WHEN encrypted_password IS NOT NULL THEN '✅ Password Set'
        ELSE '❌ No Password'
    END as status,
    raw_user_meta_data->>'role' as role,
    email_confirmed_at
FROM auth.users
WHERE email IN (
    'admin@test.com', 'admin1@test.com', 'admin2@test.com',
    'cust@test.com', 'cust1@test.com', 'cust2@test.com'
)
ORDER BY
    CASE raw_user_meta_data->>'role'
        WHEN 'admin' THEN 1
        WHEN 'customer' THEN 2
        ELSE 3
    END,
    email;

-- ============================================
-- FINAL MESSAGE
-- ============================================
DO $$
DECLARE
    admin_count INTEGER;
    customer_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM auth.users
    WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com');

    SELECT COUNT(*) INTO customer_count
    FROM auth.users
    WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com');

    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '✅ TEST USERS CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Created: % admins, % customers', admin_count, customer_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔐 ALL ACCOUNTS USE PASSWORD: 1234';
    RAISE NOTICE '';
    RAISE NOTICE '👨‍💼 ADMIN ACCOUNTS:';
    RAISE NOTICE '  • admin@test.com';
    RAISE NOTICE '  • admin1@test.com';
    RAISE NOTICE '  • admin2@test.com';
    RAISE NOTICE '';
    RAISE NOTICE '👤 CUSTOMER ACCOUNTS:';
    RAISE NOTICE '  • cust@test.com';
    RAISE NOTICE '  • cust1@test.com';
    RAISE NOTICE '  • cust2@test.com';
    RAISE NOTICE '';
    RAISE NOTICE '✅ These will work with signInWithPassword()!';
    RAISE NOTICE '========================================================';
END $$;