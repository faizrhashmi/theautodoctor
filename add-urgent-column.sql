-- CRITICAL: Add is_urgent column to session_requests
-- This is blocking session_request creation in the intake flow
-- Run this in your Supabase SQL Editor NOW

ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS session_requests_urgent_idx
ON public.session_requests(is_urgent)
WHERE is_urgent = TRUE;

-- Verify it worked
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'session_requests'
AND column_name = 'is_urgent';
