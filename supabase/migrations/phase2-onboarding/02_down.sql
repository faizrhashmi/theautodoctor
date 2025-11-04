-- Phase 2.1: Onboarding Checklist System - Rollback
-- Migration: Remove onboarding tracking from profiles
-- Date: 2025-11-03

-- Drop index
DROP INDEX IF EXISTS public.profiles_onboarding_dismissed_idx;

-- Remove columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_dismissed;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_dismissed_at;

-- Verification
SELECT
  'onboarding_dismissed' AS column_name,
  NOT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_dismissed'
  ) AS removed
UNION ALL
SELECT
  'onboarding_dismissed_at' AS column_name,
  NOT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_dismissed_at'
  ) AS removed;
