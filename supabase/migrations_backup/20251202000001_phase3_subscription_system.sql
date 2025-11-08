-- Phase 3: Subscription System
-- Creates customer_subscriptions and credit_transactions tables
-- Migration date: 2025-12-02

-- ============================================================================
-- PART 1: Create customer_subscriptions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES service_plans(id),

  -- Stripe Integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Subscription Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'expired')),

  -- Credit Balance
  current_credits INTEGER NOT NULL DEFAULT 0,
  total_credits_allocated INTEGER NOT NULL DEFAULT 0, -- Lifetime total
  credits_used INTEGER NOT NULL DEFAULT 0, -- Lifetime used

  -- Billing
  billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  billing_cycle_end TIMESTAMPTZ NOT NULL,
  next_billing_date TIMESTAMPTZ,

  -- Cancellation
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Metadata
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_billing_cycle CHECK (billing_cycle_end > billing_cycle_start),
  CONSTRAINT valid_credits CHECK (current_credits >= 0)
);

-- Indexes for performance
CREATE INDEX idx_customer_subscriptions_customer ON customer_subscriptions(customer_id);
CREATE INDEX idx_customer_subscriptions_status ON customer_subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_customer_subscriptions_stripe ON customer_subscriptions(stripe_subscription_id);
CREATE INDEX idx_customer_subscriptions_billing ON customer_subscriptions(next_billing_date) WHERE status = 'active';

-- Enable RLS
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own subscriptions
CREATE POLICY "Customers can view own subscriptions"
  ON customer_subscriptions
  FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can update their own subscription settings (cancel, pause)
CREATE POLICY "Customers can update own subscriptions"
  ON customer_subscriptions
  FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Only service role can insert/delete subscriptions
CREATE POLICY "Service role can manage subscriptions"
  ON customer_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated trigger
CREATE OR REPLACE FUNCTION update_customer_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_subscriptions_updated_at
  BEFORE UPDATE ON customer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_subscriptions_updated_at();

COMMENT ON TABLE customer_subscriptions IS 'Customer subscription plans with credit balance tracking';

-- ============================================================================
-- PART 2: Create credit_transactions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES customer_subscriptions(id) ON DELETE SET NULL,

  -- Transaction Details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'allocation',      -- Monthly credit grant
    'rollover',        -- Credits rolled over from previous month
    'deduction',       -- Credits used for a session
    'refund',          -- Credits refunded (canceled session)
    'adjustment',      -- Manual adjustment by admin
    'expiration'       -- Credits expired
  )),

  amount INTEGER NOT NULL, -- Positive for credits added, negative for deductions
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),

  -- Context
  related_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  session_type TEXT, -- quick, video, diagnostic
  description TEXT,

  -- Metadata
  performed_by UUID REFERENCES profiles(id), -- For admin adjustments
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_credit_transactions_customer ON credit_transactions(customer_id, created_at DESC);
CREATE INDEX idx_credit_transactions_subscription ON credit_transactions(subscription_id);
CREATE INDEX idx_credit_transactions_session ON credit_transactions(related_session_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type, created_at DESC);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own transactions
CREATE POLICY "Customers can view own credit transactions"
  ON credit_transactions
  FOR SELECT
  USING (customer_id = auth.uid());

-- Only service role can insert transactions
CREATE POLICY "Service role can manage credit transactions"
  ON credit_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE credit_transactions IS 'Ledger of all credit allocations, deductions, and adjustments';

-- ============================================================================
-- PART 3: Helper Functions
-- ============================================================================

