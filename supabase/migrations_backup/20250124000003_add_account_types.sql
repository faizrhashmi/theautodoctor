-- Migration: Add account type tracking for B2C → B2B2C transition
-- Date: 2025-01-24
-- Purpose: Prepare database for workshop and corporate account features

-- ============================================================================
-- PART 1: Add account_type to profiles table
-- ============================================================================

-- Add account_type column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT
    CHECK (account_type IN ('individual_customer', 'corporate_customer', 'workshop_customer'));

-- Add organization relationship
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add source tracking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct'
    CHECK (source IN ('direct', 'workshop_referral', 'invitation', 'import'));

-- Add workshop referral tracking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referred_by_workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Backfill existing profiles with default account type
UPDATE profiles
SET account_type = 'individual_customer'
WHERE account_type IS NULL;

-- Make account_type required going forward
ALTER TABLE profiles
  ALTER COLUMN account_type SET DEFAULT 'individual_customer';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_workshop_referral ON profiles(referred_by_workshop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_source ON profiles(source);

-- ============================================================================
-- PART 2: Add account_type to mechanics table
-- ============================================================================

-- Add account_type column to mechanics
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual_mechanic'
    CHECK (account_type IN ('individual_mechanic', 'workshop_mechanic'));

-- Add workshop relationship
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add source tracking
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct'
    CHECK (source IN ('direct', 'workshop_invitation', 'import'));

-- Add SIN collection tracking
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS requires_sin_collection BOOLEAN DEFAULT TRUE;

ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS sin_collection_completed_at TIMESTAMPTZ;

-- Add auto-approval flag (for workshop-invited mechanics)
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;

-- Add encrypted SIN column (if not exists)
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS sin_encrypted TEXT;

-- Backfill existing mechanics with default values
UPDATE mechanics
SET account_type = 'individual_mechanic'
WHERE account_type IS NULL;

UPDATE mechanics
SET requires_sin_collection = TRUE
WHERE requires_sin_collection IS NULL AND account_type = 'individual_mechanic';

UPDATE mechanics
SET requires_sin_collection = FALSE
WHERE account_type = 'workshop_mechanic';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mechanics_workshop ON mechanics(workshop_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_account_type ON mechanics(account_type);
CREATE INDEX IF NOT EXISTS idx_mechanics_source ON mechanics(source);
CREATE INDEX IF NOT EXISTS idx_mechanics_sin_required ON mechanics(requires_sin_collection) WHERE requires_sin_collection = TRUE;

-- ============================================================================
-- PART 3: Comments for documentation
-- ============================================================================

COMMENT ON COLUMN profiles.account_type IS 'Type of customer account: individual (B2C), corporate (B2B SaaS), or workshop customer (B2B2C)';
COMMENT ON COLUMN profiles.organization_id IS 'Organization this profile belongs to (for corporate users)';
COMMENT ON COLUMN profiles.source IS 'How this customer signed up: direct, workshop referral, invitation, or import';
COMMENT ON COLUMN profiles.referred_by_workshop_id IS 'Workshop that referred this customer (for B2B2C)';

COMMENT ON COLUMN mechanics.account_type IS 'Type of mechanic: independent (B2C) or workshop-affiliated (B2B2C)';
COMMENT ON COLUMN mechanics.workshop_id IS 'Workshop this mechanic is affiliated with (for B2B2C)';
COMMENT ON COLUMN mechanics.source IS 'How this mechanic signed up: direct, workshop invitation, or import';
COMMENT ON COLUMN mechanics.requires_sin_collection IS 'Whether mechanic needs to provide SIN (false for workshop employees)';
COMMENT ON COLUMN mechanics.sin_collection_completed_at IS 'When mechanic provided their SIN/Business Number';
COMMENT ON COLUMN mechanics.auto_approved IS 'Whether mechanic was auto-approved (workshop invitations skip admin review)';
COMMENT ON COLUMN mechanics.sin_encrypted IS 'Encrypted SIN or Business Number (AES-256-GCM)';
