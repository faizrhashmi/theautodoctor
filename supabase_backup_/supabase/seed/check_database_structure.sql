-- Database Structure Analysis for TheAutoDoctor
-- Run this script to understand your exact database schema

-- ============================================
-- 1. CHECK AUTH.USERS STRUCTURE
-- ============================================
SELECT '=== AUTH.USERS COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 2. CHECK PROFILES TABLE
-- ============================================
SELECT '=== PROFILES TABLE ===' as section;
-- Check if profiles table exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'profiles'
        ) THEN 'profiles table EXISTS'
        ELSE 'profiles table DOES NOT EXIST'
    END as profiles_status;

-- If exists, show columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK CUSTOMERS TABLE
-- ============================================
SELECT '=== CUSTOMERS TABLE ===' as section;
-- Check if customers table exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'customers'
        ) THEN 'customers table EXISTS'
        ELSE 'customers table DOES NOT EXIST'
    END as customers_status;

-- If exists, show columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'customers'
ORDER BY ordinal_position;

-- ============================================
-- 4. CHECK MECHANICS TABLE (already know this exists)
-- ============================================
SELECT '=== MECHANICS TABLE ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'mechanics'
ORDER BY ordinal_position
LIMIT 10; -- Just show first 10 columns for brevity

-- ============================================
-- 5. CHECK AVAILABLE EXTENSIONS
-- ============================================
SELECT '=== AVAILABLE EXTENSIONS ===' as section;
SELECT name, installed_version, comment
FROM pg_available_extensions
WHERE name IN ('pgcrypto', 'uuid-ossp', 'pg_cron')
ORDER BY name;

-- ============================================
-- 6. CHECK RLS POLICIES
-- ============================================
SELECT '=== RLS POLICIES ON AUTH.USERS ===' as section;
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'auth'
AND tablename = 'users'
LIMIT 5;

-- ============================================
-- 7. SUMMARY REPORT
-- ============================================
DO $$
DECLARE
    has_profiles BOOLEAN;
    has_customers BOOLEAN;
    has_pgcrypto BOOLEAN;
    profiles_columns TEXT;
    customers_columns TEXT;
BEGIN
    -- Check what tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO has_profiles;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) INTO has_customers;

    -- Check if pgcrypto extension is available
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) INTO has_pgcrypto;

    -- Get column lists
    IF has_profiles THEN
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        INTO profiles_columns
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles';
    END IF;

    IF has_customers THEN
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        INTO customers_columns
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customers';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 DATABASE STRUCTURE SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📁 TABLE STATUS:';
    RAISE NOTICE '  • auth.users: EXISTS (Supabase Auth)';
    RAISE NOTICE '  • profiles: %', CASE WHEN has_profiles THEN 'EXISTS' ELSE 'DOES NOT EXIST' END;
    RAISE NOTICE '  • customers: %', CASE WHEN has_customers THEN 'EXISTS' ELSE 'DOES NOT EXIST' END;
    RAISE NOTICE '  • mechanics: EXISTS';
    RAISE NOTICE '';

    IF has_profiles THEN
        RAISE NOTICE '📋 PROFILES COLUMNS:';
        RAISE NOTICE '  %', profiles_columns;
        RAISE NOTICE '';
    END IF;

    IF has_customers THEN
        RAISE NOTICE '📋 CUSTOMERS COLUMNS:';
        RAISE NOTICE '  %', customers_columns;
        RAISE NOTICE '';
    END IF;

    RAISE NOTICE '🔧 EXTENSIONS:';
    RAISE NOTICE '  • pgcrypto: %', CASE WHEN has_pgcrypto THEN 'INSTALLED' ELSE 'NOT INSTALLED' END;
    RAISE NOTICE '';

    RAISE NOTICE '⚠️  IMPORTANT NOTES:';
    RAISE NOTICE '  1. Use crypt() with gen_salt(''bf'') for password hashing';
    RAISE NOTICE '  2. Ensure pgcrypto extension is enabled';
    RAISE NOTICE '  3. Check column names before inserting data';
    RAISE NOTICE '========================================';
END $$;