-- Function to get customer's current credit balance
CREATE OR REPLACE FUNCTION get_customer_credit_balance(
  p_customer_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT current_credits INTO v_balance
  FROM customer_subscriptions
  WHERE customer_id = p_customer_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_customer_credit_balance IS 'Returns the current credit balance for an active subscription';

-- Function to deduct credits for a session
CREATE OR REPLACE FUNCTION deduct_session_credits(
  p_customer_id UUID,
  p_session_id UUID,
  p_session_type TEXT,
  p_is_specialist BOOLEAN,
  p_credit_cost INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get active subscription
  SELECT id, current_credits INTO v_subscription_id, v_current_balance
  FROM customer_subscriptions
  WHERE customer_id = p_customer_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE; -- Lock row for update

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for customer %', p_customer_id;
  END IF;

  IF v_current_balance < p_credit_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Available: %, Required: %', v_current_balance, p_credit_cost;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_credit_cost;

  -- Update subscription balance
  UPDATE customer_subscriptions
  SET
    current_credits = v_new_balance,
    credits_used = credits_used + p_credit_cost,
    updated_at = NOW()
  WHERE id = v_subscription_id;

  -- Record transaction
  INSERT INTO credit_transactions (
    customer_id,
    subscription_id,
    transaction_type,
    amount,
    balance_after,
    related_session_id,
    session_type,
    description
  ) VALUES (
    p_customer_id,
    v_subscription_id,
    'deduction',
    -p_credit_cost,
    v_new_balance,
    p_session_id,
    p_session_type,
    format('Deducted %s credits for %s session with %s',
      p_credit_cost,
      p_session_type,
      CASE WHEN p_is_specialist THEN 'brand specialist' ELSE 'standard mechanic' END
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deduct_session_credits IS 'Deducts credits for a session and records transaction';

-- Function to refund credits for canceled session
CREATE OR REPLACE FUNCTION refund_session_credits(
  p_customer_id UUID,
  p_session_id UUID,
  p_credit_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get active subscription
  SELECT id, current_credits INTO v_subscription_id, v_current_balance
  FROM customer_subscriptions
  WHERE customer_id = p_customer_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for customer %', p_customer_id;
  END IF;

  v_new_balance := v_current_balance + p_credit_amount;

  -- Update subscription balance
  UPDATE customer_subscriptions
  SET
    current_credits = v_new_balance,
    credits_used = GREATEST(0, credits_used - p_credit_amount),
    updated_at = NOW()
  WHERE id = v_subscription_id;

  -- Record transaction
  INSERT INTO credit_transactions (
    customer_id,
    subscription_id,
    transaction_type,
    amount,
    balance_after,
    related_session_id,
    description
  ) VALUES (
    p_customer_id,
    v_subscription_id,
    'refund',
    p_credit_amount,
    v_new_balance,
    p_session_id,
    format('Refunded %s credits for canceled session', p_credit_amount)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refund_session_credits IS 'Refunds credits for a canceled session';

-- Function to allocate monthly credits
CREATE OR REPLACE FUNCTION allocate_monthly_credits(
  p_subscription_id UUID,
  p_credit_amount INTEGER,
  p_is_rollover BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  v_customer_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get subscription details
  SELECT customer_id, current_credits INTO v_customer_id, v_current_balance
  FROM customer_subscriptions
  WHERE id = p_subscription_id
    AND status = 'active'
  FOR UPDATE;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Subscription % not found or not active', p_subscription_id;
  END IF;

  v_new_balance := v_current_balance + p_credit_amount;

  -- Update subscription
  UPDATE customer_subscriptions
  SET
    current_credits = v_new_balance,
    total_credits_allocated = total_credits_allocated + p_credit_amount,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  -- Record transaction
  INSERT INTO credit_transactions (
    customer_id,
    subscription_id,
    transaction_type,
    amount,
    balance_after,
    description
  ) VALUES (
    v_customer_id,
    p_subscription_id,
    CASE WHEN p_is_rollover THEN 'rollover' ELSE 'allocation' END,
    p_credit_amount,
    v_new_balance,
    CASE
      WHEN p_is_rollover THEN format('Rolled over %s credits from previous month', p_credit_amount)
      ELSE format('Monthly allocation of %s credits', p_credit_amount)
    END
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION allocate_monthly_credits IS 'Allocates monthly credits to a subscription';

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Phase 3: Subscription System migration completed successfully!' AS status;
