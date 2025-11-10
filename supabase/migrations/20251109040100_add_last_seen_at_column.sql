-- Add last_seen_at column to mechanics table for presence tracking
-- This is used to show online/offline status to customers

-- Add last_seen_at column (timestamp with timezone)
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Add index for fast queries on recent activity
CREATE INDEX IF NOT EXISTS idx_mechanics_last_seen_at
ON public.mechanics(last_seen_at DESC)
WHERE last_seen_at IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.mechanics.last_seen_at IS 'Timestamp of last activity - used to calculate online/away/offline status';

-- Update existing mechanics who are currently on shift to have a recent last_seen_at
UPDATE public.mechanics
SET last_seen_at = NOW()
WHERE currently_on_shift = true AND last_seen_at IS NULL;
