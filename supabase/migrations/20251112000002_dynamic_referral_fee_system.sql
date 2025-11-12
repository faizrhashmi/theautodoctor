-- =====================================================
-- Dynamic Mechanic Referral Fee System
-- Created: 2025-11-12
-- Purpose: Make referral fees configurable via platform_fee_settings
-- Business Logic: Admin can adjust mechanic referral rates dynamically
-- =====================================================

-- =====================================================
-- STEP 1: Add mechanic referral settings to platform_fee_settings
-- =====================================================

-- Add mechanic_referral_percent column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'platform_fee_settings'
        AND column_name = 'mechanic_referral_percent'
    ) THEN
        ALTER TABLE platform_fee_settings
        ADD COLUMN mechanic_referral_percent DECIMAL(5,2) DEFAULT 2.00 CHECK (mechanic_referral_percent >= 0 AND mechanic_referral_percent <= 100);

        COMMENT ON COLUMN platform_fee_settings.mechanic_referral_percent IS
        'Percentage of bid amount paid to referring mechanic when customer accepts RFQ bid (default 2%)';
    END IF;
END $$;

-- Add workshop_escalation_referral_percent column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'platform_fee_settings'
        AND column_name = 'workshop_escalation_referral_percent'
    ) THEN
        ALTER TABLE platform_fee_settings
        ADD COLUMN workshop_escalation_referral_percent DECIMAL(5,2) DEFAULT 5.00 CHECK (workshop_escalation_referral_percent >= 0 AND workshop_escalation_referral_percent <= 100);

        COMMENT ON COLUMN platform_fee_settings.workshop_escalation_referral_percent IS
        'Percentage of job value paid to mechanic who escalates to workshop (direct assignment, not RFQ - default 5%)';
    END IF;
END $$;

-- Insert/update default settings
INSERT INTO platform_fee_settings (id, mechanic_referral_percent, workshop_escalation_referral_percent)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 2.00, 5.00)
ON CONFLICT (id) DO UPDATE SET
    mechanic_referral_percent = COALESCE(platform_fee_settings.mechanic_referral_percent, 2.00),
    workshop_escalation_referral_percent = COALESCE(platform_fee_settings.workshop_escalation_referral_percent, 5.00);

-- =====================================================
-- STEP 2: Update workshop_escalation_queue referral_fee_percent default
-- =====================================================

-- Change default from 5.00 to fetch from settings (we'll handle this in the application layer)
COMMENT ON COLUMN workshop_escalation_queue.referral_fee_percent IS
'Referral fee percentage for this escalation. Should match platform_fee_settings.workshop_escalation_referral_percent at time of creation';

-- =====================================================
-- STEP 3: Create mechanic_referral_earnings table with dynamic rate
-- =====================================================

CREATE TABLE IF NOT EXISTS mechanic_referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who earned the commission
    mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,

    -- What RFQ was this from
    rfq_id UUID NOT NULL REFERENCES workshop_rfq_marketplace(id) ON DELETE CASCADE,
    diagnostic_session_id UUID REFERENCES diagnostic_sessions(id) ON DELETE SET NULL,

    -- Customer and workshop involved
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bid_id UUID NOT NULL REFERENCES workshop_rfq_bids(id) ON DELETE CASCADE,

    -- Financial details
    bid_amount DECIMAL(10,2) NOT NULL CHECK (bid_amount > 0),
    referral_rate DECIMAL(5,4) NOT NULL CHECK (referral_rate >= 0 AND referral_rate <= 1),
    commission_amount DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0),

    -- Payment tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'cancelled', 'failed')),
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    payout_id TEXT, -- Stripe payout ID when paid

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Metadata for tracking
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Ensure one commission per RFQ
    UNIQUE(rfq_id, mechanic_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mechanic_referral_earnings_mechanic
ON mechanic_referral_earnings(mechanic_id, status, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_mechanic_referral_earnings_status
ON mechanic_referral_earnings(status, earned_at DESC)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_mechanic_referral_earnings_rfq
ON mechanic_referral_earnings(rfq_id);

-- RLS Policies
ALTER TABLE mechanic_referral_earnings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS mechanic_view_own_referrals ON mechanic_referral_earnings;
DROP POLICY IF EXISTS admin_view_all_referrals ON mechanic_referral_earnings;
DROP POLICY IF EXISTS system_insert_referrals ON mechanic_referral_earnings;
DROP POLICY IF EXISTS system_update_referrals ON mechanic_referral_earnings;

-- Mechanics can view their own referral earnings
CREATE POLICY mechanic_view_own_referrals
ON mechanic_referral_earnings
FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id FROM mechanics WHERE id = mechanic_id
    )
);

