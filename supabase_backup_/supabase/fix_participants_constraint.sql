-- Fix the unique constraint on session_participants
-- The UNIQUE constraint must exist for upsert to work

-- Check if constraint exists
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'session_participants'
  AND constraint_type = 'UNIQUE';

-- Add the unique constraint if it doesn't exist
-- This will fail if duplicate rows already exist, so we clean them up first

-- Step 1: Remove any duplicate participants (keep only the first one)
DELETE FROM session_participants a
USING session_participants b
WHERE a.id > b.id
  AND a.session_id = b.session_id
  AND a.user_id = b.user_id;

-- Step 2: Add the unique constraint
ALTER TABLE session_participants
DROP CONSTRAINT IF EXISTS session_participants_session_id_user_id_key;

ALTER TABLE session_participants
ADD CONSTRAINT session_participants_session_id_user_id_key
UNIQUE (session_id, user_id);

-- Verify it was created
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'session_participants'
  AND constraint_type = 'UNIQUE';

SELECT 'Unique constraint added successfully!' AS status;
