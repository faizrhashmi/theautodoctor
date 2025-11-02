-- ============================================================================
-- Phase 4: Favorites Priority Database Migration
-- ============================================================================
-- Adds columns to session_requests for favorites priority tracking
--
-- New Columns:
--   - preferred_mechanic_id: FK to mechanics table for favorite mechanic
--   - priority_window_minutes: Configurable priority window (default 10)
--   - priority_notified_at: Timestamp when priority notification was sent
--
-- SAFE TO RUN: Uses IF NOT EXISTS - idempotent and non-destructive
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Columns to session_requests Table
-- ============================================================================

-- Add preferred_mechanic_id column
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS preferred_mechanic_id UUID;

-- Add priority_window_minutes column
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS priority_window_minutes INTEGER DEFAULT 10;

-- Add priority_notified_at column
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS priority_notified_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Add Foreign Key Constraint (if not exists)
-- ============================================================================

DO $$
BEGIN
  -- Check if foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'session_requests_preferred_mechanic_id_fkey'
  ) THEN
    -- Add foreign key to mechanics table
    ALTER TABLE public.session_requests
    ADD CONSTRAINT session_requests_preferred_mechanic_id_fkey
    FOREIGN KEY (preferred_mechanic_id)
    REFERENCES public.mechanics(id)
    ON DELETE SET NULL;

    RAISE NOTICE '✅ Added foreign key constraint: session_requests_preferred_mechanic_id_fkey';
  ELSE
    RAISE NOTICE '⏭️  Foreign key constraint already exists: session_requests_preferred_mechanic_id_fkey';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add Indexes for Performance
-- ============================================================================

-- Index for queries filtering by preferred_mechanic_id
CREATE INDEX IF NOT EXISTS session_requests_preferred_mechanic_idx
ON public.session_requests(preferred_mechanic_id)
WHERE preferred_mechanic_id IS NOT NULL;

-- Composite index for priority analytics (mechanic + notification time)
CREATE INDEX IF NOT EXISTS session_requests_priority_analytics_idx
ON public.session_requests(preferred_mechanic_id, priority_notified_at, status)
WHERE preferred_mechanic_id IS NOT NULL;

-- Index for priority timeout queries
CREATE INDEX IF NOT EXISTS session_requests_priority_timeout_idx
ON public.session_requests(priority_notified_at, status)
WHERE priority_notified_at IS NOT NULL AND status = 'pending';

-- ============================================================================
-- STEP 4: Add Column Documentation
-- ============================================================================

COMMENT ON COLUMN public.session_requests.preferred_mechanic_id IS
'UUID of the favorite mechanic who receives priority notification (10-minute window). NULL if no favorite or standard broadcast.';

COMMENT ON COLUMN public.session_requests.priority_window_minutes IS
'Duration in minutes for priority notification window before fallback broadcast. Default: 10 minutes.';

COMMENT ON COLUMN public.session_requests.priority_notified_at IS
'Timestamp when priority notification was sent to preferred_mechanic_id. NULL if priority flow not used.';

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

DO $$
DECLARE
  preferred_mechanic_exists BOOLEAN;
  priority_window_exists BOOLEAN;
  priority_notified_exists BOOLEAN;
  fk_constraint_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Verifying Phase 4 Migration';
  RAISE NOTICE '============================================';

  -- Check columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'session_requests'
    AND column_name = 'preferred_mechanic_id'
  ) INTO preferred_mechanic_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'session_requests'
    AND column_name = 'priority_window_minutes'
  ) INTO priority_window_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'session_requests'
    AND column_name = 'priority_notified_at'
  ) INTO priority_notified_exists;

  -- Check foreign key constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'session_requests_preferred_mechanic_id_fkey'
  ) INTO fk_constraint_exists;

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'session_requests'
  AND indexname LIKE '%priority%';

  -- Report results
  IF preferred_mechanic_exists THEN
    RAISE NOTICE '✅ Column added: preferred_mechanic_id (UUID)';
  ELSE
    RAISE WARNING '❌ Column missing: preferred_mechanic_id';
  END IF;

  IF priority_window_exists THEN
    RAISE NOTICE '✅ Column added: priority_window_minutes (INTEGER, default 10)';
  ELSE
    RAISE WARNING '❌ Column missing: priority_window_minutes';
  END IF;

  IF priority_notified_exists THEN
    RAISE NOTICE '✅ Column added: priority_notified_at (TIMESTAMPTZ)';
  ELSE
    RAISE WARNING '❌ Column missing: priority_notified_at';
  END IF;

  IF fk_constraint_exists THEN
    RAISE NOTICE '✅ Foreign key: preferred_mechanic_id → mechanics(id)';
  ELSE
    RAISE WARNING '❌ Foreign key constraint missing';
  END IF;

  IF index_count >= 3 THEN
    RAISE NOTICE '✅ Indexes created: % priority-related indexes', index_count;
  ELSE
    RAISE WARNING '⚠️  Expected 3 priority indexes, found %', index_count;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Phase 4 Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run: npx supabase gen types typescript --local > src/types/supabase.ts';
  RAISE NOTICE '  2. Update fulfillment.ts to use new columns instead of metadata';
  RAISE NOTICE '  3. Test priority flow with database columns';
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
-- This migration adds three columns to session_requests:
--   ✅ preferred_mechanic_id (UUID, FK to mechanics, nullable)
--   ✅ priority_window_minutes (INTEGER, default 10)
--   ✅ priority_notified_at (TIMESTAMPTZ, nullable)
--
-- Benefits over metadata approach:
--   ✅ Queryable: Can filter by preferred_mechanic_id in SQL
--   ✅ Analytics: Track priority success rates
--   ✅ RLS-friendly: Can add policies based on preferred_mechanic_id
--   ✅ Type-safe: TypeScript knows these columns exist
--   ✅ Indexed: Fast queries for priority analytics
--
-- Run this in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================================================
