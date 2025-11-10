-- ============================================================================
-- ADD SUSPENSION FIELDS TO MECHANICS TABLE
-- ============================================================================
-- Add fields required for 30-day cooling period and account suspension logic
-- These fields are referenced by auto_update_mechanic_type trigger
-- ============================================================================

-- Add suspension-related columns to mechanics table
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned', 'pending'));

ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP;

ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Create index for querying suspended mechanics
CREATE INDEX IF NOT EXISTS idx_mechanics_account_status
  ON mechanics(account_status);

CREATE INDEX IF NOT EXISTS idx_mechanics_suspended_until
  ON mechanics(suspended_until)
  WHERE suspended_until IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN mechanics.account_status IS 'Account status: active, suspended (cooling period), banned, or pending approval';
COMMENT ON COLUMN mechanics.suspended_until IS 'Timestamp when suspension ends (NULL if not suspended)';
COMMENT ON COLUMN mechanics.ban_reason IS 'Reason for suspension or ban (shown to mechanic)';
