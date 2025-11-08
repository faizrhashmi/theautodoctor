-- Create session_files table for file uploads during sessions
-- This table stores files uploaded by customers and mechanics during chat/video sessions

CREATE TABLE IF NOT EXISTS public.session_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign keys
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL, -- User ID (customer or mechanic)

  -- File metadata
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  storage_path TEXT NOT NULL, -- Path in Supabase storage
  file_url TEXT, -- Public URL for the file

  -- Additional metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_session_files_session_id ON public.session_files(session_id);
CREATE INDEX IF NOT EXISTS idx_session_files_uploaded_by ON public.session_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_session_files_created_at ON public.session_files(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_session_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_files_updated_at_trigger
  BEFORE UPDATE ON public.session_files
  FOR EACH ROW
  EXECUTE FUNCTION update_session_files_updated_at();

-- Enable Row Level Security
ALTER TABLE public.session_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Customers can view files from their own sessions
CREATE POLICY "Customers can view their session files"
  ON public.session_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_files.session_id
      AND sessions.customer_user_id = auth.uid()
    )
  );

-- Mechanics can view files from sessions they're assigned to
CREATE POLICY "Mechanics can view assigned session files"
  ON public.session_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_files.session_id
      AND sessions.mechanic_id IN (
        SELECT id FROM public.mechanics
        WHERE mechanics.id = (
          SELECT mechanic_id FROM public.mechanic_sessions
          WHERE token = current_setting('request.cookie.aad_mech', true)
          AND expires_at > now()
          LIMIT 1
        )
      )
    )
  );

-- Customers can upload files to their own sessions
CREATE POLICY "Customers can upload to their sessions"
  ON public.session_files
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_files.session_id
      AND sessions.customer_user_id = auth.uid()
    )
  );

-- Mechanics can upload files to sessions they're assigned to
CREATE POLICY "Mechanics can upload to assigned sessions"
  ON public.session_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      INNER JOIN public.mechanics m ON m.id = s.mechanic_id
      INNER JOIN public.mechanic_sessions ms ON ms.mechanic_id = m.id
      WHERE s.id = session_files.session_id
      AND ms.token = current_setting('request.cookie.aad_mech', true)
      AND ms.expires_at > now()
      AND uploaded_by = m.id
    )
  );

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own uploaded files"
  ON public.session_files
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.session_files TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.session_files TO anon;

-- Add comment
COMMENT ON TABLE public.session_files IS 'Stores file uploads (images, documents, videos) shared during chat/video sessions between customers and mechanics';
