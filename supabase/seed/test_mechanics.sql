-- Create test mechanics for TheAutoDoctor
-- This script creates test mechanics with minimal required fields
-- Adjusted for your database schema (without updated_at, is_available, rating, etc.)

-- First, let's check what columns actually exist in your mechanics table
DO $$
DECLARE
    column_list TEXT;
BEGIN
    -- Get list of existing columns for debugging
    SELECT string_agg(column_name, ', ')
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics';

    RAISE NOTICE 'Existing columns in mechanics table: %', column_list;
END $$;

-- Create test mechanics with only the essential columns that exist
-- Using DO block to handle potential duplicate key errors gracefully
DO $$
DECLARE
    test_password_hash TEXT;
BEGIN
    -- Generate password hash for '1234'
    -- This is a bcrypt hash of '1234' - you can verify with any bcrypt tool
    test_password_hash := '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi';

    -- Insert test mechanic 1: mech@test.com
    INSERT INTO public.mechanics (
        id,
        name,
        email,
        phone,
        password_hash,
        status,
        created_at,
        workshop_id,
        account_type
    ) VALUES (
        gen_random_uuid(),
        'Test Mechanic 1',
        'mech@test.com',
        '+1234567890',
        test_password_hash,
        'active',
        NOW(),
        NULL,  -- No workshop association
        'independent'
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        status = EXCLUDED.status;

    -- Insert test mechanic 2: mech1@test.com
    INSERT INTO public.mechanics (
        id,
        name,
        email,
        phone,
        password_hash,
        status,
        created_at,
        workshop_id,
        account_type
    ) VALUES (
        gen_random_uuid(),
        'Test Mechanic 2',
        'mech1@test.com',
        '+1234567891',
        test_password_hash,
        'active',
        NOW(),
        NULL,  -- No workshop association
        'independent'
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        status = EXCLUDED.status;

    -- Insert test mechanic 3: mech2@test.com
    INSERT INTO public.mechanics (
        id,
        name,
        email,
        phone,
        password_hash,
        status,
        created_at,
        workshop_id,
        account_type
    ) VALUES (
        gen_random_uuid(),
        'Test Mechanic 3',
        'mech2@test.com',
        '+1234567892',
        test_password_hash,
        'active',
        NOW(),
        NULL,  -- No workshop association
        'independent'
    ) ON CONFLICT (email) DO UPDATE
    SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        status = EXCLUDED.status;

    RAISE NOTICE 'Test mechanics created successfully!';
    RAISE NOTICE 'Emails: mech@test.com, mech1@test.com, mech2@test.com';
    RAISE NOTICE 'Password for all: 1234';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating test mechanics: %', SQLERRM;
        RAISE;
END $$;

-- Verify the test mechanics were created
SELECT
    email,
    name,
    status,
    account_type,
    CASE
        WHEN workshop_id IS NULL THEN 'No Workshop'
        ELSE 'Has Workshop'
    END as workshop_status,
    created_at
FROM public.mechanics
WHERE email IN ('mech@test.com', 'mech1@test.com', 'mech2@test.com')
ORDER BY email;

-- Optional: Create a test workshop and associate one mechanic with it
-- Uncomment if you want to test workshop features
/*
DO $$
DECLARE
    test_workshop_id UUID;
    test_mechanic_id UUID;
BEGIN
    -- Create a test workshop organization
    INSERT INTO public.organizations (
        id,
        name,
        organization_type,
        email,
        status,
        created_at
    ) VALUES (
        gen_random_uuid(),
        'Test Workshop',
        'workshop',
        'workshop@test.com',
        'active',
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name
    RETURNING id INTO test_workshop_id;

    -- Associate mech1@test.com with the workshop
    SELECT id INTO test_mechanic_id
    FROM public.mechanics
    WHERE email = 'mech1@test.com';

    IF test_mechanic_id IS NOT NULL THEN
        UPDATE public.mechanics
        SET
            workshop_id = test_workshop_id,
            account_type = 'workshop'
        WHERE id = test_mechanic_id;

        RAISE NOTICE 'Associated mech1@test.com with Test Workshop';
    END IF;
END $$;
*/