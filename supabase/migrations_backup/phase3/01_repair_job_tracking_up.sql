-- =====================================================
-- PHASE 3.2: REPAIR JOB TRACKING
-- Purpose: Track detailed repair progress after quote acceptance
-- Created: 2025-01-04
-- Part of: Customer Journey Blueprint - Phase 3: Post-Session Engagement
-- =====================================================

-- =====================================================
-- 1. REPAIR JOBS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS repair_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relationships
  repair_quote_id UUID NOT NULL REFERENCES repair_quotes(id) ON DELETE CASCADE UNIQUE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,
  vehicle_id UUID,

  -- Job Details (denormalized for performance)
  job_number TEXT UNIQUE, -- Workshop's internal job number
  description TEXT NOT NULL,
  vehicle_info JSONB, -- {year, make, model, vin, mileage}

  -- Status Workflow
  status TEXT DEFAULT 'pending_parts' CHECK (status IN (
    'pending_parts',      -- Waiting for parts to arrive
    'parts_received',     -- Parts have arrived, ready to start
    'repair_started',     -- Work has begun
    'in_progress',        -- Actively being worked on
    'waiting_approval',   -- Additional work needed, awaiting customer approval
    'quality_check',      -- Final inspection
    'ready_for_pickup',   -- Completed, ready for customer
    'completed',          -- Customer picked up vehicle
    'on_hold',            -- Paused (e.g., waiting for customer decision)
    'cancelled'           -- Job cancelled
  )),

  -- Timeline
  quote_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  parts_ordered_at TIMESTAMP WITH TIME ZONE,
  parts_received_at TIMESTAMP WITH TIME ZONE,
  repair_started_at TIMESTAMP WITH TIME ZONE,
  quality_check_at TIMESTAMP WITH TIME ZONE,
  ready_for_pickup_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Estimated vs Actual
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  estimated_labor_hours DECIMAL(5,2),
  actual_labor_hours DECIMAL(5,2),

  -- Parts Tracking
  parts_status TEXT DEFAULT 'not_ordered' CHECK (parts_status IN (
    'not_ordered',
    'ordered',
    'partially_received',
    'all_received',
    'on_backorder'
  )),
  parts_ordered_count INTEGER DEFAULT 0,
  parts_received_count INTEGER DEFAULT 0,
  parts_eta TIMESTAMP WITH TIME ZONE,
  parts_supplier TEXT,

  -- Customer Communication
  last_update_sent_at TIMESTAMP WITH TIME ZONE,
  customer_notified_ready BOOLEAN DEFAULT false,
  ready_notification_sent_at TIMESTAMP WITH TIME ZONE,

  -- Additional Work
  additional_work_requested BOOLEAN DEFAULT false,
  additional_quote_id UUID REFERENCES repair_quotes(id),

  -- Quality & Completion
  quality_check_passed BOOLEAN,
  quality_notes TEXT,
  final_notes TEXT, -- Notes for customer at pickup

  -- Pickup Details
  pickup_scheduled_at TIMESTAMP WITH TIME ZONE,
  pickup_reminder_sent BOOLEAN DEFAULT false,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  picked_up_by_name TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_repair_jobs_customer ON repair_jobs(customer_id);
CREATE INDEX idx_repair_jobs_workshop ON repair_jobs(workshop_id);
CREATE INDEX idx_repair_jobs_quote ON repair_jobs(repair_quote_id);
CREATE INDEX idx_repair_jobs_status ON repair_jobs(status);
CREATE INDEX idx_repair_jobs_created ON repair_jobs(created_at DESC);
CREATE INDEX idx_repair_jobs_completion ON repair_jobs(estimated_completion_date) WHERE status NOT IN ('completed', 'cancelled');

COMMENT ON TABLE repair_jobs IS 'Phase 3.2: Detailed repair progress tracking after quote acceptance';

-- =====================================================
-- 2. REPAIR JOB STATUS UPDATES
-- =====================================================

CREATE TABLE IF NOT EXISTS repair_job_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relationships
  repair_job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES mechanics(id),

  -- Update Details
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN (
    'status_change',
    'parts_update',
    'timeline_update',
    'customer_message',
    'internal_note'
  )),

  -- Message
  message TEXT,
  internal_only BOOLEAN DEFAULT false, -- If true, customer doesn't see this

  -- Media
  photos TEXT[], -- Storage URLs

  -- Customer Notification
  customer_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_repair_job_updates_job ON repair_job_updates(repair_job_id);
