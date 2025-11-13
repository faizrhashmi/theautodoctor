-- =====================================================
-- Diagnostic Credit System & In-Person Booking
-- Created: 2025-11-12
-- Purpose: Implement diagnostic-first in-person booking with 48-hour credit system
-- Baseline: See IN_PERSON_DIAGNOSTIC_IMPLEMENTATION_PLAN_2025-11-12.md
-- =====================================================

-- =====================================================
-- STEP 1: Create mechanic_diagnostic_pricing table
-- =====================================================

CREATE TABLE IF NOT EXISTS mechanic_diagnostic_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE UNIQUE,

  -- Pricing tiers (mechanic sets, enforced minimums)
  chat_diagnostic_price DECIMAL(10,2) NOT NULL CHECK (chat_diagnostic_price >= 19),
  video_diagnostic_price DECIMAL(10,2) NOT NULL CHECK (video_diagnostic_price >= 39),
  in_person_diagnostic_price DECIMAL(10,2) NOT NULL CHECK (in_person_diagnostic_price >= 50),

  -- Descriptions (what's included in each tier)
  chat_diagnostic_description TEXT,
  video_diagnostic_description TEXT,
  in_person_diagnostic_description TEXT,

  -- Enforce pricing hierarchy: video >= chat, in_person >= video
  CONSTRAINT chk_diagnostic_price_hierarchy CHECK (
    video_diagnostic_price >= chat_diagnostic_price AND
    in_person_diagnostic_price >= video_diagnostic_price
  ),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mechanic_diagnostic_pricing_mechanic_id ON mechanic_diagnostic_pricing(mechanic_id);

COMMENT ON TABLE mechanic_diagnostic_pricing IS
'Mechanic-specific diagnostic pricing for chat, video, and in-person diagnostics. Enforces minimum prices and hierarchy.';

COMMENT ON COLUMN mechanic_diagnostic_pricing.chat_diagnostic_price IS
'Price for text/photo-based diagnostic (minimum $19). Platform takes 30% commission.';

COMMENT ON COLUMN mechanic_diagnostic_pricing.video_diagnostic_price IS
'Price for live video diagnostic (minimum $39, must be >= chat price). Platform takes 30% commission.';

COMMENT ON COLUMN mechanic_diagnostic_pricing.in_person_diagnostic_price IS
'Price for in-person shop diagnostic (minimum $50, must be >= video price). Platform takes 30% commission.';

-- =====================================================
-- STEP 2: Add diagnostic credit tracking to diagnostic_sessions
-- =====================================================

DO $$
BEGIN
    -- Track if session requires in-person follow-up
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'diagnostic_sessions' AND column_name = 'requires_in_person_follow_up'
    ) THEN
        ALTER TABLE diagnostic_sessions
        ADD COLUMN requires_in_person_follow_up BOOLEAN DEFAULT false;
    END IF;

    -- Track if credit has been used
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'diagnostic_sessions' AND column_name = 'diagnostic_credit_used'
    ) THEN
        ALTER TABLE diagnostic_sessions
        ADD COLUMN diagnostic_credit_used BOOLEAN DEFAULT false;
    END IF;

    -- When credit expires (48 hours after completion)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'diagnostic_sessions' AND column_name = 'diagnostic_credit_expires_at'
    ) THEN
        ALTER TABLE diagnostic_sessions
        ADD COLUMN diagnostic_credit_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Link to in-person appointment created from this credit
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'diagnostic_sessions' AND column_name = 'in_person_appointment_id'
    ) THEN
        ALTER TABLE diagnostic_sessions
        ADD COLUMN in_person_appointment_id UUID REFERENCES workshop_appointments(id);
    END IF;

    RAISE NOTICE '✅ Added diagnostic credit tracking columns to diagnostic_sessions';
END $$;

COMMENT ON COLUMN diagnostic_sessions.requires_in_person_follow_up IS
'Mechanic determined in-person inspection needed. Customer gets 48-hour credit toward in-person diagnostic.';

