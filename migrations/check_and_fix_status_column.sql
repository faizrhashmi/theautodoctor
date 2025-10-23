-- Migration: Check and fix session_requests.status column
-- Purpose: Add 'unattended' and 'expired' status support

-- STEP 1: Check current column type
-- Run this first to see what we're working with:
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'session_requests' AND column_name = 'status';

-- If the result shows data_type = 'text' or 'character varying':
-- Then the column is NOT using an enum, just plain text
-- Solution: No migration needed! Just update the code.

-- If the result shows data_type = 'USER-DEFINED' and udt_name = 'session_request_status':
-- Then the column IS using an enum
-- Solution: Add new values to the enum (see below)

-- ============================================================================
-- OPTION 1: Column is plain TEXT (most common in Supabase)
-- ============================================================================
-- If status column is text, no database migration needed!
-- The TypeScript types already support 'unattended' and 'expired'
-- The cleanup functions will just set status = 'unattended' or 'expired'
-- PostgreSQL will accept any text value.

-- OPTION 2: Column uses an ENUM (less common)
-- ============================================================================
-- If your database actually has a session_request_status enum, run this:

-- First, check if enum exists:
-- SELECT EXISTS (
--   SELECT 1 FROM pg_type WHERE typname = 'session_request_status'
-- );

-- If TRUE, add new values:
-- ALTER TYPE session_request_status ADD VALUE IF NOT EXISTS 'unattended';
-- ALTER TYPE session_request_status ADD VALUE IF NOT EXISTS 'expired';

-- ============================================================================
-- RECOMMENDED: Just check your current values
-- ============================================================================
-- See what status values currently exist in your table:
SELECT DISTINCT status FROM session_requests ORDER BY status;

-- This will show you: cancelled, accepted, pending
-- After the cleanup runs, you'll also see: unattended, expired
