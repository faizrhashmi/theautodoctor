-- =====================================================
-- Migration: Micro-Sessions & On-Shift Tracking
-- =====================================================
-- Purpose: Enable short advice-only sessions and mechanic on-shift mode
-- Date: 2025-10-28
-- Implements: Tier 1 recommendations from workshop feature analysis
-- =====================================================

-- =====================================================
-- 1. ADD SESSION DURATION TYPES
-- =====================================================

-- Add duration type to diagnostic_sessions
ALTER TABLE public.diagnostic_sessions
ADD COLUMN IF NOT EXISTS session_duration_type TEXT
  CHECK (session_duration_type IN ('micro', 'standard', 'extended'))
  DEFAULT 'standard';

-- Add explicit duration tracking
ALTER TABLE public.diagnostic_sessions
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Add hard time cap for auto-cutoff (in seconds)
ALTER TABLE public.diagnostic_sessions
ADD COLUMN IF NOT EXISTS time_cap_seconds INTEGER;

-- Add time extension tracking
ALTER TABLE public.diagnostic_sessions
ADD COLUMN IF NOT EXISTS time_extended BOOLEAN DEFAULT FALSE;

ALTER TABLE public.diagnostic_sessions
ADD COLUMN IF NOT EXISTS extension_minutes INTEGER DEFAULT 0;

-- Add advice-only flag for micro-sessions
ALTER TABLE public.diagnostic_sessions
ADD COLUMN IF NOT EXISTS advice_only BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.diagnostic_sessions.session_duration_type IS 'Session length category: micro (2-10min), standard (30-45min), extended (60min)';
COMMENT ON COLUMN public.diagnostic_sessions.duration_minutes IS 'Planned session duration in minutes';
COMMENT ON COLUMN public.diagnostic_sessions.time_cap_seconds IS 'Hard time limit - session auto-ends after this many seconds';
COMMENT ON COLUMN public.diagnostic_sessions.time_extended IS 'Whether session was extended beyond original time cap';
COMMENT ON COLUMN public.diagnostic_sessions.extension_minutes IS 'Additional minutes granted via extension';
COMMENT ON COLUMN public.diagnostic_sessions.advice_only IS 'If true, session is quick advice (no deep diagnostics)';

-- =====================================================
-- 2. ADD MECHANIC ON-SHIFT TRACKING
-- =====================================================

-- Add participation mode (what types of sessions mechanic can take)
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS participation_mode TEXT
  CHECK (participation_mode IN ('micro_only', 'full_only', 'both'))
  DEFAULT 'both';

-- Add on-shift tracking
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS currently_on_shift BOOLEAN DEFAULT FALSE;

ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS last_clock_in TIMESTAMPTZ;

ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS last_clock_out TIMESTAMPTZ;

-- Add daily micro-session caps
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS daily_micro_minutes_cap INTEGER DEFAULT 30;

ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS daily_micro_minutes_used INTEGER DEFAULT 0;

ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS last_micro_reset_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN public.mechanics.participation_mode IS 'What session types mechanic can accept: micro_only (quick advice), full_only (standard sessions), both';
COMMENT ON COLUMN public.mechanics.currently_on_shift IS 'Whether mechanic is currently clocked in and available for on-shift micro-sessions';
COMMENT ON COLUMN public.mechanics.last_clock_in IS 'Last time mechanic clocked in';
COMMENT ON COLUMN public.mechanics.last_clock_out IS 'Last time mechanic clocked out';
COMMENT ON COLUMN public.mechanics.daily_micro_minutes_cap IS 'Maximum micro-session minutes per day (prevents work disruption)';
COMMENT ON COLUMN public.mechanics.daily_micro_minutes_used IS 'Micro-session minutes used today';
COMMENT ON COLUMN public.mechanics.last_micro_reset_date IS 'Date when daily counter was last reset';

