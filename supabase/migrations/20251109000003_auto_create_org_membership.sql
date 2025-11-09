-- Auto-create organization_members record when mechanic becomes workshop owner
-- This allows independent workshop owners to access the workshop dashboard

CREATE OR REPLACE FUNCTION ensure_workshop_owner_membership()
RETURNS TRIGGER AS $$
DECLARE
  existing_membership_id UUID;
BEGIN
  -- Only proceed if mechanic has a workshop_id
  IF NEW.workshop_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this mechanic is the owner of the workshop
  DECLARE
    is_owner BOOLEAN;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM organizations
      WHERE id = NEW.workshop_id
      AND created_by = NEW.user_id
    ) INTO is_owner;

    -- If they're the owner, ensure they have an organization_members record
    IF is_owner THEN
      -- Check if membership already exists
      SELECT id INTO existing_membership_id
      FROM organization_members
      WHERE user_id = NEW.user_id
      AND organization_id = NEW.workshop_id;

      IF existing_membership_id IS NULL THEN
        -- Create new membership record
        INSERT INTO organization_members (
          user_id,
          organization_id,
          role,
          status,
          joined_at
        ) VALUES (
          NEW.user_id,
          NEW.workshop_id,
          'owner',
          'active',
          NOW()
        );

        RAISE NOTICE 'Created organization_members record for workshop owner: user_id=%, org_id=%', NEW.user_id, NEW.workshop_id;
      ELSE
        -- Update existing membership to ensure it's active with owner role
        UPDATE organization_members
        SET
          role = 'owner',
          status = 'active',
          joined_at = COALESCE(joined_at, NOW())
        WHERE id = existing_membership_id;

        RAISE NOTICE 'Updated organization_members record for workshop owner: user_id=%, org_id=%', NEW.user_id, NEW.workshop_id;
      END IF;
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs AFTER the mechanic type trigger
-- This ensures account_type is already set when we check ownership
DROP TRIGGER IF EXISTS trigger_ensure_workshop_owner_membership ON mechanics;
CREATE TRIGGER trigger_ensure_workshop_owner_membership
  AFTER INSERT OR UPDATE OF workshop_id ON mechanics
  FOR EACH ROW
  EXECUTE FUNCTION ensure_workshop_owner_membership();

COMMENT ON FUNCTION ensure_workshop_owner_membership() IS 'Automatically creates/updates organization_members record when a mechanic becomes a workshop owner';

-- Backfill: Create organization_members records for existing workshop owners
-- This fixes the test user and any other existing owner/operators
INSERT INTO organization_members (
  user_id,
  organization_id,
  role,
  status,
  joined_at
)
SELECT
  m.user_id,
  m.workshop_id,
  'owner',
  'active',
  NOW()
FROM mechanics m
INNER JOIN organizations o ON o.id = m.workshop_id
WHERE m.workshop_id IS NOT NULL
  AND o.created_by = m.user_id
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = m.user_id
    AND om.organization_id = m.workshop_id
  );