COMMENT ON COLUMN diagnostic_sessions.diagnostic_credit_used IS
'Whether customer has used their diagnostic credit for in-person follow-up (one-time use only).';

COMMENT ON COLUMN diagnostic_sessions.diagnostic_credit_expires_at IS
'Credit expiration timestamp (48 hours after session completion). After this, customer must book new diagnostic.';

-- =====================================================
-- STEP 3: Add payment tracking to workshop_appointments
-- =====================================================

DO $$
BEGIN
    -- Appointment type (diagnostic, follow-up, service)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'appointment_type'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN appointment_type VARCHAR(50) DEFAULT 'new_diagnostic';

        ALTER TABLE workshop_appointments
        ADD CONSTRAINT chk_appointment_type CHECK (
            appointment_type IN ('new_diagnostic', 'in_person_follow_up', 'follow_up_service')
        );
    END IF;

    -- Link to parent diagnostic session (if follow-up)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'parent_diagnostic_session_id'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN parent_diagnostic_session_id UUID REFERENCES diagnostic_sessions(id);
    END IF;

    -- Track if diagnostic credit was applied
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'diagnostic_credit_applied'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN diagnostic_credit_applied BOOLEAN DEFAULT false;
    END IF;

    -- Amount of credit applied
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'diagnostic_credit_amount'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN diagnostic_credit_amount DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Mechanic's diagnostic price for this appointment
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'mechanic_diagnostic_price'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN mechanic_diagnostic_price DECIMAL(10,2);
    END IF;

    -- Platform commission percentage (30% for diagnostics, 15% for services)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_appointments' AND column_name = 'platform_commission_percent'
    ) THEN
        ALTER TABLE workshop_appointments
        ADD COLUMN platform_commission_percent DECIMAL(5,2) DEFAULT 30.00;
    END IF;

    RAISE NOTICE '✅ Added appointment payment tracking columns to workshop_appointments';
END $$;

COMMENT ON COLUMN workshop_appointments.appointment_type IS
'new_diagnostic: New in-person diagnostic. in_person_follow_up: Follow-up from online diagnostic with credit. follow_up_service: Repair/service after diagnostic.';

COMMENT ON COLUMN workshop_appointments.diagnostic_credit_applied IS
'Whether customer used diagnostic credit from previous session. If true, they paid less or nothing for this appointment.';

COMMENT ON COLUMN workshop_appointments.diagnostic_credit_amount IS
'Dollar amount of credit applied from previous diagnostic session (e.g., $50 video credit toward $75 in-person).';

-- =====================================================
-- STEP 4: Create function to set diagnostic credit expiration
-- =====================================================

CREATE OR REPLACE FUNCTION set_diagnostic_credit_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- When mechanic marks session as requiring in-person follow-up
  -- Set expiration to 48 hours from completion time
  IF NEW.requires_in_person_follow_up = true
     AND OLD.requires_in_person_follow_up = false
     AND NEW.status = 'completed' THEN

    NEW.diagnostic_credit_expires_at = NEW.completed_at + INTERVAL '48 hours';

    RAISE NOTICE 'Diagnostic credit set for session %. Expires at: %',
      NEW.id, NEW.diagnostic_credit_expires_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_diagnostic_credit_expiration
  BEFORE UPDATE ON diagnostic_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_diagnostic_credit_expiration();

COMMENT ON FUNCTION set_diagnostic_credit_expiration IS
'Automatically sets credit expiration 48 hours after session completion when mechanic marks requires_in_person_follow_up = true.';

-- =====================================================
-- STEP 5: Create function to validate diagnostic credit usage
-- =====================================================

CREATE OR REPLACE FUNCTION validate_diagnostic_credit_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_session RECORD;
  v_credit_valid BOOLEAN;
  v_hours_since_completion NUMERIC;
