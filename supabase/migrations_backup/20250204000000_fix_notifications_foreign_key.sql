-- Fix notifications table foreign key to reference auth.users instead of users
-- This migration is idempotent - safe to run multiple times

-- Drop the existing (incorrect) foreign key constraint if it exists
ALTER TABLE IF EXISTS public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Add the correct foreign key pointing to auth.users
ALTER TABLE IF EXISTS public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also add request_submitted to the type check constraint
ALTER TABLE IF EXISTS public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE IF EXISTS public.notifications
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'request_created',
  'request_submitted',
  'request_accepted',
  'request_rejected',
  'session_started',
  'session_completed',
  'session_cancelled',
  'message_received',
  'payment_received',
  'quote_received'
));

COMMENT ON CONSTRAINT notifications_user_id_fkey ON public.notifications IS
  'References auth.users (Supabase Auth) for proper user tracking across all roles';