CREATE INDEX idx_repair_job_updates_created ON repair_job_updates(created_at DESC);
CREATE INDEX idx_repair_job_updates_customer_visible
  ON repair_job_updates(repair_job_id, created_at DESC)
  WHERE internal_only = false;

COMMENT ON TABLE repair_job_updates IS 'Timeline of status changes and updates for repair jobs';

-- =====================================================
-- 3. AUTOMATED TIMESTAMP TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_repair_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_repair_job_updated_at
  BEFORE UPDATE ON repair_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_repair_job_updated_at();

-- =====================================================
-- 4. AUTO-CREATE JOB FROM APPROVED QUOTE
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_repair_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create job when quote is approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO repair_jobs (
      repair_quote_id,
      customer_id,
      workshop_id,
      mechanic_id,
      vehicle_id,
      description,
      quote_accepted_at,
      estimated_completion_date,
      estimated_labor_hours
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      NEW.workshop_id,
      NEW.mechanic_id,
      NEW.vehicle_id,
      'Repair job for quote #' || NEW.id,
      NOW(),
      NOW() + INTERVAL '1 day' * COALESCE(NEW.estimated_completion_hours, 24) / 24,
      NEW.estimated_completion_hours
    )
    ON CONFLICT (repair_quote_id) DO NOTHING; -- Prevent duplicates
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_repair_job
  AFTER UPDATE ON repair_quotes
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION auto_create_repair_job();

-- =====================================================
-- 5. AUTO-LOG STATUS CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION log_repair_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF NEW.status != OLD.status THEN
    INSERT INTO repair_job_updates (
      repair_job_id,
      old_status,
      new_status,
      update_type,
      message,
      internal_only
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      'status_change',
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      false -- Customer can see status changes
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_repair_job_status_change
  AFTER UPDATE ON repair_jobs
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION log_repair_job_status_change();

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_job_updates ENABLE ROW LEVEL SECURITY;

-- Customers can view their own repair jobs
CREATE POLICY repair_jobs_customer_select ON repair_jobs
  FOR SELECT
  USING (customer_id = auth.uid());

-- Workshop staff can view jobs for their workshop
CREATE POLICY repair_jobs_workshop_select ON repair_jobs
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT workshop_id FROM workshop_roles WHERE user_id = auth.uid()
    )
  );

-- Workshop staff can update jobs for their workshop
CREATE POLICY repair_jobs_workshop_update ON repair_jobs
  FOR UPDATE
  USING (
    workshop_id IN (
      SELECT workshop_id FROM workshop_roles WHERE user_id = auth.uid()
    )
  );

-- Customers can view updates for their jobs (non-internal only)
CREATE POLICY repair_job_updates_customer_select ON repair_job_updates
  FOR SELECT
  USING (
    repair_job_id IN (
      SELECT id FROM repair_jobs WHERE customer_id = auth.uid()
    )
    AND internal_only = false
  );

-- Workshop staff can view all updates for their workshop jobs
CREATE POLICY repair_job_updates_workshop_select ON repair_job_updates
  FOR SELECT
  USING (
    repair_job_id IN (
      SELECT id FROM repair_jobs WHERE workshop_id IN (
        SELECT workshop_id FROM workshop_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Workshop staff can insert updates
CREATE POLICY repair_job_updates_workshop_insert ON repair_job_updates
  FOR INSERT
  WITH CHECK (
    repair_job_id IN (
      SELECT id FROM repair_jobs WHERE workshop_id IN (
        SELECT workshop_id FROM workshop_roles WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Get active repair jobs for a customer
CREATE OR REPLACE FUNCTION get_active_repair_jobs(p_customer_id UUID)
RETURNS TABLE (
  job_id UUID,
  status TEXT,
  description TEXT,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  workshop_name TEXT,
  last_update TEXT,
  last_update_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rj.id,
    rj.status,
    rj.description,
    rj.estimated_completion_date,
    EXTRACT(DAY FROM (rj.estimated_completion_date - NOW()))::INTEGER,
    o.name,
    rju.message,
    rju.created_at
  FROM repair_jobs rj
  LEFT JOIN organizations o ON o.id = rj.workshop_id
  LEFT JOIN LATERAL (
    SELECT message, created_at
    FROM repair_job_updates
    WHERE repair_job_id = rj.id
      AND internal_only = false
    ORDER BY created_at DESC
    LIMIT 1
  ) rju ON true
  WHERE rj.customer_id = p_customer_id
    AND rj.status NOT IN ('completed', 'cancelled')
  ORDER BY rj.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
