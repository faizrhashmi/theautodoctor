-- Migration 06: Session Extensions & File Storage
-- Purpose: Support time extensions via Stripe payments and file attachments

-- ============================================================================
-- PART 1: Session Extensions (Task 4)
-- ============================================================================

-- Add extension tracking columns to sessions table
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes int DEFAULT 0;

-- Create session_extensions table for tracking purchased time extensions
CREATE TABLE IF NOT EXISTS public.session_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  minutes int NOT NULL CHECK (minutes > 0),
  payment_intent_id text UNIQUE, -- Ensures idempotency
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_extensions_session_id
  ON public.session_extensions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_extensions_payment_intent
  ON public.session_extensions(payment_intent_id);

-- RLS policies for session_extensions
ALTER TABLE public.session_extensions ENABLE ROW LEVEL SECURITY;

-- Users can view extensions for their own sessions
CREATE POLICY session_extensions_select_own ON public.session_extensions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.customer_user_id = auth.uid() OR s.mechanic_id = auth.uid())
    )
  );

-- Only system/webhook can insert extensions
CREATE POLICY session_extensions_insert_system ON public.session_extensions
  FOR INSERT
  WITH CHECK (false); -- Block direct inserts, only via webhook

COMMENT ON TABLE public.session_extensions IS
  'Tracks time extensions purchased via Stripe. Idempotent via payment_intent_id.';

-- ============================================================================
-- PART 2: File Storage (Task 5)
-- ============================================================================

-- Create session_files table for tracking uploaded files
CREATE TABLE IF NOT EXISTS public.session_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text, -- MIME type
  size int, -- bytes
  storage_path text NOT NULL, -- Path in Supabase Storage
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_files_session_id
  ON public.session_files(session_id);
CREATE INDEX IF NOT EXISTS idx_session_files_uploaded_by
  ON public.session_files(uploaded_by);

-- RLS policies for session_files
ALTER TABLE public.session_files ENABLE ROW LEVEL SECURITY;

-- Users can view files from their own sessions
CREATE POLICY session_files_select_own ON public.session_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.customer_user_id = auth.uid() OR s.mechanic_id = auth.uid())
    )
  );

-- Users can insert files to their own sessions
CREATE POLICY session_files_insert_own ON public.session_files
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (s.customer_user_id = auth.uid() OR s.mechanic_id = auth.uid())
    )
  );

COMMENT ON TABLE public.session_files IS
  'Tracks files uploaded during chat/video sessions. Storage path references Supabase Storage bucket.';

-- ============================================================================
-- PART 3: Helper Function - Calculate Session Expiry
-- ============================================================================

-- Function to calculate when a session should expire based on start time and duration
CREATE OR REPLACE FUNCTION calculate_session_expiry(
  p_session_id uuid
) RETURNS timestamptz AS $$
DECLARE
  v_started_at timestamptz;
  v_duration_minutes int;
  v_result timestamptz;
BEGIN
  SELECT started_at, COALESCE(duration_minutes, 0)
  INTO v_started_at, v_duration_minutes
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_started_at IS NULL THEN
    -- Session not started yet, no expiry
    RETURN NULL;
  END IF;

  v_result := v_started_at + (v_duration_minutes || ' minutes')::interval;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_session_expiry IS
  'Calculates session expiry time based on started_at + duration_minutes';

-- ============================================================================
-- PART 4: Update existing sessions with expires_at
-- ============================================================================

-- Backfill expires_at for existing sessions based on plan duration
DO $$
DECLARE
  v_session RECORD;
  v_plan_duration int;
BEGIN
  FOR v_session IN
    SELECT id, started_at, plan, expires_at
    FROM public.sessions
    WHERE started_at IS NOT NULL AND expires_at IS NULL
  LOOP
    -- Determine plan duration (same logic as clients)
    CASE
      WHEN v_session.plan IN ('free', 'trial', 'trial-free') THEN
        v_plan_duration := 5;
      WHEN v_session.plan = 'chat10' THEN
        v_plan_duration := 30;
      WHEN v_session.plan = 'video15' THEN
        v_plan_duration := 45;
      WHEN v_session.plan = 'diagnostic' THEN
        v_plan_duration := 60;
      ELSE
        v_plan_duration := 30; -- Default
    END CASE;

    UPDATE public.sessions
    SET
      duration_minutes = v_plan_duration,
      expires_at = v_session.started_at + (v_plan_duration || ' minutes')::interval
    WHERE id = v_session.id;
  END LOOP;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

SELECT
  'Migration 06 complete' as message,
  (SELECT COUNT(*) FROM public.session_extensions) as extension_count,
  (SELECT COUNT(*) FROM public.session_files) as file_count,
  (SELECT COUNT(*) FROM public.sessions WHERE expires_at IS NOT NULL) as sessions_with_expiry;
