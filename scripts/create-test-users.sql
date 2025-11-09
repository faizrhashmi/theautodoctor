-- ===================================================================
-- TEST USERS SCRIPT - Three Mechanic Model
-- ===================================================================
-- Purpose: Create test users for all three mechanic types
-- Date: 2025-01-09
-- Usage: Run this in Supabase SQL Editor or via CLI
-- ===================================================================

-- Clean up existing test users first (if they exist)
DELETE FROM mechanics WHERE email IN (
  'virtual.mechanic@test.com',
  'independent.workshop@test.com',
  'workshop.employee@test.com'
);

DELETE FROM organizations WHERE email IN (
  'test.workshop@test.com',
  'independent.workshop@test.com'
);

DELETE FROM auth.users WHERE email IN (
  'virtual.mechanic@test.com',
  'independent.workshop@test.com',
  'workshop.employee@test.com',
  'workshop.admin@test.com',
  'test.customer@test.com'
);

-- ===================================================================
-- TEST USER 1: VIRTUAL-ONLY MECHANIC
-- ===================================================================
-- Purpose: Virtual diagnostic sessions only, earns 70%, can escalate to RFQ
-- Expected Behavior:
--   ✅ Can access /mechanic/earnings
--   ✅ Can access /mechanic/analytics
--   ✅ Sidebar shows all items
--   ✅ Cannot create quotes directly
--   ✅ Can escalate sessions to RFQ
-- ===================================================================

-- Create auth user
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
  role
) VALUES (
  gen_random_uuid(),
  'virtual.mechanic@test.com',
  crypt('Test1234!', gen_salt('bf')), -- Password: Test1234!
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Virtual Mechanic"}',
  'authenticated',
  'authenticated'
)
RETURNING id INTO @virtual_user_id;

-- Create mechanic profile (Virtual-Only)
INSERT INTO mechanics (
  id,
  user_id,
  email,
  name,
  phone,

  -- Location
  city,
  province,
  postal_code,
  country,

  -- Type: Virtual-Only (no workshop_id, account_type can be null or 'independent')
  workshop_id,        -- NULL = Virtual-Only
  account_type,       -- NULL or 'independent'

  -- Credentials
  red_seal_certified,
  years_of_experience,
  specializations,

  -- Stripe
  stripe_account_id,
  stripe_onboarding_completed,
  stripe_payouts_enabled,

  -- Status
  application_status,
  approved_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'virtual.mechanic@test.com'),
  'virtual.mechanic@test.com',
  'Virtual Mechanic',
  '+1-416-555-0001',

  'Toronto',
  'Ontario',
  'M5H 2N2',
  'Canada',

  NULL,              -- No workshop (Virtual-Only)
  NULL,              -- No account_type or 'independent'

  TRUE,              -- Red Seal certified
  8,                 -- 8 years experience
  ARRAY['Honda', 'Toyota', 'Nissan'],

  'acct_test_virtual_123',  -- Test Stripe account
  TRUE,
  TRUE,

  'approved',
  NOW(),
  NOW(),
  NOW()
);

-- ===================================================================
-- TEST USER 2: INDEPENDENT WORKSHOP OWNER/OPERATOR
-- ===================================================================
-- Purpose: Owns their workshop, can do virtual + quotes, earns 70%
-- Expected Behavior:
--   ✅ Can access /mechanic/earnings
--   ✅ Can access /mechanic/analytics
--   ✅ Sidebar shows all items
--   ✅ Can create quotes
--   ✅ Can perform sessions
--   ✅ Should have dual dashboard access (future feature)
-- ===================================================================

-- Create auth user for independent workshop
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
  role
) VALUES (
  gen_random_uuid(),
  'independent.workshop@test.com',
  crypt('Test1234!', gen_salt('bf')), -- Password: Test1234!
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Independent Workshop Owner"}',
  'authenticated',
  'authenticated'
);

-- Create organization (their workshop)
INSERT INTO organizations (
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

  -- Stripe
  stripe_connect_account_id,
  stripe_onboarding_completed,
  stripe_payouts_enabled,
  platform_fee_percentage,

  -- Status
  status,
  verification_status,
  created_at,
  updated_at,
  created_by
) VALUES (
  gen_random_uuid(),
  'workshop',
  'Independent Auto Shop',
  'independent-auto-shop',
  'independent.workshop@test.com',
  '+1-416-555-0002',
  '456 Workshop Ave',
  'Toronto',
  'Ontario',
  'M4B 1B3',
  'Canada',

  'acct_test_independent_shop_123',
  TRUE,
  TRUE,
  30.0,  -- 30% platform fee (negotiable)

  'active',
  'verified',
  NOW(),
  NOW(),
  (SELECT id FROM auth.users WHERE email = 'independent.workshop@test.com')
)
RETURNING id INTO @independent_shop_id;

