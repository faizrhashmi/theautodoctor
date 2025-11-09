-- ============================================================================
-- AUTO UPDATE MECHANIC TYPE ON WORKSHOP ASSIGNMENT CHANGES
-- ============================================================================
-- This trigger automatically updates mechanic account_type and workshop_id
-- when workshop assignments change (mechanic added/removed from workshop)
-- ============================================================================

-- Function to automatically update mechanic type when workshop_id changes
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

-- Create trigger on mechanics table
DROP TRIGGER IF EXISTS trigger_auto_update_mechanic_type ON mechanics;
CREATE TRIGGER trigger_auto_update_mechanic_type
  BEFORE UPDATE OF workshop_id ON mechanics
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_mechanic_type();

-- ============================================================================
-- ADMIN AUDIT LOG FOR MECHANIC TYPE CHANGES
-- ============================================================================
-- Log all mechanic type changes for admin visibility
-- ============================================================================

CREATE TABLE IF NOT EXISTS mechanic_type_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  old_account_type TEXT,
  new_account_type TEXT,
  old_workshop_id UUID,
  new_workshop_id UUID,
  change_reason TEXT,
  change_source TEXT, -- 'workshop_assignment', 'admin_manual', 'workshop_removal'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for querying
CREATE INDEX IF NOT EXISTS idx_mechanic_type_log_mechanic ON mechanic_type_change_log(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_type_log_created ON mechanic_type_change_log(created_at DESC);

-- Function to log mechanic type changes
CREATE OR REPLACE FUNCTION log_mechanic_type_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if account_type or workshop_id actually changed
  IF (OLD.account_type IS DISTINCT FROM NEW.account_type)
     OR (OLD.workshop_id IS DISTINCT FROM NEW.workshop_id) THEN

    INSERT INTO mechanic_type_change_log (
      mechanic_id,
      old_account_type,
      new_account_type,
      old_workshop_id,
      new_workshop_id,
      change_source,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.account_type,
      NEW.account_type,
      OLD.workshop_id,
      NEW.workshop_id,
      CASE
        WHEN NEW.workshop_id IS NOT NULL AND OLD.workshop_id IS NULL THEN 'workshop_assignment'
        WHEN NEW.workshop_id IS NULL AND OLD.workshop_id IS NOT NULL THEN 'workshop_removal'
        ELSE 'admin_manual'
      END,
      CASE
        WHEN NEW.workshop_id IS NOT NULL AND OLD.workshop_id IS NULL THEN 'Mechanic assigned to workshop'
        WHEN NEW.workshop_id IS NULL AND OLD.workshop_id IS NOT NULL THEN 'Mechanic removed from workshop'
        ELSE 'Manual admin change'
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log changes
DROP TRIGGER IF EXISTS trigger_log_mechanic_type_change ON mechanics;
CREATE TRIGGER trigger_log_mechanic_type_change
  AFTER UPDATE OF account_type, workshop_id ON mechanics
  FOR EACH ROW
  EXECUTE FUNCTION log_mechanic_type_change();

-- Enable RLS on log table
ALTER TABLE mechanic_type_change_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admins can view all mechanic type changes"
  ON mechanic_type_change_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- HELPER FUNCTION FOR ADMIN PANEL
-- ============================================================================
-- Get mechanic type classification for display
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mechanic_type(p_mechanic_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_account_type TEXT;
  v_workshop_id UUID;
  v_is_owner BOOLEAN;
BEGIN
  -- Get mechanic details
  SELECT account_type, workshop_id INTO v_account_type, v_workshop_id
  FROM mechanics
  WHERE id = p_mechanic_id;

  -- If no workshop affiliation
  IF v_workshop_id IS NULL THEN
    RETURN 'VIRTUAL_ONLY';
  END IF;

  -- Check if owner
  SELECT EXISTS (
    SELECT 1 FROM mechanics m
    JOIN organizations o ON o.id = m.workshop_id
    WHERE m.id = p_mechanic_id
    AND o.created_by = m.user_id
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN 'INDEPENDENT_WORKSHOP';
  ELSE
    RETURN 'WORKSHOP_AFFILIATED';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_mechanic_type(UUID) IS 'Returns mechanic type classification: VIRTUAL_ONLY, INDEPENDENT_WORKSHOP, or WORKSHOP_AFFILIATED';
