-- Create vehicle service history views
-- Migration date: 2025-10-28
-- Purpose: Create convenient views for tracking vehicle service history

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.vehicle_service_history;
DROP VIEW IF EXISTS public.vehicle_session_history;
DROP VIEW IF EXISTS public.vehicle_intake_history;

-- View: All sessions for each vehicle
CREATE VIEW public.vehicle_session_history AS
SELECT
  v.id as vehicle_id,
  v.user_id as owner_id,
  v.year,
  v.make,
  v.model,
  v.nickname,
  v.vin,
  v.plate,
  v.mileage as current_mileage,
  v.is_primary,
  sr.id as session_request_id,
  sr.session_type,
  sr.plan_code,
  sr.status as session_status,
  sr.created_at as session_created_at,
  sr.accepted_at,
  sr.mechanic_id,
  sr.customer_name,
  sr.customer_email,
  sr.customer_city,
  sr.customer_country,
  sr.request_type,
  sr.routing_type,
  sr.is_follow_up,
  sr.follow_up_type,
  sr.parent_session_id,
  p.full_name as mechanic_name
FROM public.vehicles v
LEFT JOIN public.session_requests sr ON v.id = sr.vehicle_id
LEFT JOIN public.profiles p ON sr.mechanic_id = p.id
ORDER BY sr.created_at DESC NULLS LAST;

-- View: All intakes for each vehicle
CREATE VIEW public.vehicle_intake_history AS
SELECT
  v.id as vehicle_id,
  v.user_id as owner_id,
  v.year,
  v.make,
  v.model,
  v.nickname,
  v.vin,
  v.plate,
  v.mileage as current_mileage,
  v.is_primary,
  i.id as intake_id,
  i.plan as intake_plan,
  i.created_at as intake_created_at,
  i.name as customer_name,
  i.email as customer_email,
  i.phone as customer_phone,
  i.concern,
  i.city,
  i.odometer as intake_odometer,
  i.files as intake_files
FROM public.vehicles v
LEFT JOIN public.intakes i ON v.id = i.vehicle_id
ORDER BY i.created_at DESC NULLS LAST;

-- Combined view: All service history (sessions + intakes) for each vehicle
CREATE VIEW public.vehicle_service_history AS
SELECT
  v.id as vehicle_id,
  v.user_id as owner_id,
  v.year,
  v.make,
  v.model,
  v.nickname,
  v.vin,
  v.plate,
  v.mileage as current_mileage,
  v.is_primary,
  'session' as record_type,
  sr.id as record_id,
  sr.created_at as record_date,
  sr.session_type as service_type,
  sr.status as status,
  sr.request_type,
  NULL::text as notes,
  sr.mechanic_id,
  p.full_name as mechanic_name,
  NULL::text as concern,
  NULL::text as intake_plan,
  sr.is_follow_up,
  sr.parent_session_id
FROM public.vehicles v
INNER JOIN public.session_requests sr ON v.id = sr.vehicle_id
LEFT JOIN public.profiles p ON sr.mechanic_id = p.id

UNION ALL

SELECT
  v.id as vehicle_id,
  v.user_id as owner_id,
  v.year,
  v.make,
  v.model,
  v.nickname,
  v.vin,
  v.plate,
  v.mileage as current_mileage,
  v.is_primary,
  'intake' as record_type,
  i.id as record_id,
  i.created_at as record_date,
  'intake'::text as service_type,
  NULL::text as status,
  NULL::text as request_type,
  NULL::text as notes,
  NULL::uuid as mechanic_id,
  NULL::text as mechanic_name,
  i.concern,
  i.plan as intake_plan,
  NULL::boolean as is_follow_up,
  NULL::uuid as parent_session_id
FROM public.vehicles v
INNER JOIN public.intakes i ON v.id = i.vehicle_id

ORDER BY record_date DESC;

-- Add RLS policies for the views (they inherit from base tables)
-- But we add explicit grants for clarity

-- Grant access to authenticated users
GRANT SELECT ON public.vehicle_session_history TO authenticated;
GRANT SELECT ON public.vehicle_intake_history TO authenticated;
GRANT SELECT ON public.vehicle_service_history TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.vehicle_session_history IS
  'Shows all session requests associated with each vehicle, including mechanic information';

COMMENT ON VIEW public.vehicle_intake_history IS
  'Shows all intake forms associated with each vehicle';

COMMENT ON VIEW public.vehicle_service_history IS
  'Combined view of all service history (sessions and intakes) for each vehicle, ordered by date';

-- Verify views were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name IN ('vehicle_session_history', 'vehicle_intake_history', 'vehicle_service_history')
  ) THEN
    RAISE NOTICE 'SUCCESS: Vehicle service history views created successfully';
  ELSE
    RAISE EXCEPTION 'FAILED: Views were not created';
  END IF;
END $$;
