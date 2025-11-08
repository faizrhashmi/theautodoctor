-- Add vehicle reference to intakes table
-- Migration date: 2025-10-28
-- Purpose: Link intake forms to specific vehicles from the vehicles table

DO $$
BEGIN
  -- Add vehicle_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intakes' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE public.intakes
      ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added vehicle_id column to intakes table';
  END IF;
END $$;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS intakes_vehicle_id_idx
  ON public.intakes(vehicle_id);

-- Add documentation comment
COMMENT ON COLUMN public.intakes.vehicle_id IS
  'Reference to the vehicle in the vehicles table. When set, this links the intake to a specific vehicle record. The individual vehicle fields (make, model, year, vin, plate, odometer) are kept for backward compatibility and for anonymous/guest intake submissions.';

-- Add comments to legacy fields
COMMENT ON COLUMN public.intakes.make IS 'Legacy field: Vehicle make. Use vehicle_id reference when possible.';
COMMENT ON COLUMN public.intakes.model IS 'Legacy field: Vehicle model. Use vehicle_id reference when possible.';
COMMENT ON COLUMN public.intakes.year IS 'Legacy field: Vehicle year. Use vehicle_id reference when possible.';
COMMENT ON COLUMN public.intakes.vin IS 'Legacy field: Vehicle VIN. Use vehicle_id reference when possible.';
COMMENT ON COLUMN public.intakes.plate IS 'Legacy field: License plate. Use vehicle_id reference when possible.';
COMMENT ON COLUMN public.intakes.odometer IS 'Legacy field: Odometer reading. Use vehicle_id reference when possible.';

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intakes' AND column_name = 'vehicle_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: vehicle_id column added to intakes table';
  ELSE
    RAISE EXCEPTION 'FAILED: vehicle_id column was not added';
  END IF;
END $$;
