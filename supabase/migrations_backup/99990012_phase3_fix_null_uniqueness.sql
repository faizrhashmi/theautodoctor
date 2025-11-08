-- ============================================================================
-- PHASE 3.4: FIX NULL UNIQUENESS ISSUES
-- ============================================================================
-- This migration fixes the NULL uniqueness problem in organization_members
-- where UNIQUE(organization_id, user_id) allows multiple NULL values.
--
-- Issue: Multiple pending invites can exist for same organization because
-- NULL user_id is not considered unique by PostgreSQL.
--
-- Solution: Create partial unique indexes and add business logic constraints
--
-- Date: 2025-10-27
-- Priority: MEDIUM
-- ============================================================================

-- ============================================================================
-- 1. FIX ORGANIZATION_MEMBERS NULL UNIQUENESS
-- ============================================================================

-- Drop existing unique constraint
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_organization_id_user_id_key;

-- Create partial unique index for active members (user_id NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS org_members_unique_active
  ON organization_members(organization_id, user_id)
  WHERE user_id IS NOT NULL AND status = 'active';

-- Create partial unique index for pending invites by email
CREATE UNIQUE INDEX IF NOT EXISTS org_members_unique_pending_email
  ON organization_members(organization_id, invite_email)
  WHERE user_id IS NULL AND status = 'pending' AND invite_email IS NOT NULL;

-- Add CHECK constraint: if status is 'active', user_id must NOT be NULL
ALTER TABLE organization_members
ADD CONSTRAINT user_id_required_for_active
CHECK (
  (status = 'pending' AND user_id IS NULL) OR
  (status IN ('active', 'suspended', 'removed') AND user_id IS NOT NULL)
);

-- Add CHECK constraint: if status is 'pending', invite_email must NOT be NULL
ALTER TABLE organization_members
ADD CONSTRAINT invite_email_required_for_pending
CHECK (
  (status != 'pending') OR
  (status = 'pending' AND invite_email IS NOT NULL)
);

-- ============================================================================
-- 2. ADD TRIGGER TO PREVENT DUPLICATE PENDING INVITES
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_duplicate_invites()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if invite_email already has pending invite for this organization
  IF NEW.status = 'pending' AND NEW.user_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = NEW.organization_id
      AND invite_email = NEW.invite_email
      AND status = 'pending'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'User with email % already has a pending invite for this organization', NEW.invite_email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_duplicate_invites_trigger ON organization_members;
CREATE TRIGGER prevent_duplicate_invites_trigger
  BEFORE INSERT OR UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_invites();

-- ============================================================================
-- 3. CLEAN UP EXISTING DUPLICATE PENDING INVITES
-- ============================================================================

-- Delete duplicate pending invites (keep oldest)
DELETE FROM organization_members om1
WHERE om1.status = 'pending'
AND om1.user_id IS NULL
AND EXISTS (
  SELECT 1 FROM organization_members om2
  WHERE om2.organization_id = om1.organization_id
  AND om2.invite_email = om1.invite_email
  AND om2.status = 'pending'
  AND om2.created_at < om1.created_at
);

-- ============================================================================
-- 4. FIX SIMILAR ISSUE IN MECHANICS TABLE (if exists)
-- ============================================================================

-- Check if mechanics has similar uniqueness issues with workshop invites
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanics' AND column_name = 'invited_by'
  ) THEN
    -- Create partial unique index for independent mechanics
    CREATE UNIQUE INDEX IF NOT EXISTS mechanics_unique_email_independent
      ON mechanics(email)
      WHERE account_type = 'independent';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
  index_count INTEGER;
BEGIN
  RAISE NOTICE '=== Verifying NULL Uniqueness Fixes ===';

  -- Check for duplicate pending invites
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT organization_id, invite_email, COUNT(*) as cnt
    FROM organization_members
    WHERE status = 'pending' AND user_id IS NULL
    GROUP BY organization_id, invite_email
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING '✗ Found % duplicate pending invites', duplicate_count;
  ELSE
    RAISE NOTICE '✓ No duplicate pending invites found';
  END IF;

  -- Check if partial indexes exist
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'organization_members'
  AND indexname IN ('org_members_unique_active', 'org_members_unique_pending_email');

  IF index_count = 2 THEN
    RAISE NOTICE '✓ Both partial unique indexes created';
  ELSE
    RAISE WARNING '✗ Only % of 2 partial unique indexes found', index_count;
  END IF;

  -- Check if trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'prevent_duplicate_invites_trigger'
  ) THEN
    RAISE NOTICE '✓ Duplicate prevention trigger is active';
  ELSE
    RAISE WARNING '✗ Duplicate prevention trigger not found';
  END IF;

  RAISE NOTICE '=== NULL uniqueness fixes complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX org_members_unique_active IS 'Ensures one active membership per user per organization';
COMMENT ON INDEX org_members_unique_pending_email IS 'Ensures one pending invite per email per organization';
COMMENT ON CONSTRAINT user_id_required_for_active ON organization_members IS 'Active members must have user_id';
COMMENT ON CONSTRAINT invite_email_required_for_pending ON organization_members IS 'Pending invites must have invite_email';
COMMENT ON FUNCTION prevent_duplicate_invites() IS 'Prevents duplicate pending invites for same email and organization';
