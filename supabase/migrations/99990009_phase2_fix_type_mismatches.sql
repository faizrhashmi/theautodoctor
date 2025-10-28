-- ============================================================================
-- PHASE 2.6: FIX TYPE MISMATCHES AND ADD ENUM CONSTRAINTS
-- ============================================================================
-- This migration adds database-level validation for enum-like fields that
-- currently only have TypeScript validation, causing silent failures.
--
-- Issues Fixed:
-- 1. sessions.status - No CHECK constraint at database level
-- 2. mechanics.account_type - Two conflicting CHECK constraints
-- 3. workshop_alerts.severity - No TypeScript type defined
--
-- Date: 2025-10-27
-- Priority: HIGH
-- ============================================================================

-- ============================================================================
-- 1. FIX MECHANICS.ACCOUNT_TYPE CONFLICTING CONSTRAINTS
-- ============================================================================

-- Drop all existing account_type constraints on mechanics
ALTER TABLE mechanics
  DROP CONSTRAINT IF EXISTS mechanics_account_type_check;

ALTER TABLE mechanics
  DROP CONSTRAINT IF EXISTS mechanics_account_type_check1;

-- Update old values to new standard
UPDATE mechanics
SET account_type = 'independent'
WHERE account_type = 'individual_mechanic';

UPDATE mechanics
SET account_type = 'workshop'
WHERE account_type = 'workshop_mechanic';

-- Add unified constraint
ALTER TABLE mechanics
ADD CONSTRAINT mechanics_account_type_check
CHECK (account_type IN ('independent', 'workshop'));

-- ============================================================================
-- 2. ADD SESSIONS.STATUS CHECK CONSTRAINT
-- ============================================================================

-- First, check for any invalid status values and log them
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM sessions
  WHERE status NOT IN (
    'pending', 'waiting', 'live', 'scheduled',
    'completed', 'cancelled', 'expired', 'unattended'
  );

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % sessions with invalid status values', invalid_count;

    -- Log invalid statuses for review
    RAISE NOTICE 'Invalid statuses: %', (
      SELECT array_agg(DISTINCT status)
      FROM sessions
      WHERE status NOT IN (
        'pending', 'waiting', 'live', 'scheduled',
        'completed', 'cancelled', 'expired', 'unattended'
      )
    );
  END IF;
END $$;

-- Add CHECK constraint for valid session statuses
ALTER TABLE sessions
ADD CONSTRAINT sessions_status_check
CHECK (status IN (
  'pending',
  'waiting',
  'live',
  'scheduled',
  'completed',
  'cancelled',
  'expired',
  'unattended'
));

-- ============================================================================
-- 3. ADD SESSION_REQUESTS.STATUS CHECK CONSTRAINT
-- ============================================================================

ALTER TABLE session_requests
ADD CONSTRAINT session_requests_status_check
CHECK (status IN (
  'pending',
  'accepted',
  'cancelled',
  'expired'
));

-- ============================================================================
-- 4. ADD WORKSHOP_ALERTS.SEVERITY CHECK CONSTRAINT (already exists)
-- ============================================================================

-- This constraint already exists from the migration, just verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workshop_alerts_severity_check'
  ) THEN
    ALTER TABLE workshop_alerts
    ADD CONSTRAINT workshop_alerts_severity_check
    CHECK (severity IN ('critical', 'warning', 'info'));
  END IF;
END $$;

-- ============================================================================
-- 5. ADD ORGANIZATION_MEMBERS.STATUS CHECK CONSTRAINT (already exists)
-- ============================================================================

-- Verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%organization_members%status%'
  ) THEN
    ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_status_check
    CHECK (status IN ('pending', 'active', 'suspended', 'removed'));
  END IF;
END $$;

-- ============================================================================
-- 6. ADD ORGANIZATION_MEMBERS.ROLE CHECK CONSTRAINT (already exists)
-- ============================================================================

-- Verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%organization_members%role%'
  ) THEN
    ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('owner', 'admin', 'member', 'viewer'));
  END IF;
END $$;

-- ============================================================================
-- 7. ADD PROFILES.ACCOUNT_TYPE CHECK CONSTRAINT (already exists)
-- ============================================================================

-- Verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%profiles%account_type%'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_account_type_check
    CHECK (account_type IN (
      'individual_customer',
      'corporate_customer',
      'workshop_customer'
    ));
  END IF;
END $$;

-- ============================================================================
-- 8. ADD PROFILES.SOURCE CHECK CONSTRAINT (already exists)
-- ============================================================================

-- Verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%profiles%source%'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_source_check
    CHECK (source IN ('direct', 'workshop_referral', 'invitation', 'import'));
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  RAISE NOTICE '=== Verifying Type Constraints ===';

  -- Check all CHECK constraints
  FOR constraint_rec IN
    SELECT
      conname,
      conrelid::regclass AS table_name
    FROM pg_constraint
    WHERE conname IN (
      'mechanics_account_type_check',
      'sessions_status_check',
      'session_requests_status_check',
      'workshop_alerts_severity_check',
      'organization_members_status_check',
      'organization_members_role_check',
      'profiles_account_type_check',
      'profiles_source_check'
    )
    ORDER BY table_name, conname
  LOOP
    RAISE NOTICE '✓ Constraint "%" exists on "%"', constraint_rec.conname, constraint_rec.table_name;
  END LOOP;

  -- Check for sessions with invalid status (should be 0 now)
  IF EXISTS (
    SELECT 1 FROM sessions
    WHERE status NOT IN (
      'pending', 'waiting', 'live', 'scheduled',
      'completed', 'cancelled', 'expired', 'unattended'
    )
  ) THEN
    RAISE WARNING '✗ Found sessions with invalid status after constraint addition!';
  ELSE
    RAISE NOTICE '✓ All sessions have valid status values';
  END IF;

  RAISE NOTICE '=== Type validation constraints complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT mechanics_account_type_check ON mechanics IS 'Valid values: independent, workshop';
COMMENT ON CONSTRAINT sessions_status_check ON sessions IS 'Valid statuses: pending, waiting, live, scheduled, completed, cancelled, expired, unattended';
COMMENT ON CONSTRAINT session_requests_status_check ON session_requests IS 'Valid statuses: pending, accepted, cancelled, expired';
