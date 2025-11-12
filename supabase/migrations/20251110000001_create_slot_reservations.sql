-- =====================================================
-- SLOT RESERVATIONS TABLE
-- Purpose: Prevent double-booking by reserving time slots during checkout
-- Author: Claude (Scheduling System Implementation)
-- Date: 2025-11-10
-- =====================================================

-- Create slot_reservations table
CREATE TABLE IF NOT EXISTS slot_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  mechanic_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Time slot details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'reserved',
  -- Values: 'reserved' | 'confirmed' | 'expired' | 'cancelled'

  -- Expiration (auto-expire after 15 minutes if not confirmed)
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,

  -- Metadata for debugging/tracking
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_status CHECK (status IN ('reserved', 'confirmed', 'expired', 'cancelled'))
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup: Get reservations by mechanic and time
CREATE INDEX idx_slot_reservations_mechanic_time
  ON slot_reservations(mechanic_id, start_time)
  WHERE status IN ('reserved', 'confirmed');

-- Find expired reservations (for cleanup cron job)
CREATE INDEX idx_slot_reservations_expires_at
  ON slot_reservations(expires_at)
  WHERE status = 'reserved' AND expires_at IS NOT NULL;

-- Lookup by session
CREATE INDEX idx_slot_reservations_session_id
  ON slot_reservations(session_id);

-- Status tracking
CREATE INDEX idx_slot_reservations_status
  ON slot_reservations(status);

-- =====================================================
-- PREVENT OVERLAPPING RESERVATIONS
-- Uses PostgreSQL's range types + exclusion constraint
-- =====================================================

-- Note: This requires the btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Exclusion constraint: Prevent overlapping time slots for same mechanic
ALTER TABLE slot_reservations
  ADD CONSTRAINT no_overlapping_reservations EXCLUDE USING gist (
    mechanic_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('reserved', 'confirmed'));

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE slot_reservations ENABLE ROW LEVEL SECURITY;

-- Mechanics can view their own reservations
CREATE POLICY "Mechanics can view their reservations"
  ON slot_reservations FOR SELECT
  USING (mechanic_id = auth.uid());

-- Customers can view reservations for their sessions
CREATE POLICY "Customers can view their session reservations"
  ON slot_reservations FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE customer_user_id = auth.uid()
    )
  );

-- Service role can manage all reservations (for backend operations)
CREATE POLICY "Service role can manage all reservations"
  ON slot_reservations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_slot_reservations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Auto-set confirmed_at when status changes to confirmed
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = NOW();
    NEW.expires_at = NULL; -- Remove expiration once confirmed
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_slot_reservations_timestamp
  BEFORE UPDATE ON slot_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_reservations_timestamp();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if a time slot is available
CREATE OR REPLACE FUNCTION is_slot_available(
  p_mechanic_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  -- Check for conflicting reservations
  SELECT COUNT(*) INTO v_conflict_count
  FROM slot_reservations
  WHERE mechanic_id = p_mechanic_id
    AND status IN ('reserved', 'confirmed')
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_slot_available(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  IS 'Check if a time slot is available for a mechanic (no overlapping reservations)';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE slot_reservations IS 'Temporary time slot reservations to prevent double-booking during checkout';
COMMENT ON COLUMN slot_reservations.session_id IS 'Links to session once created (initially NULL during reservation)';
COMMENT ON COLUMN slot_reservations.expires_at IS 'Auto-expire reservation after 15 minutes if not confirmed';
COMMENT ON COLUMN slot_reservations.status IS 'reserved: Temporary hold | confirmed: Payment completed | expired: Timed out | cancelled: User cancelled';
COMMENT ON CONSTRAINT no_overlapping_reservations ON slot_reservations IS 'Prevents double-booking via database-level exclusion constraint';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage to authenticated users
GRANT SELECT ON slot_reservations TO authenticated;
GRANT INSERT, UPDATE ON slot_reservations TO service_role;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
