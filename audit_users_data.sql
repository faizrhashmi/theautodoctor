-- COMPREHENSIVE USER DATA AUDIT
-- This script will help us understand the current state of all users

-- 1. ALL PROFILES WITH ROLES
SELECT
  id,
  email,
  role,
  full_name,
  phone_number,
  city,
  province,
  postal_code,
  latitude,
  longitude,
  stripe_customer_id,
  stripe_account_id,
  is_suspended,
  created_at
FROM profiles
ORDER BY role, created_at;

-- 2. CUSTOMER DETAILS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.phone_number,
  p.city,
  p.province,
  p.postal_code,
  p.latitude,
  p.longitude,
  p.stripe_customer_id,
  p.created_at
FROM profiles p
WHERE p.role = 'customer'
ORDER BY p.created_at;

-- 3. MECHANIC PROFILES (ALL TYPES)
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  m.mechanic_type,
  m.years_experience,
  m.hourly_rate,
  m.bio,
  m.specializations,
  m.red_seal_certified,
  m.red_seal_trade,
  m.red_seal_province,
  m.red_seal_certificate_number,
  m.red_seal_issue_date,
  m.interprovincial_certified,
  m.interprovincial_trades,
  m.quebec_certified,
  m.quebec_qualification_certificate_number,
  m.is_available,
  m.workshop_id,
  p.city,
  p.province,
  p.postal_code,
  p.latitude,
  p.longitude
FROM profiles p
LEFT JOIN mechanic_profiles m ON p.id = m.user_id
WHERE p.role = 'mechanic'
ORDER BY m.mechanic_type, p.created_at;

-- 4. BRAND SPECIALIST CERTIFICATIONS
SELECT
  bc.id,
  bc.mechanic_id,
  p.full_name,
  bc.brand_name,
  bc.certification_type,
  bc.certificate_number,
  bc.issue_date,
  bc.expiry_date,
  bc.issuing_organization,
  bc.verified
FROM brand_specialist_certifications bc
JOIN profiles p ON bc.mechanic_id = p.id
ORDER BY p.full_name, bc.brand_name;

-- 5. WORKSHOPS (ORGANIZATIONS)
SELECT
  o.id,
  o.name,
  o.business_name,
  o.business_address,
  o.city,
  o.province,
  o.postal_code,
  o.latitude,
  o.longitude,
  o.phone_number,
  o.business_registration_number,
  o.tax_id,
  o.website,
  o.created_at,
  o.owner_id
FROM organizations o
WHERE o.type = 'workshop'
ORDER BY o.created_at;

-- 6. WORKSHOP MEMBERS (MECHANICS ASSOCIATED WITH WORKSHOPS)
SELECT
  om.id,
  om.organization_id,
  org.name as workshop_name,
  om.user_id,
  p.full_name as mechanic_name,
  p.email,
  om.role as member_role,
  om.joined_at
FROM organization_members om
JOIN organizations org ON om.organization_id = org.id
JOIN profiles p ON om.user_id = p.id
WHERE org.type = 'workshop'
ORDER BY org.name, om.joined_at;

-- 7. RFQs (REQUEST FOR QUOTES)
SELECT
  rfq.id,
  rfq.customer_id,
  c.full_name as customer_name,
  rfq.vehicle_make,
  rfq.vehicle_model,
  rfq.vehicle_year,
  rfq.issue_description,
  rfq.service_type,
  rfq.urgency,
  rfq.status,
  rfq.created_at,
  rfq.preferred_date,
  rfq.location_city,
  rfq.location_province,
  rfq.location_postal_code
FROM rfqs rfq
JOIN profiles c ON rfq.customer_id = c.id
ORDER BY rfq.created_at DESC;

-- 8. QUOTES SUBMITTED BY MECHANICS
SELECT
  q.id,
  q.rfq_id,
  q.mechanic_id,
  m.full_name as mechanic_name,
  mp.mechanic_type,
  q.estimated_cost,
  q.estimated_duration,
  q.message,
  q.status,
  q.created_at
FROM quotes q
JOIN profiles m ON q.mechanic_id = m.id
LEFT JOIN mechanic_profiles mp ON m.id = mp.user_id
ORDER BY q.rfq_id, q.created_at;

-- 9. APPOINTMENTS/SESSIONS
SELECT
  sr.id,
  sr.customer_id,
  c.full_name as customer_name,
  sr.mechanic_id,
  m.full_name as mechanic_name,
  mp.mechanic_type,
  sr.session_type,
  sr.status,
  sr.scheduled_at,
  sr.location_type,
  sr.location_address,
  sr.created_at
FROM session_requests sr
JOIN profiles c ON sr.customer_id = c.id
LEFT JOIN profiles m ON sr.mechanic_id = m.id
LEFT JOIN mechanic_profiles mp ON m.id = mp.user_id
ORDER BY sr.scheduled_at DESC;

-- 10. WORKSHOP APPOINTMENTS
SELECT
  wa.id,
  wa.workshop_id,
  w.name as workshop_name,
  wa.customer_id,
  c.full_name as customer_name,
  wa.mechanic_id,
  m.full_name as mechanic_name,
  wa.appointment_type,
  wa.service_type,
  wa.scheduled_at,
  wa.status,
  wa.created_at
FROM workshop_appointments wa
JOIN organizations w ON wa.workshop_id = w.id
JOIN profiles c ON wa.customer_id = c.id
LEFT JOIN profiles m ON wa.mechanic_id = m.id
ORDER BY wa.scheduled_at DESC;

-- 11. SUMMARY COUNTS
SELECT
  'Total Users' as metric,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT
  'Customers',
  COUNT(*)
FROM profiles WHERE role = 'customer'
UNION ALL
SELECT
  'Mechanics',
  COUNT(*)
FROM profiles WHERE role = 'mechanic'
UNION ALL
SELECT
  'Virtual Mechanics',
  COUNT(*)
FROM mechanic_profiles WHERE mechanic_type = 'virtual'
UNION ALL
SELECT
  'Workshop Mechanics',
  COUNT(*)
FROM mechanic_profiles WHERE mechanic_type = 'workshop'
UNION ALL
SELECT
  'Independent Mechanics',
  COUNT(*)
FROM mechanic_profiles WHERE mechanic_type = 'independent'
UNION ALL
SELECT
  'Workshops',
  COUNT(*)
FROM organizations WHERE type = 'workshop'
UNION ALL
SELECT
  'RFQs',
  COUNT(*)
FROM rfqs
UNION ALL
SELECT
  'Quotes',
  COUNT(*)
FROM quotes
UNION ALL
SELECT
  'Session Requests',
  COUNT(*)
FROM session_requests
UNION ALL
SELECT
  'Workshop Appointments',
  COUNT(*)
FROM workshop_appointments
UNION ALL
SELECT
  'Brand Certifications',
  COUNT(*)
FROM brand_specialist_certifications;
