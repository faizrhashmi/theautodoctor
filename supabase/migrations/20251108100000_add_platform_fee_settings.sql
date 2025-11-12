-- ============================================================================
-- PLATFORM FEE SETTINGS SYSTEM
-- ============================================================================
-- Creates tables for dynamic fee configuration with admin control
-- Replaces hardcoded fee values with database-driven settings
--
-- Tables Created:
-- 1. platform_fee_settings - Global default fees
-- 2. workshop_fee_overrides - Per-workshop custom rates
-- 3. mechanic_fee_overrides - Per-mechanic custom referral fees
-- 4. fee_change_log - Audit trail for all fee changes
-- ============================================================================

-- ============================================================================
-- 1. GLOBAL PLATFORM FEE SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_fee_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,

  -- Session Payment Splits
  default_session_mechanic_percent DECIMAL(5,2) DEFAULT 70.00 NOT NULL
    CHECK (default_session_mechanic_percent >= 0 AND default_session_mechanic_percent <= 100),
  default_session_platform_percent DECIMAL(5,2) DEFAULT 30.00 NOT NULL
    CHECK (default_session_platform_percent >= 0 AND default_session_platform_percent <= 100),

  -- Referral Fees
  default_referral_fee_percent DECIMAL(5,2) DEFAULT 2.00 NOT NULL
    CHECK (default_referral_fee_percent >= 0 AND default_referral_fee_percent <= 20),

  -- Workshop Quote/Repair Platform Fees
  default_workshop_quote_platform_fee DECIMAL(5,2) DEFAULT 15.00 NOT NULL
    CHECK (default_workshop_quote_platform_fee >= 0 AND default_workshop_quote_platform_fee <= 50),

  -- Escrow Settings
  default_escrow_hold_days INTEGER DEFAULT 7 NOT NULL
    CHECK (default_escrow_hold_days >= 0 AND default_escrow_hold_days <= 90),

  high_value_threshold_cents INTEGER DEFAULT 100000 NOT NULL
    CHECK (high_value_threshold_cents >= 0),

  high_value_escrow_hold_days INTEGER DEFAULT 14 NOT NULL
    CHECK (high_value_escrow_hold_days >= 0 AND high_value_escrow_hold_days <= 90),

  -- Auto-release settings
  enable_auto_release BOOLEAN DEFAULT true NOT NULL,
  require_manual_approval_over_threshold BOOLEAN DEFAULT true NOT NULL,

  -- Audit
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure only one row exists
  CONSTRAINT single_settings_row CHECK (id = '00000000-0000-0000-0000-000000000001'::UUID),

  -- Ensure session split adds up to 100%
  CONSTRAINT valid_session_split CHECK (
    default_session_mechanic_percent + default_session_platform_percent = 100
  )
);

-- Insert default values
INSERT INTO platform_fee_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE platform_fee_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings (cached by app)
CREATE POLICY "Anyone can read platform fee settings"
  ON platform_fee_settings FOR SELECT
  USING (true);

-- Policy: Only admins can update settings
-- Note: This will be restrictive until profiles table exists with role column
CREATE POLICY "Only admins can update platform fee settings"
  ON platform_fee_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      -- Will need to be updated when profiles.role column is added
      -- For now, rely on service role key for updates
    )
    AND false -- Temporarily disabled until admin role system is in place
  );

-- ============================================================================
-- 2. WORKSHOP-SPECIFIC FEE OVERRIDES
-- ============================================================================

CREATE TABLE IF NOT EXISTS workshop_fee_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL, -- REFERENCES organizations(id) ON DELETE CASCADE (will be added later),

  -- Custom Session Fees (overrides global defaults)
  custom_session_platform_fee DECIMAL(5,2)
    CHECK (custom_session_platform_fee >= 0 AND custom_session_platform_fee <= 50),

  -- Custom Quote/Repair Fees
  custom_quote_platform_fee DECIMAL(5,2)
    CHECK (custom_quote_platform_fee >= 0 AND custom_quote_platform_fee <= 50),

  -- Custom Escrow Settings
  custom_escrow_hold_days INTEGER
    CHECK (custom_escrow_hold_days >= 0 AND custom_escrow_hold_days <= 90),

  -- Agreement Details
  agreement_type TEXT
    CHECK (agreement_type IN ('volume_discount', 'promotional', 'partnership', 'custom', 'trial')),

  agreement_notes TEXT,

  agreement_start_date DATE,
  agreement_end_date DATE,

  is_active BOOLEAN DEFAULT true NOT NULL,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One override per workshop
  UNIQUE(workshop_id)
);

-- Enable RLS
ALTER TABLE workshop_fee_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Workshops can read their own overrides
-- Temporarily disabled until organization_members table exists
CREATE POLICY "Workshops can read their own fee overrides"
  ON workshop_fee_overrides FOR SELECT
  USING (false); -- Will be updated when organization_members table is available

-- Policy: Only admins can create/update/delete overrides
-- Temporarily disabled until admin role system is in place
CREATE POLICY "Only admins can manage workshop fee overrides"
  ON workshop_fee_overrides FOR ALL
  USING (false); -- Will be updated when profiles.role column is added

