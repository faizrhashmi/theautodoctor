-- Add free_session_override column to profiles table
-- This allows admins to grant free sessions to customers for testing/support purposes

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS free_session_override BOOLEAN DEFAULT false;

-- Add index for performance when checking override status
CREATE INDEX IF NOT EXISTS idx_profiles_free_session_override
ON profiles(id) WHERE free_session_override = true;

-- Add comment explaining the column purpose
COMMENT ON COLUMN profiles.free_session_override IS
'Admin toggle to grant/reset free session eligibility. When true, customer can use free session regardless of history. Used for testing and customer support.';
