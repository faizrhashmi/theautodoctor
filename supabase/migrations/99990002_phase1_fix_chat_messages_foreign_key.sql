-- ============================================================================
-- PHASE 1.2: FIX CHAT_MESSAGES FOREIGN KEY CONSTRAINT
-- ============================================================================
-- This migration restores the sender_id foreign key constraint that was
-- dropped in 20251022210000_fix_chat_messages_sender_fkey.sql
--
-- Issue: chat_messages.sender_id has NO foreign key constraint, allowing
-- orphaned records and invalid sender references.
--
-- Date: 2025-10-27
-- Priority: CRITICAL
-- ============================================================================

-- Step 1: Clean up any existing invalid sender_id values
-- (Set to NULL if they don't reference valid users or mechanics)

UPDATE chat_messages
SET sender_id = NULL
WHERE sender_id IS NOT NULL
  AND sender_id NOT IN (SELECT id FROM auth.users)
  AND sender_id NOT IN (SELECT id FROM mechanics);

-- Step 2: Add CHECK constraint to validate sender_id
-- This ensures sender_id references either auth.users OR mechanics

ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_sender_valid CHECK (
  sender_id IS NULL OR
  sender_id IN (SELECT id FROM auth.users) OR
  sender_id IN (SELECT id FROM mechanics)
);

-- Note: We cannot add a traditional FOREIGN KEY because sender_id needs
-- to reference TWO different tables (auth.users OR mechanics).
-- The CHECK constraint provides validation while allowing polymorphic references.

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx ON chat_messages(sender_id);

-- Step 4: Add trigger to validate sender_id on INSERT/UPDATE
CREATE OR REPLACE FUNCTION validate_chat_message_sender()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure sender_id is not NULL for new messages
  IF NEW.sender_id IS NULL THEN
    RAISE EXCEPTION 'sender_id cannot be NULL';
  END IF;

  -- Validate sender_id exists in either auth.users or mechanics
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.sender_id)
     AND NOT EXISTS (SELECT 1 FROM mechanics WHERE id = NEW.sender_id) THEN
    RAISE EXCEPTION 'Invalid sender_id: % does not exist in users or mechanics', NEW.sender_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_chat_message_sender_trigger ON chat_messages;
CREATE TRIGGER validate_chat_message_sender_trigger
  BEFORE INSERT OR UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_chat_message_sender();

-- Step 5: Update RLS policies to ensure sender_id is set correctly
DROP POLICY IF EXISTS "Users can insert messages in their sessions" ON chat_messages;
CREATE POLICY "Users can insert messages in their sessions"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    -- Ensure sender_id matches authenticated user
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = chat_messages.session_id
      AND sp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  invalid_count INTEGER;
  null_count INTEGER;
BEGIN
  RAISE NOTICE '=== Verifying chat_messages sender_id integrity ===';

  -- Check for NULL sender_id
  SELECT COUNT(*) INTO null_count
  FROM chat_messages
  WHERE sender_id IS NULL;

  IF null_count > 0 THEN
    RAISE WARNING '✗ Found % messages with NULL sender_id', null_count;
  ELSE
    RAISE NOTICE '✓ No messages with NULL sender_id';
  END IF;

  -- Check for invalid sender_id
  SELECT COUNT(*) INTO invalid_count
  FROM chat_messages
  WHERE sender_id IS NOT NULL
    AND sender_id NOT IN (SELECT id FROM auth.users)
    AND sender_id NOT IN (SELECT id FROM mechanics);

  IF invalid_count > 0 THEN
    RAISE WARNING '✗ Found % messages with invalid sender_id', invalid_count;
  ELSE
    RAISE NOTICE '✓ All sender_id values are valid';
  END IF;

  -- Check if trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'validate_chat_message_sender_trigger'
  ) THEN
    RAISE NOTICE '✓ Validation trigger is active';
  ELSE
    RAISE WARNING '✗ Validation trigger not found';
  END IF;

  RAISE NOTICE '=== chat_messages sender_id validation complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN chat_messages.sender_id IS 'UUID of the message sender. Must reference auth.users.id OR mechanics.id. Validated by trigger.';
COMMENT ON CONSTRAINT chat_messages_sender_valid ON chat_messages IS 'Ensures sender_id references either auth.users or mechanics';
COMMENT ON FUNCTION validate_chat_message_sender() IS 'Validates sender_id exists in auth.users or mechanics before INSERT/UPDATE';
