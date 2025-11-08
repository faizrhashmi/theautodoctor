-- Add urgent flag to intakes table for express/priority sessions
-- This allows customers to request immediate connection with available mechanics

DO $$
BEGIN
  -- Add urgent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intakes' AND column_name = 'urgent'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN urgent BOOLEAN DEFAULT false;

    -- Add comment for documentation
    COMMENT ON COLUMN public.intakes.urgent IS 'Flag indicating this is an urgent/express session request requiring immediate mechanic connection';
  END IF;
END $$;

-- Create index for querying urgent requests (helps mechanics prioritize)
CREATE INDEX IF NOT EXISTS idx_intakes_urgent ON public.intakes(urgent) WHERE urgent = true;
