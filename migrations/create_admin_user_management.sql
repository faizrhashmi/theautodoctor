-- Admin User Management Tables
-- Run this migration to add user management features

-- Admin notes on users (for internal tracking)
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS admin_notes_user_idx ON public.admin_notes (user_id);
CREATE INDEX IF NOT EXISTS admin_notes_admin_idx ON public.admin_notes (admin_id);
CREATE INDEX IF NOT EXISTS admin_notes_created_idx ON public.admin_notes (created_at DESC);

-- Admin action history (audit log for all admin actions on users)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'suspend', 'ban', 'verify_email', 'reset_password', 'send_notification', 'adjust_rating', 'approve', etc.
  reason TEXT,
  duration_days INTEGER, -- for suspensions
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS admin_actions_admin_idx ON public.admin_actions (admin_id);
CREATE INDEX IF NOT EXISTS admin_actions_target_idx ON public.admin_actions (target_user_id);
CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON public.admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_actions_type_idx ON public.admin_actions (action_type);

-- Add suspension fields to profiles table
DO $$
BEGIN
  -- Add suspended_until if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_until TIMESTAMPTZ;
  END IF;

  -- Add ban_reason if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ban_reason TEXT;
  END IF;

  -- Add last_active_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_active_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add mechanic-specific fields if they don't exist
DO $$
BEGIN
  -- Add specializations if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'specializations'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN specializations TEXT[];
  END IF;

  -- Add availability if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'availability'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN availability JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add is_online if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN is_online BOOLEAN DEFAULT false;
  END IF;

  -- Add rating if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00;
  END IF;

  -- Add total_sessions if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'total_sessions'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN total_sessions INTEGER DEFAULT 0;
  END IF;

  -- Add total_earnings if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'total_earnings'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00;
  END IF;

  -- Add avg_response_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'avg_response_time'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN avg_response_time INTEGER; -- in seconds
  END IF;

  -- Add approval_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN approval_status TEXT DEFAULT 'pending'; -- 'pending', 'approved', 'rejected'
  END IF;

  -- Add account_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN account_status TEXT DEFAULT 'active'; -- 'active', 'suspended', 'banned'
  END IF;

  -- Add last_active_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN last_active_at TIMESTAMPTZ;
  END IF;

  -- Add suspended_until if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN suspended_until TIMESTAMPTZ;
  END IF;

  -- Add ban_reason if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN ban_reason TEXT;
  END IF;

  -- Add bio if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.mechanics ADD COLUMN bio TEXT;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_notes (only admins can access)
DROP POLICY IF EXISTS "Admins can view all notes" ON public.admin_notes;
CREATE POLICY "Admins can view all notes"
  ON public.admin_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create notes" ON public.admin_notes;
CREATE POLICY "Admins can create notes"
  ON public.admin_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for admin_actions (only admins can access)
DROP POLICY IF EXISTS "Admins can view all actions" ON public.admin_actions;
CREATE POLICY "Admins can view all actions"
  ON public.admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create actions" ON public.admin_actions;
CREATE POLICY "Admins can create actions"
  ON public.admin_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for mechanic fields
CREATE INDEX IF NOT EXISTS mechanics_approval_status_idx ON public.mechanics (approval_status);
CREATE INDEX IF NOT EXISTS mechanics_account_status_idx ON public.mechanics (account_status);
CREATE INDEX IF NOT EXISTS mechanics_is_online_idx ON public.mechanics (is_online);
CREATE INDEX IF NOT EXISTS mechanics_rating_idx ON public.mechanics (rating DESC);

-- Trigger for updated_at on admin_notes
CREATE OR REPLACE FUNCTION public.handle_admin_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_notes_updated_at ON public.admin_notes;
CREATE TRIGGER admin_notes_updated_at
  BEFORE UPDATE ON public.admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_notes_updated_at();

-- Verification
SELECT 'Admin user management migration completed successfully!' AS status;