-- Admins can view all referral earnings
CREATE POLICY admin_view_all_referrals
ON mechanic_referral_earnings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- System can insert referral earnings (via service role)
CREATE POLICY system_insert_referrals
ON mechanic_referral_earnings
FOR INSERT
WITH CHECK (true);

-- System can update referral earnings (via service role)
CREATE POLICY system_update_referrals
ON mechanic_referral_earnings
FOR UPDATE
USING (true);

COMMENT ON TABLE mechanic_referral_earnings IS
'Tracks referral commissions earned by virtual mechanics when customers accept bids on RFQs. Referral rate is dynamic and set from platform_fee_settings';

-- =====================================================
-- STEP 4: Function to get current referral rate
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_mechanic_referral_rate()
RETURNS DECIMAL AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    SELECT mechanic_referral_percent / 100.0
    INTO v_rate
    FROM platform_fee_settings
    WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
    LIMIT 1;

    -- Default to 2% if not set
    RETURN COALESCE(v_rate, 0.02);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_mechanic_referral_rate IS
'Returns current mechanic referral rate as decimal (e.g., 0.02 for 2%) from platform_fee_settings';

CREATE OR REPLACE FUNCTION get_current_workshop_escalation_rate()
RETURNS DECIMAL AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    SELECT workshop_escalation_referral_percent / 100.0
    INTO v_rate
    FROM platform_fee_settings
    WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
    LIMIT 1;

    -- Default to 5% if not set
    RETURN COALESCE(v_rate, 0.05);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_workshop_escalation_rate IS
'Returns current workshop escalation referral rate as decimal (e.g., 0.05 for 5%) from platform_fee_settings';

