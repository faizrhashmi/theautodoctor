-- Add vehicle reference to session_requests table
-- Migration date: 2025-10-28
-- Purpose: Link session requests to specific vehicles from the vehicles table

DO $$
BEGIN
  -- Add vehicle_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_requests' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE public.session_requests
      ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added vehicle_id column to session_requests table';
  END IF;
END $$;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS session_requests_vehicle_id_idx
  ON public.session_requests(vehicle_id);

-- Add documentation comment
COMMENT ON COLUMN public.session_requests.vehicle_id IS
  'Reference to the vehicle in the vehicles table for this session request. Links sessions to specific customer vehicles for service history tracking.';

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_requests' AND column_name = 'vehicle_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: vehicle_id column added to session_requests table';
  ELSE
    RAISE EXCEPTION 'FAILED: vehicle_id column was not added';
  END IF;
END $$;
