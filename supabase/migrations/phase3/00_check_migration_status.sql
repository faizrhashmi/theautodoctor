-- =====================================================
-- PHASE 3.2: CHECK MIGRATION STATUS
-- Purpose: Check if repair job tracking migration is already applied
-- Run this BEFORE running 01_up.sql
-- =====================================================

-- Check if tables exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_jobs')
    THEN '✅ repair_jobs table EXISTS'
    ELSE '❌ repair_jobs table MISSING'
  END AS repair_jobs_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_job_updates')
    THEN '✅ repair_job_updates table EXISTS'
    ELSE '❌ repair_job_updates table MISSING'
  END AS repair_job_updates_status;

-- Check if indexes exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'repair_jobs' AND indexname = 'idx_repair_jobs_customer')
    THEN '✅ idx_repair_jobs_customer EXISTS'
    ELSE '❌ idx_repair_jobs_customer MISSING'
  END AS customer_index_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'repair_jobs' AND indexname = 'idx_repair_jobs_status')
    THEN '✅ idx_repair_jobs_status EXISTS'
    ELSE '❌ idx_repair_jobs_status MISSING'
  END AS status_index_status;

-- Check if functions exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_repair_jobs')
    THEN '✅ get_active_repair_jobs function EXISTS'
    ELSE '❌ get_active_repair_jobs function MISSING'
  END AS helper_function_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_create_repair_job')
    THEN '✅ auto_create_repair_job function EXISTS'
    ELSE '❌ auto_create_repair_job function MISSING'
  END AS auto_create_function_status;

-- Check if triggers exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_create_repair_job')
    THEN '✅ trigger_auto_create_repair_job EXISTS'
    ELSE '❌ trigger_auto_create_repair_job MISSING'
  END AS auto_create_trigger_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_log_repair_job_status_change')
    THEN '✅ trigger_log_repair_job_status_change EXISTS'
    ELSE '❌ trigger_log_repair_job_status_change MISSING'
  END AS log_trigger_status;

-- Overall status
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_jobs')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_job_updates')
    AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'repair_jobs' AND indexname = 'idx_repair_jobs_customer')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_repair_jobs')
    AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_create_repair_job')
    THEN '🟢 MIGRATION ALREADY APPLIED - Skip 01_up.sql, run 03_verify.sql only'
    ELSE '🟡 MIGRATION PARTIALLY APPLIED OR MISSING - Contact support before proceeding'
  END AS overall_status;
