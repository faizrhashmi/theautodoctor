-- ============================================
-- PHASE 3: Account Deletion System
-- Created: 2025-12-01
-- Description: PIPEDA right to erasure with legal retention
-- ============================================

-- ============================================
-- 1. ACCOUNT DELETION QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS account_deletion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Deletion Request
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  requested_by UUID REFERENCES profiles(id), -- Usually same as customer_id
  deletion_reason TEXT,

  -- Request Details
  ip_address INET,
  user_agent TEXT,

  -- Processing Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Request submitted
    'processing',        -- Deletion in progress
    'completed',         -- Immediate deletion complete
    'scheduled',         -- Scheduled for future anonymization
    'cancelled',         -- Customer cancelled request
    'failed'            -- Deletion failed
  )),

  -- Processing Timestamps
  processing_started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- What was deleted
  data_deleted JSONB DEFAULT '{}'::jsonb, -- Track what was deleted
  data_retained JSONB DEFAULT '{}'::jsonb, -- Track what was retained (legal requirement)

  -- Legal Retention Schedule
  retention_schedule JSONB, -- When different data types will be anonymized
  full_anonymization_date DATE, -- When all data will be anonymized (7 years)

  -- Admin Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deletion_queue_customer ON account_deletion_queue(customer_id);
CREATE INDEX idx_deletion_queue_status ON account_deletion_queue(status);
CREATE INDEX idx_deletion_queue_requested ON account_deletion_queue(requested_at DESC);
CREATE INDEX idx_deletion_queue_anonymization ON account_deletion_queue(full_anonymization_date)
  WHERE status = 'scheduled';

COMMENT ON TABLE account_deletion_queue IS 'PIPEDA: Track account deletion requests with legal retention compliance';
COMMENT ON COLUMN account_deletion_queue.retention_schedule IS 'JSON object defining when each data type will be anonymized';

-- ============================================
-- 2. DATA ANONYMIZATION LOG
-- ============================================

CREATE TABLE IF NOT EXISTS data_anonymization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL, -- Don't reference profiles (may be deleted)
  deletion_request_id UUID REFERENCES account_deletion_queue(id),

  -- Anonymization Details
  data_type TEXT NOT NULL CHECK (data_type IN (
    'profile',
    'vehicles',
    'session_data',
    'chat_messages',
    'payment_records',
    'tax_records',
    'quotes',
    'reviews'
  )),

  -- Before/After
  records_affected INTEGER DEFAULT 0,
  anonymization_method TEXT, -- How it was anonymized

  -- Timing
  anonymized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE, -- When it was scheduled
  retention_period_days INTEGER, -- How long it was retained

  -- Who performed it
  performed_by TEXT DEFAULT 'system', -- 'system' or admin user ID

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_anonymization_customer ON data_anonymization_log(customer_id);
CREATE INDEX idx_anonymization_request ON data_anonymization_log(deletion_request_id);
CREATE INDEX idx_anonymization_type ON data_anonymization_log(data_type);
CREATE INDEX idx_anonymization_date ON data_anonymization_log(anonymized_at DESC);

COMMENT ON TABLE data_anonymization_log IS 'PIPEDA: Audit trail of data anonymization';

-- ============================================
-- 3. ADD DELETION FIELDS TO PROFILES
-- ============================================

-- Add soft delete fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deletion_request_id UUID REFERENCES account_deletion_queue(id),
ADD COLUMN IF NOT EXISTS anonymized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_profiles_deleted ON profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_profiles_anonymized ON profiles(anonymized)
  WHERE anonymized = true;

COMMENT ON COLUMN profiles.deleted_at IS 'PIPEDA: Timestamp when account was soft-deleted';
COMMENT ON COLUMN profiles.anonymized IS 'PIPEDA: Whether personal data has been anonymized';

-- ============================================
-- 4. DELETION FUNCTIONS
-- ============================================

