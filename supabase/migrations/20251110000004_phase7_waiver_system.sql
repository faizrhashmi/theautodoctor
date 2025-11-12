-- Phase 7: Waiver Flow for Scheduled Sessions
-- Add columns needed for waiver tracking and no-show handling

-- 1. Add waiver tracking columns to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS waiver_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS waiver_signature TEXT,
ADD COLUMN IF NOT EXISTS waiver_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN sessions.waiver_signed_at IS 'Timestamp when customer signed the session waiver';
COMMENT ON COLUMN sessions.waiver_signature IS 'Customer digital signature (typed full name)';
COMMENT ON COLUMN sessions.waiver_reminder_sent_at IS 'Timestamp when 15-minute waiver reminder email was sent';
COMMENT ON COLUMN sessions.cancelled_at IS 'Timestamp when session was cancelled';
COMMENT ON COLUMN sessions.cancellation_reason IS 'Reason for cancellation (e.g., customer no-show)';

-- 2. Create mechanic_earnings table for tracking compensation
CREATE TABLE IF NOT EXISTS mechanic_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'session_payment', 'no_show_compensation', 'bonus', etc.
  status VARCHAR(50) NOT NULL DEFAULT 'pending_payout', -- 'pending_payout', 'paid', 'cancelled'
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance (check if columns exist first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mechanic_earnings' AND column_name = 'mechanic_user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_mechanic_user_id ON mechanic_earnings(mechanic_user_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mechanic_earnings' AND column_name = 'mechanic_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_mechanic_id ON mechanic_earnings(mechanic_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mechanic_earnings' AND column_name = 'session_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_session_id ON mechanic_earnings(session_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mechanic_earnings' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_status ON mechanic_earnings(status);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mechanic_earnings' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_created_at ON mechanic_earnings(created_at);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE mechanic_earnings IS 'Tracks mechanic earnings including session payments and no-show compensation';

-- 3. Create customer_credits table for tracking account credits
CREATE TABLE IF NOT EXISTS customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'no_show_credit', 'refund', 'promotional', etc.
  status VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'used', 'expired'
  used_at TIMESTAMPTZ,
  used_for_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_credits_customer_user_id ON customer_credits(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_session_id ON customer_credits(session_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_status ON customer_credits(status);
CREATE INDEX IF NOT EXISTS idx_customer_credits_expires_at ON customer_credits(expires_at);

-- Add comment
COMMENT ON TABLE customer_credits IS 'Tracks customer account credits from refunds and no-show policies';

-- 4. Add status for scheduled sessions waiting for waiver
-- Update existing sessions status enum if needed (this is informational - adjust if using enums)
COMMENT ON COLUMN sessions.status IS 'Session status: pending, waiting (waiver signed), live, completed, cancelled, cancelled_no_show';

-- 5. Enable RLS (Row Level Security) policies

-- mechanic_earnings policies
ALTER TABLE mechanic_earnings ENABLE ROW LEVEL SECURITY;

-- Mechanics can view their own earnings (conditional based on column existence)
DO $$
BEGIN
  -- Drop policy if it exists
  DROP POLICY IF EXISTS mechanic_earnings_select_own ON mechanic_earnings;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mechanic_earnings' AND column_name = 'mechanic_user_id') THEN
    EXECUTE 'CREATE POLICY mechanic_earnings_select_own ON mechanic_earnings
      FOR SELECT
      USING (mechanic_user_id = auth.uid())';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'mechanic_earnings' AND column_name = 'mechanic_id') THEN
    EXECUTE 'CREATE POLICY mechanic_earnings_select_own ON mechanic_earnings
      FOR SELECT
      USING (mechanic_id = auth.uid())';
  END IF;
END $$;

-- Only system (service role) can insert/update earnings
DROP POLICY IF EXISTS mechanic_earnings_insert_system ON mechanic_earnings;
CREATE POLICY mechanic_earnings_insert_system ON mechanic_earnings
  FOR INSERT
  WITH CHECK (false); -- Only service role can insert

DROP POLICY IF EXISTS mechanic_earnings_update_system ON mechanic_earnings;
CREATE POLICY mechanic_earnings_update_system ON mechanic_earnings
  FOR UPDATE
  USING (false); -- Only service role can update

-- customer_credits policies
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;

-- Customers can view their own credits (conditional based on column existence)
DO $$
BEGIN
  -- Drop policy if it exists
  DROP POLICY IF EXISTS customer_credits_select_own ON customer_credits;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'customer_credits' AND column_name = 'customer_user_id') THEN
    EXECUTE 'CREATE POLICY customer_credits_select_own ON customer_credits
      FOR SELECT
      USING (customer_user_id = auth.uid())';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'customer_credits' AND column_name = 'customer_id') THEN
    EXECUTE 'CREATE POLICY customer_credits_select_own ON customer_credits
      FOR SELECT
      USING (customer_id = auth.uid())';
  END IF;
END $$;

-- Only system (service role) can insert/update credits
DROP POLICY IF EXISTS customer_credits_insert_system ON customer_credits;
CREATE POLICY customer_credits_insert_system ON customer_credits
  FOR INSERT
  WITH CHECK (false); -- Only service role can insert

DROP POLICY IF EXISTS customer_credits_update_system ON customer_credits;
CREATE POLICY customer_credits_update_system ON customer_credits
  FOR UPDATE
  USING (false); -- Only service role can update

-- 6. Add index on sessions for waiver reminder queries
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_waiver ON sessions(scheduled_for, status, waiver_signed_at)
  WHERE status = 'scheduled' AND waiver_signed_at IS NULL;

-- 7. Add updated_at trigger for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mechanic_earnings_updated_at
  BEFORE UPDATE ON mechanic_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_credits_updated_at
  BEFORE UPDATE ON customer_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Create notification type for waiver signed (optional - if notifications table exists)
-- This allows mechanics to receive notifications when customers sign waivers
-- Assumes a notifications table exists with similar structure