-- Create mechanic profile (Independent Workshop Owner)
INSERT INTO mechanics (
  id,
  user_id,
  email,
  name,
  phone,

  -- Location
  city,
  province,
  postal_code,
  country,

  -- Type: Independent Workshop (has workshop_id + account_type='independent')
  workshop_id,        -- Points to their OWN workshop
  account_type,       -- 'independent' = owner

  -- Credentials
  red_seal_certified,
  years_of_experience,
  specializations,

  -- Stripe
  stripe_account_id,
  stripe_onboarding_completed,
  stripe_payouts_enabled,

  -- Status
  application_status,
  approved_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'independent.workshop@test.com'),
  'independent.workshop@test.com',
  'Independent Workshop Owner',
  '+1-416-555-0002',

  'Toronto',
  'Ontario',
  'M4B 1B3',
  'Canada',

  (SELECT id FROM organizations WHERE email = 'independent.workshop@test.com'), -- Their workshop
  'independent',     -- Owner/operator

  TRUE,
  12,
  ARRAY['BMW', 'Mercedes', 'Audi'],

  'acct_test_independent_mech_123',
  TRUE,
  TRUE,

  'approved',
  NOW(),
  NOW(),
  NOW()
);

-- ===================================================================
-- TEST USER 3: WORKSHOP EMPLOYEE MECHANIC
-- ===================================================================
-- Purpose: Employee of Test Auto Shop, payments go to workshop
-- Expected Behavior:
--   ❌ CANNOT access /mechanic/earnings (403 Forbidden)
--   ❌ CANNOT access /mechanic/analytics (403 Forbidden)
--   ✅ Sidebar HIDES earnings and analytics
--   ✅ Can perform sessions
--   ✅ Sessions paid to workshop (not mechanic)
--   ⚠️ Availability controlled by workshop admin (Phase 2)
-- ===================================================================

-- First, create the workshop (employer)
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
  role
) VALUES (
  gen_random_uuid(),
  'workshop.admin@test.com',
  crypt('Test1234!', gen_salt('bf')), -- Password: Test1234!
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Workshop Admin"}',
  'authenticated',
  'authenticated'
);

-- Create Test Auto Shop organization
INSERT INTO organizations (
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

  -- Stripe
  stripe_connect_account_id,
  stripe_onboarding_completed,
  stripe_payouts_enabled,
  platform_fee_percentage,

  -- Status
  status,
  verification_status,
  created_at,
  updated_at,
  created_by
) VALUES (
  gen_random_uuid(),
  'workshop',
  'Test Auto Shop',
  'test-auto-shop',
  'test.workshop@test.com',
  '+1-416-555-0003',
  '789 Garage Street',
  'Toronto',
  'Ontario',
  'M5G 1X8',
  'Canada',

  'acct_test_workshop_123',
  TRUE,
  TRUE,
  25.0,  -- 25% platform fee (negotiated)

  'active',
  'verified',
  NOW(),
  NOW(),
  (SELECT id FROM auth.users WHERE email = 'workshop.admin@test.com')
)
RETURNING id INTO @test_workshop_id;

-- Create workshop employee mechanic auth user
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
  role
) VALUES (
  gen_random_uuid(),
  'workshop.employee@test.com',
  crypt('Test1234!', gen_salt('bf')), -- Password: Test1234!
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Workshop Employee"}',
  'authenticated',
  'authenticated'
);

-- Create mechanic profile (Workshop Employee)
INSERT INTO mechanics (
  id,
  user_id,
  email,
  name,
  phone,

  -- Location
  city,
  province,
  postal_code,
  country,

  -- Type: Workshop Employee (has workshop_id + account_type='workshop')
  workshop_id,        -- Points to employer workshop
  account_type,       -- 'workshop' = employee

  -- Credentials
  red_seal_certified,
  years_of_experience,
  specializations,

  -- Stripe (employee may or may not have personal account)
  stripe_account_id,
  stripe_onboarding_completed,
  stripe_payouts_enabled,

  -- Status
  application_status,
  approved_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'workshop.employee@test.com'),
  'workshop.employee@test.com',
  'Workshop Employee Mechanic',
  '+1-416-555-0004',

  'Toronto',
  'Ontario',
  'M5G 1X8',
  'Canada',

  (SELECT id FROM organizations WHERE email = 'test.workshop@test.com'), -- Employer workshop
  'workshop',        -- Employee status

  TRUE,
  5,
  ARRAY['Ford', 'Chevrolet', 'Dodge'],

  NULL,  -- No personal Stripe (payments go to workshop)
  FALSE,
  FALSE,

  'approved',
  NOW(),
  NOW(),
  NOW()
);

