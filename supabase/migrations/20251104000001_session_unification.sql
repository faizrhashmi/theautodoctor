-- ============================================================================
-- SESSION UNIFICATION MIGRATION
-- Replace session_requests with session_assignments (strict FK to sessions)
-- Add session_devices for single-device enforcement
-- Add session_events for immutable audit trail
-- ============================================================================

-- ============================================================================
-- 1. CREATE session_assignments (replacement for session_requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','offered','accepted','declined','expired','cancelled')) DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  offered_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_session_assignments_session ON session_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_assignments_mechanic ON session_assignments(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_session_assignments_status ON session_assignments(status);
CREATE INDEX IF NOT EXISTS idx_session_assignments_created ON session_assignments(created_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_session_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotent migrations)
DROP TRIGGER IF EXISTS trg_session_assignments_updated ON session_assignments;

CREATE TRIGGER trg_session_assignments_updated
  BEFORE UPDATE ON session_assignments
  FOR EACH ROW EXECUTE FUNCTION touch_session_assignments_updated_at();

-- ============================================================================
-- 2. CREATE session_devices (single-device enforcement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kicked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(session_id, user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_session_devices_session ON session_devices(session_id);
CREATE INDEX IF NOT EXISTS idx_session_devices_user ON session_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_session_devices_active ON session_devices(session_id, kicked_at) WHERE kicked_at IS NULL;

-- ============================================================================
-- 3. CREATE session_events (immutable audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'assigned', 'joined', 'started', 'ended',
    'cancelled', 'expired', 'timeout', 'device_kicked',
    'mechanic_accepted', 'mechanic_declined'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_created ON session_events(created_at);

-- ============================================================================
-- 4. BACKFILL session_assignments from session_requests
-- ============================================================================

-- First, add session_id column to session_requests if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_requests') THEN
    -- Add session_id column (nullable for now)
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'session_requests'
      AND column_name = 'session_id'
    ) THEN
      ALTER TABLE session_requests ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;

      -- Create index for performance
      CREATE INDEX IF NOT EXISTS idx_session_requests_session ON session_requests(session_id);

      RAISE NOTICE '✓ Added session_id column to session_requests';
    END IF;

    -- Populate session_id via time-window join (match customer + time proximity)
    -- Match session_requests to sessions within 5-minute window
    UPDATE session_requests sr
    SET session_id = s.id
    FROM sessions s
    WHERE sr.session_id IS NULL
      AND sr.customer_id = s.customer_user_id
      AND s.created_at >= sr.created_at - INTERVAL '5 minutes'
      AND s.created_at <= sr.created_at + INTERVAL '5 minutes'
      AND s.type::text = sr.session_type::text;

    -- Log results
    RAISE NOTICE '✓ Populated session_id in session_requests via time-window join';

    -- Insert into session_assignments from repaired session_requests
    -- Check if metadata column exists in session_requests
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'session_requests'
      AND column_name = 'metadata'
    ) THEN
      -- Insert with metadata
      INSERT INTO session_assignments (
        session_id,
        mechanic_id,
        status,
        created_at,
        offered_at,
        accepted_at,
        metadata
      )
      SELECT
        sr.session_id,
        sr.mechanic_id,
        CASE sr.status
          WHEN 'pending' THEN 'queued'
          WHEN 'accepted' THEN 'accepted'
          WHEN 'cancelled' THEN 'cancelled'
          ELSE 'queued'
        END,
        sr.created_at,
        sr.created_at, -- Use created_at as offered_at
        sr.accepted_at,
        sr.metadata
      FROM session_requests sr
      WHERE sr.session_id IS NOT NULL -- Only migrate rows we could link
      ON CONFLICT DO NOTHING;
    ELSE
      -- Insert without metadata (use default)
      INSERT INTO session_assignments (
        session_id,
        mechanic_id,
        status,
        created_at,
        offered_at,
        accepted_at
      )
      SELECT
        sr.session_id,
        sr.mechanic_id,
        CASE sr.status
          WHEN 'pending' THEN 'queued'
          WHEN 'accepted' THEN 'accepted'
          WHEN 'cancelled' THEN 'cancelled'
          ELSE 'queued'
        END,
        sr.created_at,
        sr.created_at, -- Use created_at as offered_at
        sr.accepted_at
      FROM session_requests sr
      WHERE sr.session_id IS NOT NULL -- Only migrate rows we could link
      ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE '✓ Migrated session_requests to session_assignments';
  ELSE
    RAISE NOTICE '⚠ session_requests table does not exist, skipping migration';
  END IF;
END $$;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- session_assignments
ALTER TABLE session_assignments ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Mechanics can view their assignments" ON session_assignments;
DROP POLICY IF EXISTS "System can insert assignments" ON session_assignments;
DROP POLICY IF EXISTS "Mechanics can update their assignments" ON session_assignments;

CREATE POLICY "Mechanics can view their assignments"
  ON session_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mechanics m
      WHERE m.id = mechanic_id
        AND m.user_id = auth.uid()
    )
    OR status IN ('queued', 'offered') -- All mechanics can see queued/offered
  );

