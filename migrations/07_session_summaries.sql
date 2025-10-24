-- Migration 07: Session Summaries
-- Task 7: Add summary fields to sessions table

-- Add summary columns to sessions table
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS summary_data jsonb,
ADD COLUMN IF NOT EXISTS summary_submitted_at timestamptz;

-- Create index on summary_submitted_at for efficient querying
CREATE INDEX IF NOT EXISTS idx_sessions_summary_submitted_at
ON public.sessions(summary_submitted_at)
WHERE summary_submitted_at IS NOT NULL;

-- Add comment explaining the summary_data structure
COMMENT ON COLUMN public.sessions.summary_data IS 'JSON object containing: findings, steps_taken, parts_needed, next_steps, photos (array of URLs)';
COMMENT ON COLUMN public.sessions.summary_submitted_at IS 'Timestamp when mechanic submitted the session summary';

-- Grant access
GRANT SELECT, UPDATE ON public.sessions TO authenticated;
