/**
 * Batch 2 - Phase 2: Mechanic Surface Schema Additions
 *
 * Add missing columns to mechanics table:
 * - about_me: TEXT field for mechanic bio/description
 * - hourly_rate: DECIMAL(8,2) for custom hourly rates
 *
 * IDEMPOTENT: Safe to run multiple times
 * NO DATA CHANGES: Pure DDL only
 */

-- Add about_me column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'about_me'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN about_me TEXT;

    COMMENT ON COLUMN public.mechanics.about_me IS 'Mechanic bio/description for profile display';
  END IF;
END $$;

-- Add hourly_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN hourly_rate DECIMAL(8,2);

    COMMENT ON COLUMN public.mechanics.hourly_rate IS 'Custom hourly rate for mechanic (NULL = use tier default)';
  END IF;
END $$;

-- Verification output
DO $$
BEGIN
  RAISE NOTICE 'Schema additions complete. Verify with 03_verify.sql';
END $$;