-- Function: Request Account Deletion
CREATE OR REPLACE FUNCTION request_account_deletion(
  p_customer_id UUID,
  p_deletion_reason TEXT,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS UUID AS $$
DECLARE
  v_deletion_id UUID;
  v_anonymization_date DATE;
BEGIN
  -- Check for active sessions
  IF EXISTS (
    SELECT 1 FROM diagnostic_sessions
    WHERE (customer_id = p_customer_id OR mechanic_id = p_customer_id)
      AND status IN ('pending', 'in_progress', 'live')
  ) THEN
    RAISE EXCEPTION 'Cannot delete account with active sessions. Please complete or cancel all active sessions first.';
  END IF;

  -- Calculate full anonymization date (7 years from now for tax records)
  v_anonymization_date := CURRENT_DATE + INTERVAL '7 years';

  -- Create deletion request
  INSERT INTO account_deletion_queue (
    customer_id,
    requested_by,
    deletion_reason,
    ip_address,
    user_agent,
    status,
    retention_schedule,
    full_anonymization_date
  ) VALUES (
    p_customer_id,
    p_customer_id,
    p_deletion_reason,
    p_ip_address,
    p_user_agent,
    'pending',
    jsonb_build_object(
      'immediate', jsonb_build_array('profile', 'vehicles', 'preferences'),
      '90_days', jsonb_build_array('session_data', 'chat_messages'),
      '2_years', jsonb_build_array('reviews', 'ratings'),
      '7_years', jsonb_build_array('payment_records', 'tax_records')
    ),
    v_anonymization_date
  )
  RETURNING id INTO v_deletion_id;

  RETURN v_deletion_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION request_account_deletion IS 'PIPEDA: Customer requests account deletion';

-- Function: Process Account Deletion (Immediate)
CREATE OR REPLACE FUNCTION process_account_deletion(
  p_deletion_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_customer_id UUID;
  v_data_deleted JSONB := '{}'::jsonb;
  v_data_retained JSONB := '{}'::jsonb;
BEGIN
  -- Get customer ID
  SELECT customer_id INTO v_customer_id
  FROM account_deletion_queue
  WHERE id = p_deletion_id;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Deletion request not found';
  END IF;

  -- Update deletion queue status
  UPDATE account_deletion_queue
  SET status = 'processing',
      processing_started_at = NOW(),
      updated_at = NOW()
  WHERE id = p_deletion_id;

  -- IMMEDIATE DELETION (soft delete - actual deletion happens later)

  -- 1. Soft delete profile
  UPDATE profiles
  SET deleted_at = NOW(),
      deletion_request_id = p_deletion_id,
      updated_at = NOW()
  WHERE id = v_customer_id;

  v_data_deleted := jsonb_set(v_data_deleted, '{profile}', 'true'::jsonb);

  -- 2. Delete vehicles
  DELETE FROM vehicles WHERE customer_id = v_customer_id;
  v_data_deleted := jsonb_set(v_data_deleted, '{vehicles}', 'true'::jsonb);

  -- 3. Delete favorites
  DELETE FROM customer_favorite_providers WHERE customer_id = v_customer_id;
  v_data_deleted := jsonb_set(v_data_deleted, '{favorites}', 'true'::jsonb);

  -- 4. Withdraw all consents
  UPDATE customer_consents
  SET withdrawn_at = NOW(),
      updated_at = NOW()
  WHERE customer_id = v_customer_id
    AND withdrawn_at IS NULL;

  v_data_deleted := jsonb_set(v_data_deleted, '{consents}', 'true'::jsonb);

  -- RETAINED DATA (with legal justification)

  -- 1. Payment records (7 years - CRA requirement)
  -- Don't delete, just mark retention reason
  v_data_retained := jsonb_set(v_data_retained, '{payment_records}',
    jsonb_build_object(
      'retention_period', '7 years',
      'legal_basis', 'Income Tax Act - business records retention',
      'anonymization_date', (CURRENT_DATE + INTERVAL '7 years')::text
    )
  );

  -- 2. Session data (2 years - business analytics, then anonymized)
  v_data_retained := jsonb_set(v_data_retained, '{session_data}',
    jsonb_build_object(
      'retention_period', '2 years',
      'legal_basis', 'Legitimate business interest - quality improvement',
      'anonymization_date', (CURRENT_DATE + INTERVAL '2 years')::text
    )
  );

  -- 3. Quotes and repair records (2 years - business records)
  v_data_retained := jsonb_set(v_data_retained, '{repair_quotes}',
    jsonb_build_object(
      'retention_period', '2 years',
      'legal_basis', 'Business records - warranty claims',
      'anonymization_date', (CURRENT_DATE + INTERVAL '2 years')::text
    )
  );

  -- Update deletion queue
  UPDATE account_deletion_queue
  SET status = 'scheduled',
      completed_at = NOW(),
      data_deleted = v_data_deleted,
      data_retained = v_data_retained,
      updated_at = NOW()
  WHERE id = p_deletion_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_account_deletion IS 'PIPEDA: Process immediate deletion with legal retention';

-- Function: Anonymize Customer Data
CREATE OR REPLACE FUNCTION anonymize_customer_data(
  p_customer_id UUID,
  p_data_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_records_affected INTEGER := 0;
  v_deletion_request_id UUID;
BEGIN
  -- Get deletion request ID
  SELECT deletion_request_id INTO v_deletion_request_id
  FROM profiles
  WHERE id = p_customer_id;

  -- Anonymize based on data type
  CASE p_data_type
    WHEN 'profile' THEN
      -- Anonymize profile data
      UPDATE profiles
      SET
        email = 'deleted_' || id || '@example.com',
        full_name = 'Deleted User',
        phone = NULL,
        address = NULL,
        city = NULL,
        postal_code = NULL,
        anonymized = true,
        anonymized_at = NOW()
      WHERE id = p_customer_id;

      GET DIAGNOSTICS v_records_affected = ROW_COUNT;

    WHEN 'session_data' THEN
      -- Anonymize session notes and customer-specific data
      UPDATE diagnostic_sessions
      SET
        customer_notes = '[ANONYMIZED]',
        issue_description = '[ANONYMIZED]'
      WHERE customer_id = p_customer_id;

      GET DIAGNOSTICS v_records_affected = ROW_COUNT;

    WHEN 'chat_messages' THEN
      -- Delete chat messages (anonymization not practical)
      DELETE FROM chat_messages
      WHERE session_id IN (
        SELECT id FROM diagnostic_sessions WHERE customer_id = p_customer_id
      );

      GET DIAGNOSTICS v_records_affected = ROW_COUNT;

    WHEN 'reviews' THEN
      -- Anonymize reviews (keep rating but remove text)
      UPDATE session_reviews
      SET
        review_text = '[Review removed - account deleted]',
        customer_name = 'Anonymous'
      WHERE customer_id = p_customer_id;

      GET DIAGNOSTICS v_records_affected = ROW_COUNT;

  END CASE;

  -- Log anonymization
  INSERT INTO data_anonymization_log (
    customer_id,
    deletion_request_id,
    data_type,
    records_affected,
    anonymization_method,
    status
  ) VALUES (
    p_customer_id,
    v_deletion_request_id,
    p_data_type,
    v_records_affected,
    'automated_anonymization',
    'completed'
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION anonymize_customer_data IS 'PIPEDA: Anonymize specific data type for deleted account';

-- ============================================
-- 5. DELETION VIEWS
-- ============================================

CREATE OR REPLACE VIEW pending_account_deletions AS
SELECT
  adq.id AS deletion_id,
  adq.customer_id,
  p.email,
  p.full_name,
  adq.requested_at,
  adq.deletion_reason,
  adq.status,
  adq.full_anonymization_date,

  -- Active sessions check
  (SELECT COUNT(*) FROM diagnostic_sessions ds
   WHERE ds.customer_id = adq.customer_id
   AND ds.status IN ('pending', 'in_progress', 'live')) AS active_sessions_count,

  -- Data summary
  (SELECT COUNT(*) FROM vehicles WHERE customer_id = adq.customer_id) AS vehicles_count,
  (SELECT COUNT(*) FROM diagnostic_sessions WHERE customer_id = adq.customer_id) AS sessions_count,
  (SELECT COUNT(*) FROM repair_quotes WHERE customer_id = adq.customer_id) AS quotes_count

FROM account_deletion_queue adq
LEFT JOIN profiles p ON p.id = adq.customer_id
WHERE adq.status IN ('pending', 'processing')
ORDER BY adq.requested_at DESC;

COMMENT ON VIEW pending_account_deletions IS 'Admin view of pending deletion requests';

CREATE OR REPLACE VIEW scheduled_anonymizations AS
SELECT
  adq.customer_id,
  adq.full_anonymization_date,
  adq.retention_schedule,
  adq.completed_at AS deletion_processed_at,

  -- Days until full anonymization
  (adq.full_anonymization_date - CURRENT_DATE) AS days_until_anonymization,

  -- Anonymization progress
  (SELECT COUNT(*) FROM data_anonymization_log
   WHERE deletion_request_id = adq.id
   AND status = 'completed') AS anonymization_steps_completed,

  (SELECT COUNT(DISTINCT data_type) FROM data_anonymization_log
   WHERE deletion_request_id = adq.id
   AND status = 'pending') AS anonymization_steps_pending

FROM account_deletion_queue adq
WHERE adq.status = 'scheduled'
ORDER BY adq.full_anonymization_date ASC;

COMMENT ON VIEW scheduled_anonymizations IS 'Track scheduled data anonymizations';

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE account_deletion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_anonymization_log ENABLE ROW LEVEL SECURITY;

-- Customers can view/create their own deletion requests
CREATE POLICY "Customers can view own deletion requests"
  ON account_deletion_queue FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create deletion requests"
  ON account_deletion_queue FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all deletion requests"
  ON account_deletion_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Anonymization log - admins only
CREATE POLICY "Admins can view anonymization log"
  ON data_anonymization_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 7. TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_deletion_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_deletion_queue_updated_at
  BEFORE UPDATE ON account_deletion_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_deletion_queue_timestamp();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3: Account Deletion System - Migration Complete';
  RAISE NOTICE '📋 Created Tables:';
  RAISE NOTICE '   - account_deletion_queue (deletion request tracking)';
  RAISE NOTICE '   - data_anonymization_log (anonymization audit trail)';
  RAISE NOTICE '📊 Created Views:';
  RAISE NOTICE '   - pending_account_deletions (admin queue)';
  RAISE NOTICE '   - scheduled_anonymizations (retention schedule)';
  RAISE NOTICE '⚙️ Created Functions:';
  RAISE NOTICE '   - request_account_deletion() (customer initiates)';
  RAISE NOTICE '   - process_account_deletion() (immediate deletion)';
  RAISE NOTICE '   - anonymize_customer_data() (scheduled anonymization)';
  RAISE NOTICE '📅 Retention Periods:';
  RAISE NOTICE '   - Immediate: profile, vehicles, preferences';
  RAISE NOTICE '   - 90 days: session data (anonymized)';
  RAISE NOTICE '   - 2 years: reviews, ratings (anonymized)';
  RAISE NOTICE '   - 7 years: payment/tax records (CRA requirement)';
  RAISE NOTICE '🔐 Row Level Security: ENABLED';
END $$;
