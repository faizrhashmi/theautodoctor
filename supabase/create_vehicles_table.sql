-- Create a dedicated vehicles table for multiple vehicle support
-- This replaces the single vehicle_info JSON field in profiles

-- Step 1: Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Owner
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vehicle details
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT NOT NULL,
  vin TEXT,
  color TEXT,
  mileage TEXT,
  plate TEXT,

  -- Metadata
  is_primary BOOLEAN DEFAULT false,
  nickname TEXT, -- e.g., "Dad's truck", "My Honda"

  -- Constraints
  CONSTRAINT vehicles_make_check CHECK (char_length(make) > 0),
  CONSTRAINT vehicles_model_check CHECK (char_length(model) > 0),
  CONSTRAINT vehicles_year_check CHECK (char_length(year) > 0)
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS vehicles_user_id_idx ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS vehicles_is_primary_idx ON public.vehicles(is_primary);

-- Step 3: Create RLS policies
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Users can view their own vehicles
DROP POLICY IF EXISTS "Users can view own vehicles" ON public.vehicles;
CREATE POLICY "Users can view own vehicles"
  ON public.vehicles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own vehicles
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
CREATE POLICY "Users can insert own vehicles"
  ON public.vehicles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own vehicles
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
CREATE POLICY "Users can update own vehicles"
  ON public.vehicles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own vehicles
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;
CREATE POLICY "Users can delete own vehicles"
  ON public.vehicles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vehicles_updated_at_trigger ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at_trigger
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicles_updated_at();

-- Step 5: Create function to ensure only one primary vehicle per user
CREATE OR REPLACE FUNCTION ensure_one_primary_vehicle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Unset is_primary for all other vehicles of this user
    UPDATE public.vehicles
    SET is_primary = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_one_primary_vehicle_trigger ON public.vehicles;
CREATE TRIGGER ensure_one_primary_vehicle_trigger
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_one_primary_vehicle();

-- Step 6: Migrate existing vehicle_info data from profiles to vehicles table
-- This is optional - only run if you have existing data
-- INSERT INTO public.vehicles (user_id, make, model, year, vin, color, mileage, is_primary)
-- SELECT
--   id as user_id,
--   vehicle_info->>'make' as make,
--   vehicle_info->>'model' as model,
--   vehicle_info->>'year' as year,
--   vehicle_info->>'vin' as vin,
--   vehicle_info->>'color' as color,
--   vehicle_info->>'mileage' as mileage,
--   true as is_primary
-- FROM public.profiles
-- WHERE vehicle_info IS NOT NULL
--   AND vehicle_info->>'make' IS NOT NULL
--   AND vehicle_info->>'model' IS NOT NULL
--   AND vehicle_info->>'year' IS NOT NULL
-- ON CONFLICT DO NOTHING;

-- Verify the table and policies
SELECT * FROM pg_tables WHERE tablename = 'vehicles';
SELECT * FROM pg_policies WHERE tablename = 'vehicles';