CREATE POLICY "System can insert assignments"
  ON session_assignments FOR INSERT
  WITH CHECK (true); -- API handles auth

CREATE POLICY "Mechanics can update their assignments"
  ON session_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM mechanics m
      WHERE m.id = mechanic_id
        AND m.user_id = auth.uid()
    )
  );

-- session_devices
ALTER TABLE session_devices ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Users can view their own devices" ON session_devices;
DROP POLICY IF EXISTS "Users can insert their own devices" ON session_devices;
DROP POLICY IF EXISTS "Users can update their own devices" ON session_devices;

CREATE POLICY "Users can view their own devices"
  ON session_devices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own devices"
  ON session_devices FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices"
  ON session_devices FOR UPDATE
  USING (user_id = auth.uid());

-- session_events (read-only for users)
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Users can view events for their sessions" ON session_events;
DROP POLICY IF EXISTS "System can insert events" ON session_events;

CREATE POLICY "Users can view events for their sessions"
  ON session_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id
        AND s.customer_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = session_events.session_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert events"
  ON session_events FOR INSERT
  WITH CHECK (true); -- API handles auth

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get active session for a customer
CREATE OR REPLACE FUNCTION get_active_session_for_customer(p_customer_id UUID)
RETURNS TABLE (
  session_id UUID,
  session_status TEXT,
  session_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.status,
    s.type,
    s.created_at
  FROM sessions s
  WHERE s.customer_user_id = p_customer_id
    AND s.status IN ('pending', 'waiting', 'live', 'scheduled')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if mechanic can accept assignment
CREATE OR REPLACE FUNCTION can_mechanic_accept_assignment(
  p_mechanic_id UUID,
  p_assignment_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_active BOOLEAN;
  v_assignment_status TEXT;
BEGIN
  -- Check if mechanic has any active sessions
  SELECT EXISTS (
    SELECT 1 FROM sessions s
    JOIN session_assignments sa ON sa.session_id = s.id
    WHERE sa.mechanic_id = p_mechanic_id
      AND sa.status = 'accepted'
      AND s.status IN ('waiting', 'live')
  ) INTO v_has_active;

  IF v_has_active THEN
    RETURN FALSE;
  END IF;

  -- Check if assignment is still available
  SELECT status INTO v_assignment_status
  FROM session_assignments
  WHERE id = p_assignment_id;

  IF v_assignment_status IN ('queued', 'offered') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. LOGGING
-- ============================================================================

DO $$
DECLARE
  assignments_count INT;
  devices_count INT;
  events_count INT;
BEGIN
  SELECT COUNT(*) INTO assignments_count FROM session_assignments;
  SELECT COUNT(*) INTO devices_count FROM session_devices;
  SELECT COUNT(*) INTO events_count FROM session_events;

  RAISE NOTICE '✅ SESSION UNIFICATION MIGRATION COMPLETE';
  RAISE NOTICE '  - session_assignments: % rows', assignments_count;
  RAISE NOTICE '  - session_devices: % rows', devices_count;
  RAISE NOTICE '  - session_events: % rows', events_count;
END $$;
