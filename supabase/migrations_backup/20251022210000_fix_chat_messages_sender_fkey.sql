-- Fix chat_messages sender_id constraint to allow both users and mechanics
-- Drop the foreign key constraint that limits sender_id to users table only

-- Drop the existing foreign key constraint
ALTER TABLE IF EXISTS public.chat_messages 
  DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;

-- No need to add a new constraint since sender_id can be from either users or mechanics tables
-- The application logic handles the validation

-- Add a comment explaining the design
COMMENT ON COLUMN public.chat_messages.sender_id IS 'UUID of the message sender. Can reference either users.id or mechanics.id depending on who sent the message.';
