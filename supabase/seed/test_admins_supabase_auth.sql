-- Create test admin accounts in Supabase auth.users
-- Creates admin@test.com, admin1@test.com, admin2@test.com with password '1234'
-- This script is specifically for Supabase Auth system

DO $$
DECLARE
    test_password_hash TEXT;
    existing_count INTEGER;
    user_id1 UUID;
    user_id2 UUID;
    user_id3 UUID;
BEGIN
    -- Password hash for '1234' (bcrypt)
    test_password_hash := '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi';

    -- Generate UUIDs
    user_id1 := gen_random_uuid();
    user_id2 := gen_random_uuid();
    user_id3 := gen_random_uuid();

    -- Check and create admin@test.com
    SELECT COUNT(*) INTO existing_count
    FROM auth.users
    WHERE email = 'admin@test.com';

    IF existing_count = 0 THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            confirmation_token,
            recovery_token
        ) VALUES (
            user_id1,
            'admin@test.com',
            test_password_hash,
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            '{"name":"Test Admin 1","role":"admin","is_admin":true}'::jsonb,
            '',
            ''
        );
        RAISE NOTICE '✅ Created admin@test.com';
    ELSE
        -- Update existing user's password
        UPDATE auth.users
        SET encrypted_password = test_password_hash,
            raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            raw_user_meta_data = '{"name":"Test Admin 1","role":"admin","is_admin":true}'::jsonb
        WHERE email = 'admin@test.com';
        RAISE NOTICE '✅ Updated admin@test.com';
    END IF;

    -- Check and create admin1@test.com
    SELECT COUNT(*) INTO existing_count
    FROM auth.users
    WHERE email = 'admin1@test.com';

    IF existing_count = 0 THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            confirmation_token,
            recovery_token
        ) VALUES (
            user_id2,
            'admin1@test.com',
            test_password_hash,
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            '{"name":"Test Admin 2","role":"admin","is_admin":true}'::jsonb,
            '',
            ''
        );
        RAISE NOTICE '✅ Created admin1@test.com';
    ELSE
        -- Update existing user's password
        UPDATE auth.users
        SET encrypted_password = test_password_hash,
            raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            raw_user_meta_data = '{"name":"Test Admin 2","role":"admin","is_admin":true}'::jsonb
        WHERE email = 'admin1@test.com';
        RAISE NOTICE '✅ Updated admin1@test.com';
    END IF;

    -- Check and create admin2@test.com
    SELECT COUNT(*) INTO existing_count
    FROM auth.users
    WHERE email = 'admin2@test.com';

    IF existing_count = 0 THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            confirmation_token,
            recovery_token
        ) VALUES (
            user_id3,
            'admin2@test.com',
            test_password_hash,
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            '{"name":"Test Admin 3","role":"admin","is_admin":true}'::jsonb,
            '',
            ''
        );
        RAISE NOTICE '✅ Created admin2@test.com';
    ELSE
        -- Update existing user's password
        UPDATE auth.users
        SET encrypted_password = test_password_hash,
            raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            raw_user_meta_data = '{"name":"Test Admin 3","role":"admin","is_admin":true}'::jsonb
        WHERE email = 'admin2@test.com';
        RAISE NOTICE '✅ Updated admin2@test.com';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ Admin accounts ready!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '  Email: admin@test.com  | Password: 1234';
    RAISE NOTICE '  Email: admin1@test.com | Password: 1234';
    RAISE NOTICE '  Email: admin2@test.com | Password: 1234';
    RAISE NOTICE '====================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RAISE;
END $$;

-- Verify the admin accounts
SELECT
    email,
    email_confirmed_at,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'is_admin' as is_admin,
    created_at
FROM auth.users
WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com')
ORDER BY email;

-- Also create/update profiles if profiles table exists
DO $$
DECLARE
    has_profiles_table BOOLEAN;
    user_record RECORD;
BEGIN
    -- Check if profiles table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
    ) INTO has_profiles_table;

    IF has_profiles_table THEN
        RAISE NOTICE 'Creating/updating profiles...';

        -- Loop through admin users and create profiles
        FOR user_record IN
            SELECT id, email, raw_user_meta_data->>'name' as name
            FROM auth.users
            WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com')
        LOOP
            INSERT INTO public.profiles (id, email, full_name, is_admin)
            VALUES (
                user_record.id,
                user_record.email,
                user_record.name,
                true
            )
            ON CONFLICT (id) DO UPDATE
            SET
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                is_admin = true;
        END LOOP;

        RAISE NOTICE '✅ Profiles created/updated';
    ELSE
        RAISE NOTICE 'No profiles table found - skipping profile creation';
    END IF;
END $$;