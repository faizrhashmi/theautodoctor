-- Add read receipt tracking to chat_messages
-- This enables WhatsApp-like read receipts (✓ vs ✓✓)

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on unread messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at
ON chat_messages(session_id, read_at)
WHERE read_at IS NULL;

-- Add comment
COMMENT ON COLUMN chat_messages.read_at IS 'Timestamp when the message was read by the recipient. NULL means unread.';
