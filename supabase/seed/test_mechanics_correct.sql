-- Create test mechanics for TheAutoDoctor
-- Using the actual database schema with correct column names

DO $$
DECLARE
    test_password_hash TEXT;
    mech1_id UUID;
    mech2_id UUID;
    mech3_id UUID;
BEGIN
    -- Generate password hash for '1234'
    -- This is a bcrypt hash of '1234'
    test_password_hash := '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi';

    -- Generate UUIDs for mechanics
    mech1_id := gen_random_uuid();
    mech2_id := gen_random_uuid();
    mech3_id := gen_random_uuid();

    -- Insert test mechanic 1: mech@test.com (Independent mechanic)
    INSERT INTO public.mechanics (
        id,
        created_at,
        name,
        email,
        phone,
        password_hash,
        is_available,
        rating,
        completed_sessions,
        account_type,
        workshop_id,
        application_status,
        last_updated
    ) VALUES (
        mech1_id,
        NOW(),
        'Test Mechanic 1',
        'mech@test.com',
        '+1234567890',
        test_password_hash,
        true,
        4.5,
        10,
        'independent',
        NULL,
        'approved',
        NOW()
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        is_available = EXCLUDED.is_available,
        rating = EXCLUDED.rating,
        completed_sessions = EXCLUDED.completed_sessions,
        account_type = EXCLUDED.account_type,
        application_status = EXCLUDED.application_status,
        last_updated = NOW();

    -- Insert test mechanic 2: mech1@test.com (Workshop mechanic)
    INSERT INTO public.mechanics (
        id,
        created_at,
        name,
        email,
        phone,
        password_hash,
        is_available,
        rating,
        completed_sessions,
        account_type,
        workshop_id,
        application_status,
        last_updated
    ) VALUES (
        mech2_id,
        NOW(),
        'Test Mechanic 2',
        'mech1@test.com',
        '+1234567891',
        test_password_hash,
        true,
        4.8,
        25,
        'workshop',
        NULL, -- Will be updated if you create a test workshop
        'approved',
        NOW()
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        is_available = EXCLUDED.is_available,
        rating = EXCLUDED.rating,
        completed_sessions = EXCLUDED.completed_sessions,
        account_type = EXCLUDED.account_type,
        application_status = EXCLUDED.application_status,
        last_updated = NOW();

    -- Insert test mechanic 3: mech2@test.com (Independent but unavailable)
    INSERT INTO public.mechanics (
        id,
        created_at,
        name,
        email,
        phone,
        password_hash,
        is_available,
        rating,
        completed_sessions,
        account_type,
        workshop_id,
        application_status,
        last_updated
    ) VALUES (
        mech3_id,
        NOW(),
        'Test Mechanic 3',
        'mech2@test.com',
        '+1234567892',
        test_password_hash,
        false, -- Not available
        4.2,
        5,
        'independent',
        NULL,
        'approved',
        NOW()
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        is_available = EXCLUDED.is_available,
        rating = EXCLUDED.rating,
        completed_sessions = EXCLUDED.completed_sessions,
        account_type = EXCLUDED.account_type,
        application_status = EXCLUDED.application_status,
        last_updated = NOW();

    RAISE NOTICE '✅ Test mechanics created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Mechanics:';
    RAISE NOTICE '1. Email: mech@test.com  | Password: 1234 | Type: Independent | Available: Yes | Rating: 4.5';
    RAISE NOTICE '2. Email: mech1@test.com | Password: 1234 | Type: Workshop    | Available: Yes | Rating: 4.8';
    RAISE NOTICE '3. Email: mech2@test.com | Password: 1234 | Type: Independent | Available: No  | Rating: 4.2';
    RAISE NOTICE '';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating test mechanics: %', SQLERRM;
        RAISE;
END $$;

-- Verify the test mechanics were created
SELECT
    email,
    name,
    account_type,
    is_available,
    rating,
    completed_sessions,
    CASE
        WHEN workshop_id IS NULL THEN 'No Workshop'
        ELSE 'Has Workshop (ID: ' || workshop_id::text || ')'
    END as workshop_status,
    application_status,
    created_at,
    last_updated
FROM public.mechanics
WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com')
ORDER BY email;

-- Optional: Create a test workshop and associate one mechanic with it
-- Uncomment the block below if you want to test workshop features

/*
DO $$
DECLARE
    test_workshop_id UUID;
    test_mechanic_id UUID;
BEGIN
    -- Generate UUID for workshop
    test_workshop_id := gen_random_uuid();

    -- Create a test workshop organization
    INSERT INTO public.organizations (
        id,
        name,
        organization_type,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        country,
        status,
        stripe_account_id,
        stripe_onboarding_completed,
        created_at
    ) VALUES (
        test_workshop_id,
        'Test Workshop Auto Repair',
        'workshop',
        'workshop@test.com',
        '+1234567899',
        '123 Workshop Street',
        'Toronto',
        'ON',
        'M5V 3A8',
        'Canada',
        'active',
        NULL,
        false,
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name,
        status = EXCLUDED.status
    RETURNING id INTO test_workshop_id;

    -- Get the mechanic ID for mech1@test.com
    SELECT id INTO test_mechanic_id
    FROM public.mechanics
    WHERE email = 'mech1@test.com';

    -- Associate the mechanic with the workshop
    IF test_mechanic_id IS NOT NULL THEN
        UPDATE public.mechanics
        SET
            workshop_id = test_workshop_id,
            account_type = 'workshop',
            last_updated = NOW()
        WHERE id = test_mechanic_id;

        RAISE NOTICE '✅ Associated mech1@test.com with Test Workshop Auto Repair';
        RAISE NOTICE 'Workshop ID: %', test_workshop_id;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating test workshop: %', SQLERRM;
        RAISE;
END $$;

-- Verify workshop association
SELECT
    m.email,
    m.name as mechanic_name,
    m.account_type,
    o.name as workshop_name,
    o.email as workshop_email
FROM public.mechanics m
LEFT JOIN public.organizations o ON m.workshop_id = o.id
WHERE m.email = 'mech1@test.com';
*/