-- Phase 2.1: Onboarding Checklist System
-- Migration: Add onboarding tracking to profiles
-- Date: 2025-11-03

-- Add onboarding_dismissed field to track if user manually dismissed the checklist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_dismissed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_dismissed BOOLEAN DEFAULT false;
    COMMENT ON COLUMN public.profiles.onboarding_dismissed IS 'Whether user manually dismissed the onboarding checklist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_dismissed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_dismissed_at TIMESTAMPTZ;
    COMMENT ON COLUMN public.profiles.onboarding_dismissed_at IS 'When user dismissed the onboarding checklist';
  END IF;
END $$;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS profiles_onboarding_dismissed_idx
ON public.profiles(onboarding_dismissed)
WHERE onboarding_dismissed = false;

-- Verification
SELECT
  'onboarding_dismissed' AS column_name,
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_dismissed'
  ) AS exists
UNION ALL
SELECT
  'onboarding_dismissed_at' AS column_name,
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_dismissed_at'
  ) AS exists;
