-- Email Sync Trigger Migration
-- Purpose: Keep profiles.email in sync with auth.users.email automatically
-- Date: 2025-11-11

-- Create function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_email_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync email from auth.users to profiles
  UPDATE public.profiles
  SET
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_email ON auth.users;

-- Create trigger for email updates
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_email_to_profiles();

-- Create trigger for new user creation (sync email immediately)
CREATE TRIGGER on_auth_user_created_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_to_profiles();

-- Backfill existing emails from auth.users to profiles (one-time sync)
DO $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id
  AND (p.email IS NULL OR p.email != u.email);

  RAISE NOTICE 'Email sync completed. Updated % profiles.', (SELECT COUNT(*) FROM public.profiles WHERE email IS NOT NULL);
END $$;

-- Add comment for documentation
COMMENT ON FUNCTION sync_email_to_profiles() IS 'Automatically syncs email from auth.users to profiles.email on insert/update';
