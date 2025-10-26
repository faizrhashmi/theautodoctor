-- IMPORTANT: To create test users with working passwords in Supabase,
-- You need to use Supabase's admin functions to properly hash passwords.
-- The bcrypt hash won't work with signInWithPassword()

-- First, let's check what columns exist in profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Create a function to properly create test users with correct password hashing
CREATE OR REPLACE FUNCTION create_test_user(
    user_email TEXT,
    user_password TEXT,
    user_name TEXT,
    user_role TEXT,
    is_admin_user BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Create user using auth.users (this will properly hash the password)
    -- Note: We use crypt() function with gen_salt() to properly hash the password
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        confirmation_token,
        recovery_token
    )
    SELECT
        gen_random_uuid(),
        user_email,
        crypt(user_password, gen_salt('bf')), -- Proper Supabase password hashing
        NOW(), -- Email confirmed
        NOW(),
        NOW(),
        jsonb_build_object(
            'provider', 'email',
            'providers', ARRAY['email'],
            'role', user_role
        ),
        jsonb_build_object(
            'name', user_name,
            'role', user_role,
            'is_admin', is_admin_user
        ),
        'authenticated',
        'authenticated',
        '',
        ''
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = user_email
    )
    RETURNING id INTO new_user_id;

    -- If user already exists, update their password
    IF new_user_id IS NULL THEN
        UPDATE auth.users
        SET
            encrypted_password = crypt(user_password, gen_salt('bf')),
            raw_app_meta_data = jsonb_build_object(
                'provider', 'email',
                'providers', ARRAY['email'],
                'role', user_role
            ),
            raw_user_meta_data = jsonb_build_object(
                'name', user_name,
                'role', user_role,
                'is_admin', is_admin_user
            ),
            updated_at = NOW()
        WHERE email = user_email
        RETURNING id INTO new_user_id;
    END IF;

    -- Create/update profile if profiles table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Check if is_admin column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
        ) THEN
            INSERT INTO public.profiles (id, email, full_name, is_admin)
            VALUES (new_user_id, user_email, user_name, is_admin_user)
            ON CONFLICT (id) DO UPDATE
            SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
        ELSE
            -- If is_admin column doesn't exist, insert without it
            INSERT INTO public.profiles (id, email, full_name)
            VALUES (new_user_id, user_email, user_name)
            ON CONFLICT (id) DO UPDATE
            SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
        END IF;
    END IF;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Admin Test Accounts
SELECT create_test_user('admin@test.com', '1234', 'Test Admin 1', 'admin', true);
SELECT create_test_user('admin1@test.com', '1234', 'Test Admin 2', 'admin', true);
SELECT create_test_user('admin2@test.com', '1234', 'Test Admin 3', 'admin', true);

-- Create Customer Test Accounts
SELECT create_test_user('cust@test.com', '1234', 'Test Customer 1', 'customer', false);
SELECT create_test_user('cust1@test.com', '1234', 'Test Customer 2', 'customer', false);
SELECT create_test_user('cust2@test.com', '1234', 'Test Customer 3', 'customer', false);

-- Create customers table entries if needed
DO $$
DECLARE
    user_record RECORD;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) THEN
        FOR user_record IN
            SELECT id, email, raw_user_meta_data->>'name' as name
            FROM auth.users
            WHERE email IN ('cust@test.com', 'cust1@test.com', 'cust2@test.com')
        LOOP
            -- Insert without is_admin column since customers table likely doesn't have it
            INSERT INTO public.customers (id, email, full_name, phone, created_at)
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
        END LOOP;
    END IF;
END $$;

-- Verify all users were created
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

-- Clean up the function
DROP FUNCTION IF EXISTS create_test_user;

-- Display final status
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
    RAISE NOTICE '✅ TEST USERS CREATED WITH PROPER PASSWORD HASHING';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created: % admins, % customers', admin_count, customer_count;
    RAISE NOTICE '';
    RAISE NOTICE '👨‍💼 ADMIN ACCOUNTS (Password: 1234):';
    RAISE NOTICE '  • admin@test.com';
    RAISE NOTICE '  • admin1@test.com';
    RAISE NOTICE '  • admin2@test.com';
    RAISE NOTICE '';
    RAISE NOTICE '👤 CUSTOMER ACCOUNTS (Password: 1234):';
    RAISE NOTICE '  • cust@test.com';
    RAISE NOTICE '  • cust1@test.com';
    RAISE NOTICE '  • cust2@test.com';
    RAISE NOTICE '';
    RAISE NOTICE 'These accounts will work with signInWithPassword()!';
    RAISE NOTICE '========================================================';
END $$;