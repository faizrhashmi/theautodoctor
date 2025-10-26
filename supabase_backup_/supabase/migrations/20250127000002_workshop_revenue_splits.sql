-- =====================================================
-- Migration: Workshop Revenue Splits (Priority 3)
-- =====================================================
-- Purpose: Enable Stripe Connect for workshops and revenue tracking
-- Date: 2025-01-27
-- Dependencies: 20250127000001_smart_session_routing.sql
-- =====================================================

-- 1. Add Stripe Connect fields to organizations table
-- =====================================================

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT UNIQUE;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS platform_fee_percentage NUMERIC(5, 2) DEFAULT 20.00
  CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 100);

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS custom_fee_agreement BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.organizations.stripe_connect_account_id IS 'Stripe Connect Express account ID for receiving payouts';
COMMENT ON COLUMN public.organizations.stripe_onboarding_completed IS 'Whether workshop completed Stripe onboarding';
COMMENT ON COLUMN public.organizations.stripe_charges_enabled IS 'Whether workshop can receive charges';
COMMENT ON COLUMN public.organizations.stripe_payouts_enabled IS 'Whether workshop can receive payouts';
COMMENT ON COLUMN public.organizations.stripe_details_submitted IS 'Whether workshop submitted all required Stripe details';
COMMENT ON COLUMN public.organizations.platform_fee_percentage IS 'Platform fee percentage (default 20%)';
COMMENT ON COLUMN public.organizations.custom_fee_agreement IS 'Whether workshop has custom fee agreement';

