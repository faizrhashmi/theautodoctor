-- Update the auto_update_mechanic_type function to include 30-day cooling period
CREATE OR REPLACE FUNCTION auto_update_mechanic_type()
RETURNS TRIGGER AS $$
BEGIN
  -- When workshop_id is set (mechanic joins workshop)
  IF NEW.workshop_id IS NOT NULL AND (OLD.workshop_id IS NULL OR OLD.workshop_id != NEW.workshop_id) THEN
    -- Check if this mechanic is the owner of the workshop
    DECLARE
      is_owner BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM organizations
        WHERE id = NEW.workshop_id
        AND created_by = NEW.user_id
      ) INTO is_owner;

      IF is_owner THEN
        -- Owner/Operator: individual_mechanic + workshop_id
        NEW.account_type := 'individual_mechanic';
        RAISE NOTICE 'Mechanic % set to OWNER/OPERATOR (individual_mechanic + workshop)', NEW.id;
      ELSE
        -- Employee: workshop_mechanic + workshop_id
        NEW.account_type := 'workshop_mechanic';
        RAISE NOTICE 'Mechanic % set to WORKSHOP_EMPLOYEE (workshop_mechanic)', NEW.id;
      END IF;
    END;

  -- When workshop_id is removed (mechanic terminated/removed from workshop)
  ELSIF NEW.workshop_id IS NULL AND OLD.workshop_id IS NOT NULL THEN
    -- BUSINESS RULE: 30-day cooling period after workshop termination
    -- 1. Suspend account immediately
    -- 2. Set 30-day suspension period
    -- 3. After 30 days, they can resume as virtual-only OR join new workshop

    NEW.account_type := 'individual_mechanic';
    NEW.service_tier := 'virtual_only';
    NEW.account_status := 'suspended';
    NEW.suspended_until := (NOW() + INTERVAL '30 days')::timestamp;
    NEW.ban_reason := 'Cooling period after workshop termination. You can resume work in 30 days.';

    RAISE NOTICE 'Mechanic % removed from workshop - 30-day cooling period applied', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
