-- ============================================
-- Workshop Escalation System
-- Created: 2025-10-27
-- Description: Enable virtual mechanics to escalate completed diagnostics
--              to workshops for repair quote creation
-- ============================================

-- ============================================
-- 1. ADD ESCALATION FIELDS TO DIAGNOSTIC SESSIONS
-- ============================================

-- Add escalation tracking fields to diagnostic_sessions
ALTER TABLE diagnostic_sessions
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalated_by_mechanic_id UUID REFERENCES mechanics(id),
ADD COLUMN IF NOT EXISTS escalated_to_workshop_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS escalation_status TEXT CHECK (escalation_status IN ('pending', 'accepted', 'quote_sent', 'declined')),
ADD COLUMN IF NOT EXISTS escalation_notes TEXT;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_escalated ON diagnostic_sessions(escalated);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_escalated_workshop ON diagnostic_sessions(escalated_to_workshop_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_escalation_status ON diagnostic_sessions(escalation_status);

COMMENT ON COLUMN diagnostic_sessions.escalated IS 'Whether this session was escalated to a workshop for repairs';
COMMENT ON COLUMN diagnostic_sessions.escalated_at IS 'When the session was escalated';
COMMENT ON COLUMN diagnostic_sessions.escalated_by_mechanic_id IS 'Virtual mechanic who escalated (for referral tracking)';
COMMENT ON COLUMN diagnostic_sessions.escalated_to_workshop_id IS 'Workshop that received the escalation';
COMMENT ON COLUMN diagnostic_sessions.escalation_status IS 'Status of workshop response to escalation';
COMMENT ON COLUMN diagnostic_sessions.escalation_notes IS 'Additional notes from mechanic for workshop';

-- ============================================
-- 2. WORKSHOP ESCALATION QUEUE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workshop_escalation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  diagnostic_session_id UUID REFERENCES diagnostic_sessions(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  escalating_mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL NOT NULL,
  assigned_workshop_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'quote_sent', 'declined', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Workshop assignment
  auto_assigned BOOLEAN DEFAULT false, -- True if platform auto-matched, false if mechanic chose
  assignment_method TEXT CHECK (assignment_method IN ('auto_match', 'mechanic_choice', 'partnership')),

  -- Service advisor assignment
  assigned_to_advisor_id UUID REFERENCES mechanics(id), -- Service advisor who picks up the escalation
  assigned_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Customer vehicle & issue details (denormalized for quick access)
  vehicle_info JSONB,
  issue_summary TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),

  -- Mechanic diagnosis (passed to workshop)
  diagnosis_summary TEXT,
  recommended_services TEXT[],
  diagnostic_photos JSONB DEFAULT '[]'::jsonb,
  mechanic_notes TEXT,

  -- Workshop actions
  quote_created_at TIMESTAMP WITH TIME ZONE,
  quote_id UUID REFERENCES repair_quotes(id),
  declined_reason TEXT,
  declined_at TIMESTAMP WITH TIME ZONE,

  -- Referral tracking (for mechanic commission)
  referral_fee_percent DECIMAL(5,2) DEFAULT 5.00, -- % of repair revenue going to referring mechanic
  referral_fee_amount DECIMAL(10,2),
  referral_paid BOOLEAN DEFAULT false,
  referral_paid_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for workshop queue management
CREATE INDEX idx_escalation_queue_workshop ON workshop_escalation_queue(assigned_workshop_id);
CREATE INDEX idx_escalation_queue_status ON workshop_escalation_queue(status);
CREATE INDEX idx_escalation_queue_priority ON workshop_escalation_queue(priority);
CREATE INDEX idx_escalation_queue_mechanic ON workshop_escalation_queue(escalating_mechanic_id);
CREATE INDEX idx_escalation_queue_advisor ON workshop_escalation_queue(assigned_to_advisor_id);
CREATE INDEX idx_escalation_queue_customer ON workshop_escalation_queue(customer_id);
CREATE INDEX idx_escalation_queue_created ON workshop_escalation_queue(created_at);

COMMENT ON TABLE workshop_escalation_queue IS 'Queue of diagnostic sessions escalated to workshops for repair quotes';
COMMENT ON COLUMN workshop_escalation_queue.referral_fee_percent IS 'Commission % for referring mechanic';

-- ============================================
-- 3. WORKSHOP PREFERENCES FOR ESCALATION
-- ============================================

CREATE TABLE IF NOT EXISTS workshop_escalation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Auto-accept settings
  auto_accept_escalations BOOLEAN DEFAULT false,
  max_daily_escalations INTEGER DEFAULT 10,

  -- Service capabilities
  accepted_service_types TEXT[] DEFAULT ARRAY['general_repair', 'diagnostics', 'oil_change', 'brakes', 'engine', 'transmission', 'electrical', 'suspension'],

  -- Geographic preferences
  service_radius_km INTEGER DEFAULT 25, -- How far they'll serve customers
  preferred_cities TEXT[],

  -- Availability
  accepting_new_customers BOOLEAN DEFAULT true,
  business_hours JSONB DEFAULT '{"monday": "9-17", "tuesday": "9-17", "wednesday": "9-17", "thursday": "9-17", "friday": "9-17"}'::jsonb,

  -- Response time
  typical_quote_turnaround_hours INTEGER DEFAULT 24,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workshop_escalation_prefs_workshop ON workshop_escalation_preferences(workshop_id);
CREATE INDEX idx_workshop_escalation_prefs_accepting ON workshop_escalation_preferences(accepting_new_customers);

COMMENT ON TABLE workshop_escalation_preferences IS 'Workshop settings for receiving escalated diagnostic sessions';

-- ============================================
-- 4. MECHANIC ESCALATION STATS (for tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS mechanic_escalation_stats (
  mechanic_id UUID PRIMARY KEY REFERENCES mechanics(id) ON DELETE CASCADE,

  -- Escalation metrics
  total_escalations INTEGER DEFAULT 0,
  escalations_accepted INTEGER DEFAULT 0,
  escalations_quoted INTEGER DEFAULT 0,
  escalations_converted INTEGER DEFAULT 0, -- Customer approved quote and got repair

  -- Revenue tracking
  total_referral_fees_earned DECIMAL(10,2) DEFAULT 0.00,
  total_referral_fees_pending DECIMAL(10,2) DEFAULT 0.00,

  -- Quality metrics
  average_workshop_rating DECIMAL(3,2), -- How workshops rate the quality of escalations
  average_customer_satisfaction DECIMAL(3,2), -- Customer satisfaction with referred workshops

  -- Last activity
  last_escalation_at TIMESTAMP WITH TIME ZONE,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE mechanic_escalation_stats IS 'Track mechanic performance with workshop escalations';

-- ============================================
-- 5. TRIGGERS FOR AUTO-UPDATES
-- ============================================

-- Trigger to update diagnostic_sessions when escalation is created
CREATE OR REPLACE FUNCTION update_diagnostic_session_on_escalation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE diagnostic_sessions
  SET
    escalated = true,
    escalated_at = NEW.created_at,
    escalated_by_mechanic_id = NEW.escalating_mechanic_id,
    escalated_to_workshop_id = NEW.assigned_workshop_id,
    escalation_status = NEW.status,
    updated_at = NOW()
  WHERE id = NEW.diagnostic_session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_on_escalation
AFTER INSERT ON workshop_escalation_queue
FOR EACH ROW
EXECUTE FUNCTION update_diagnostic_session_on_escalation();

-- Trigger to update escalation stats when quote is created/converted
CREATE OR REPLACE FUNCTION update_escalation_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update mechanic stats when escalation status changes
  IF (TG_OP = 'UPDATE') THEN
    -- Escalation accepted by workshop
    IF (NEW.status = 'accepted' AND OLD.status = 'pending') THEN
      UPDATE mechanic_escalation_stats
      SET
        escalations_accepted = escalations_accepted + 1,
        updated_at = NOW()
      WHERE mechanic_id = NEW.escalating_mechanic_id;
    END IF;

    -- Quote sent
    IF (NEW.status = 'quote_sent' AND OLD.status != 'quote_sent') THEN
      UPDATE mechanic_escalation_stats
      SET
        escalations_quoted = escalations_quoted + 1,
        updated_at = NOW()
      WHERE mechanic_id = NEW.escalating_mechanic_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_escalation_stats
AFTER INSERT OR UPDATE ON workshop_escalation_queue
FOR EACH ROW
EXECUTE FUNCTION update_escalation_stats();

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to find best workshop match for escalation
CREATE OR REPLACE FUNCTION find_matching_workshops(
  p_service_type TEXT,
  p_customer_city TEXT,
  p_urgency TEXT
)
RETURNS TABLE (
  workshop_id UUID,
  workshop_name TEXT,
  distance_score INTEGER,
  capacity_score INTEGER,
  rating_score DECIMAL,
  total_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as workshop_id,
    o.name as workshop_name,
    CASE
      WHEN p_customer_city = ANY(wep.preferred_cities) THEN 100
      ELSE 50
    END as distance_score,
    CASE
      WHEN wep.accepting_new_customers THEN 100
      ELSE 0
    END as capacity_score,
    COALESCE(o.rating, 3.5) * 20 as rating_score,
    (CASE
      WHEN p_customer_city = ANY(wep.preferred_cities) THEN 100
      ELSE 50
    END +
    CASE
      WHEN wep.accepting_new_customers THEN 100
      ELSE 0
    END +
    (COALESCE(o.rating, 3.5) * 20)::INTEGER) as total_score
  FROM organizations o
  LEFT JOIN workshop_escalation_preferences wep ON wep.workshop_id = o.id
  WHERE
    o.organization_type = 'workshop'
    AND o.status = 'active'
    AND (wep.accepting_new_customers = true OR wep.accepting_new_customers IS NULL)
    AND (p_service_type = ANY(wep.accepted_service_types) OR wep.accepted_service_types IS NULL)
  ORDER BY total_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_matching_workshops IS 'Find best workshop matches for escalation based on location, capacity, and ratings';