BEGIN
  -- Only validate if this is an in-person follow-up with credit applied
  IF NEW.appointment_type = 'in_person_follow_up' AND NEW.diagnostic_credit_applied = true THEN

    -- Get parent diagnostic session
    SELECT * INTO v_parent_session
    FROM diagnostic_sessions
    WHERE id = NEW.parent_diagnostic_session_id;

    -- Validate parent session exists
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent diagnostic session % not found', NEW.parent_diagnostic_session_id;
    END IF;

    -- Validate parent session is completed
    IF v_parent_session.status != 'completed' THEN
      RAISE EXCEPTION 'Parent diagnostic session must be completed to use credit';
    END IF;

    -- Validate credit not already used
    IF v_parent_session.diagnostic_credit_used = true THEN
      RAISE EXCEPTION 'Diagnostic credit for session % has already been used', v_parent_session.id;
    END IF;

    -- Validate credit hasn't expired (48 hours)
    IF NOW() > v_parent_session.diagnostic_credit_expires_at THEN
      v_hours_since_completion = EXTRACT(EPOCH FROM (NOW() - v_parent_session.completed_at)) / 3600;
      RAISE EXCEPTION 'Diagnostic credit expired (%.1f hours since completion, maximum 48 hours)',
        v_hours_since_completion;
    END IF;

    -- Validate mechanic is the same
    IF v_parent_session.mechanic_id != NEW.mechanic_id THEN
      RAISE EXCEPTION 'Diagnostic credit can only be used with the same mechanic';
    END IF;

    -- Validate customer is the same
    IF v_parent_session.customer_id != NEW.customer_user_id THEN
      RAISE EXCEPTION 'Diagnostic credit can only be used by the same customer';
    END IF;

    RAISE NOTICE 'Diagnostic credit validation passed for session %', v_parent_session.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_diagnostic_credit_usage
  BEFORE INSERT ON workshop_appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_diagnostic_credit_usage();

COMMENT ON FUNCTION validate_diagnostic_credit_usage IS
'Validates diagnostic credit before applying: checks expiration (48 hours), same mechanic, same customer, credit not already used.';

-- =====================================================
-- STEP 6: Create function to mark credit as used
-- =====================================================

CREATE OR REPLACE FUNCTION mark_diagnostic_credit_as_used()
RETURNS TRIGGER AS $$
BEGIN
  -- When in-person follow-up appointment is created with credit
  -- Mark the parent session credit as used
  IF NEW.appointment_type = 'in_person_follow_up' AND NEW.diagnostic_credit_applied = true THEN

    UPDATE diagnostic_sessions
    SET diagnostic_credit_used = true,
        in_person_appointment_id = NEW.id
    WHERE id = NEW.parent_diagnostic_session_id;

    RAISE NOTICE 'Marked diagnostic credit as used for session %', NEW.parent_diagnostic_session_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_diagnostic_credit_as_used
  AFTER INSERT ON workshop_appointments
  FOR EACH ROW
  EXECUTE FUNCTION mark_diagnostic_credit_as_used();

COMMENT ON FUNCTION mark_diagnostic_credit_as_used IS
'Marks diagnostic session credit as used after in-person follow-up appointment created. Prevents credit reuse.';

-- =====================================================
-- STEP 7: Create helper function to check credit validity
-- =====================================================

