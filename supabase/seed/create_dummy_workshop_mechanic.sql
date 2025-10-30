-- ============================================================================
-- Create Fully Approved Dummy Mechanic with Workshop Affiliation
-- ============================================================================
-- This script creates:
-- 1. A fully verified and active workshop organization
-- 2. A fully approved mechanic with 100% profile completion
-- 3. Workshop affiliation between them
--
-- Login credentials:
--   Email: workshop.mechanic@test.com
--   Password: 1234
-- ============================================================================

DO $$
DECLARE
    workshop_id UUID;
    mechanic_id UUID;
    test_password_hash TEXT;
BEGIN
    -- Password hash for '1234' (bcrypt)
    test_password_hash := '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi';

    -- Generate UUIDs
    workshop_id := gen_random_uuid();
    mechanic_id := gen_random_uuid();

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Dummy Workshop & Mechanic...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- ========================================================================
    -- STEP 1: Create Workshop Organization
    -- ========================================================================

    INSERT INTO public.organizations (
        id,
        organization_type,
        name,
        slug,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        country,
        status,
        verification_status,
        verification_notes,
        mechanic_capacity,
        commission_rate,
        coverage_postal_codes,
        service_radius_km,
        business_registration_number,
        tax_id,
        stripe_account_status,
        stripe_onboarding_completed,
        settings,
        metadata,
        created_at,
        updated_at,
        approved_at
    ) VALUES (
        workshop_id,
        'workshop',
        'Elite Auto Care Workshop',
        'elite-auto-care-workshop',
        'elite.workshop@test.com',
        '+14165551234',
        '456 Professional Blvd, Unit 12',
        'Toronto',
        'ON',
        'M4B 1B3',
        'Canada',
        'active',                      -- Active status
        'verified',                     -- Verified by admin
        'Test workshop - fully approved for development',
        15,                            -- Can have 15 mechanics
        12.00,                         -- 12% commission rate
        ARRAY['M4B', 'M4C', 'M4E', 'M4K', 'M4L', 'M4M', 'M5A', 'M5B'],
        25,                            -- 25km service radius
        'BN123456789',
        'GST-123456789RT0001',
        'verified',
        true,
        '{"notifications_enabled": true, "auto_assign": true}',
        '{"test_account": true, "created_by": "seed_script"}',
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        status = 'active',
        verification_status = 'verified',
        mechanic_capacity = 15,
        commission_rate = 12.00,
        updated_at = NOW()
    RETURNING id INTO workshop_id;

    RAISE NOTICE '✅ Workshop created: Elite Auto Care Workshop';
    RAISE NOTICE '   Email: elite.workshop@test.com';
    RAISE NOTICE '   ID: %', workshop_id;
    RAISE NOTICE '';

    -- ========================================================================
    -- STEP 2: Create Fully Approved Mechanic with Complete Profile
    -- ========================================================================

    INSERT INTO public.mechanics (
        id,
        created_at,

        -- Basic Info (40 points)
        name,
        email,
        phone,
        password_hash,

        -- Account Type & Workshop Affiliation
        account_type,
        workshop_id,
        invited_by,
        invite_accepted_at,

        -- Approval Status (CRITICAL)
        application_status,
        background_check_status,
        approved_at,
        application_submitted_at,
        onboarding_completed,

        -- Profile Completion (CRITICAL)
        profile_completion_score,
        can_accept_sessions,

        -- Credentials & Certifications (30 points)
        years_of_experience,
        red_seal_certified,
        red_seal_number,
        red_seal_province,
        red_seal_expiry_date,
        other_certifications,

        -- Specializations (20 points)
        specializations,
        service_keywords,

        -- Brand Specialist Info
        is_brand_specialist,
        brand_specializations,
        specialist_tier,

        -- Shop Information
        shop_affiliation,
        shop_name,
        shop_address,

        -- Location (10 points)
        full_address,
        city,
        province,
        postal_code,
        country,

        -- Availability
        is_available,

        -- Performance Metrics
        rating,
        completed_sessions,

        -- Payment (5 points)
        stripe_account_id,
        stripe_onboarding_completed,
        banking_info_completed,

        -- Insurance & Legal
        liability_insurance,
        insurance_policy_number,
        insurance_expiry,
        criminal_record_check,
        crc_date,

        -- Metadata
        last_updated
    ) VALUES (
        mechanic_id,
        NOW(),

        -- Basic Info
        'Alex Thompson',
        'workshop.mechanic@test.com',
        '+14165559876',
        test_password_hash,

        -- Account Type & Workshop
        'workshop',                    -- Workshop-affiliated mechanic
        workshop_id,                   -- Linked to workshop
        workshop_id,                   -- Invited by workshop
        NOW() - INTERVAL '30 days',   -- Accepted invitation 30 days ago

        -- Approval Status ✅
        'approved',                    -- FULLY APPROVED
        'approved',                    -- Background check PASSED
        NOW() - INTERVAL '25 days',   -- Approved 25 days ago
        NOW() - INTERVAL '28 days',   -- Applied 28 days ago
        true,                          -- Onboarding completed

        -- Profile Completion ✅
        100,                           -- 100% COMPLETE
        true,                          -- CAN ACCEPT SESSIONS ✅

        -- Credentials & Certifications
        8,                             -- 8 years experience
        true,                          -- Red Seal certified
        'RS-ON-87654321',
        'ON',
        NOW() + INTERVAL '18 months', -- Valid for 18 more months
        '{"ASE": ["A1", "A4", "A6", "A8"], "manufacturer": ["Honda Master", "Toyota Level 2"]}'::jsonb,

        -- Specializations
        ARRAY['brakes', 'suspension', 'diagnostics', 'electrical', 'engine', 'transmission'],
        ARRAY['brake repair', 'brake inspection', 'suspension repair', 'shock replacement', 'diagnostic scan', 'check engine light', 'electrical troubleshooting', 'alternator repair', 'battery replacement', 'engine repair', 'transmission service'],

        -- Brand Specialist
        true,                          -- Is brand specialist
        ARRAY['Honda', 'Toyota', 'Mazda', 'Nissan'],
        'brand',                       -- Brand specialist tier

        -- Shop Information
        'workshop',
        'Elite Auto Care Workshop',
        '456 Professional Blvd, Unit 12, Toronto, ON',

        -- Location
        '789 Maple Street, Apt 5B, Toronto, ON M4B 2K9',
        'Toronto',
        'ON',
        'M4B 2K9',
        'Canada',

        -- Availability
        true,                          -- Currently available

        -- Performance Metrics
        4.9,                           -- Excellent rating
        47,                            -- 47 completed sessions

        -- Payment (simulated Stripe account)
        'acct_test_' || substring(md5(random()::text) from 1 for 16),
        true,                          -- Stripe onboarding complete
        true,                          -- Banking info complete

        -- Insurance & Legal
        true,                          -- Has liability insurance
        'INS-' || substring(md5(random()::text) from 1 for 12),
        NOW() + INTERVAL '11 months', -- Insurance valid
        true,                          -- Criminal record check done
        NOW() - INTERVAL '60 days',   -- CRC done 60 days ago

        -- Metadata
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        account_type = 'workshop',
        workshop_id = EXCLUDED.workshop_id,
        application_status = 'approved',
        background_check_status = 'approved',
        profile_completion_score = 100,
        can_accept_sessions = true,
        is_available = true,
        approved_at = NOW(),
        last_updated = NOW()
    RETURNING id INTO mechanic_id;

    RAISE NOTICE '✅ Mechanic created: Alex Thompson';
    RAISE NOTICE '   Email: workshop.mechanic@test.com';
    RAISE NOTICE '   Password: 1234';
    RAISE NOTICE '   ID: %', mechanic_id;
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 SUMMARY:';
    RAISE NOTICE '   ✅ Workshop: Elite Auto Care Workshop';
    RAISE NOTICE '   ✅ Mechanic: Alex Thompson';
    RAISE NOTICE '   ✅ Profile Completion: 100%%';
    RAISE NOTICE '   ✅ Application Status: APPROVED';
    RAISE NOTICE '   ✅ Background Check: APPROVED';
    RAISE NOTICE '   ✅ Can Accept Sessions: YES';
    RAISE NOTICE '   ✅ Workshop Affiliation: ACTIVE';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 LOGIN CREDENTIALS:';
    RAISE NOTICE '   Email: workshop.mechanic@test.com';
    RAISE NOTICE '   Password: 1234';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '   1. Login at: http://localhost:3000/mechanic/login';
    RAISE NOTICE '   2. Navigate to: /mechanic/dashboard';
    RAISE NOTICE '   3. Test end-to-end customer flow';
    RAISE NOTICE '';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '';
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE NOTICE '';
        RAISE;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify Workshop
SELECT
    '🏢 WORKSHOP VERIFICATION' as check_type,
    id,
    name,
    organization_type,
    email,
    status,
    verification_status,
    mechanic_capacity,
    commission_rate,
    city,
    province,
    created_at
FROM public.organizations
WHERE email = 'elite.workshop@test.com';

-- Verify Mechanic with Full Details
SELECT
    '👨‍🔧 MECHANIC VERIFICATION' as check_type,
    id,
    name,
    email,
    account_type,
    application_status,
    background_check_status,
    profile_completion_score,
    can_accept_sessions,
    is_available,
    years_of_experience,
    red_seal_certified,
    red_seal_number,
    CASE
        WHEN specializations IS NOT NULL
        THEN array_length(specializations, 1)
        ELSE 0
    END as specialization_count,
    is_brand_specialist,
    CASE
        WHEN brand_specializations IS NOT NULL
        THEN array_length(brand_specializations, 1)
        ELSE 0
    END as brand_count,
    rating,
    completed_sessions,
    stripe_onboarding_completed,
    liability_insurance,
    criminal_record_check,
    city,
    province,
    approved_at,
    created_at
FROM public.mechanics
WHERE email = 'workshop.mechanic@test.com';

-- Verify Workshop-Mechanic Relationship
SELECT
    '🔗 RELATIONSHIP VERIFICATION' as check_type,
    m.name as mechanic_name,
    m.email as mechanic_email,
    m.account_type,
    o.name as workshop_name,
    o.email as workshop_email,
    o.city as workshop_city,
    m.invite_accepted_at,
    CASE
        WHEN m.workshop_id = o.id THEN '✅ Linked'
        ELSE '❌ Not Linked'
    END as link_status,
    CASE
        WHEN m.invited_by = o.id THEN '✅ Correct'
        ELSE '❌ Mismatch'
    END as invitation_status
FROM public.mechanics m
INNER JOIN public.organizations o ON m.workshop_id = o.id
WHERE m.email = 'workshop.mechanic@test.com';

-- Profile Completion Breakdown
SELECT
    '📊 PROFILE COMPLETION DETAILS' as check_type,
    name,
    email,
    -- Basic Info (40 points)
    CASE WHEN name IS NOT NULL THEN '✅' ELSE '❌' END as has_name,
    CASE WHEN email IS NOT NULL THEN '✅' ELSE '❌' END as has_email,
    CASE WHEN phone IS NOT NULL THEN '✅' ELSE '❌' END as has_phone,
    -- Credentials (30 points)
    CASE WHEN years_of_experience > 0 THEN '✅' ELSE '❌' END as has_experience,
    CASE WHEN red_seal_certified THEN '✅' ELSE '❌' END as has_red_seal,
    -- Specializations (20 points)
    CASE WHEN specializations IS NOT NULL AND array_length(specializations, 1) > 0 THEN '✅' ELSE '❌' END as has_specializations,
    -- Location (10 points)
    CASE WHEN city IS NOT NULL AND province IS NOT NULL THEN '✅' ELSE '❌' END as has_location,
    -- Payment (5 points)
    CASE WHEN stripe_onboarding_completed THEN '✅' ELSE '❌' END as stripe_complete,
    -- Overall
    profile_completion_score as score,
    can_accept_sessions as can_work
FROM public.mechanics
WHERE email = 'workshop.mechanic@test.com';

-- Ready for Production Check
SELECT
    '🚀 PRODUCTION READINESS' as check_type,
    CASE
        WHEN application_status = 'approved' THEN '✅ APPROVED'
        ELSE '❌ ' || application_status
    END as approval_check,
    CASE
        WHEN background_check_status = 'approved' THEN '✅ PASSED'
        ELSE '❌ ' || background_check_status
    END as background_check,
    CASE
        WHEN profile_completion_score >= 80 THEN '✅ COMPLETE (' || profile_completion_score || '%)'
        ELSE '❌ INCOMPLETE (' || profile_completion_score || '%)'
    END as profile_check,
    CASE
        WHEN can_accept_sessions THEN '✅ YES'
        ELSE '❌ NO'
    END as can_accept_check,
    CASE
        WHEN is_available THEN '✅ AVAILABLE'
        ELSE '❌ UNAVAILABLE'
    END as availability_check,
    CASE
        WHEN workshop_id IS NOT NULL THEN '✅ AFFILIATED'
        ELSE '❌ NO WORKSHOP'
    END as workshop_check,
    CASE
        WHEN
            application_status = 'approved' AND
            background_check_status = 'approved' AND
            profile_completion_score >= 80 AND
            can_accept_sessions = true AND
            is_available = true AND
            workshop_id IS NOT NULL
        THEN '🎉 READY FOR TESTING!'
        ELSE '⚠️  NOT READY'
    END as overall_status
FROM public.mechanics
WHERE email = 'workshop.mechanic@test.com';
