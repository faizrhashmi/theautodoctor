-- ✅ WAITLIST SYSTEM: Create customer_waitlist table
-- Tracks customers waiting for mechanics to come online
-- When a mechanic clocks in, customers on waitlist are notified

CREATE TABLE IF NOT EXISTS customer_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'mechanic_online',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_customer_waitlist_customer_id ON customer_waitlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_waitlist_status ON customer_waitlist(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_customer_waitlist_expires ON customer_waitlist(expires_at) WHERE status = 'pending';

-- Row Level Security
ALTER TABLE customer_waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own waitlist entries
CREATE POLICY customer_waitlist_select_own ON customer_waitlist
  FOR SELECT
  USING (customer_id = auth.uid());

-- Policy: Customers can insert their own waitlist entries
CREATE POLICY customer_waitlist_insert_own ON customer_waitlist
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Policy: Customers can delete their own waitlist entries (cancel waitlist)
CREATE POLICY customer_waitlist_delete_own ON customer_waitlist
  FOR DELETE
  USING (customer_id = auth.uid());

-- Policy: System can update any waitlist entry (for notification tracking)
CREATE POLICY customer_waitlist_update_system ON customer_waitlist
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to auto-expire old waitlist entries
CREATE OR REPLACE FUNCTION expire_old_waitlist_entries()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE customer_waitlist
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

-- Optional: Add trigger to auto-expire on SELECT (not recommended for production, use cron instead)
-- COMMENT: In production, call expire_old_waitlist_entries() from a scheduled job

COMMENT ON TABLE customer_waitlist IS 'Tracks customers waiting for mechanics to come online';
COMMENT ON COLUMN customer_waitlist.notification_type IS 'Type of notification: mechanic_online, mechanic_available, etc.';
COMMENT ON COLUMN customer_waitlist.status IS 'Status: pending, notified, expired, cancelled';
COMMENT ON COLUMN customer_waitlist.metadata IS 'Additional context: source, mechanic preferences, etc.';
COMMENT ON COLUMN customer_waitlist.expires_at IS 'Waitlist entry auto-expires after 24 hours';
