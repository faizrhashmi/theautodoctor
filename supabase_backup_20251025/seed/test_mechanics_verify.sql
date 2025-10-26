-- Verification script for test mechanics
-- Run this after creating the test mechanics to verify they work

-- 1. Check if all test mechanics exist
SELECT
    '✅ Mechanics Created' as status,
    COUNT(*) as count,
    STRING_AGG(email, ', ') as emails
FROM public.mechanics
WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com');

-- 2. Display detailed info for each test mechanic
SELECT
    ROW_NUMBER() OVER (ORDER BY email) as "#",
    email,
    name,
    account_type,
    CASE
        WHEN is_available = true THEN '✅ Available'
        ELSE '❌ Not Available'
    END as availability,
    COALESCE(rating::text, 'No rating') as rating,
    COALESCE(completed_sessions::text, '0') as sessions,
    CASE
        WHEN workshop_id IS NULL THEN 'Independent'
        ELSE 'Workshop ID: ' || LEFT(workshop_id::text, 8) || '...'
    END as affiliation,
    application_status
FROM public.mechanics
WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com')
ORDER BY email;

-- 3. Test password authentication (shows hash exists)
SELECT
    email,
    CASE
        WHEN password_hash IS NOT NULL AND LENGTH(password_hash) > 0
        THEN '✅ Password set'
        ELSE '❌ No password'
    END as password_status,
    LEFT(password_hash, 10) || '...' as hash_preview
FROM public.mechanics
WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com')
ORDER BY email;

-- 4. Check for any potential issues
WITH mechanic_checks AS (
    SELECT
        email,
        CASE WHEN id IS NULL THEN 'Missing ID' ELSE NULL END as issue1,
        CASE WHEN password_hash IS NULL THEN 'Missing password' ELSE NULL END as issue2,
        CASE WHEN application_status != 'approved' THEN 'Not approved' ELSE NULL END as issue3
    FROM public.mechanics
    WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com')
)
SELECT
    email,
    COALESCE(
        NULLIF(CONCAT_WS(', ', issue1, issue2, issue3), ''),
        '✅ No issues'
    ) as status
FROM mechanic_checks
ORDER BY email;

-- 5. Summary
DO $$
DECLARE
    mech_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mech_count
    FROM public.mechanics
    WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com');

    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'TEST MECHANICS VERIFICATION COMPLETE';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Total test mechanics created: %', mech_count;

    IF mech_count = 3 THEN
        RAISE NOTICE 'Status: ✅ SUCCESS - All test mechanics created';
        RAISE NOTICE '';
        RAISE NOTICE 'You can now test login with:';
        RAISE NOTICE '  • mech@test.com  (password: 1234)';
        RAISE NOTICE '  • mech1@test.com (password: 1234)';
        RAISE NOTICE '  • mech2@test.com (password: 1234)';
    ELSE
        RAISE NOTICE 'Status: ⚠️  Only % of 3 mechanics created', mech_count;
        RAISE NOTICE 'Run test_mechanics_correct.sql to create missing ones';
    END IF;
    RAISE NOTICE '====================================';
END $$;