CREATE OR REPLACE FUNCTION check_diagnostic_credit_validity(
  p_customer_id UUID,
  p_mechanic_id UUID
) RETURNS TABLE (
  has_credit BOOLEAN,
  session_id UUID,
  session_type VARCHAR,
  credit_amount DECIMAL,
  expires_at TIMESTAMP WITH TIME ZONE,
  hours_remaining NUMERIC
) AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Find most recent completed diagnostic session with this mechanic
  SELECT * INTO v_session
  FROM diagnostic_sessions
  WHERE customer_id = p_customer_id
    AND mechanic_id = p_mechanic_id
    AND status = 'completed'
    AND requires_in_person_follow_up = true
    AND diagnostic_credit_used = false
    AND diagnostic_credit_expires_at > NOW()
  ORDER BY completed_at DESC
  LIMIT 1;

  -- If no valid credit found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, 0::DECIMAL, NULL::TIMESTAMP WITH TIME ZONE, 0::NUMERIC;
    RETURN;
  END IF;

  -- Return credit information
  RETURN QUERY SELECT
    true,
    v_session.id,
    v_session.session_type::VARCHAR,
    v_session.session_price,
    v_session.diagnostic_credit_expires_at,
    EXTRACT(EPOCH FROM (v_session.diagnostic_credit_expires_at - NOW())) / 3600;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_diagnostic_credit_validity IS
'Check if customer has valid diagnostic credit with specific mechanic. Returns credit details or false if no valid credit.';

-- =====================================================
-- STEP 8: RLS Policies for mechanic_diagnostic_pricing
-- =====================================================

ALTER TABLE mechanic_diagnostic_pricing ENABLE ROW LEVEL SECURITY;

-- Public can view mechanic pricing
CREATE POLICY "Mechanic diagnostic pricing is publicly viewable"
  ON mechanic_diagnostic_pricing FOR SELECT
  USING (true);

-- Mechanic can update their own pricing
CREATE POLICY "Mechanics can update own diagnostic pricing"
  ON mechanic_diagnostic_pricing FOR ALL
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 9: Create default pricing for existing mechanics (optional)
-- =====================================================

-- Insert default pricing for mechanics who don't have pricing yet
-- This is optional - mechanics can set their own pricing later
INSERT INTO mechanic_diagnostic_pricing (
  mechanic_id,
  chat_diagnostic_price,
  video_diagnostic_price,
  in_person_diagnostic_price,
  chat_diagnostic_description,
  video_diagnostic_description,
  in_person_diagnostic_description
)
SELECT
  id,
  25.00, -- Default chat price
  50.00, -- Default video price
  75.00, -- Default in-person price
  'Text-based diagnosis with photo analysis and written recommendations',
  '30-minute live video call with real-time diagnosis and expert guidance',
  '45-60 minute comprehensive shop inspection with professional scan tools, test drive, and detailed written report with photos'
FROM mechanics
WHERE NOT EXISTS (
  SELECT 1 FROM mechanic_diagnostic_pricing mdp WHERE mdp.mechanic_id = mechanics.id
);

DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE '✅ Created default diagnostic pricing for % mechanics', inserted_count;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================

DO $$
DECLARE
  pricing_count INTEGER;
  credit_sessions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pricing_count FROM mechanic_diagnostic_pricing;

  SELECT COUNT(*) INTO credit_sessions_count
  FROM diagnostic_sessions
  WHERE requires_in_person_follow_up = true;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Diagnostic Credit System Installed';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '  - % mechanics have diagnostic pricing set', pricing_count;
  RAISE NOTICE '  - % diagnostic sessions require in-person follow-up', credit_sessions_count;
  RAISE NOTICE '';
  RAISE NOTICE '💰 Pricing Structure:';
  RAISE NOTICE '  - Chat diagnostic: Minimum $19 (30 percent commission)';
  RAISE NOTICE '  - Video diagnostic: Minimum $39 (30 percent commission)';
  RAISE NOTICE '  - In-Person diagnostic: Minimum $50 (30 percent commission)';
  RAISE NOTICE '';
  RAISE NOTICE '🎫 Credit System:';
  RAISE NOTICE '  - Credit validity: 48 hours after session completion';
  RAISE NOTICE '  - Credit scope: Same mechanic only';
  RAISE NOTICE '  - Credit usage: One-time use';
  RAISE NOTICE '  - Lower tier credits toward higher tier';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready for use';
  RAISE NOTICE '========================================';
END $$;
