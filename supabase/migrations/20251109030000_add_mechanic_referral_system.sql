-- =====================================================
-- Mechanic Referral System Migration
-- =====================================================
--
-- Purpose: Enable virtual mechanics to earn 2% referral commission
--          when they help customers create RFQs that result in accepted bids
--
-- Flow:
-- 1. Mechanic completes diagnostic session
-- 2. Mechanic creates DRAFT RFQ on behalf of customer
-- 3. Customer reviews and submits RFQ to marketplace
-- 4. Workshops bid on RFQ
-- 5. Customer accepts a bid
-- 6. Mechanic earns 2% referral commission (deducted from platform fee)
--
-- Date: 2025-01-09
-- =====================================================

-- =====================================================
-- STEP 1: Add draft status and referring_mechanic_id to RFQ table
-- =====================================================

-- Add draft status to RFQ marketplace
ALTER TABLE workshop_rfq_marketplace
ADD COLUMN IF NOT EXISTS rfq_status TEXT DEFAULT 'active' CHECK (rfq_status IN ('draft', 'active', 'bidding', 'accepted', 'completed', 'expired', 'cancelled'));

-- Update existing records to 'active' status
UPDATE workshop_rfq_marketplace
SET rfq_status = 'active'
WHERE rfq_status IS NULL;

-- Add referring_mechanic_id (nullable - only set when mechanic creates draft)
-- Note: escalating_mechanic_id already exists and serves the same purpose
-- We'll use escalating_mechanic_id for tracking referrals

-- Add metadata column if it doesn't exist (for tracking referral source)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workshop_rfq_marketplace'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE workshop_rfq_marketplace
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

COMMENT ON COLUMN workshop_rfq_marketplace.escalating_mechanic_id IS
'Mechanic who created this RFQ (NULL for customer-direct). Used for 2% referral commission tracking.';

COMMENT ON COLUMN workshop_rfq_marketplace.rfq_status IS
'RFQ lifecycle status: draft (mechanic created, awaiting customer review), active (in marketplace), bidding (has bids), accepted (customer chose bid), completed (work done), expired, cancelled';

-- =====================================================
-- STEP 2: Create mechanic_referral_earnings table
-- =====================================================

CREATE TABLE IF NOT EXISTS mechanic_referral_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

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
    referral_rate DECIMAL(5,4) NOT NULL DEFAULT 0.02 CHECK (referral_rate >= 0 AND referral_rate <= 1),
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
'Tracks 2% referral commissions earned by virtual mechanics when customers accept bids on RFQs the mechanic helped create';

-- =====================================================
-- STEP 3: Function to calculate referral commission
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_referral_commission(
    p_bid_amount DECIMAL,
    p_referral_rate DECIMAL DEFAULT 0.02
) RETURNS DECIMAL AS $$
BEGIN
    -- Commission = bid amount × referral rate
    -- Platform fee is 30%, so 2% comes from platform's share
    RETURN ROUND(p_bid_amount * p_referral_rate, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_referral_commission IS
'Calculates mechanic referral commission (default 2% of bid amount). Commission is deducted from platform fee, not customer price.';

-- =====================================================
-- STEP 4: Trigger to auto-create referral earnings when bid is accepted
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
BEGIN
    -- Only process when bid status changes to 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN

        -- Get RFQ details including referring mechanic
        SELECT
            rfq.escalating_mechanic_id,
            rfq.customer_id,
            rfq.diagnostic_session_id,
            NEW.quote_amount,
            bid.workshop_id
        INTO
            v_mechanic_id,
            v_customer_id,
            v_diagnostic_session_id,
            v_bid_amount,
            v_workshop_id
        FROM workshop_rfq_marketplace rfq
        JOIN workshop_rfq_bids bid ON bid.rfq_id = rfq.id
        WHERE rfq.id = NEW.rfq_id
        AND bid.id = NEW.id;

        -- Only create referral if there was a referring mechanic
        IF v_mechanic_id IS NOT NULL THEN

            -- Calculate commission
            v_commission := calculate_referral_commission(v_bid_amount);

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
                NEW.rfq_id,
                v_diagnostic_session_id,
                v_customer_id,
                v_workshop_id,
                NEW.id,
                v_bid_amount,
                0.02, -- 2%
                v_commission,
                'pending',
                jsonb_build_object(
                    'created_via', 'auto_trigger',
                    'bid_accepted_at', NOW()
                )
            )
            ON CONFLICT (rfq_id, mechanic_id) DO NOTHING; -- Prevent duplicates

            RAISE NOTICE 'Created referral earning: mechanic % earned $% from RFQ %',
                v_mechanic_id, v_commission, NEW.rfq_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on workshop_rfq_bids table
DROP TRIGGER IF EXISTS trigger_create_mechanic_referral ON workshop_rfq_bids;
CREATE TRIGGER trigger_create_mechanic_referral
    AFTER UPDATE OF status ON workshop_rfq_bids
    FOR EACH ROW
    EXECUTE FUNCTION create_mechanic_referral_on_bid_accept();

COMMENT ON TRIGGER trigger_create_mechanic_referral ON workshop_rfq_bids IS
'Automatically creates mechanic_referral_earnings entry when customer accepts a bid on an RFQ created by a mechanic';

-- =====================================================
-- STEP 5: Update timestamp trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_mechanic_referral_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mechanic_referral_timestamp
    BEFORE UPDATE ON mechanic_referral_earnings
    FOR EACH ROW
    EXECUTE FUNCTION update_mechanic_referral_timestamp();

-- =====================================================
-- STEP 6: View for mechanic referral dashboard
-- =====================================================

CREATE OR REPLACE VIEW mechanic_referral_summary AS
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

    -- Average commission
    COALESCE(AVG(mre.commission_amount), 0) AS avg_commission,

    -- Date range
    MIN(mre.earned_at) AS first_referral_date,
    MAX(mre.earned_at) AS last_referral_date

FROM mechanics m
LEFT JOIN mechanic_referral_earnings mre ON m.id = mre.mechanic_id
GROUP BY m.id, m.user_id;

COMMENT ON VIEW mechanic_referral_summary IS
'Summary view of mechanic referral earnings for dashboard display';

-- =====================================================
-- STEP 7: Sample data comment (for testing)
-- =====================================================

COMMENT ON TABLE mechanic_referral_earnings IS
'Example data flow:
1. Virtual mechanic (ID: abc) completes diagnostic with customer (ID: 123)
2. Mechanic creates draft RFQ with escalating_mechanic_id = abc
3. Customer reviews and submits RFQ to marketplace (status: draft → active)
4. Workshop bids $1000
5. Customer accepts bid
6. Trigger fires → creates mechanic_referral_earnings entry:
   - mechanic_id: abc
   - bid_amount: 1000.00
   - commission_amount: 20.00 (2%)
   - status: pending
7. Admin/system marks as paid → status: paid, paid_at: timestamp';
