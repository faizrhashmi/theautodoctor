-- ===================================================================
-- Phase 1 Test Users Creation Script
-- ===================================================================
-- Purpose: Create 3 test users to test Phase 1 access control
-- Date: 2025-11-09
-- ===================================================================

-- STEP 1: Create auth users
-- ===================================================================

-- Virtual-Only Mechanic
INSERT INTO auth.users (
  id,
  instance_id,
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
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'virtual.test@theautodoctor.com',
  '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG1vRCh.2Cy', -- Password: Test1234!
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Virtual Test Mechanic"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Workshop Employee
INSERT INTO auth.users (
  id,
  instance_id,
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
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'employee.test@theautodoctor.com',
  '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG1vRCh.2Cy', -- Password: Test1234!
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Workshop Employee Test"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Independent Workshop Owner
INSERT INTO auth.users (
  id,
  instance_id,
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
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'independent.test@theautodoctor.com',
  '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG1vRCh.2Cy', -- Password: Test1234!
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Independent Workshop Owner Test"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- STEP 2: Create test workshop for workshop employee and independent owner
-- ===================================================================

INSERT INTO organizations (
  id,
  name,
  organization_type,
  address,
  city,
  province,
  postal_code,
  phone,
  email,
  status,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Test Workshop Ltd',
  'workshop',
  '123 Test Street',
  'Toronto',
  'ON',
  'M5V 3A8',
  '+14165551234',
  'workshop@theautodoctor.com',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (
  id,
  name,
  organization_type,
  address,
  city,
  province,
  postal_code,
  phone,
  email,
  status,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000011',
  'Independent Auto Shop',
  'workshop',
  '456 Independent Ave',
  'Toronto',
  'ON',
  'M4B 1B3',
  '+14165555678',
  'independent@theautodoctor.com',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- STEP 3: Create mechanic profiles
-- ===================================================================

-- Virtual-Only Mechanic (NO workshop_id)
INSERT INTO mechanics (
  id,
  user_id,
  email,
  name,
  phone,
  province,
  city,
  postal_code,
  years_of_experience,
  specializations,
  certifications,
  languages,
  bio,
  hourly_rate,
  service_tier,
  account_type,
  workshop_id,
  availability_status,
  rating_average,
  total_sessions,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'virtual.test@theautodoctor.com',
  'Virtual Test Mechanic',
  '+14165551111',
  'ON',
  'Toronto',
  'M5V 3A8',
  8,
  ARRAY['Engine Diagnostics', 'Electrical Systems', 'Transmission'],
  ARRAY['ASE Certified', 'Red Seal'],
  ARRAY['English', 'French'],
  'Experienced virtual diagnostic mechanic specializing in remote troubleshooting.',
  75.00,
  'premium',
  NULL, -- Virtual-only = NULL account_type
  NULL, -- Virtual-only = NULL workshop_id
  'available',
  4.8,
  156,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Workshop Employee (account_type = 'workshop')
INSERT INTO mechanics (
  id,
  user_id,
  email,
  name,
  phone,
  province,
  city,
  postal_code,
  years_of_experience,
  specializations,
  certifications,
  languages,
  bio,
  hourly_rate,
  service_tier,
  account_type,
  workshop_id,
  availability_status,
  rating_average,
  total_sessions,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'employee.test@theautodoctor.com',
  'Workshop Employee Test',
  '+14165552222',
  'ON',
  'Toronto',
  'M5V 3A8',
  5,
  ARRAY['Brakes', 'Suspension', 'Oil Changes'],
  ARRAY['ASE Certified'],
  ARRAY['English'],
  'Workshop employee mechanic. Payment goes to workshop.',
  60.00,
  'standard',
  'workshop', -- CRITICAL: This makes them a workshop employee
  '00000000-0000-0000-0000-000000000010', -- Linked to Test Workshop
  'available',
  4.5,
  89,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Independent Workshop Owner (account_type = 'independent')
INSERT INTO mechanics (
  id,
  user_id,
  email,
  name,
  phone,
  province,
  city,
  postal_code,
  years_of_experience,
  specializations,
  certifications,
  languages,
  bio,
  hourly_rate,
  service_tier,
  account_type,
  workshop_id,
  availability_status,
  rating_average,
  total_sessions,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  'independent.test@theautodoctor.com',
  'Independent Workshop Owner Test',
  '+14165553333',
  'ON',
  'Toronto',
  'M4B 1B3',
  12,
  ARRAY['Engine Repair', 'Diagnostics', 'Performance Tuning'],
  ARRAY['Red Seal', 'ASE Master Certified'],
  ARRAY['English', 'Spanish'],
  'Independent workshop owner with dual dashboard access.',
  85.00,
  'premium',
  'independent', -- CRITICAL: This makes them an independent owner
  '00000000-0000-0000-0000-000000000011', -- Linked to their own workshop
  'available',
  4.9,
  234,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- STEP 4: Create profiles for auth integration
-- ===================================================================

INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000001', 'virtual.test@theautodoctor.com', 'Virtual Test Mechanic', 'mechanic', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'employee.test@theautodoctor.com', 'Workshop Employee Test', 'mechanic', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'independent.test@theautodoctor.com', 'Independent Workshop Owner Test', 'mechanic', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Verification
-- ===================================================================

SELECT
  m.email,
  m.name,
  m.account_type,
  m.workshop_id IS NOT NULL as has_workshop,
  CASE
    WHEN m.workshop_id IS NULL THEN 'VIRTUAL_ONLY ✅ Can access Earnings/Analytics'
    WHEN m.account_type = 'workshop' THEN 'WORKSHOP_EMPLOYEE ❌ BLOCKED from Earnings/Analytics'
    WHEN m.account_type = 'independent' THEN 'INDEPENDENT_WORKSHOP ✅ Can access Earnings/Analytics'
    ELSE 'UNKNOWN'
  END as mechanic_type_and_access
FROM mechanics m
WHERE m.email LIKE '%test@theautodoctor.com'
ORDER BY m.email;

-- ===================================================================
-- Test Credentials
-- ===================================================================
--
-- All test users have the same password: Test1234!
--
-- 1. Virtual-Only Mechanic:
--    Email: virtual.test@theautodoctor.com
--    Password: Test1234!
--    Expected: ✅ Can see and access Earnings & Analytics
--
-- 2. Workshop Employee:
--    Email: employee.test@theautodoctor.com
--    Password: Test1234!
--    Expected: ❌ Cannot see or access Earnings & Analytics (403 error)
--
-- 3. Independent Workshop Owner:
--    Email: independent.test@theautodoctor.com
--    Password: Test1234!
--    Expected: ✅ Can see and access Earnings & Analytics
--
-- ===================================================================
