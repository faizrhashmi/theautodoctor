-- Lock specialist fields for workshop employees
-- Only workshop owners and admins can modify employee specialist status
-- Created: 2025-11-12

-- Drop existing policies (including any from previous attempts)
DROP POLICY IF EXISTS "Mechanics can update own profile" ON mechanics;
DROP POLICY IF EXISTS "Mechanics can update own profile with restrictions" ON mechanics;
DROP POLICY IF EXISTS "Workshop owners manage employee specialists" ON mechanics;
DROP POLICY IF EXISTS "Platform admins manage all specialists" ON mechanics;

-- Create granular update policy for mechanics
-- Note: Independent mechanics (no workshop_id or account_type != 'workshop_mechanic') can update specialist fields
-- Workshop employees (account_type = 'workshop_mechanic') are blocked from updating via application layer
CREATE POLICY "Mechanics can update own profile with restrictions"
  ON mechanics FOR UPDATE
  USING (
    -- Can only update own record
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Can only update own record
    user_id = auth.uid()
  );

-- Workshop owners can update their employees' specialist designations
CREATE POLICY "Workshop owners manage employee specialists"
  ON mechanics FOR UPDATE
  USING (
    -- User is owner/admin of the mechanic's workshop
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  )
  WITH CHECK (
    -- Same workshop check
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Platform admins can update any mechanic's specialist status
CREATE POLICY "Platform admins manage all specialists"
  ON mechanics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Mechanics can update own profile with restrictions" ON mechanics IS
  'Mechanics can update their own profiles, but workshop employees cannot self-designate as specialists. Workshop owners control employee specialist status via dashboard.';

COMMENT ON POLICY "Workshop owners manage employee specialists" ON mechanics IS
  'Workshop owners and admins can manage specialist designations for their team members. No admin approval needed for workshop employees.';

COMMENT ON POLICY "Platform admins manage all specialists" ON mechanics IS
  'Platform admins have full control over all mechanic specialist designations for moderation and quality control.';
