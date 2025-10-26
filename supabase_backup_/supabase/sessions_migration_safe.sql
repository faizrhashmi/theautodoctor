-- SAFE Migration: Chat Sessions System
-- Run this in Supabase SQL Editor

-- Step 1: Create extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Create enum types
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

-- Step 3: Drop existing sessions table if it exists (CAREFUL - only do this if you're okay losing existing data)
-- UNCOMMENT THE NEXT LINE ONLY IF YOU'RE SURE:
-- DROP TABLE IF EXISTS public.sessions CASCADE;

-- Step 4: Create sessions table
-- If you get an error here, it means the table exists. Run the DROP command above first.
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan TEXT NOT NULL,
  type public.session_type NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_session_id TEXT NOT NULL UNIQUE,
  intake_id UUID,  -- Removed foreign key constraint for now
  customer_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Step 5: Add foreign key to intakes if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intakes') THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_intake_id_fkey
      FOREIGN KEY (intake_id)
      REFERENCES public.intakes (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Step 6: Create session_participants table
CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.session_participant_role NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (session_id, user_id)
);

-- Step 7: Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Step 8: Create trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Step 9: Create trigger
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

-- Step 12: Create RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sessions' AND policyname = 'Participants can read their sessions'
  ) THEN
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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session_participants' AND policyname = 'Participants can read participants'
  ) THEN
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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Participants can read messages'
  ) THEN
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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Participants can send messages'
  ) THEN
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
  END IF;
END $$;

-- Success message
SELECT 'Migration completed successfully!' AS status;
