-- Fix session_requests.mechanic_id foreign key to reference mechanics table instead of auth.users

-- Drop the old foreign key constraint
ALTER TABLE public.session_requests
  DROP CONSTRAINT IF EXISTS session_requests_mechanic_id_fkey;

-- Add new foreign key constraint referencing mechanics table
ALTER TABLE public.session_requests
  ADD CONSTRAINT session_requests_mechanic_id_fkey
  FOREIGN KEY (mechanic_id)
  REFERENCES public.mechanics(id)
  ON DELETE SET NULL;

-- Update RLS policies to allow mechanics to update session_requests
DROP POLICY IF EXISTS "Mechanics can accept requests" ON public.session_requests;

CREATE POLICY "Mechanics can accept requests"
  ON public.session_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND mechanic_id IS NULL
  )
  WITH CHECK (
    -- Allow setting mechanic_id to any value from mechanics table
    status = 'accepted'
  );