-- =====================================================
-- STEP 5: Function to calculate referral commission (dynamic)
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_referral_commission(
    p_bid_amount DECIMAL,
    p_referral_rate DECIMAL DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    -- Use provided rate or fetch from settings
    IF p_referral_rate IS NOT NULL THEN
        v_rate := p_referral_rate;
    ELSE
        v_rate := get_current_mechanic_referral_rate();
    END IF;

    -- Commission = bid amount × referral rate
    RETURN ROUND(p_bid_amount * v_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_referral_commission IS
'Calculates mechanic referral commission using dynamic rate from platform_fee_settings (or provided rate)';

-- =====================================================
-- STEP 6: Trigger to auto-create referral earnings when bid is accepted (DYNAMIC RATE)
-- =====================================================

CREATE OR REPLACE FUNCTION create_mechanic_referral_on_bid_accept()
RETURNS TRIGGER AS $$
DECLARE
    v_mechanic_id UUID;
    v_bid_amount DECIMAL;
    v_customer_id UUID;
    v_workshop_id UUID;
    v_diagnostic_session_id UUID;
    v_commission DECIMAL;
    v_referral_rate DECIMAL;
BEGIN
    -- Only process when bid status changes to 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN

        -- Get RFQ details including referring mechanic
        SELECT
            rfq.escalating_mechanic_id,
            rfq.customer_id,
            rfq.diagnostic_session_id,
            NEW.quote_amount,
            NEW.workshop_id
        INTO
            v_mechanic_id,
            v_customer_id,
            v_diagnostic_session_id,
            v_bid_amount,
            v_workshop_id
        FROM workshop_rfq_marketplace rfq
        WHERE rfq.id = NEW.rfq_marketplace_id;

        -- Only create referral if there was a referring mechanic
        IF v_mechanic_id IS NOT NULL THEN

            -- Get current referral rate from settings (DYNAMIC!)
            v_referral_rate := get_current_mechanic_referral_rate();

            -- Calculate commission using dynamic rate
            v_commission := calculate_referral_commission(v_bid_amount, v_referral_rate);

            -- Create referral earnings record
            INSERT INTO mechanic_referral_earnings (
                mechanic_id,
                rfq_id,
                diagnostic_session_id,
                customer_id,
                workshop_id,
                bid_id,
                bid_amount,
                referral_rate,
                commission_amount,
                status,
                metadata
            ) VALUES (
                v_mechanic_id,
                NEW.rfq_marketplace_id,
                v_diagnostic_session_id,
                v_customer_id,
                v_workshop_id,
                NEW.id,
                v_bid_amount,
                v_referral_rate,
                v_commission,
                'pending',
                jsonb_build_object(
                    'created_via', 'auto_trigger',
                    'bid_accepted_at', NOW(),
                    'rate_at_time_of_acceptance', v_referral_rate
                )
            )
            ON CONFLICT (rfq_id, mechanic_id) DO NOTHING; -- Prevent duplicates

            RAISE NOTICE 'Created referral earning: mechanic % earned $% (rate: % percent) from RFQ %',
                v_mechanic_id, v_commission, v_referral_rate * 100, NEW.rfq_marketplace_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_create_mechanic_referral ON workshop_rfq_bids;

CREATE TRIGGER trigger_create_mechanic_referral
    AFTER UPDATE OF status ON workshop_rfq_bids
    FOR EACH ROW
    EXECUTE FUNCTION create_mechanic_referral_on_bid_accept();

COMMENT ON TRIGGER trigger_create_mechanic_referral ON workshop_rfq_bids IS
'Automatically creates mechanic_referral_earnings entry when customer accepts a bid. Uses DYNAMIC rate from platform_fee_settings';

-- =====================================================
-- STEP 7: Update timestamp trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_mechanic_referral_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mechanic_referral_timestamp ON mechanic_referral_earnings;

CREATE TRIGGER trigger_update_mechanic_referral_timestamp
    BEFORE UPDATE ON mechanic_referral_earnings
    FOR EACH ROW
    EXECUTE FUNCTION update_mechanic_referral_timestamp();

-- =====================================================
-- STEP 8: View for mechanic referral dashboard
-- =====================================================

-- Drop existing view to avoid column name conflicts
DROP VIEW IF EXISTS mechanic_referral_summary CASCADE;

CREATE VIEW mechanic_referral_summary AS
SELECT
    m.id AS mechanic_id,
    m.user_id,

    -- Total statistics
    COUNT(mre.id) AS total_referrals,
    COUNT(mre.id) FILTER (WHERE mre.status = 'paid') AS paid_referrals,
    COUNT(mre.id) FILTER (WHERE mre.status = 'pending') AS pending_referrals,

    -- Financial statistics
    COALESCE(SUM(mre.commission_amount), 0) AS total_earned,
    COALESCE(SUM(mre.commission_amount) FILTER (WHERE mre.status = 'paid'), 0) AS total_paid,
    COALESCE(SUM(mre.commission_amount) FILTER (WHERE mre.status = 'pending'), 0) AS pending_earnings,

    -- Average commission and rate
    COALESCE(AVG(mre.commission_amount), 0) AS avg_commission,
    COALESCE(AVG(mre.referral_rate * 100), 0) AS avg_referral_rate_percent,

    -- Date range
    MIN(mre.earned_at) AS first_referral_date,
    MAX(mre.earned_at) AS last_referral_date

FROM mechanics m
LEFT JOIN mechanic_referral_earnings mre ON m.id = mre.mechanic_id
GROUP BY m.id, m.user_id;

COMMENT ON VIEW mechanic_referral_summary IS
'Summary view of mechanic referral earnings for dashboard display';

-- =====================================================
-- Migration Complete
-- =====================================================

DO $$
DECLARE
    v_current_rfq_rate DECIMAL;
    v_current_escalation_rate DECIMAL;
BEGIN
    SELECT mechanic_referral_percent, workshop_escalation_referral_percent
    INTO v_current_rfq_rate, v_current_escalation_rate
    FROM platform_fee_settings WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;

    RAISE NOTICE '✅ Dynamic Referral Fee System Installed';
    RAISE NOTICE '📊 Current Rates:';
    RAISE NOTICE '   - RFQ Marketplace Referral: % percent', v_current_rfq_rate;
    RAISE NOTICE '   - Workshop Escalation Referral: % percent', v_current_escalation_rate;
    RAISE NOTICE '🎛️  Admins can now adjust these rates via platform_fee_settings table';
    RAISE NOTICE '⚡ All new referrals will use the current rate at time of bid acceptance';
END $$;
