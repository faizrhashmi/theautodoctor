-- Migrate existing vehicle data from intakes and profiles to vehicles table
-- Migration date: 2025-10-28
-- Purpose: One-time migration to populate vehicles table with historical data

-- IMPORTANT: This migration is OPTIONAL and should only be run if you have existing data
-- Review the data before running this migration in production

DO $$
DECLARE
  migrated_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN

  -- Step 1: Migrate vehicle data from intakes to vehicles table
  -- This creates vehicle records for authenticated users who have submitted intakes
  -- Only migrate intakes that have complete vehicle information

  RAISE NOTICE 'Starting vehicle data migration from intakes...';

  INSERT INTO public.vehicles (
    user_id,
    make,
    model,
    year,
    vin,
    mileage,
    plate,
    color,
    is_primary,
    created_at,
    updated_at
  )
  SELECT DISTINCT ON (i.vin, p.id)
    p.id as user_id,
    i.make,
    i.model,
    i.year,
    i.vin,
    i.odometer as mileage,
    i.plate,
    NULL as color, -- intakes don't have color field
    false as is_primary, -- Will set primary later
    i.created_at,
    NOW() as updated_at
  FROM public.intakes i
  INNER JOIN public.profiles p ON p.email = i.email OR p.phone = i.phone
  WHERE
    i.make IS NOT NULL
    AND i.model IS NOT NULL
    AND i.year IS NOT NULL
    AND i.vin IS NOT NULL
    AND LENGTH(TRIM(i.make)) > 0
    AND LENGTH(TRIM(i.model)) > 0
    AND LENGTH(TRIM(i.year)) > 0
    -- Only migrate if vehicle doesn't already exist for this user
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.user_id = p.id
        AND v.vin = i.vin
    )
  ORDER BY i.vin, p.id, i.created_at ASC
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % vehicle records from intakes', migrated_count;

  -- Step 2: Migrate vehicle info from profiles (legacy vehicle_info JSONB field)
  -- Only for users who don't have any vehicles yet

  RAISE NOTICE 'Starting vehicle data migration from profiles...';

  INSERT INTO public.vehicles (
    user_id,
    make,
    model,
    year,
    vin,
    mileage,
    color,
    is_primary,
    created_at,
    updated_at
  )
  SELECT
    p.id as user_id,
    p.vehicle_info->>'make' as make,
    p.vehicle_info->>'model' as model,
    p.vehicle_info->>'year' as year,
    p.vehicle_info->>'vin' as vin,
    p.vehicle_info->>'mileage' as mileage,
    p.vehicle_info->>'color' as color,
    true as is_primary, -- Legacy vehicle becomes primary
    p.created_at,
    NOW() as updated_at
  FROM public.profiles p
  WHERE
    p.vehicle_info IS NOT NULL
    AND p.vehicle_info ? 'make'
    AND p.vehicle_info ? 'model'
    AND p.vehicle_info ? 'year'
    AND LENGTH(TRIM(p.vehicle_info->>'make')) > 0
    AND LENGTH(TRIM(p.vehicle_info->>'model')) > 0
    AND LENGTH(TRIM(p.vehicle_info->>'year')) > 0
    -- Only if user doesn't have any vehicles yet
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.user_id = p.id
    )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS skipped_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % vehicle records from profiles', skipped_count;

  -- Step 3: Set first vehicle as primary for each user who doesn't have a primary

  RAISE NOTICE 'Setting primary vehicles for users without one...';

  WITH first_vehicles AS (
    SELECT DISTINCT ON (user_id)
      id,
      user_id
    FROM public.vehicles
    WHERE is_primary = false
    ORDER BY user_id, created_at ASC
  )
  UPDATE public.vehicles v
  SET is_primary = true
  FROM first_vehicles fv
  WHERE v.id = fv.id
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicles v2
      WHERE v2.user_id = fv.user_id
        AND v2.is_primary = true
    );

  -- Step 4: Update intakes to link to their vehicle records

  RAISE NOTICE 'Linking intakes to vehicle records...';

  UPDATE public.intakes i
  SET vehicle_id = v.id
  FROM public.vehicles v
  INNER JOIN public.profiles p ON v.user_id = p.id
  WHERE
    i.vehicle_id IS NULL
    AND (p.email = i.email OR p.phone = i.phone)
    AND v.vin = i.vin
    AND v.make = i.make
    AND v.model = i.model
    AND v.year = i.year;

  -- Step 5: Link session_requests to vehicles based on parent session's intake

  RAISE NOTICE 'Linking session requests to vehicle records...';

  UPDATE public.session_requests sr
  SET vehicle_id = i.vehicle_id
  FROM public.sessions s
  INNER JOIN public.intakes i ON s.intake_id = i.id
  WHERE
    sr.vehicle_id IS NULL
    AND sr.parent_session_id = s.id
    AND i.vehicle_id IS NOT NULL;

  -- Report summary
  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'Total vehicles created: %', (migrated_count + skipped_count);
  RAISE NOTICE 'From intakes: %', migrated_count;
  RAISE NOTICE 'From profiles: %', skipped_count;

  -- Count linked records
  DECLARE
    linked_intakes INTEGER;
    linked_requests INTEGER;
  BEGIN
    SELECT COUNT(*) INTO linked_intakes FROM public.intakes WHERE vehicle_id IS NOT NULL;
    SELECT COUNT(*) INTO linked_requests FROM public.session_requests WHERE vehicle_id IS NOT NULL;

    RAISE NOTICE 'Intakes linked to vehicles: %', linked_intakes;
    RAISE NOTICE 'Session requests linked to vehicles: %', linked_requests;
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
  END;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;
