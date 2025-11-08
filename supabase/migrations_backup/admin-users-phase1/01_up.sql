-- ============================================
-- ADMIN USER MANAGEMENT - PHASE 1
-- Date: 2025-11-02
-- Description: Critical admin tools - user status management
-- Idempotent: Safe to run multiple times
-- ============================================

-- ============================================
-- 1. PROFILES TABLE - STATUS COLUMNS
-- ============================================

-- Ensure account_status column exists in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN account_status TEXT DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned', 'deleted'));

    CREATE INDEX idx_profiles_account_status ON profiles(account_status);
    COMMENT ON COLUMN profiles.account_status IS 'User account status for access control';

    RAISE NOTICE 'Added account_status column to profiles';
  ELSE
    RAISE NOTICE 'account_status column already exists in profiles';
  END IF;
END $$;

-- Ensure suspended_until column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN suspended_until TIMESTAMP WITH TIME ZONE;

    CREATE INDEX idx_profiles_suspended_until ON profiles(suspended_until)
    WHERE suspended_until IS NOT NULL;
    COMMENT ON COLUMN profiles.suspended_until IS 'Suspension expiration timestamp';

    RAISE NOTICE 'Added suspended_until column to profiles';
  ELSE
    RAISE NOTICE 'suspended_until column already exists in profiles';
  END IF;
END $$;

-- Ensure ban_reason column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN ban_reason TEXT;

    COMMENT ON COLUMN profiles.ban_reason IS 'Reason for permanent ban';

    RAISE NOTICE 'Added ban_reason column to profiles';
  ELSE
    RAISE NOTICE 'ban_reason column already exists in profiles';
  END IF;
END $$;

-- Ensure email_verified column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN email_verified BOOLEAN DEFAULT false;

    CREATE INDEX idx_profiles_email_verified ON profiles(email_verified);
    COMMENT ON COLUMN profiles.email_verified IS 'Whether user email has been verified';

    RAISE NOTICE 'Added email_verified column to profiles';
  ELSE
    RAISE NOTICE 'email_verified column already exists in profiles';
  END IF;
END $$;

-- ============================================
-- 2. MECHANICS TABLE - MIRROR STATUS COLUMNS
-- ============================================

-- Mirror account_status to mechanics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN account_status TEXT DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned', 'deleted'));

    COMMENT ON COLUMN mechanics.account_status IS 'Mirrored from profiles for quick access';

    RAISE NOTICE 'Added account_status column to mechanics';
  ELSE
    RAISE NOTICE 'account_status column already exists in mechanics';
  END IF;
END $$;

-- Mirror suspended_until to mechanics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN suspended_until TIMESTAMP WITH TIME ZONE;

    COMMENT ON COLUMN mechanics.suspended_until IS 'Mirrored from profiles for quick access';

    RAISE NOTICE 'Added suspended_until column to mechanics';
  ELSE
    RAISE NOTICE 'suspended_until column already exists in mechanics';
  END IF;
END $$;

-- Mirror ban_reason to mechanics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN ban_reason TEXT;

    COMMENT ON COLUMN mechanics.ban_reason IS 'Mirrored from profiles for quick access';

    RAISE NOTICE 'Added ban_reason column to mechanics';
  ELSE
    RAISE NOTICE 'ban_reason column already exists in mechanics';
  END IF;
END $$;

-- ============================================
-- 3. ENSURE ADMIN_ACTIONS TABLE EXISTS
-- ============================================

-- Check if admin_actions table exists, if not create it
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure indexes exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'admin_actions'
    AND indexname = 'idx_admin_actions_admin'
  ) THEN
    CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC);
    RAISE NOTICE 'Created idx_admin_actions_admin index';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'admin_actions'
    AND indexname = 'idx_admin_actions_target'
  ) THEN
    CREATE INDEX idx_admin_actions_target ON admin_actions(target_user_id, created_at DESC);
    RAISE NOTICE 'Created idx_admin_actions_target index';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'admin_actions'
    AND indexname = 'idx_admin_actions_type'
  ) THEN
    CREATE INDEX idx_admin_actions_type ON admin_actions(action_type, created_at DESC);
    RAISE NOTICE 'Created idx_admin_actions_type index';
  END IF;
END $$;

COMMENT ON TABLE admin_actions IS 'Audit log for all admin actions';

-- ============================================
-- 4. VERIFICATION & COMPLETION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Phase 1 schema migration complete!';
  RAISE NOTICE 'Run 03_verify.sql to confirm all changes.';
  RAISE NOTICE '============================================';
END $$;
