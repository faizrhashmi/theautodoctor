-- =====================================================
-- PHASE 3.2: REPAIR JOB TRACKING - ROLLBACK
-- Purpose: Remove repair job tracking schema
-- =====================================================

-- Drop policies first
DROP POLICY IF EXISTS repair_job_updates_workshop_insert ON repair_job_updates;
DROP POLICY IF EXISTS repair_job_updates_workshop_select ON repair_job_updates;
DROP POLICY IF EXISTS repair_job_updates_customer_select ON repair_job_updates;
DROP POLICY IF EXISTS repair_jobs_workshop_update ON repair_jobs;
DROP POLICY IF EXISTS repair_jobs_workshop_select ON repair_jobs;
DROP POLICY IF EXISTS repair_jobs_customer_select ON repair_jobs;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_log_repair_job_status_change ON repair_jobs;
DROP TRIGGER IF EXISTS trigger_auto_create_repair_job ON repair_quotes;
DROP TRIGGER IF EXISTS trigger_repair_job_updated_at ON repair_jobs;

-- Drop functions
DROP FUNCTION IF EXISTS get_active_repair_jobs(UUID);
DROP FUNCTION IF EXISTS log_repair_job_status_change();
DROP FUNCTION IF EXISTS auto_create_repair_job();
DROP FUNCTION IF EXISTS update_repair_job_updated_at();

-- Drop tables (updates first due to FK)
DROP TABLE IF EXISTS repair_job_updates CASCADE;
DROP TABLE IF EXISTS repair_jobs CASCADE;
