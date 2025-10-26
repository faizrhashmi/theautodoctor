-- Simple Database Structure Check for TheAutoDoctor
-- This version avoids RLS policies that might cause warnings

-- ============================================
-- 1. CHECK EXTENSIONS FIRST
-- ============================================
SELECT 'CHECKING PGCRYPTO EXTENSION' as status;
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
        THEN '✅ pgcrypto is INSTALLED - passwords can be hashed correctly'
        ELSE '❌ pgcrypto NOT INSTALLED - run: CREATE EXTENSION IF NOT EXISTS pgcrypto;'
    END as pgcrypto_status;

-- ============================================
-- 2. CHECK PROFILES TABLE
-- ============================================
SELECT 'CHECKING PROFILES TABLE' as status;
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'profiles'
        ) THEN '✅ profiles table EXISTS'
        ELSE '❌ profiles table DOES NOT EXIST'
    END as profiles_status;

-- Show profiles columns if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK CUSTOMERS TABLE
-- ============================================
SELECT 'CHECKING CUSTOMERS TABLE' as status;
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'customers'
        ) THEN '✅ customers table EXISTS'
        ELSE '❌ customers table DOES NOT EXIST'
    END as customers_status;

-- Show customers columns if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers'
ORDER BY ordinal_position;

-- ============================================
-- 4. CHECK EXISTING TEST USERS
-- ============================================
SELECT 'CHECKING EXISTING TEST USERS' as status;
SELECT
    email,
    CASE
        WHEN encrypted_password IS NOT NULL THEN '✅ Has Password'
        ELSE '❌ No Password'
    END as password_status,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email IN (
    'admin@test.com', 'admin1@test.com', 'admin2@test.com',
    'cust@test.com', 'cust1@test.com', 'cust2@test.com',
    'mech@test.com', 'mech1@test.com', 'mech2@test.com'
)
ORDER BY email;

-- ============================================
-- 5. FINAL SUMMARY
-- ============================================
DO $$
DECLARE
    has_pgcrypto BOOLEAN;
    has_profiles BOOLEAN;
    has_customers BOOLEAN;
    test_user_count INTEGER;
BEGIN
    -- Check pgcrypto
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
    INTO has_pgcrypto;

    -- Check tables
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO has_profiles;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) INTO has_customers;

    -- Count existing test users
    SELECT COUNT(*) INTO test_user_count
    FROM auth.users
    WHERE email LIKE '%@test.com';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 DATABASE CHECK RESULTS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    IF NOT has_pgcrypto THEN
        RAISE NOTICE '❌ CRITICAL: pgcrypto extension NOT installed!';
        RAISE NOTICE '   Run this first: CREATE EXTENSION IF NOT EXISTS pgcrypto;';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '✅ pgcrypto extension is installed';
    END IF;

    RAISE NOTICE '✅ auth.users table exists (Supabase Auth)';

    IF has_profiles THEN
        RAISE NOTICE '✅ profiles table exists';
    ELSE
        RAISE NOTICE '⚠️  profiles table does not exist';
    END IF;

    IF has_customers THEN
        RAISE NOTICE '✅ customers table exists';
    ELSE
        RAISE NOTICE '⚠️  customers table does not exist';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Test users found: %', test_user_count;
    RAISE NOTICE '========================================';
END $$;