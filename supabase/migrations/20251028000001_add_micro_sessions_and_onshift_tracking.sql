-- =====================================================
-- Migration: Micro-Sessions & On-Shift Tracking
-- =====================================================
-- Purpose: Enable short advice-only sessions and mechanic on-shift mode
-- Date: 2025-10-28
-- Implements: Tier 1 recommendations from workshop feature analysis
-- =====================================================

-- =====================================================
-- 1. ADD SESSION DURATION TYPES TO diagnostic_sessions
-- =====================================================

-- Add duration type
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

-- =====================================================
-- 2. ADD MECHANIC ON-SHIFT TRACKING TO mechanics
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
  location TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mechanic_shift_logs_mechanic_idx ON public.mechanic_shift_logs(mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_shift_logs_workshop_idx ON public.mechanic_shift_logs(workshop_id) WHERE workshop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mechanic_shift_logs_clock_in_idx ON public.mechanic_shift_logs(clock_in_at DESC);

-- =====================================================
-- 4. CREATE FUNCTION TO RESET DAILY MICRO MINUTES
-- =====================================================

CREATE OR REPLACE FUNCTION reset_daily_micro_minutes()
RETURNS void AS $$
BEGIN
  UPDATE public.mechanics
  SET
    daily_micro_minutes_used = 0,
    last_micro_reset_date = CURRENT_DATE
  WHERE last_micro_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGER TO AUTO-CLOSE OPEN SHIFT
-- =====================================================

CREATE OR REPLACE FUNCTION auto_close_previous_shift()
RETURNS TRIGGER AS $$
BEGIN
  -- If mechanic is clocking in and has an open shift, close it
  IF NEW.currently_on_shift = TRUE AND OLD.currently_on_shift = FALSE THEN
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

DROP TRIGGER IF EXISTS mechanics_auto_close_shift ON public.mechanics;
CREATE TRIGGER mechanics_auto_close_shift
  BEFORE UPDATE ON public.mechanics
  FOR EACH ROW
  WHEN (OLD.currently_on_shift IS DISTINCT FROM NEW.currently_on_shift)
  EXECUTE FUNCTION auto_close_previous_shift();

-- =====================================================
-- 6. ADD MICRO-SESSION PRICING TO service_plans
-- =====================================================

INSERT INTO public.service_plans (
  name,
  slug,
  description,
  price,
  duration_minutes,
  perks,
  recommended_for,
  is_active,
  display_order,
  plan_category
) VALUES (
  'Quick Advice',
  'micro',
  'Ultra-quick consultation for simple questions (2-10 minutes)',
  4.99,
  10,
  jsonb_build_array(
    'Text chat only',
    '1 photo upload',
    'Quick diagnosis & basic advice',
    'Perfect for simple yes/no questions'
  ),
  'Best for quick questions that need fast answers.',
  true,
  0,
  'basic'
)
ON CONFLICT (slug) DO UPDATE SET
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  perks = EXCLUDED.perks,
  recommended_for = EXCLUDED.recommended_for;

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
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
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - mechanic_shift_logs table';
  RAISE NOTICE '  - reset_daily_micro_minutes() function';
  RAISE NOTICE '  - auto_close_previous_shift() trigger';
  RAISE NOTICE '  - micro session pricing ($4.99)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Next: Set up cron job to run reset_daily_micro_minutes() daily';
END $$;
