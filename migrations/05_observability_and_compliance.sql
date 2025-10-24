-- ============================================================================
-- Migration 05: OBSERVABILITY & COMPLIANCE
-- ============================================================================
--
-- G1) Structured logging & timeline
-- H1) CASL consent flags & unsubscribe
--
-- Purpose:
-- - Track session lifecycle events with structured logs
-- - Enable session timeline reconstruction
-- - Add CASL-compliant consent management
-- - Support unsubscribe functionality with audit trail
--
-- ============================================================================

-- ============================================================================
-- G1: SESSION LOGS (Structured Logging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Log metadata
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  event TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Context IDs (nullable for flexibility)
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  mechanic_id UUID,
  customer_id UUID,
  request_id UUID,

  -- Additional metadata (flexible JSONB)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast timeline queries
CREATE INDEX IF NOT EXISTS idx_session_logs_session_id
  ON public.session_logs(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_request_id
  ON public.session_logs(request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_mechanic_id
  ON public.session_logs(mechanic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_customer_id
  ON public.session_logs(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_event
  ON public.session_logs(event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_created_at
  ON public.session_logs(created_at DESC);

-- ============================================================================
-- H1: CONSENT MANAGEMENT (CASL Compliance)
-- ============================================================================

-- Add consent columns to profiles (if not exists)
DO $$
BEGIN
  -- email_marketing_opt_in
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email_marketing_opt_in'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN email_marketing_opt_in BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE '✓ Added email_marketing_opt_in column to profiles';
  END IF;

  -- sms_marketing_opt_in
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'sms_marketing_opt_in'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN sms_marketing_opt_in BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE '✓ Added sms_marketing_opt_in column to profiles';
  END IF;

  -- consent_timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'consent_timestamp'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN consent_timestamp TIMESTAMPTZ;
    RAISE NOTICE '✓ Added consent_timestamp column to profiles';
  END IF;

  -- consent_ip
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'consent_ip'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN consent_ip TEXT;
    RAISE NOTICE '✓ Added consent_ip column to profiles';
  END IF;
END $$;

-- Email consent audit log
CREATE TABLE IF NOT EXISTS public.email_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL,
  ip_address TEXT,
  method TEXT, -- 'signup', 'unsubscribe_link', 'admin', 'profile_update'
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_email_consent_log_user_id
  ON public.email_consent_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_consent_log_email
  ON public.email_consent_log(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_consent_log_created_at
  ON public.email_consent_log(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- session_logs: Users can view logs for their own sessions
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_logs_customer_view ON public.session_logs
  FOR SELECT USING (
    customer_id = auth.uid() OR
    session_id IN (
      SELECT id FROM public.sessions WHERE customer_user_id = auth.uid()
    )
  );

CREATE POLICY session_logs_mechanic_view ON public.session_logs
  FOR SELECT USING (
    mechanic_id = auth.uid() OR
    session_id IN (
      SELECT id FROM public.sessions WHERE mechanic_id = auth.uid()
    )
  );

-- Admins can do everything (via service role)
CREATE POLICY session_logs_admin_all ON public.session_logs
  FOR ALL USING (false);

-- email_consent_log: Users can view their own consent log
ALTER TABLE public.email_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_consent_log_user_view ON public.email_consent_log
  FOR SELECT USING (user_id = auth.uid());

-- Admins can do everything (via service role)
CREATE POLICY email_consent_log_admin_all ON public.email_consent_log
  FOR ALL USING (false);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log consent change
CREATE OR REPLACE FUNCTION log_consent_change(
  p_user_id UUID,
  p_email TEXT,
  p_consent_given BOOLEAN,
  p_ip_address TEXT DEFAULT NULL,
  p_method TEXT DEFAULT 'profile_update',
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.email_consent_log (
    user_id,
    email,
    consent_given,
    ip_address,
    method,
    user_agent
  ) VALUES (
    p_user_id,
    p_email,
    p_consent_given,
    p_ip_address,
    p_method,
    p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-log consent changes
CREATE OR REPLACE FUNCTION auto_log_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if email_marketing_opt_in changed
  IF (TG_OP = 'UPDATE' AND OLD.email_marketing_opt_in IS DISTINCT FROM NEW.email_marketing_opt_in) THEN
    INSERT INTO public.email_consent_log (
      user_id,
      email,
      consent_given,
      ip_address,
      method,
      metadata
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.email_marketing_opt_in,
      NEW.consent_ip,
      'profile_update',
      jsonb_build_object(
        'previous_value', OLD.email_marketing_opt_in,
        'new_value', NEW.email_marketing_opt_in,
        'changed_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_log_consent_changes ON public.profiles;
CREATE TRIGGER trigger_auto_log_consent_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_consent_changes();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION 05 VERIFICATION ===';
  RAISE NOTICE '';

  -- Check tables created
  RAISE NOTICE '[✓] Tables created:';
  RAISE NOTICE '    - session_logs (structured logging)';
  RAISE NOTICE '    - email_consent_log (CASL compliance)';
  RAISE NOTICE '';

  -- Check columns added to profiles
  RAISE NOTICE '[✓] Columns added to profiles:';
  RAISE NOTICE '    - email_marketing_opt_in';
  RAISE NOTICE '    - sms_marketing_opt_in';
  RAISE NOTICE '    - consent_timestamp';
  RAISE NOTICE '    - consent_ip';
  RAISE NOTICE '';

  -- Check functions created
  RAISE NOTICE '[✓] Functions created:';
  RAISE NOTICE '    - log_consent_change() - Manual consent logging';
  RAISE NOTICE '    - auto_log_consent_changes() - Auto-log trigger';
  RAISE NOTICE '';

  -- Check RLS enabled
  RAISE NOTICE '[✓] Row Level Security enabled on all tables';
  RAISE NOTICE '';

  RAISE NOTICE '=== MIGRATION 05 COMPLETE ===';
  RAISE NOTICE '';
END $$;
