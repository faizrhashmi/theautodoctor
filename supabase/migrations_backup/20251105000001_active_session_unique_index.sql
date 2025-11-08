-- Migration: Add Unique Index for Active Sessions
-- Date: 2025-11-05
-- Purpose: Prevent duplicate active sessions per customer at database level
--
-- This enforces the business rule that a customer can only have ONE active session
-- at a time (pending, waiting, live, or scheduled status).
--
-- This complements the code-level check in the unified session factory and provides
-- a safety net against race conditions, concurrent requests, and webhook retries.

-- Drop index if it exists (for idempotent migrations)
DROP INDEX IF EXISTS uq_active_session_per_customer;

-- Create partial unique index on customer_user_id WHERE status is active
-- Only applies to sessions with status IN ('pending', 'waiting', 'live', 'scheduled')
CREATE UNIQUE INDEX uq_active_session_per_customer
ON public.sessions (customer_user_id)
WHERE status IN ('pending', 'waiting', 'live', 'scheduled');

-- Add comment for documentation
COMMENT ON INDEX uq_active_session_per_customer IS
'Ensures a customer can only have one active session at a time. Prevents race conditions and duplicate session creation.';

-- IMPORTANT: This index will cause INSERT/UPDATE operations to fail with a unique violation error
-- if a customer tries to create a second active session.
--
-- The unified session factory (src/lib/sessionFactory.ts) checks for active sessions BEFORE
-- attempting to insert, so this should rarely be hit in normal operation.
--
-- If this constraint is violated, it indicates:
-- 1. Race condition between concurrent requests
-- 2. Stripe webhook retry creating duplicate session
-- 3. Bug in the session creation logic
--
-- Application code should catch this error and handle it gracefully by returning
-- the existing active session to the customer.
