-- =====================================================
-- PHASE 3.2: REPAIR JOB TRACKING - VERIFICATION
-- Purpose: Verify repair job tracking schema is correctly installed
-- =====================================================

-- =====================================================
-- 1. VERIFY TABLES EXIST
-- =====================================================

DO $$
BEGIN
  -- Check repair_jobs table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_jobs') THEN
    RAISE EXCEPTION 'repair_jobs table does not exist';
  END IF;

  -- Check repair_job_updates table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_job_updates') THEN
    RAISE EXCEPTION 'repair_job_updates table does not exist';
  END IF;

  RAISE NOTICE 'All tables exist';
END $$;

-- =====================================================
-- 2. VERIFY COLUMNS
-- =====================================================

DO $$
BEGIN
  -- Verify key columns in repair_jobs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_jobs' AND column_name = 'status'
  ) THEN
    RAISE EXCEPTION 'repair_jobs.status column missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_jobs' AND column_name = 'parts_status'
  ) THEN
    RAISE EXCEPTION 'repair_jobs.parts_status column missing';
  END IF;

  RAISE NOTICE 'All columns exist';
END $$;

-- =====================================================
-- 3. VERIFY INDEXES
-- =====================================================

DO $$
BEGIN
  -- Check key indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'repair_jobs' AND indexname = 'idx_repair_jobs_customer'
  ) THEN
    RAISE EXCEPTION 'idx_repair_jobs_customer index missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'repair_jobs' AND indexname = 'idx_repair_jobs_status'
  ) THEN
    RAISE EXCEPTION 'idx_repair_jobs_status index missing';
  END IF;

  RAISE NOTICE 'All indexes exist';
END $$;

-- =====================================================
-- 4. VERIFY FUNCTIONS
-- =====================================================

DO $$
BEGIN
  -- Check helper function
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_active_repair_jobs'
  ) THEN
    RAISE EXCEPTION 'get_active_repair_jobs function missing';
  END IF;

  -- Check trigger functions
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'auto_create_repair_job'
  ) THEN
    RAISE EXCEPTION 'auto_create_repair_job function missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'log_repair_job_status_change'
  ) THEN
    RAISE EXCEPTION 'log_repair_job_status_change function missing';
  END IF;

  RAISE NOTICE 'All functions exist';
END $$;

-- =====================================================
-- 5. VERIFY TRIGGERS
-- =====================================================

DO $$
BEGIN
  -- Check triggers
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_create_repair_job'
  ) THEN
    RAISE EXCEPTION 'trigger_auto_create_repair_job missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_log_repair_job_status_change'
  ) THEN
    RAISE EXCEPTION 'trigger_log_repair_job_status_change missing';
  END IF;

  RAISE NOTICE 'All triggers exist';
END $$;

-- =====================================================
-- 6. VERIFY RLS POLICIES
-- =====================================================

DO $$
BEGIN
  -- Check RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'repair_jobs' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on repair_jobs';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'repair_job_updates' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on repair_job_updates';
  END IF;

  RAISE NOTICE 'RLS is enabled';
END $$;

-- =====================================================
-- 7. FINAL VERIFICATION SUMMARY
-- =====================================================

-- Summary
SELECT
  'Phase 3.2 Repair Job Tracking' AS component,
  'VERIFIED' AS status,
  NOW() AS verified_at;

-- Show table structure (Supabase-compatible)
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('repair_jobs', 'repair_job_updates')
ORDER BY table_name, ordinal_position;

-- Show indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('repair_jobs', 'repair_job_updates')
ORDER BY tablename, indexname;

-- Show policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('repair_jobs', 'repair_job_updates')
ORDER BY tablename, policyname;