-- Index for fast workshop lookups
CREATE INDEX idx_workshop_fee_overrides_workshop ON workshop_fee_overrides(workshop_id) WHERE is_active = true;

-- ============================================================================
-- 3. MECHANIC-SPECIFIC REFERRAL FEE OVERRIDES
-- ============================================================================

CREATE TABLE IF NOT EXISTS mechanic_fee_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL, -- REFERENCES mechanics(id) ON DELETE CASCADE (will be added later),

  -- Custom Referral Fee (overrides global default)
  custom_referral_fee_percent DECIMAL(5,2) NOT NULL
    CHECK (custom_referral_fee_percent >= 0 AND custom_referral_fee_percent <= 20),

  -- Override Details
  override_reason TEXT,

  effective_date DATE DEFAULT CURRENT_DATE NOT NULL,
  expiry_date DATE,

  is_active BOOLEAN DEFAULT true NOT NULL,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One override per mechanic
  UNIQUE(mechanic_id),

  -- Ensure effective_date <= expiry_date
  CONSTRAINT valid_date_range CHECK (expiry_date IS NULL OR effective_date <= expiry_date)
);

-- Enable RLS
ALTER TABLE mechanic_fee_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Mechanics can read their own override
CREATE POLICY "Mechanics can read their own fee override"
  ON mechanic_fee_overrides FOR SELECT
  USING (mechanic_id = auth.uid());

-- Policy: Only admins can create/update/delete overrides
-- Temporarily disabled until admin role system is in place
CREATE POLICY "Only admins can manage mechanic fee overrides"
  ON mechanic_fee_overrides FOR ALL
  USING (false); -- Will be updated when profiles.role column is added

-- Index for fast mechanic lookups
CREATE INDEX idx_mechanic_fee_overrides_mechanic ON mechanic_fee_overrides(mechanic_id) WHERE is_active = true;

-- ============================================================================
-- 4. FEE CHANGE AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS fee_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('global', 'workshop', 'mechanic')),

  entity_id UUID,  -- NULL for global changes

  field_name TEXT NOT NULL,
  old_value NUMERIC(10,2),
  new_value NUMERIC(10,2),

  -- Why it changed
  change_reason TEXT,

  -- Who changed it
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Additional context
  metadata JSONB
);

-- Enable RLS
ALTER TABLE fee_change_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit log
-- Temporarily disabled until admin role system is in place
CREATE POLICY "Only admins can read fee change log"
  ON fee_change_log FOR SELECT
  USING (false); -- Will be updated when profiles.role column is added

-- Policy: Only system can insert (via trigger)
CREATE POLICY "Only system can insert fee changes"
  ON fee_change_log FOR INSERT
  WITH CHECK (true);  -- Trigger handles insertion

-- Indexes for audit queries
CREATE INDEX idx_fee_change_log_entity ON fee_change_log(entity_type, entity_id);
CREATE INDEX idx_fee_change_log_changed_at ON fee_change_log(changed_at DESC);

-- ============================================================================
-- 5. TRIGGERS FOR AUDIT LOGGING
-- ============================================================================

-- Function to log platform fee setting changes
CREATE OR REPLACE FUNCTION log_platform_fee_change()
RETURNS TRIGGER AS $$
DECLARE
  field_name TEXT;
  old_val NUMERIC;
  new_val NUMERIC;
