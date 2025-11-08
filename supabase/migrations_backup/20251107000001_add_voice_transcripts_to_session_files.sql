-- Add support for voice transcripts in session_files table
-- Voice notes will be stored as text transcriptions, not audio files

-- Add file_category to distinguish between file uploads and voice transcripts
ALTER TABLE public.session_files
ADD COLUMN IF NOT EXISTS file_category TEXT DEFAULT 'upload' CHECK (file_category IN ('upload', 'voice_transcript', 'screenshot'));

-- Add transcript field for voice notes
ALTER TABLE public.session_files
ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Add tags array for categorizing files
ALTER TABLE public.session_files
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add index for better query performance on file_category
CREATE INDEX IF NOT EXISTS idx_session_files_category ON public.session_files(file_category);

-- Add index for searching transcripts
CREATE INDEX IF NOT EXISTS idx_session_files_transcript ON public.session_files USING gin(to_tsvector('english', transcript));

-- Update comment
COMMENT ON COLUMN public.session_files.file_category IS 'Category: upload (file upload), voice_transcript (voice note), screenshot (captured image)';
COMMENT ON COLUMN public.session_files.transcript IS 'Text transcription for voice notes';
COMMENT ON COLUMN public.session_files.tags IS 'Array of tags for categorizing files (Engine, Brakes, etc.)';
