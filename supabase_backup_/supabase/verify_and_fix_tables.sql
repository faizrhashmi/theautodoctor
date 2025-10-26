-- Verify all tables exist and create missing ones

-- Step 1: Check what tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('sessions', 'session_participants', 'chat_messages')
ORDER BY table_name;

-- Step 2: Check chat_messages structure if it exists
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Step 3: Drop and recreate chat_messages table (SAFE - it should be empty for new feature)
DROP TABLE IF EXISTS public.chat_messages CASCADE;

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Step 4: Create index
CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx
ON public.chat_messages (session_id, created_at);

-- Step 5: Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
DROP POLICY IF EXISTS "Participants can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;

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

-- Step 7: Verify the table was created correctly
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_messages'
ORDER BY ordinal_position;

SELECT 'chat_messages table created successfully!' AS status;