BEGIN
  -- Check each field that changed
  IF OLD.default_session_mechanic_percent != NEW.default_session_mechanic_percent THEN
    INSERT INTO fee_change_log (entity_type, field_name, old_value, new_value, changed_by)
    VALUES ('global', 'session_mechanic_percent', OLD.default_session_mechanic_percent, NEW.default_session_mechanic_percent, NEW.updated_by);
  END IF;

  IF OLD.default_session_platform_percent != NEW.default_session_platform_percent THEN
    INSERT INTO fee_change_log (entity_type, field_name, old_value, new_value, changed_by)
    VALUES ('global', 'session_platform_percent', OLD.default_session_platform_percent, NEW.default_session_platform_percent, NEW.updated_by);
  END IF;

  IF OLD.default_referral_fee_percent != NEW.default_referral_fee_percent THEN
    INSERT INTO fee_change_log (entity_type, field_name, old_value, new_value, changed_by)
    VALUES ('global', 'referral_fee_percent', OLD.default_referral_fee_percent, NEW.default_referral_fee_percent, NEW.updated_by);
  END IF;

  IF OLD.default_workshop_quote_platform_fee != NEW.default_workshop_quote_platform_fee THEN
    INSERT INTO fee_change_log (entity_type, field_name, old_value, new_value, changed_by)
    VALUES ('global', 'workshop_quote_platform_fee', OLD.default_workshop_quote_platform_fee, NEW.default_workshop_quote_platform_fee, NEW.updated_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for platform fee settings
CREATE TRIGGER on_platform_fee_change
  AFTER UPDATE ON platform_fee_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_platform_fee_change();

-- Function to log workshop fee override changes
CREATE OR REPLACE FUNCTION log_workshop_fee_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO fee_change_log (entity_type, entity_id, field_name, old_value, new_value, changed_by)
    VALUES ('workshop', NEW.workshop_id, 'custom_fees_created', NULL, 1, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.custom_session_platform_fee IS DISTINCT FROM NEW.custom_session_platform_fee THEN
      INSERT INTO fee_change_log (entity_type, entity_id, field_name, old_value, new_value, changed_by)
      VALUES ('workshop', NEW.workshop_id, 'session_platform_fee', OLD.custom_session_platform_fee, NEW.custom_session_platform_fee, NEW.updated_by);
    END IF;

    IF OLD.custom_quote_platform_fee IS DISTINCT FROM NEW.custom_quote_platform_fee THEN
      INSERT INTO fee_change_log (entity_type, entity_id, field_name, old_value, new_value, changed_by)
      VALUES ('workshop', NEW.workshop_id, 'quote_platform_fee', OLD.custom_quote_platform_fee, NEW.custom_quote_platform_fee, NEW.updated_by);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for workshop fee overrides
CREATE TRIGGER on_workshop_fee_change
  AFTER INSERT OR UPDATE ON workshop_fee_overrides
  FOR EACH ROW
  EXECUTE FUNCTION log_workshop_fee_change();

-- Function to log mechanic fee override changes
CREATE OR REPLACE FUNCTION log_mechanic_fee_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO fee_change_log (entity_type, entity_id, field_name, old_value, new_value, changed_by, change_reason)
    VALUES ('mechanic', NEW.mechanic_id, 'referral_fee_percent', NULL, NEW.custom_referral_fee_percent, NEW.created_by, NEW.override_reason);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.custom_referral_fee_percent != NEW.custom_referral_fee_percent THEN
      INSERT INTO fee_change_log (entity_type, entity_id, field_name, old_value, new_value, changed_by, change_reason)
      VALUES ('mechanic', NEW.mechanic_id, 'referral_fee_percent', OLD.custom_referral_fee_percent, NEW.custom_referral_fee_percent, NEW.updated_by, NEW.override_reason);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for mechanic fee overrides
CREATE TRIGGER on_mechanic_fee_change
  AFTER INSERT OR UPDATE ON mechanic_fee_overrides
  FOR EACH ROW
  EXECUTE FUNCTION log_mechanic_fee_change();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Get effective referral fee for a mechanic
CREATE OR REPLACE FUNCTION get_mechanic_referral_fee(p_mechanic_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  custom_fee DECIMAL(5,2);
  default_fee DECIMAL(5,2);
BEGIN
  -- Check for mechanic-specific override
  SELECT custom_referral_fee_percent INTO custom_fee
  FROM mechanic_fee_overrides
  WHERE mechanic_id = p_mechanic_id
    AND is_active = true
    AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    AND effective_date <= CURRENT_DATE;

  IF custom_fee IS NOT NULL THEN
    RETURN custom_fee;
  END IF;

  -- Fall back to global default
  SELECT default_referral_fee_percent INTO default_fee
  FROM platform_fee_settings;

  RETURN COALESCE(default_fee, 2.00);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get effective workshop quote platform fee
CREATE OR REPLACE FUNCTION get_workshop_quote_platform_fee(p_workshop_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  custom_fee DECIMAL(5,2);
  default_fee DECIMAL(5,2);
BEGIN
  -- Check for workshop-specific override
  SELECT custom_quote_platform_fee INTO custom_fee
  FROM workshop_fee_overrides
  WHERE workshop_id = p_workshop_id
    AND is_active = true
    AND (agreement_end_date IS NULL OR agreement_end_date >= CURRENT_DATE);

  IF custom_fee IS NOT NULL THEN
    RETURN custom_fee;
  END IF;

  -- Fall back to global default
  SELECT default_workshop_quote_platform_fee INTO default_fee
  FROM platform_fee_settings;

  RETURN COALESCE(default_fee, 15.00);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get effective session split percentages
CREATE OR REPLACE FUNCTION get_session_split_percentages()
RETURNS TABLE(mechanic_percent DECIMAL(5,2), platform_percent DECIMAL(5,2)) AS $$
BEGIN
  RETURN QUERY
  SELECT
    default_session_mechanic_percent,
    default_session_platform_percent
  FROM platform_fee_settings;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE platform_fee_settings IS 'Global default fee settings for the platform. Only one row allowed.';
COMMENT ON TABLE workshop_fee_overrides IS 'Custom fee agreements for specific workshops';
COMMENT ON TABLE mechanic_fee_overrides IS 'Custom referral fees for specific mechanics';
COMMENT ON TABLE fee_change_log IS 'Audit trail for all fee configuration changes';

COMMENT ON FUNCTION get_mechanic_referral_fee IS 'Returns effective referral fee % for a mechanic (custom or default)';
COMMENT ON FUNCTION get_workshop_quote_platform_fee IS 'Returns effective quote platform fee % for a workshop (custom or default)';
COMMENT ON FUNCTION get_session_split_percentages IS 'Returns current session payment split percentages';
