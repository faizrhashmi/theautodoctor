-- PHASE 1 MIGRATION: CERT EXPANSION - ADDITIVE SCHEMA
-- PURPOSE: Add generic certification columns to mechanics table
-- SAFETY: Uses IF NOT EXISTS guards - idempotent, can run multiple times
-- STRATEGY: ADDITIVE ONLY - keeps all existing Red Seal columns intact

-- ============================================================================
-- BEGIN TRANSACTION
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD NEW GENERIC CERTIFICATION COLUMNS
-- ============================================================================

-- Column 1: certification_type
-- Stores the TYPE of certification (Red Seal, Provincial, ASE, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'certification_type'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN certification_type TEXT
    CHECK (certification_type IN (
      'red_seal',
      'provincial',
      'ase',
      'cpa_quebec',
      'manufacturer',
      'other'
    ));

    COMMENT ON COLUMN public.mechanics.certification_type IS
      'Primary certification type: red_seal | provincial | ase | cpa_quebec | manufacturer | other';
  END IF;
END $$;

-- Column 2: certification_number
-- Stores the certification/license number (e.g., "RS-ON-12345678")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'certification_number'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN certification_number TEXT;

    COMMENT ON COLUMN public.mechanics.certification_number IS
      'Certification/license number (e.g., RS-ON-12345, ASE A1, etc.)';
  END IF;
END $$;

-- Column 3: certification_authority
-- Stores who issued the certification (e.g., "Red Seal Program", "Ontario College of Trades")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'certification_authority'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN certification_authority TEXT;

    COMMENT ON COLUMN public.mechanics.certification_authority IS
      'Issuing authority (e.g., "Red Seal Program", "Ontario College of Trades", "ASE", "CPA Montreal")';
  END IF;
END $$;

-- Column 4: certification_region
-- Stores the province/state of certification (e.g., "ON", "QC", "CA")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'certification_region'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN certification_region TEXT;

    COMMENT ON COLUMN public.mechanics.certification_region IS
      'Province/state of certification (e.g., "ON", "QC", "BC", "CA" for interprovincial)';
  END IF;
END $$;

-- Column 5: certification_expiry_date
-- Stores when the certification expires (if applicable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'mechanics'
    AND column_name = 'certification_expiry_date'
  ) THEN
    ALTER TABLE public.mechanics
    ADD COLUMN certification_expiry_date DATE;

    COMMENT ON COLUMN public.mechanics.certification_expiry_date IS
      'Expiry date of primary certification (NULL if no expiry)';
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEX for certification_type (for faster filtering)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'mechanics'
    AND indexname = 'idx_mechanics_certification_type'
  ) THEN
    CREATE INDEX idx_mechanics_certification_type
    ON public.mechanics (certification_type)
    WHERE certification_type IS NOT NULL;

    COMMENT ON INDEX public.idx_mechanics_certification_type IS
      'Performance index for filtering mechanics by certification type';
  END IF;
END $$;

-- ============================================================================
-- ADD TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE public.mechanics IS
  'Mechanics table - contains both legacy red_seal_* fields (deprecated but kept for compatibility) and new certification_* fields (preferred)';

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

-- ✅ All new columns are NULLABLE (no NOT NULL constraints)
-- ✅ All changes are ADDITIVE (no columns dropped or renamed)
-- ✅ All operations are IDEMPOTENT (can safely re-run)
-- ✅ Old red_seal_* columns are UNTOUCHED (backward compatibility)
-- ✅ Index created for performance
-- ⚠️ Data backfill happens in Phase 3 (separate script)