-- =====================================================
-- 3. CREATE CLOCK-IN/OUT HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mechanic_shift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,

  -- Shift timing
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  shift_duration_minutes INTEGER,

  -- Workshop context (if mechanic is workshop-based)
  workshop_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,

  -- Session stats during shift
  micro_sessions_taken INTEGER DEFAULT 0,
  micro_minutes_used INTEGER DEFAULT 0,
  full_sessions_taken INTEGER DEFAULT 0,

  -- Metadata
  location TEXT, -- Optional: where mechanic clocked in from
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mechanic_shift_logs_mechanic_idx ON public.mechanic_shift_logs(mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_shift_logs_workshop_idx ON public.mechanic_shift_logs(workshop_id) WHERE workshop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mechanic_shift_logs_clock_in_idx ON public.mechanic_shift_logs(clock_in_at DESC);

COMMENT ON TABLE public.mechanic_shift_logs IS 'Tracks mechanic clock-in/out history and shift productivity';

-- =====================================================
-- 4. CREATE FUNCTION TO RESET DAILY MICRO MINUTES
-- =====================================================

CREATE OR REPLACE FUNCTION reset_daily_micro_minutes()
RETURNS void AS $$
BEGIN
  -- Reset all mechanics whose last reset was before today
  UPDATE public.mechanics
  SET
    daily_micro_minutes_used = 0,
    last_micro_reset_date = CURRENT_DATE
  WHERE last_micro_reset_date < CURRENT_DATE;

  RAISE NOTICE 'Reset daily micro minutes for % mechanics',
    (SELECT COUNT(*) FROM public.mechanics WHERE last_micro_reset_date = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_daily_micro_minutes IS 'Resets daily micro-session minute counters (run as cron job)';

-- =====================================================
-- 5. CREATE FUNCTION TO CHECK MECHANIC AVAILABILITY
-- =====================================================

CREATE OR REPLACE FUNCTION can_accept_session(
  p_mechanic_id UUID,
  p_session_duration_type TEXT,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  can_accept BOOLEAN,
  reason TEXT,
  minutes_remaining INTEGER
) AS $$
DECLARE
  v_mechanic RECORD;
  v_minutes_remaining INTEGER;
BEGIN
  -- Get mechanic details
  SELECT
    participation_mode,
    currently_on_shift,
    daily_micro_minutes_cap,
    daily_micro_minutes_used,
    is_active,
    onboarding_completed
  INTO v_mechanic
  FROM public.mechanics
  WHERE id = p_mechanic_id;

  -- Check if mechanic exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Mechanic not found'::TEXT, 0::INTEGER;
    RETURN;
  END IF;

  -- Check if mechanic is active and onboarded
  IF NOT v_mechanic.is_active OR NOT v_mechanic.onboarding_completed THEN
    RETURN QUERY SELECT FALSE, 'Mechanic not active or onboarding incomplete'::TEXT, 0::INTEGER;
    RETURN;
  END IF;

  -- For micro-sessions
  IF p_session_duration_type = 'micro' THEN
    -- Check participation mode allows micro
    IF v_mechanic.participation_mode = 'full_only' THEN
      RETURN QUERY SELECT FALSE, 'Mechanic only accepts full sessions'::TEXT, 0::INTEGER;
      RETURN;
    END IF;

    -- Check if on-shift (required for micro-sessions)
    IF NOT v_mechanic.currently_on_shift THEN
      RETURN QUERY SELECT FALSE, 'Mechanic must be on-shift for micro-sessions'::TEXT, 0::INTEGER;
      RETURN;
    END IF;

    -- Check daily cap
    v_minutes_remaining := v_mechanic.daily_micro_minutes_cap - v_mechanic.daily_micro_minutes_used;
    IF v_minutes_remaining < p_duration_minutes THEN
      RETURN QUERY SELECT FALSE,
        'Daily micro-session cap reached'::TEXT,
        v_minutes_remaining;
      RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT TRUE, 'Can accept micro-session'::TEXT, v_minutes_remaining;
    RETURN;
  END IF;

  -- For standard/extended sessions
  IF p_session_duration_type IN ('standard', 'extended') THEN
    -- Check participation mode allows full sessions
    IF v_mechanic.participation_mode = 'micro_only' THEN
      RETURN QUERY SELECT FALSE, 'Mechanic only accepts micro-sessions'::TEXT, 0::INTEGER;
      RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT TRUE, 'Can accept full session'::TEXT, 0::INTEGER;
    RETURN;
  END IF;

  -- Unknown session type
  RETURN QUERY SELECT FALSE, 'Unknown session duration type'::TEXT, 0::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_accept_session IS 'Checks if mechanic can accept a session based on mode, shift status, and daily caps';

-- =====================================================
-- 6. CREATE TRIGGER TO AUTO-CLOSE OPEN SHIFT ON CLOCK-IN
-- =====================================================

CREATE OR REPLACE FUNCTION auto_close_previous_shift()
RETURNS TRIGGER AS $$
BEGIN
  -- If mechanic is clocking in and has an open shift, close it
  IF NEW.currently_on_shift = TRUE AND OLD.currently_on_shift = FALSE THEN
    -- Update any open shift logs
    UPDATE public.mechanic_shift_logs
    SET
      clock_out_at = NEW.last_clock_in,
      shift_duration_minutes = EXTRACT(EPOCH FROM (NEW.last_clock_in - clock_in_at)) / 60,
      updated_at = NOW()
    WHERE
      mechanic_id = NEW.id
      AND clock_out_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mechanics_auto_close_shift
  BEFORE UPDATE ON public.mechanics
  FOR EACH ROW
  WHEN (OLD.currently_on_shift IS DISTINCT FROM NEW.currently_on_shift)
  EXECUTE FUNCTION auto_close_previous_shift();

COMMENT ON FUNCTION auto_close_previous_shift IS 'Automatically closes previous shift when mechanic clocks in again';

-- =====================================================
-- 7. UPDATE PRICING STRUCTURE
-- =====================================================

-- Add micro-session pricing to service_plans if not exists
INSERT INTO public.service_plans (
  name,
  slug,
  description,
  price_cents,
  duration_minutes,
  session_type,
  features,
  is_active,
  sort_order
) VALUES (
  'Quick Advice (Micro)',
  'micro-advice',
  'Ultra-quick consultation for simple questions (2-10 minutes)',
  499, -- $4.99
  10,
  'chat',
  jsonb_build_array(
    'Text chat only',
    '1 photo upload',
    'Quick diagnosis',
    'Basic advice',
    'No recording'
  ),
  true,
  0
)
ON CONFLICT (slug) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  duration_minutes = EXCLUDED.duration_minutes,
  features = EXCLUDED.features;

-- =====================================================
-- 8. CREATE VIEW FOR MECHANIC AVAILABILITY STATUS
-- =====================================================

CREATE OR REPLACE VIEW public.mechanic_availability_status AS
SELECT
  m.id,
  m.name,
  m.email,
  m.participation_mode,
  m.currently_on_shift,
  m.is_active,
  m.onboarding_completed,
  m.daily_micro_minutes_cap,
  m.daily_micro_minutes_used,
  (m.daily_micro_minutes_cap - m.daily_micro_minutes_used) as micro_minutes_remaining,
  m.last_clock_in,
  m.last_clock_out,
  CASE
    WHEN NOT m.is_active OR NOT m.onboarding_completed THEN 'offline'
    WHEN m.currently_on_shift AND m.participation_mode IN ('micro_only', 'both') THEN 'on_shift'
    WHEN NOT m.currently_on_shift AND m.participation_mode IN ('full_only', 'both') THEN 'off_shift'
    ELSE 'offline'
  END as availability_status,
  m.workshop_id,
  o.name as workshop_name
FROM public.mechanics m
LEFT JOIN public.organizations o ON m.workshop_id = o.id;

COMMENT ON VIEW public.mechanic_availability_status IS 'Real-time view of mechanic availability and shift status';

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS diagnostic_sessions_duration_type_idx
  ON public.diagnostic_sessions(session_duration_type);

CREATE INDEX IF NOT EXISTS diagnostic_sessions_time_cap_idx
  ON public.diagnostic_sessions(time_cap_seconds)
  WHERE time_cap_seconds IS NOT NULL;

CREATE INDEX IF NOT EXISTS mechanics_on_shift_idx
  ON public.mechanics(currently_on_shift)
  WHERE currently_on_shift = TRUE;

CREATE INDEX IF NOT EXISTS mechanics_participation_mode_idx
  ON public.mechanics(participation_mode);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Micro-Sessions & On-Shift Tracking migration complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to diagnostic_sessions:';
  RAISE NOTICE '  - session_duration_type (micro/standard/extended)';
  RAISE NOTICE '  - duration_minutes, time_cap_seconds';
  RAISE NOTICE '  - time_extended, extension_minutes';
  RAISE NOTICE '  - advice_only flag';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to mechanics:';
  RAISE NOTICE '  - participation_mode (micro_only/full_only/both)';
  RAISE NOTICE '  - currently_on_shift tracking';
  RAISE NOTICE '  - daily_micro_minutes_cap and usage';
  RAISE NOTICE '  - clock-in/out timestamps';
  RAISE NOTICE '';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - mechanic_shift_logs (shift history)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '  - reset_daily_micro_minutes()';
  RAISE NOTICE '  - can_accept_session()';
  RAISE NOTICE '';
  RAISE NOTICE 'Created views:';
  RAISE NOTICE '  - mechanic_availability_status';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Next steps:';
  RAISE NOTICE '1. Create clock-in/out API endpoints';
  RAISE NOTICE '2. Update session creation to support micro-sessions';
  RAISE NOTICE '3. Build countdown timer UI component';
  RAISE NOTICE '4. Add mechanic status pills to dashboard';
  RAISE NOTICE '5. Set up cron job to run reset_daily_micro_minutes() daily';
END $$;
