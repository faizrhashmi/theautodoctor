-- =====================================================
-- VERIFY MECHANIC SETUP
-- =====================================================
-- Run this to check if your mechanic account is set up correctly

-- 1. Check if auth user exists
SELECT
  'AUTH USER' as check_type,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'mechanic@test.com';

-- 2. Check if profile exists and has correct role
SELECT
  'PROFILE' as check_type,
  id,
  role,
  full_name,
  created_at
FROM public.profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'mechanic@test.com'
);

-- 3. Check if mechanic record exists with user_id
SELECT
  'MECHANIC' as check_type,
  m.id as mechanic_id,
  m.user_id,
  m.name,
  m.email,
  m.application_status,
  m.created_at
FROM public.mechanics m
WHERE m.user_id IN (
  SELECT id FROM auth.users WHERE email = 'mechanic@test.com'
);

-- 4. Show what's missing
DO $$
DECLARE
  auth_user_exists BOOLEAN;
  profile_exists BOOLEAN;
  profile_role TEXT;
  mechanic_exists BOOLEAN;
  user_uuid UUID;
BEGIN
  -- Check auth user
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'mechanic@test.com') INTO auth_user_exists;

  IF NOT auth_user_exists THEN
    RAISE NOTICE '❌ AUTH USER MISSING: Create user in Supabase Dashboard → Authentication → Users';
    RAISE NOTICE '   Email: mechanic@test.com';
    RAISE NOTICE '   Password: password123';
    RETURN;
  END IF;

  SELECT id INTO user_uuid FROM auth.users WHERE email = 'mechanic@test.com';
  RAISE NOTICE '✅ AUTH USER EXISTS: %', user_uuid;

  -- Check profile
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_uuid) INTO profile_exists;

  IF NOT profile_exists THEN
    RAISE NOTICE '❌ PROFILE MISSING: Profile should be auto-created. Check triggers.';
    RETURN;
  END IF;

  SELECT role INTO profile_role FROM public.profiles WHERE id = user_uuid;
  RAISE NOTICE '✅ PROFILE EXISTS';

  IF profile_role != 'mechanic' THEN
    RAISE NOTICE '❌ PROFILE ROLE WRONG: Got "%" but expected "mechanic"', profile_role;
    RAISE NOTICE '   FIX: UPDATE public.profiles SET role = ''mechanic'' WHERE id = ''%'';', user_uuid;
    RETURN;
  END IF;

  RAISE NOTICE '✅ PROFILE ROLE CORRECT: mechanic';

  -- Check mechanic record
  SELECT EXISTS(SELECT 1 FROM public.mechanics WHERE user_id = user_uuid) INTO mechanic_exists;

  IF NOT mechanic_exists THEN
    RAISE NOTICE '❌ MECHANIC RECORD MISSING';
    RAISE NOTICE '   FIX: INSERT INTO public.mechanics (user_id, name, email, application_status)';
    RAISE NOTICE '        VALUES (''%'', ''Test Mechanic'', ''mechanic@test.com'', ''approved'');', user_uuid;
    RETURN;
  END IF;

  RAISE NOTICE '✅ MECHANIC RECORD EXISTS';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ALL CHECKS PASSED! You should be able to login now.';
  RAISE NOTICE '   Email: mechanic@test.com';
  RAISE NOTICE '   Password: password123';
END $$;
