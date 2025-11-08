-- Apply Voice Transcripts Migration
-- Run this in Supabase SQL Editor or via psql

BEGIN;

-- Check if session_files table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_files') THEN
        RAISE EXCEPTION 'session_files table does not exist. Please create it first.';
    END IF;
END $$;

-- Add file_category column
ALTER TABLE public.session_files
ADD COLUMN IF NOT EXISTS file_category TEXT DEFAULT 'upload';

-- Add check constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'session_files_file_category_check'
        AND conrelid = 'public.session_files'::regclass
    ) THEN
        ALTER TABLE public.session_files
        ADD CONSTRAINT session_files_file_category_check
        CHECK (file_category IN ('upload', 'voice_transcript', 'screenshot'));
    END IF;
END $$;

-- Add transcript field for voice notes
ALTER TABLE public.session_files
ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Add tags array for categorizing files
ALTER TABLE public.session_files
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_session_files_category
ON public.session_files(file_category);

CREATE INDEX IF NOT EXISTS idx_session_files_transcript
ON public.session_files
USING gin(to_tsvector('english', transcript));

-- Update comments
COMMENT ON COLUMN public.session_files.file_category IS 'Category: upload (file upload), voice_transcript (voice note), screenshot (captured image)';
COMMENT ON COLUMN public.session_files.transcript IS 'Text transcription for voice notes';
COMMENT ON COLUMN public.session_files.tags IS 'Array of tags for categorizing files (Engine, Brakes, etc.)';

COMMIT;

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'session_files'
AND column_name IN ('file_category', 'transcript', 'tags')
ORDER BY ordinal_position;
