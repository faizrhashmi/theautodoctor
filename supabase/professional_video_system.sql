-- Professional Video Session System Schema
-- Adds session timing, file sharing, waivers, and mechanic features
-- Safe migration - checks for existing columns

-- Step 1: Enhance sessions table with timing and professional features
DO $$
BEGIN
  -- Add started_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN started_at TIMESTAMPTZ;
  END IF;

  -- Add ended_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN ended_at TIMESTAMPTZ;
  END IF;

  -- Add duration_minutes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN duration_minutes INTEGER;
  END IF;

  -- Add scheduled_for if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN scheduled_for TIMESTAMPTZ;
  END IF;

  -- Add mechanic_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'mechanic_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN mechanic_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;
  END IF;

  -- Add waiver_accepted if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'waiver_accepted'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN waiver_accepted BOOLEAN DEFAULT false;
  END IF;

  -- Add waiver_accepted_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'waiver_accepted_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN waiver_accepted_at TIMESTAMPTZ;
  END IF;

  -- Add waiver_ip_address if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'waiver_ip_address'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN waiver_ip_address TEXT;
  END IF;

  -- Add vehicle_info if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'vehicle_info'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN vehicle_info JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add session_notes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'session_notes'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN session_notes TEXT;
  END IF;

  -- Add rating if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
  END IF;

  -- Add review if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'review'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN review TEXT;
  END IF;
END $$;

-- Step 2: Create session_extensions table for time extensions
CREATE TABLE IF NOT EXISTS public.session_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  extension_minutes INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL, -- in cents
  stripe_payment_id TEXT,
  approved_by UUID REFERENCES auth.users (id)
);

CREATE INDEX IF NOT EXISTS session_extensions_session_idx ON public.session_extensions (session_id);

-- Step 3: Create session_files table for file sharing
CREATE TABLE IF NOT EXISTS public.session_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_url TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS session_files_session_idx ON public.session_files (session_id);
CREATE INDEX IF NOT EXISTS session_files_uploaded_by_idx ON public.session_files (uploaded_by);

-- Step 4: Create mechanic_availability table
CREATE TABLE IF NOT EXISTS public.mechanic_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mechanic_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  UNIQUE (mechanic_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS mechanic_availability_mechanic_idx ON public.mechanic_availability (mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_availability_day_idx ON public.mechanic_availability (day_of_week);

-- Step 5: Create session_recordings table (optional)
CREATE TABLE IF NOT EXISTS public.session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size INTEGER,
  storage_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS session_recordings_session_idx ON public.session_recordings (session_id);

-- Step 6: Add indexes for sessions table new columns
CREATE INDEX IF NOT EXISTS sessions_mechanic_idx ON public.sessions (mechanic_id);
CREATE INDEX IF NOT EXISTS sessions_scheduled_for_idx ON public.sessions (scheduled_for);
CREATE INDEX IF NOT EXISTS sessions_started_at_idx ON public.sessions (started_at);
CREATE INDEX IF NOT EXISTS sessions_status_idx ON public.sessions (status);

-- Step 7: Enable RLS on new tables
ALTER TABLE public.session_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

-- Step 8: RLS Policies for session_extensions
DROP POLICY IF EXISTS "Session participants can view extensions" ON public.session_extensions;
CREATE POLICY "Session participants can view extensions"
  ON public.session_extensions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = session_extensions.session_id
        AND sp.user_id = auth.uid()
    )
  );

-- Step 9: RLS Policies for session_files
DROP POLICY IF EXISTS "Session participants can view files" ON public.session_files;
CREATE POLICY "Session participants can view files"
  ON public.session_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = session_files.session_id
        AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Session participants can upload files" ON public.session_files;
CREATE POLICY "Session participants can upload files"
  ON public.session_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = session_files.session_id
        AND sp.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Step 10: RLS Policies for mechanic_availability
DROP POLICY IF EXISTS "Mechanics can manage their availability" ON public.mechanic_availability;
CREATE POLICY "Mechanics can manage their availability"
  ON public.mechanic_availability
  FOR ALL
  USING (mechanic_id = auth.uid())
  WITH CHECK (mechanic_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view mechanic availability" ON public.mechanic_availability;
CREATE POLICY "Anyone can view mechanic availability"
  ON public.mechanic_availability
  FOR SELECT
  USING (true);

-- Step 11: RLS Policies for session_recordings
DROP POLICY IF EXISTS "Session participants can view recordings" ON public.session_recordings;
CREATE POLICY "Session participants can view recordings"
  ON public.session_recordings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = session_recordings.session_id
        AND sp.user_id = auth.uid()
    )
  );

-- Step 12: Create trigger for mechanic_availability updated_at
CREATE OR REPLACE FUNCTION public.handle_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mechanic_availability_updated_at ON public.mechanic_availability;
CREATE TRIGGER mechanic_availability_updated_at
  BEFORE UPDATE ON public.mechanic_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_availability_updated_at();

-- Step 13: Create helper function to get session duration based on plan
CREATE OR REPLACE FUNCTION public.get_session_duration(plan_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE plan_name
    WHEN 'chat10', 'quick' THEN RETURN 15;
    WHEN 'chat30', 'standard' THEN RETURN 30;
    WHEN 'diagnostic', 'premium' THEN RETURN 60;
    ELSE RETURN 30; -- default
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Update existing sessions with duration_minutes
UPDATE public.sessions
SET duration_minutes = public.get_session_duration(plan)
WHERE duration_minutes IS NULL;

-- Step 15: Verify setup
SELECT 'Professional video system schema completed successfully!' AS status;

-- Show statistics
SELECT
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  COUNT(*) FILTER (WHERE waiver_accepted = true) as sessions_with_waiver,
  COUNT(DISTINCT mechanic_id) as unique_mechanics
FROM public.sessions;
