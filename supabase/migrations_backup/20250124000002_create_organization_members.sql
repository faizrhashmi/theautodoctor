-- Migration: Create organization_members table for team management
-- Date: 2025-01-24
-- Purpose: Support multi-user organizations (workshops and corporate accounts)

-- ============================================================================
-- Create organization_members table
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL until invite accepted

  -- Role and permissions
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}'::jsonb, -- Granular permissions for fine-grained access control

  -- Invitation system
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invite_email TEXT, -- Email address invited (before user_id is set)
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invite_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  joined_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, user_id), -- One membership per user per organization
  CHECK (
    -- Either pending invite (no user_id) or active member (has user_id)
    (status = 'pending' AND user_id IS NULL) OR
    (status IN ('active', 'suspended', 'removed') AND user_id IS NOT NULL)
  )
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_invite ON organization_members(invite_code, status);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(invite_email);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can view other members in their organization
CREATE POLICY "Organization members can view members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Organization owners and admins can manage members
CREATE POLICY "Organization admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Policy: Platform admins can manage all memberships
CREATE POLICY "Platform admins can manage memberships"
  ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Functions and triggers
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on row changes
CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_members_updated_at();

-- Function: Set joined_at when status changes to active
CREATE OR REPLACE FUNCTION set_organization_member_joined_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending' AND NEW.joined_at IS NULL THEN
    NEW.joined_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-set joined_at when accepting invitation
CREATE TRIGGER organization_members_set_joined_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_organization_member_joined_at();

-- Function: Ensure at least one owner per organization
CREATE OR REPLACE FUNCTION ensure_organization_has_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- If removing owner role or deleting owner, check if others exist
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner'))
     AND OLD.status = 'active' THEN
    -- Check if this is the last active owner
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = OLD.organization_id
        AND role = 'owner'
        AND status = 'active'
        AND id != OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove the last owner from an organization';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Prevent removing last owner
CREATE TRIGGER ensure_org_has_owner
  BEFORE UPDATE OR DELETE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION ensure_organization_has_owner();

-- ============================================================================
-- Helper functions
-- ============================================================================

-- Function: Check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_org_role(
  p_user_id UUID,
  p_organization_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND role = p_role
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is member of organization (any role)
CREATE OR REPLACE FUNCTION user_is_org_member(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's role in organization
CREATE OR REPLACE FUNCTION get_user_org_role(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE organization_members IS 'Team members and invitations for organizations (workshops and corporate accounts)';

COMMENT ON COLUMN organization_members.role IS 'Member role: owner (full control), admin (manage members), member (standard access), viewer (read-only)';
COMMENT ON COLUMN organization_members.status IS 'Membership status: pending (invited), active (joined), suspended (temporarily disabled), removed (deleted)';
COMMENT ON COLUMN organization_members.permissions IS 'Granular permissions for fine-grained access control';
COMMENT ON COLUMN organization_members.invite_code IS 'Unique code for invitation links (e.g., /join/:code)';
COMMENT ON COLUMN organization_members.invite_email IS 'Email address invited (before account created)';
COMMENT ON COLUMN organization_members.invite_expires_at IS 'When the invitation expires (default: 7 days from invitation)';
COMMENT ON COLUMN organization_members.joined_at IS 'When the member accepted the invitation and joined';

-- ============================================================================
-- Additional RLS policies for organizations table
-- ============================================================================
-- Note: These policies are created here (after organization_members table exists)
-- because they reference the organization_members table

-- Policy: Organization members can view their organization
CREATE POLICY "Organization members can view their org"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Policy: Organization owners and admins can update their organization
CREATE POLICY "Organization admins can update"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );
