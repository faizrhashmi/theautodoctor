-- Add mechanic_notes field to sessions table
-- This allows mechanics to write notes during video sessions about their findings

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS mechanic_notes TEXT;

COMMENT ON COLUMN public.sessions.mechanic_notes IS 'Notes written by mechanic during the session about their findings and observations';