-- 2. Create workshop_earnings table to track revenue
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workshop_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  workshop_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  session_request_id UUID REFERENCES public.session_requests(id) ON DELETE SET NULL,
  mechanic_id UUID REFERENCES public.mechanics(id) ON DELETE SET NULL,
  payment_intent_id TEXT,

  -- Financial details
  gross_amount_cents INTEGER NOT NULL CHECK (gross_amount_cents >= 0),
  platform_fee_cents INTEGER NOT NULL CHECK (platform_fee_cents >= 0),
  workshop_net_cents INTEGER NOT NULL CHECK (workshop_net_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Metadata
  platform_fee_percentage NUMERIC(5, 2) NOT NULL,
  description TEXT,

  -- Payout tracking
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
  payout_id TEXT, -- Stripe payout/transfer ID
  payout_date TIMESTAMPTZ,
  payout_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workshop_earnings_workshop_id_idx ON public.workshop_earnings(workshop_id);
CREATE INDEX IF NOT EXISTS workshop_earnings_session_id_idx ON public.workshop_earnings(session_id);
CREATE INDEX IF NOT EXISTS workshop_earnings_payout_status_idx ON public.workshop_earnings(payout_status);
CREATE INDEX IF NOT EXISTS workshop_earnings_created_at_idx ON public.workshop_earnings(created_at DESC);
CREATE INDEX IF NOT EXISTS workshop_earnings_payment_intent_idx ON public.workshop_earnings(payment_intent_id) WHERE payment_intent_id IS NOT NULL;

COMMENT ON TABLE public.workshop_earnings IS 'Tracks earnings and revenue splits for workshop sessions';

-- 3. Create mechanic_earnings table (for workshop mechanics)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mechanic_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL, -- NULL for independent mechanics
  workshop_earning_id UUID REFERENCES public.workshop_earnings(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  payment_intent_id TEXT,

  -- Financial details
  gross_amount_cents INTEGER NOT NULL CHECK (gross_amount_cents >= 0),
  mechanic_net_cents INTEGER NOT NULL CHECK (mechanic_net_cents >= 0),
  workshop_fee_cents INTEGER DEFAULT 0 CHECK (workshop_fee_cents >= 0),
  platform_fee_cents INTEGER DEFAULT 0 CHECK (platform_fee_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Metadata
  description TEXT,
  is_workshop_mechanic BOOLEAN DEFAULT FALSE,

  -- Payout tracking
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
  payout_id TEXT,
  payout_date TIMESTAMPTZ,
  payout_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mechanic_earnings_mechanic_id_idx ON public.mechanic_earnings(mechanic_id);
CREATE INDEX IF NOT EXISTS mechanic_earnings_workshop_id_idx ON public.mechanic_earnings(workshop_id) WHERE workshop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mechanic_earnings_session_id_idx ON public.mechanic_earnings(session_id);
CREATE INDEX IF NOT EXISTS mechanic_earnings_payout_status_idx ON public.mechanic_earnings(payout_status);
CREATE INDEX IF NOT EXISTS mechanic_earnings_created_at_idx ON public.mechanic_earnings(created_at DESC);

COMMENT ON TABLE public.mechanic_earnings IS 'Tracks individual mechanic earnings from sessions';

-- 4. Create revenue split calculation function
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_revenue_split(
  p_gross_amount_cents INTEGER,
  p_workshop_id UUID,
  p_mechanic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  platform_fee_cents INTEGER,
  workshop_net_cents INTEGER,
  mechanic_net_cents INTEGER,
  workshop_fee_cents INTEGER,
  platform_fee_percentage NUMERIC,
  split_type TEXT
) AS $$
DECLARE
  v_platform_fee_pct NUMERIC;
  v_platform_fee INTEGER;
  v_workshop_net INTEGER;
  v_mechanic_net INTEGER;
  v_workshop_fee INTEGER;
  v_is_workshop_mechanic BOOLEAN;
  v_split_type TEXT;
BEGIN
  -- Get workshop's platform fee percentage
  SELECT
    COALESCE(o.platform_fee_percentage, 20.00)
  INTO v_platform_fee_pct
  FROM public.organizations o
  WHERE o.id = p_workshop_id;

  -- If no workshop, use default platform fee of 20%
  IF v_platform_fee_pct IS NULL THEN
    v_platform_fee_pct := 20.00;
  END IF;

  -- Calculate platform fee (rounded)
  v_platform_fee := ROUND(p_gross_amount_cents * (v_platform_fee_pct / 100.0));

  -- Check if mechanic belongs to workshop
  IF p_mechanic_id IS NOT NULL THEN
    SELECT (m.workshop_id = p_workshop_id)
    INTO v_is_workshop_mechanic
    FROM public.mechanics m
    WHERE m.id = p_mechanic_id;
  ELSE
    v_is_workshop_mechanic := FALSE;
  END IF;

  -- Scenario 1: Workshop mechanic performs session
  IF v_is_workshop_mechanic THEN
    v_split_type := 'workshop_mechanic';
    -- Workshop gets everything after platform fee
    v_workshop_net := p_gross_amount_cents - v_platform_fee;
    -- Mechanic payment handled separately by workshop (out of their net)
    v_mechanic_net := 0;
    v_workshop_fee := 0;

  -- Scenario 2: Independent mechanic (no workshop involved)
  ELSIF p_workshop_id IS NULL THEN
    v_split_type := 'independent_mechanic';
    -- No workshop, mechanic gets everything after platform fee
    v_workshop_net := 0;
    v_mechanic_net := p_gross_amount_cents - v_platform_fee;
    v_workshop_fee := 0;

  -- Scenario 3: Customer selected workshop but different mechanic accepted (hybrid routing)
  ELSE
    v_split_type := 'cross_workshop';
    -- Workshop still gets a referral fee (e.g., 10% of gross)
    v_workshop_fee := ROUND(p_gross_amount_cents * 0.10);
    v_workshop_net := v_workshop_fee;
    -- Mechanic gets remainder after platform fee and workshop referral
    v_mechanic_net := p_gross_amount_cents - v_platform_fee - v_workshop_fee;
  END IF;

  RETURN QUERY SELECT
    v_platform_fee,
    v_workshop_net,
    v_mechanic_net,
    v_workshop_fee,
    v_platform_fee_pct,
    v_split_type;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_revenue_split IS 'Calculates platform fee, workshop share, and mechanic share';

-- 5. Create function to record earnings after session completion
-- =====================================================

CREATE OR REPLACE FUNCTION record_session_earnings(
  p_session_id UUID,
  p_payment_intent_id TEXT,
  p_amount_cents INTEGER
)
RETURNS void AS $$
DECLARE
  v_workshop_id UUID;
  v_mechanic_id UUID;
  v_request_id UUID;
  v_split RECORD;
  v_workshop_earning_id UUID;
BEGIN
  -- Get session details
  SELECT
    sr.workshop_id,
    sr.mechanic_id,
    sr.id
  INTO
    v_workshop_id,
    v_mechanic_id,
    v_request_id
  FROM public.session_requests sr
  WHERE sr.id = (
    SELECT sr2.id
    FROM public.session_requests sr2
    WHERE sr2.customer_id = (SELECT customer_user_id FROM public.sessions WHERE id = p_session_id)
    ORDER BY sr2.created_at DESC
    LIMIT 1
  );

  -- Calculate revenue split
  SELECT * INTO v_split
  FROM calculate_revenue_split(p_amount_cents, v_workshop_id, v_mechanic_id);

  -- Record workshop earning (if workshop involved)
  IF v_workshop_id IS NOT NULL AND v_split.workshop_net_cents > 0 THEN
    INSERT INTO public.workshop_earnings (
      workshop_id,
      session_id,
      session_request_id,
      mechanic_id,
      payment_intent_id,
      gross_amount_cents,
      platform_fee_cents,
      workshop_net_cents,
      platform_fee_percentage,
      description
    ) VALUES (
      v_workshop_id,
      p_session_id,
      v_request_id,
      v_mechanic_id,
      p_payment_intent_id,
      p_amount_cents,
      v_split.platform_fee_cents,
      v_split.workshop_net_cents,
      v_split.platform_fee_percentage,
      CONCAT('Session ', p_session_id::TEXT, ' - ', v_split.split_type)
    )
    RETURNING id INTO v_workshop_earning_id;
  END IF;

  -- Record mechanic earning (if mechanic should receive direct payment)
  IF v_mechanic_id IS NOT NULL AND v_split.mechanic_net_cents > 0 THEN
    INSERT INTO public.mechanic_earnings (
      mechanic_id,
      workshop_id,
      workshop_earning_id,
      session_id,
      payment_intent_id,
      gross_amount_cents,
      mechanic_net_cents,
      workshop_fee_cents,
      platform_fee_cents,
      description,
      is_workshop_mechanic
    ) VALUES (
      v_mechanic_id,
      v_workshop_id,
      v_workshop_earning_id,
      p_session_id,
      p_payment_intent_id,
      p_amount_cents,
      v_split.mechanic_net_cents,
      v_split.workshop_fee_cents,
      v_split.platform_fee_cents,
      CONCAT('Session ', p_session_id::TEXT, ' - ', v_split.split_type),
      (v_split.split_type = 'workshop_mechanic')
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_session_earnings IS 'Records earnings for workshop and/or mechanic after session completion';

-- 6. Create views for earnings dashboards
-- =====================================================

CREATE OR REPLACE VIEW public.workshop_earnings_summary AS
SELECT
  o.id as workshop_id,
  o.name as workshop_name,
  COUNT(DISTINCT we.id) as total_sessions,
  SUM(we.gross_amount_cents)::BIGINT as total_gross_cents,
  SUM(we.platform_fee_cents)::BIGINT as total_platform_fee_cents,
  SUM(we.workshop_net_cents)::BIGINT as total_net_cents,
  SUM(CASE WHEN we.payout_status = 'paid' THEN we.workshop_net_cents ELSE 0 END)::BIGINT as paid_out_cents,
  SUM(CASE WHEN we.payout_status = 'pending' THEN we.workshop_net_cents ELSE 0 END)::BIGINT as pending_payout_cents,
  AVG(we.platform_fee_percentage) as avg_platform_fee_percentage,
  MIN(we.created_at) as first_earning_date,
  MAX(we.created_at) as last_earning_date
FROM public.organizations o
LEFT JOIN public.workshop_earnings we ON we.workshop_id = o.id
WHERE o.organization_type = 'workshop'
GROUP BY o.id, o.name;

COMMENT ON VIEW public.workshop_earnings_summary IS 'Summary of workshop earnings and payouts';

CREATE OR REPLACE VIEW public.mechanic_earnings_summary AS
SELECT
  m.id as mechanic_id,
  m.name as mechanic_name,
  m.email as mechanic_email,
  m.workshop_id,
  o.name as workshop_name,
  COUNT(DISTINCT me.id) as total_sessions,
  SUM(me.gross_amount_cents)::BIGINT as total_gross_cents,
  SUM(me.mechanic_net_cents)::BIGINT as total_net_cents,
  SUM(me.platform_fee_cents)::BIGINT as total_platform_fee_cents,
  SUM(me.workshop_fee_cents)::BIGINT as total_workshop_fee_cents,
  SUM(CASE WHEN me.payout_status = 'paid' THEN me.mechanic_net_cents ELSE 0 END)::BIGINT as paid_out_cents,
  SUM(CASE WHEN me.payout_status = 'pending' THEN me.mechanic_net_cents ELSE 0 END)::BIGINT as pending_payout_cents,
  MIN(me.created_at) as first_earning_date,
  MAX(me.created_at) as last_earning_date
FROM public.mechanics m
LEFT JOIN public.mechanic_earnings me ON me.mechanic_id = m.id
LEFT JOIN public.organizations o ON m.workshop_id = o.id
GROUP BY m.id, m.name, m.email, m.workshop_id, o.name;

COMMENT ON VIEW public.mechanic_earnings_summary IS 'Summary of mechanic earnings and payouts';

-- 7. Create trigger to update timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workshop_earnings_updated_at
  BEFORE UPDATE ON public.workshop_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER mechanic_earnings_updated_at
  BEFORE UPDATE ON public.mechanic_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 8. Migration complete
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Workshop Revenue Splits migration complete!';
  RAISE NOTICE 'Added Stripe Connect fields to organizations table';
  RAISE NOTICE 'Created tables: workshop_earnings, mechanic_earnings';
  RAISE NOTICE 'Created function: calculate_revenue_split()';
  RAISE NOTICE 'Created function: record_session_earnings()';
  RAISE NOTICE 'Created views: workshop_earnings_summary, mechanic_earnings_summary';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Next steps:';
  RAISE NOTICE '1. Implement workshop Stripe Connect onboarding API';
  RAISE NOTICE '2. Update session completion to call record_session_earnings()';
  RAISE NOTICE '3. Implement payout processing (manual or automated)';
  RAISE NOTICE '4. Create workshop/mechanic earnings dashboards';
END $$;