-- ===================================================================
-- TEST USER 4: TEST CUSTOMER
-- ===================================================================
-- Purpose: Customer to test booking flow
-- ===================================================================

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
  role
) VALUES (
  gen_random_uuid(),
  'test.customer@test.com',
  crypt('Test1234!', gen_salt('bf')), -- Password: Test1234!
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Customer"}',
  'authenticated',
  'authenticated'
);

-- Create customer profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  phone,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'test.customer@test.com'),
  'test.customer@test.com',
  'Test Customer',
  'customer',
  '+1-416-555-0005',
  NOW(),
  NOW()
);

-- Create test vehicle for customer
INSERT INTO vehicles (
  id,
  customer_id,
  year,
  make,
  brand,
  model,
  vin,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'test.customer@test.com'),
  2015,
  'Honda',
  'Honda',
  'Civic',
  '1HGBH41JXMN109186',
  NOW(),
  NOW()
);

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================
-- Run these to verify test users were created correctly
-- ===================================================================

-- Verify all test users created
SELECT
  'Test Users Created' as status,
  COUNT(*) as user_count
FROM auth.users
WHERE email IN (
  'virtual.mechanic@test.com',
  'independent.workshop@test.com',
  'workshop.employee@test.com',
  'workshop.admin@test.com',
  'test.customer@test.com'
);

-- Verify mechanic types
SELECT
  name,
  email,
  account_type,
  workshop_id,
  CASE
    WHEN workshop_id IS NULL THEN 'VIRTUAL_ONLY'
    WHEN account_type = 'workshop' THEN 'WORKSHOP_AFFILIATED'
    WHEN account_type = 'independent' THEN 'INDEPENDENT_WORKSHOP'
    ELSE 'UNKNOWN'
  END as mechanic_type
FROM mechanics
WHERE email IN (
  'virtual.mechanic@test.com',
  'independent.workshop@test.com',
  'workshop.employee@test.com'
)
ORDER BY mechanic_type;

-- Verify workshop organizations
SELECT
  name,
  email,
  organization_type,
  status,
  platform_fee_percentage
FROM organizations
WHERE email IN (
  'test.workshop@test.com',
  'independent.workshop@test.com'
);

-- ===================================================================
-- TEST CREDENTIALS SUMMARY
-- ===================================================================

/*

LOGIN CREDENTIALS:

1. VIRTUAL-ONLY MECHANIC
   Email: virtual.mechanic@test.com
   Password: Test1234!
   Expected: Full access to earnings, analytics, all sidebar items

2. INDEPENDENT WORKSHOP OWNER
   Email: independent.workshop@test.com
   Password: Test1234!
   Expected: Full access to earnings, analytics, quotes, all sidebar items

3. WORKSHOP EMPLOYEE MECHANIC
   Email: workshop.employee@test.com
   Password: Test1234!
   Expected: NO access to earnings/analytics (403), sidebar hides those items

4. WORKSHOP ADMIN
   Email: workshop.admin@test.com
   Password: Test1234!
   Expected: Workshop dashboard access, can manage employees

5. TEST CUSTOMER
   Email: test.customer@test.com
   Password: Test1234!
   Expected: Can book sessions, test matching
   Vehicle: 2015 Honda Civic

*/

-- ===================================================================
-- TESTING CHECKLIST
-- ===================================================================

/*

PHASE 1 TESTING:

□ Test 1: Virtual-Only Mechanic
  1. Login as virtual.mechanic@test.com
  2. Check sidebar shows: Earnings, Analytics ✅
  3. Navigate to /mechanic/earnings → Should load ✅
  4. Navigate to /mechanic/analytics → Should load ✅

□ Test 2: Independent Workshop Owner
  1. Login as independent.workshop@test.com
  2. Check sidebar shows: Earnings, Analytics, Quotes ✅
  3. Navigate to /mechanic/earnings → Should load ✅
  4. Navigate to /mechanic/analytics → Should load ✅
  5. Can create quotes ✅

□ Test 3: Workshop Employee (CRITICAL)
  1. Login as workshop.employee@test.com
  2. Check sidebar HIDES: Earnings, Analytics ✅
  3. Navigate to /mechanic/earnings → 403 Forbidden ❌
  4. Navigate to /mechanic/analytics → 403 Forbidden ❌
  5. Error message shown: "Workshop employees cannot access..." ✅
  6. Can still access: Sessions, Reviews, Availability ✅

□ Test 4: Customer Booking
  1. Login as test.customer@test.com
  2. Start session wizard
  3. Select vehicle: 2015 Honda Civic
  4. See all three mechanics available
  5. Book session with each type

*/
