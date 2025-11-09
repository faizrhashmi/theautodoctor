-- Workshop Availability and Appointments System
-- Allows workshops to set their operating hours and manage in-person appointment requests

-- =====================================================
-- TABLE: workshop_availability
-- Stores workshop operating hours by day of week
-- =====================================================
CREATE TABLE IF NOT EXISTS workshop_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '17:00',
  break_start_time TIME,
  break_end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per workshop per day
  UNIQUE(workshop_id, day_of_week)
);

CREATE INDEX idx_workshop_availability_workshop_id ON workshop_availability(workshop_id);
CREATE INDEX idx_workshop_availability_day_of_week ON workshop_availability(day_of_week);

COMMENT ON TABLE workshop_availability IS 'Workshop operating hours and availability schedule';
COMMENT ON COLUMN workshop_availability.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN workshop_availability.break_start_time IS 'Optional lunch/break start time';
COMMENT ON COLUMN workshop_availability.break_end_time IS 'Optional lunch/break end time';

-- =====================================================
-- TABLE: workshop_appointments
-- Stores customer appointment requests for in-person service
-- =====================================================
CREATE TABLE IF NOT EXISTS workshop_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Appointment details
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  service_type VARCHAR(100), -- e.g., 'diagnostic', 'repair', 'inspection', 'consultation'

  -- Vehicle and issue information
  vehicle_year INTEGER,
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  issue_description TEXT NOT NULL,
  diagnostic_session_id UUID REFERENCES diagnostic_sessions(id), -- Optional: link to existing session

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, confirmed, declined, completed, cancelled
  confirmed_date DATE,
  confirmed_time TIME,
  declined_reason TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50), -- 'customer', 'workshop'

  -- Contact information
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,

  -- Notes
  customer_notes TEXT,
  workshop_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'cancelled')),
  CHECK (service_type IN ('diagnostic', 'repair', 'inspection', 'consultation', 'other')),
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'workshop'))
);

-- Indexes for performance
CREATE INDEX idx_workshop_appointments_workshop_id ON workshop_appointments(workshop_id);
CREATE INDEX idx_workshop_appointments_customer_user_id ON workshop_appointments(customer_user_id);
CREATE INDEX idx_workshop_appointments_status ON workshop_appointments(status);
CREATE INDEX idx_workshop_appointments_requested_date ON workshop_appointments(requested_date);
CREATE INDEX idx_workshop_appointments_diagnostic_session_id ON workshop_appointments(diagnostic_session_id);
CREATE INDEX idx_workshop_appointments_created_at ON workshop_appointments(created_at DESC);

COMMENT ON TABLE workshop_appointments IS 'Customer appointment requests for in-person workshop service';
COMMENT ON COLUMN workshop_appointments.diagnostic_session_id IS 'Optional link to existing diagnostic session that led to this appointment';
COMMENT ON COLUMN workshop_appointments.confirmed_date IS 'Final confirmed appointment date (may differ from requested_date)';
COMMENT ON COLUMN workshop_appointments.confirmed_time IS 'Final confirmed appointment time (may differ from requested_time)';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Workshop Availability Policies
ALTER TABLE workshop_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop owners can view their availability"
  ON workshop_availability FOR SELECT
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

CREATE POLICY "Workshop owners can manage their availability"
  ON workshop_availability FOR ALL
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

CREATE POLICY "Public can view workshop availability"
  ON workshop_availability FOR SELECT
  USING (true);

-- Workshop Appointments Policies
ALTER TABLE workshop_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own appointments"
  ON workshop_appointments FOR SELECT
  USING (customer_user_id = auth.uid());

CREATE POLICY "Customers can create appointments"
  ON workshop_appointments FOR INSERT
  WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Customers can update their own pending appointments"
  ON workshop_appointments FOR UPDATE
  USING (customer_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Workshop owners can view their appointments"
  ON workshop_appointments FOR SELECT
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

CREATE POLICY "Workshop owners can manage appointments"
  ON workshop_appointments FOR UPDATE
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if workshop is open at a specific date/time
CREATE OR REPLACE FUNCTION is_workshop_open(
  p_workshop_id UUID,
  p_datetime TIMESTAMP WITH TIME ZONE
) RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_time TIME;
  v_availability RECORD;
BEGIN
  -- Extract day of week (0=Sunday, 6=Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_datetime);
  v_time := p_datetime::TIME;

  -- Get availability for this day
  SELECT * INTO v_availability
  FROM workshop_availability
  WHERE workshop_id = p_workshop_id
    AND day_of_week = v_day_of_week;

  -- If no availability record, assume closed
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if closed for the day
  IF NOT v_availability.is_open THEN
    RETURN FALSE;
  END IF;

  -- Check if time is within operating hours
  IF v_time < v_availability.open_time OR v_time >= v_availability.close_time THEN
    RETURN FALSE;
  END IF;

  -- Check if during break time
  IF v_availability.break_start_time IS NOT NULL
     AND v_availability.break_end_time IS NOT NULL THEN
    IF v_time >= v_availability.break_start_time
       AND v_time < v_availability.break_end_time THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_workshop_open(UUID, TIMESTAMP WITH TIME ZONE) IS 'Check if a workshop is open at a specific date/time';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workshop_availability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workshop_availability_timestamp
  BEFORE UPDATE ON workshop_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_workshop_availability_timestamp();

CREATE OR REPLACE FUNCTION update_workshop_appointments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Auto-set timestamps based on status changes
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = NOW();
  END IF;

  IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
    NEW.declined_at = NOW();
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;

  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workshop_appointments_timestamp
  BEFORE UPDATE ON workshop_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_workshop_appointments_timestamp();

-- =====================================================
-- DEFAULT AVAILABILITY
-- Initialize default 9-5 weekday hours for existing workshops
-- =====================================================
INSERT INTO workshop_availability (workshop_id, day_of_week, is_open, open_time, close_time)
SELECT
  id,
  day,
  CASE WHEN day IN (1, 2, 3, 4, 5) THEN true ELSE false END, -- Mon-Fri open, Sat-Sun closed
  '09:00'::TIME,
  '17:00'::TIME
FROM organizations
CROSS JOIN generate_series(0, 6) AS day
WHERE organization_type = 'workshop'
  AND NOT EXISTS (
    SELECT 1 FROM workshop_availability wa
    WHERE wa.workshop_id = organizations.id
  );
