-- =====================================================
-- Remove Workshop Escalation 5% Fee
-- Created: 2025-11-12
-- Purpose: Remove invalid 5% escalation fee
--
-- Business Logic Clarification:
-- - Virtual mechanics: Get 2% referral when customer accepts RFQ bid
-- - Independent mechanics: Are owners, don't get referral (they own the business)
-- - Workshop employees: Are salaried, don't get referral (they're employees)
-- - Therefore: 5% workshop escalation fee is INVALID and should be removed
-- =====================================================

-- =====================================================
-- STEP 1: Remove workshop_escalation_referral_percent column
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'platform_fee_settings'
        AND column_name = 'workshop_escalation_referral_percent'
    ) THEN
        ALTER TABLE platform_fee_settings
        DROP COLUMN workshop_escalation_referral_percent;

        RAISE NOTICE '✅ Removed workshop_escalation_referral_percent column';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Drop workshop escalation rate function (if exists)
-- =====================================================

DROP FUNCTION IF EXISTS get_current_workshop_escalation_rate() CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Dropped get_current_workshop_escalation_rate() function';
END $$;

-- =====================================================
-- STEP 3: Update comments to clarify 2% is ONLY for virtual mechanics
-- =====================================================

COMMENT ON COLUMN platform_fee_settings.mechanic_referral_percent IS
'Percentage of bid amount paid to VIRTUAL mechanic when customer accepts RFQ bid (default 2%). Independent mechanics and workshop employees do NOT receive this fee.';

COMMENT ON TABLE mechanic_referral_earnings IS
'Tracks referral commissions earned by VIRTUAL mechanics ONLY when customers accept bids on RFQs. Independent mechanics (owners) and workshop employees (salaried) do NOT receive referrals.';

-- =====================================================
-- STEP 4: Add validation to mechanic_referral_earnings (if mechanic_type column exists)
-- =====================================================

-- Add function to validate only virtual mechanics get referrals
-- NOTE: This validation only works if mechanics.mechanic_type column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mechanics'
        AND column_name = 'mechanic_type'
    ) THEN
        -- Create validation function
        CREATE OR REPLACE FUNCTION validate_virtual_mechanic_referral()
        RETURNS TRIGGER AS $func$
        DECLARE
            v_mechanic_type TEXT;
        BEGIN
            -- Get mechanic type
            SELECT mechanic_type INTO v_mechanic_type
            FROM mechanics
            WHERE id = NEW.mechanic_id;

            -- Only virtual_only mechanics should get referrals
            IF v_mechanic_type != 'virtual_only' THEN
                RAISE EXCEPTION 'Only virtual_only mechanics can receive referral commissions. Mechanic type: %', v_mechanic_type;
            END IF;

            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        -- Drop existing trigger if exists
        DROP TRIGGER IF EXISTS trigger_validate_virtual_mechanic_referral ON mechanic_referral_earnings;

        -- Create trigger to enforce virtual-only referrals
        CREATE TRIGGER trigger_validate_virtual_mechanic_referral
            BEFORE INSERT ON mechanic_referral_earnings
            FOR EACH ROW
            EXECUTE FUNCTION validate_virtual_mechanic_referral();

        RAISE NOTICE '✅ Created validation trigger for virtual-only mechanic referrals';
    ELSE
        RAISE NOTICE '⚠️  Skipping validation trigger - mechanics.mechanic_type column does not exist yet';
    END IF;
END $$;

-- =====================================================
-- STEP 5: Update get_current_mechanic_referral_rate function comment
-- =====================================================

COMMENT ON FUNCTION get_current_mechanic_referral_rate IS
'Returns current VIRTUAL mechanic referral rate as decimal (e.g., 0.02 for 2%) from platform_fee_settings. Only applies to virtual_only mechanics.';

COMMENT ON FUNCTION calculate_referral_commission IS
'Calculates VIRTUAL mechanic referral commission using dynamic rate from platform_fee_settings. Only virtual_only mechanics are eligible.';

-- =====================================================
-- STEP 6: Clean up any existing invalid referrals (if any)
-- =====================================================

-- Find and report any non-virtual mechanics with referral earnings
-- Only run if mechanic_type column exists
DO $$
DECLARE
    invalid_count INTEGER;
    has_mechanic_type BOOLEAN;
BEGIN
    -- Check if mechanic_type column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mechanics'
        AND column_name = 'mechanic_type'
    ) INTO has_mechanic_type;

    IF has_mechanic_type THEN
        SELECT COUNT(*) INTO invalid_count
        FROM mechanic_referral_earnings mre
        JOIN mechanics m ON mre.mechanic_id = m.id
        WHERE m.mechanic_type != 'virtual_only';

        IF invalid_count > 0 THEN
            RAISE WARNING '⚠️  Found % invalid referral earnings for non-virtual mechanics. Review and clean up manually if needed.', invalid_count;
        ELSE
            RAISE NOTICE '✅ No invalid referral earnings found';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Skipping referral validation - mechanics.mechanic_type column does not exist yet';
    END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================

DO $$
DECLARE
    v_current_rfq_rate DECIMAL;
BEGIN
    SELECT mechanic_referral_percent
    INTO v_current_rfq_rate
    FROM platform_fee_settings
    WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;

    RAISE NOTICE '✅ Workshop Escalation 5%% Fee Removed';
    RAISE NOTICE '📊 Current Referral Fee (Virtual Mechanics Only): % percent', v_current_rfq_rate;
    RAISE NOTICE '🚫 Independent mechanics (owners) do NOT receive referrals';
    RAISE NOTICE '🚫 Workshop employees (salaried) do NOT receive referrals';
    RAISE NOTICE '✅ Only virtual_only mechanics receive 2%% referral commission';
END $$;
