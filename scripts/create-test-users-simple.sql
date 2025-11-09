-- ===================================================================
-- SIMPLE TEST USERS SCRIPT - Run in Supabase Studio SQL Editor
-- ===================================================================
-- Purpose: Create test users for Phase 1 testing
-- How to use: Copy and paste into Supabase Studio SQL Editor
-- URL: http://127.0.0.1:54323 (local) or your Supabase project dashboard
-- ===================================================================

-- STEP 1: Clean up existing test users
-- ===================================================================
DO $$
BEGIN
  -- Delete test mechanics (will cascade to sessions)
  DELETE FROM mechanics WHERE email LIKE '%test.com';

  -- Delete test auth users
  DELETE FROM auth.users WHERE email LIKE '%test.com';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup warning: %', SQLERRM;
END $$;

-- STEP 2: Create Test Users via Supabase Auth
-- ===================================================================
-- Note: Use Supabase Studio UI to create these users properly
-- OR use the Supabase client in your app to sign up

-- For now, let's create basic records that you can enhance via the UI

-- VIRTUAL-ONLY MECHANIC
-- Email: virtual.mechanic@test.com
-- Password: Test1234! (set via Supabase Studio)

-- INDEPENDENT WORKSHOP OWNER
-- Email: independent.workshop@test.com
-- Password: Test1234! (set via Supabase Studio)

-- WORKSHOP EMPLOYEE
-- Email: workshop.employee@test.com
-- Password: Test1234! (set via Supabase Studio)

-- ===================================================================
-- VERIFICATION: Check existing mechanics and their types
-- ===================================================================

SELECT
  m.id,
  m.name,
  m.email,
  m.account_type,
  m.workshop_id,
  CASE
    WHEN m.workshop_id IS NULL THEN 'VIRTUAL_ONLY ✅'
    WHEN m.account_type = 'workshop' THEN 'WORKSHOP_AFFILIATED ⚠️'
    WHEN m.account_type = 'independent' THEN 'INDEPENDENT_WORKSHOP ✅'
    ELSE 'UNKNOWN'
  END as mechanic_type,
  CASE
    WHEN m.workshop_id IS NOT NULL AND m.account_type = 'workshop'
    THEN '❌ BLOCKED from earnings/analytics'
    ELSE '✅ CAN access earnings/analytics'
  END as access_level
FROM mechanics m
ORDER BY mechanic_type;

-- ===================================================================
-- INSTRUCTIONS FOR MANUAL TESTING
-- ===================================================================

/*

OPTION 1: USE EXISTING MECHANICS (RECOMMENDED)

If you already have mechanics in your database, you can test with them:

1. Find a mechanic to make "workshop employee":
   - Note their email
   - Make sure they have a workshop_id
   - UPDATE their account_type to 'workshop'

2. Find a mechanic to make "virtual-only":
   - Note their email
   - UPDATE their workshop_id to NULL
   - UPDATE their account_type to NULL

Example SQL:

-- Make mechanic a workshop employee
UPDATE mechanics
SET
  account_type = 'workshop',
  workshop_id = (SELECT id FROM organizations WHERE name LIKE '%your workshop%' LIMIT 1)
WHERE email = 'your.existing.mechanic@email.com';

-- Make mechanic virtual-only
UPDATE mechanics
SET
  account_type = NULL,
  workshop_id = NULL
WHERE email = 'another.existing.mechanic@email.com';

Then test by logging in with those mechanics!

---

OPTION 2: CREATE VIA APPLICATION UI

The easiest way to create test users:

1. VIRTUAL-ONLY MECHANIC:
   - Go to: http://localhost:3000/mechanic/signup
   - Sign up as a new mechanic
   - Don't link to any workshop
   - Complete profile
   - This creates virtual-only automatically

2. WORKSHOP + EMPLOYEE:
   - First, create a workshop account
   - Workshop invites mechanic (via workshop dashboard)
   - Mechanic accepts invite
   - This creates workshop employee automatically

---

OPTION 3: QUICK TEST MODIFICATION

If you have at least one mechanic already, run this:

*/

-- Example: Convert first mechanic to workshop employee for testing
-- (Uncomment and modify as needed)

/*
UPDATE mechanics
SET
  account_type = 'workshop',
  workshop_id = (SELECT id FROM organizations LIMIT 1)
WHERE id = (SELECT id FROM mechanics LIMIT 1);
*/

-- ===================================================================
-- TESTING VERIFICATION QUERIES
-- ===================================================================

-- Check how many mechanics of each type you have
SELECT
  CASE
    WHEN workshop_id IS NULL THEN 'VIRTUAL_ONLY'
    WHEN account_type = 'workshop' THEN 'WORKSHOP_AFFILIATED'
    WHEN account_type = 'independent' THEN 'INDEPENDENT_WORKSHOP'
    ELSE 'UNKNOWN'
  END as type,
  COUNT(*) as count
FROM mechanics
GROUP BY
  CASE
    WHEN workshop_id IS NULL THEN 'VIRTUAL_ONLY'
    WHEN account_type = 'workshop' THEN 'WORKSHOP_AFFILIATED'
    WHEN account_type = 'independent' THEN 'INDEPENDENT_WORKSHOP'
    ELSE 'UNKNOWN'
  END
ORDER BY count DESC;

-- Get mechanic details for testing
SELECT
  email,
  name,
  account_type,
  workshop_id IS NOT NULL as has_workshop,
  CASE
    WHEN workshop_id IS NULL THEN 'Login → Should see ALL sidebar items'
    WHEN account_type = 'workshop' THEN 'Login → Should NOT see Earnings/Analytics'
    WHEN account_type = 'independent' THEN 'Login → Should see ALL sidebar items'
    ELSE 'Unknown test case'
  END as test_expectation
FROM mechanics
WHERE email NOT LIKE '%+%'  -- Exclude any test/temp emails
ORDER BY account_type NULLS FIRST
LIMIT 10;

