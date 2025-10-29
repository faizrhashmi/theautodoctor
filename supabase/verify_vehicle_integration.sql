-- Verification Query for Vehicle Integration
-- Run this in Supabase SQL Editor to verify all changes were applied

-- Check 1: Verify vehicle_id column exists in session_requests
SELECT
  'session_requests.vehicle_id' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'session_requests'
      AND column_name = 'vehicle_id'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check 2: Verify vehicle_id column exists in intakes
SELECT
  'intakes.vehicle_id' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'intakes'
      AND column_name = 'vehicle_id'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check 3: Verify vehicle_service_history view exists
SELECT
  'vehicle_service_history view' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_name = 'vehicle_service_history'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check 4: Verify vehicle_session_history view exists
SELECT
  'vehicle_session_history view' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_name = 'vehicle_session_history'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check 5: Verify vehicle_intake_history view exists
SELECT
  'vehicle_intake_history view' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_name = 'vehicle_intake_history'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check 6: Verify indexes were created
SELECT
  'session_requests_vehicle_id_idx' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'session_requests_vehicle_id_idx'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

SELECT
  'intakes_vehicle_id_idx' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'intakes_vehicle_id_idx'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check 7: Count vehicles in database
SELECT
  'Total vehicles' as metric,
  COUNT(*) as count
FROM public.vehicles;

-- Check 8: Count intakes linked to vehicles
SELECT
  'Intakes with vehicle_id' as metric,
  COUNT(*) as count
FROM public.intakes
WHERE vehicle_id IS NOT NULL;

-- Check 9: Count session_requests linked to vehicles
SELECT
  'Session requests with vehicle_id' as metric,
  COUNT(*) as count
FROM public.session_requests
WHERE vehicle_id IS NOT NULL;

-- Check 10: Test the vehicle_service_history view (limit to 5 records)
SELECT
  'vehicle_service_history view test' as test_name,
  COUNT(*) as total_records
FROM public.vehicle_service_history;

-- Check 11: Sample data from vehicle_service_history (if any exists)
SELECT
  vehicle_id,
  year,
  make,
  model,
  record_type,
  record_date,
  service_type,
  status
FROM public.vehicle_service_history
LIMIT 5;

-- Summary Report
SELECT
  '=== VEHICLE INTEGRATION VERIFICATION SUMMARY ===' as report;

SELECT
  'Schema Changes' as category,
  CASE
    WHEN (
      SELECT COUNT(*) FROM information_schema.columns
      WHERE table_name IN ('session_requests', 'intakes')
      AND column_name = 'vehicle_id'
    ) = 2 THEN '✅ All columns added'
    ELSE '❌ Some columns missing'
  END as status;

SELECT
  'Database Views' as category,
  CASE
    WHEN (
      SELECT COUNT(*) FROM information_schema.views
      WHERE table_name IN ('vehicle_service_history', 'vehicle_session_history', 'vehicle_intake_history')
    ) = 3 THEN '✅ All views created'
    ELSE '❌ Some views missing'
  END as status;

SELECT
  'Indexes' as category,
  CASE
    WHEN (
      SELECT COUNT(*) FROM pg_indexes
      WHERE indexname IN ('session_requests_vehicle_id_idx', 'intakes_vehicle_id_idx')
    ) = 2 THEN '✅ All indexes created'
    ELSE '❌ Some indexes missing'
  END as status;
