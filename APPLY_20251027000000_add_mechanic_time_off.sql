-- ============================================
-- Add mechanic_time_off table
-- Created: 2025-10-27
-- Description: Track mechanic time off and vacation periods
-- ============================================

-- Create mechanic_time_off table
CREATE TABLE IF NOT EXISTS public.mechanic_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,

  -- Validation: end_date must be after or equal to start_date
  CONSTRAINT time_off_date_check CHECK (end_date >= start_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS mechanic_time_off_mechanic_idx ON public.mechanic_time_off (mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_time_off_dates_idx ON public.mechanic_time_off (start_date, end_date);

-- Enable RLS
ALTER TABLE public.mechanic_time_off ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Mechanics can manage their own time off" ON public.mechanic_time_off;
CREATE POLICY "Mechanics can manage their own time off"
  ON public.mechanic_time_off
  FOR ALL
  USING (mechanic_id IN (SELECT id FROM mechanics WHERE id = auth.uid()));

DROP POLICY IF EXISTS "System can view all time off" ON public.mechanic_time_off;
CREATE POLICY "System can view all time off"
  ON public.mechanic_time_off
  FOR SELECT
  USING (true);

-- Comment
COMMENT ON TABLE public.mechanic_time_off IS 'Tracks mechanic vacation and time off periods for availability scheduling';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ mechanic_time_off table created successfully';
END $$;
