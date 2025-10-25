-- Auto-detecting admin table structure and creating test admins
-- Creates admin@test.com, admin1@test.com, admin2@test.com with password '1234'

DO $$
DECLARE
    admin_table_name TEXT;
    test_password_hash TEXT;
    column_list TEXT;
    has_name_column BOOLEAN;
    has_role_column BOOLEAN;
BEGIN
    -- Password hash for '1234'
    test_password_hash := '$2a$10$X4kv7j5ZcG39WgogSl16ru0Lw5KPsXb5wPKJ6oTCFp5nKrZLXjXXi';

    -- Find the admin table (check common names)
    SELECT table_name INTO admin_table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('admins', 'admin_users', 'admin', 'administrators', 'staff')
    LIMIT 1;

    IF admin_table_name IS NULL THEN
        RAISE NOTICE '⚠️  No admin table found. Checking for auth.users instead...';

        -- Try to create admin accounts in auth.users with metadata
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data
        ) VALUES
        (
            gen_random_uuid(),
            'admin@test.com',
            test_password_hash,
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            '{"name":"Test Admin 1","role":"admin"}'::jsonb
        ),
        (
            gen_random_uuid(),
            'admin1@test.com',
            test_password_hash,
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            '{"name":"Test Admin 2","role":"admin"}'::jsonb
        ),
        (
            gen_random_uuid(),
            'admin2@test.com',
            test_password_hash,
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            '{"name":"Test Admin 3","role":"admin"}'::jsonb
        )
        ON CONFLICT (email) DO UPDATE
        SET
            encrypted_password = EXCLUDED.encrypted_password,
            raw_app_meta_data = EXCLUDED.raw_app_meta_data,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data;

        RAISE NOTICE '✅ Admin accounts created in auth.users table';
        RETURN;
    END IF;

    -- Check what columns exist in the admin table
    SELECT string_agg(column_name, ', ')
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = admin_table_name;

    -- Check for specific columns
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = admin_table_name
        AND column_name = 'name'
    ) INTO has_name_column;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = admin_table_name
        AND column_name = 'role'
    ) INTO has_role_column;

    RAISE NOTICE 'Found admin table: %', admin_table_name;
    RAISE NOTICE 'Available columns: %', column_list;

    -- Create admins based on available columns
    IF has_name_column AND has_role_column THEN
        -- Full structure with name and role
        EXECUTE format('
            INSERT INTO public.%I (id, email, password_hash, name, role, created_at)
            VALUES
            ($1, $2, $3, $4, $5, NOW()),
            ($6, $7, $3, $8, $5, NOW()),
            ($9, $10, $3, $11, $5, NOW())
            ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                name = EXCLUDED.name,
                role = EXCLUDED.role',
            admin_table_name
        ) USING
            gen_random_uuid(), 'admin@test.com', test_password_hash, 'Test Admin 1', 'super_admin',
            gen_random_uuid(), 'admin1@test.com', 'Test Admin 2',
            gen_random_uuid(), 'admin2@test.com', 'Test Admin 3';
    ELSIF has_name_column THEN
        -- Has name but no role
        EXECUTE format('
            INSERT INTO public.%I (id, email, password_hash, name, created_at)
            VALUES
            ($1, $2, $3, $4, NOW()),
            ($5, $6, $3, $7, NOW()),
            ($8, $9, $3, $10, NOW())
            ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                name = EXCLUDED.name',
            admin_table_name
        ) USING
            gen_random_uuid(), 'admin@test.com', test_password_hash, 'Test Admin 1',
            gen_random_uuid(), 'admin1@test.com', 'Test Admin 2',
            gen_random_uuid(), 'admin2@test.com', 'Test Admin 3';
    ELSE
        -- Minimal structure
        EXECUTE format('
            INSERT INTO public.%I (id, email, password_hash, created_at)
            VALUES
            ($1, $2, $3, NOW()),
            ($4, $5, $3, NOW()),
            ($6, $7, $3, NOW())
            ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash',
            admin_table_name
        ) USING
            gen_random_uuid(), 'admin@test.com', test_password_hash,
            gen_random_uuid(), 'admin1@test.com',
            gen_random_uuid(), 'admin2@test.com';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Test admins created successfully in % table!', admin_table_name;
    RAISE NOTICE '';
    RAISE NOTICE 'Admin Credentials:';
    RAISE NOTICE '  Email: admin@test.com  | Password: 1234';
    RAISE NOTICE '  Email: admin1@test.com | Password: 1234';
    RAISE NOTICE '  Email: admin2@test.com | Password: 1234';
    RAISE NOTICE '';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating test admins: %', SQLERRM;
        RAISE NOTICE 'You may need to adjust the script for your specific table structure';
        RAISE;
END $$;

-- Verify admins were created (try different table names)
DO $$
DECLARE
    admin_count INTEGER;
    admin_table_name TEXT;
BEGIN
    -- Find which table has the admins
    SELECT table_name INTO admin_table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('admins', 'admin_users', 'admin', 'administrators', 'staff')
    LIMIT 1;

    IF admin_table_name IS NOT NULL THEN
        EXECUTE format('
            SELECT COUNT(*) FROM public.%I
            WHERE email IN ($1, $2, $3)',
            admin_table_name
        ) INTO admin_count
        USING 'admin@test.com', 'admin1@test.com', 'admin2@test.com';

        RAISE NOTICE 'Found % test admins in % table', admin_count, admin_table_name;
    ELSE
        -- Check auth.users
        SELECT COUNT(*) INTO admin_count
        FROM auth.users
        WHERE email IN ('admin@test.com', 'admin1@test.com', 'admin2@test.com');

        RAISE NOTICE 'Found % test admins in auth.users table', admin_count;
    END IF;
END $$;