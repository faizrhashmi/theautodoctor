-- Migration to add missing columns to existing sessions table
-- This preserves your existing data!

-- Step 1: Create enum types if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
    CREATE TYPE public.session_type AS ENUM ('chat', 'video', 'diagnostic');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_participant_role') THEN
    CREATE TYPE public.session_participant_role AS ENUM ('customer', 'mechanic');
  END IF;
END $$;

-- Step 2: Add missing columns to sessions table
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS type public.session_type,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Step 3: Set type for existing rows based on plan
-- This assumes your existing sessions should default to 'video' or 'diagnostic'
UPDATE public.sessions
SET type = CASE
  WHEN plan = 'chat10' THEN 'chat'::session_type
  WHEN plan = 'video15' THEN 'video'::session_type
  WHEN plan = 'diagnostic' THEN 'diagnostic'::session_type
  ELSE 'video'::session_type  -- default fallback
END
WHERE type IS NULL;

-- Step 4: Make type column NOT NULL now that we've set values
ALTER TABLE public.sessions
  ALTER COLUMN type SET NOT NULL;

-- Step 5: Migrate customer_email to metadata (optional, keeps both for now)
UPDATE public.sessions
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{customer_email}',
  to_jsonb(customer_email)
)
WHERE customer_email IS NOT NULL AND metadata->>'customer_email' IS NULL;

-- Step 6: Create session_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.session_participant_role NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (session_id, user_id)
);

-- Step 7: Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Step 8: Create or replace trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Step 9: Create trigger for updated_at
DROP TRIGGER IF EXISTS sessions_updated_at ON public.sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Step 10: Create indexes
CREATE INDEX IF NOT EXISTS sessions_stripe_session_idx ON public.sessions (stripe_session_id);
CREATE INDEX IF NOT EXISTS sessions_type_idx ON public.sessions (type);
CREATE INDEX IF NOT EXISTS session_participants_session_idx ON public.session_participants (session_id);
CREATE INDEX IF NOT EXISTS session_participants_user_idx ON public.session_participants (user_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx ON public.chat_messages (session_id, created_at);

-- Step 11: Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 12: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Participants can read their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Participants can read participants" ON public.session_participants;
DROP POLICY IF EXISTS "Participants can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;

-- Step 13: Create RLS policies
CREATE POLICY "Participants can read their sessions"
  ON public.sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_participants sp
      WHERE sp.session_id = id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can read participants"
  ON public.session_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_participants sp
      WHERE sp.session_id = session_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can read messages"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_participants sp
      WHERE sp.session_id = session_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_participants sp
      WHERE sp.session_id = session_id
        AND sp.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Success message
SELECT 'Migration completed successfully! Sessions table updated with new columns.' AS status;
