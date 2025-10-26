-- Simple customer creation script for Supabase
-- Creates cust@test.com, cust1@test.com, cust2@test.com with password '1234'

-- Delete existing test customers first (optional - uncomment if needed)
-- DELETE FROM auth.users WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com');

-- Create Customer 1
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'cust@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi', -- bcrypt hash of '1234'
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    '{"name":"Test Customer 1","role":"customer","is_admin":false}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'cust@test.com'
);

-- Create Customer 2
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'cust1@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi', -- bcrypt hash of '1234'
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    '{"name":"Test Customer 2","role":"customer","is_admin":false}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'cust1@test.com'
);

-- Create Customer 3
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
)
SELECT
    gen_random_uuid(),
    'cust2@test.com',
    '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi', -- bcrypt hash of '1234'
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    '{"name":"Test Customer 3","role":"customer","is_admin":false}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'cust2@test.com'
);

-- Update passwords for existing customers (if they already exist)
UPDATE auth.users
SET
    encrypted_password = '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi',
    raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    raw_user_meta_data = '{"name":"Test Customer","role":"customer","is_admin":false}'::jsonb
WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com');

-- Create/Update customer records in customers table if it exists
DO $$
DECLARE
    user_record RECORD;
    has_customers_table BOOLEAN;
BEGIN
    -- Check if customers table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'customers'
    ) INTO has_customers_table;

    IF has_customers_table THEN
        -- Loop through customer users and create customer records
        FOR user_record IN
            SELECT id, email, raw_user_meta_data->>'name' as name
            FROM auth.users
            WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com')
        LOOP
            -- Try to insert customer record
            INSERT INTO public.customers (
                id,
                email,
                full_name,
                phone,
                created_at
            )
            SELECT
                user_record.id,
                user_record.email,
                user_record.name,
                CASE
                    WHEN user_record.email = 'cust@test.com' THEN '+1234567000'
                    WHEN user_record.email = 'cust1@test.com' THEN '+1234567001'
                    WHEN user_record.email = 'cust2@test.com' THEN '+1234567002'
                END,
                NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM public.customers WHERE id = user_record.id
            );

            -- Update existing customer if already exists
            UPDATE public.customers
            SET
                email = user_record.email,
                full_name = user_record.name
            WHERE id = user_record.id;
        END LOOP;

        RAISE NOTICE '✅ Customer records created/updated in customers table';
    END IF;

    -- Also check for profiles table (some setups use profiles for all users)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
    ) INTO has_customers_table;

    IF has_customers_table THEN
        -- Loop through customer users and create profiles
        FOR user_record IN
            SELECT id, email, raw_user_meta_data->>'name' as name
            FROM auth.users
            WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com')
        LOOP
            INSERT INTO public.profiles (id, email, full_name, is_admin)
            VALUES (
                user_record.id,
                user_record.email,
                user_record.name,
                false
            )
            ON CONFLICT (id) DO UPDATE
            SET
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                is_admin = false;
        END LOOP;

        RAISE NOTICE '✅ Customer profiles created/updated in profiles table';
    END IF;
END $$;

-- Verify creation
SELECT
    email,
    CASE
        WHEN encrypted_password IS NOT NULL THEN '✅ Password Set'
        ELSE '❌ No Password'
    END as password_status,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'is_admin' as is_admin,
    created_at
FROM auth.users
WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com')
ORDER BY email;

-- Display credentials
DO $$
DECLARE
    customer_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO customer_count
    FROM auth.users
    WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com');

    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'CUSTOMER ACCOUNTS STATUS';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Total customers: %', customer_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '  Email: cust@test.com  | Password: 1234';
    RAISE NOTICE '  Email: cust1@test.com | Password: 1234';
    RAISE NOTICE '  Email: cust2@test.com | Password: 1234';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'These customers can be used to test:';
    RAISE NOTICE '  • Customer login and registration';
    RAISE NOTICE '  • Creating service requests';
    RAISE NOTICE '  • Workshop selection';
    RAISE NOTICE '  • Session bookings';
    RAISE NOTICE '====================================';
END $$;