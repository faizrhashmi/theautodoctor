-- Lock specialist fields for workshop employees
-- Only workshop owners and admins can modify employee specialist status
-- Created: 2025-11-12

-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Mechanics can update own profile" ON mechanics;

-- Create update policy for mechanics
CREATE POLICY "Mechanics can update own profile"
  ON mechanics FOR UPDATE
  USING (
    -- Can only update own record
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Can only update own record
    user_id = auth.uid()
  );

-- Create trigger to prevent workshop employees from self-designating as specialists
CREATE OR REPLACE FUNCTION prevent_workshop_employee_specialist_self_designation()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a workshop employee (account_type = 'workshop_mechanic')
  -- AND they are trying to update their own record
  -- AND they are changing specialist fields
  -- THEN block the update

  IF NEW.account_type = 'workshop_mechanic' AND NEW.user_id = auth.uid() THEN
    -- Check if specialist fields are being changed
    IF (NEW.is_brand_specialist IS DISTINCT FROM OLD.is_brand_specialist) OR
       (NEW.brand_specializations IS DISTINCT FROM OLD.brand_specializations) OR
       (NEW.specialist_tier IS DISTINCT FROM OLD.specialist_tier) THEN
      RAISE EXCEPTION 'Workshop employees cannot self-designate as specialists. Contact your workshop owner.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_prevent_workshop_employee_specialist_self_designation
  BEFORE UPDATE ON mechanics
  FOR EACH ROW
  EXECUTE FUNCTION prevent_workshop_employee_specialist_self_designation();

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
COMMENT ON POLICY "Mechanics can update own profile" ON mechanics IS
  'Mechanics can update their own profiles. Specialist fields are protected by trigger for workshop employees.';

COMMENT ON POLICY "Workshop owners manage employee specialists" ON mechanics IS
  'Workshop owners and admins can manage specialist designations for their team members. No admin approval needed for workshop employees.';

COMMENT ON POLICY "Platform admins manage all specialists" ON mechanics IS
  'Platform admins have full control over all mechanic specialist designations for moderation and quality control.';
