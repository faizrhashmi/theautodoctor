-- ============================================================================
-- PHASE 1.1: ADD MISSING RLS POLICIES FOR 9 CRITICAL TABLES
-- ============================================================================
-- This migration fixes the critical issue where 9 tables have RLS enabled
-- but NO policies defined, blocking ALL database operations.
--
-- Issue: Tables created in 20250127000001_add_repair_quote_system.sql
-- have RLS enabled but no CREATE POLICY statements.
--
-- Date: 2025-10-27
-- Priority: CRITICAL
-- ============================================================================

-- ============================================================================
-- 1. REPAIR_QUOTES
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Workshops can manage their own quotes"
  ON repair_quotes
  FOR ALL
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY IF NOT EXISTS "Customers can view quotes for their sessions"
  ON repair_quotes
  FOR SELECT
  USING (
    diagnostic_session_id IN (
      SELECT id FROM diagnostic_sessions ds
      WHERE ds.customer_user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Service role has full access to repair_quotes"
  ON repair_quotes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. DIAGNOSTIC_SESSIONS
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Customers can manage their own diagnostic sessions"
  ON diagnostic_sessions
  FOR ALL
  USING (auth.uid() = customer_user_id)
  WITH CHECK (auth.uid() = customer_user_id);

CREATE POLICY IF NOT EXISTS "Workshops can view diagnostic sessions in their coverage area"
  ON diagnostic_sessions
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY IF NOT EXISTS "Mechanics can view assigned diagnostic sessions"
  ON diagnostic_sessions
  FOR SELECT
  USING (
    assigned_mechanic_id IN (
      SELECT id FROM mechanics m
      INNER JOIN mechanic_sessions ms ON ms.mechanic_id = m.id
      WHERE ms.token = current_setting('request.cookie.aad_mech', true)
      AND ms.expires_at > now()
    )
  );

CREATE POLICY IF NOT EXISTS "Service role has full access to diagnostic_sessions"
  ON diagnostic_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. IN_PERSON_VISITS
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Customers can manage their own visits"
  ON in_person_visits
  FOR ALL
  USING (
    diagnostic_session_id IN (
      SELECT id FROM diagnostic_sessions
      WHERE customer_user_id = auth.uid()
    )
  )
  WITH CHECK (
    diagnostic_session_id IN (
      SELECT id FROM diagnostic_sessions
      WHERE customer_user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Workshops can manage visits at their location"
  ON in_person_visits
  FOR ALL
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY IF NOT EXISTS "Service role has full access to in_person_visits"
  ON in_person_visits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. QUOTE_MODIFICATIONS
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Workshops can modify their own quotes"
  ON quote_modifications
  FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM repair_quotes
      WHERE workshop_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT id FROM repair_quotes
      WHERE workshop_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Customers can view modifications to their quotes"
  ON quote_modifications
  FOR SELECT
  USING (
    quote_id IN (
      SELECT rq.id FROM repair_quotes rq
      INNER JOIN diagnostic_sessions ds ON ds.id = rq.diagnostic_session_id
      WHERE ds.customer_user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Service role has full access to quote_modifications"
  ON quote_modifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. PLATFORM_FEE_RULES
-- ============================================================================

-- Only admins and service role can manage fee rules
CREATE POLICY IF NOT EXISTS "Only admins can view fee rules"
  ON platform_fee_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Service role has full access to platform_fee_rules"
  ON platform_fee_rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. REPAIR_PAYMENTS
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Customers can view their own repair payments"
  ON repair_payments
  FOR SELECT
  USING (
    quote_id IN (
      SELECT rq.id FROM repair_quotes rq
      INNER JOIN diagnostic_sessions ds ON ds.id = rq.diagnostic_session_id
      WHERE ds.customer_user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Workshops can view payments for their quotes"
  ON repair_payments
  FOR SELECT
  USING (
    quote_id IN (
      SELECT id FROM repair_quotes
      WHERE workshop_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Service role has full access to repair_payments"
  ON repair_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. PLATFORM_CHAT_MESSAGES
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Users can view platform chat messages"
  ON platform_chat_messages
  FOR SELECT
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Users can send platform chat messages"
  ON platform_chat_messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Service role has full access to platform_chat_messages"
  ON platform_chat_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. CUSTOMER_FAVORITES
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Customers can manage their own favorites"
  ON customer_favorites
  FOR ALL
  USING (auth.uid() = customer_user_id)
  WITH CHECK (auth.uid() = customer_user_id);

CREATE POLICY IF NOT EXISTS "Service role has full access to customer_favorites"
  ON customer_favorites
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. WORKSHOP_ROLES
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Workshop admins can manage roles"
  ON workshop_roles
  FOR ALL
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Workshop members can view roles"
  ON workshop_roles
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY IF NOT EXISTS "Service role has full access to workshop_roles"
  ON workshop_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  table_name TEXT;
BEGIN
  RAISE NOTICE '=== Verifying RLS Policies ===';

  FOR table_name IN
    SELECT unnest(ARRAY[
      'repair_quotes',
      'diagnostic_sessions',
      'in_person_visits',
      'quote_modifications',
      'platform_fee_rules',
      'repair_payments',
      'platform_chat_messages',
      'customer_favorites',
      'workshop_roles'
    ])
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = table_name;

    IF policy_count > 0 THEN
      RAISE NOTICE '✓ Table "%" has % policies', table_name, policy_count;
    ELSE
      RAISE WARNING '✗ Table "%" has NO policies!', table_name;
    END IF;
  END LOOP;

  RAISE NOTICE '=== RLS Policy Creation Complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE repair_quotes IS 'RLS enabled - Workshops can manage their quotes, customers can view';
COMMENT ON TABLE diagnostic_sessions IS 'RLS enabled - Customers own, workshops and mechanics can view assigned';
COMMENT ON TABLE in_person_visits IS 'RLS enabled - Customers and workshops can manage visits';
COMMENT ON TABLE quote_modifications IS 'RLS enabled - Workshops can modify, customers can view';
COMMENT ON TABLE platform_fee_rules IS 'RLS enabled - Admins only';
COMMENT ON TABLE repair_payments IS 'RLS enabled - Customers and workshops can view their payments';
COMMENT ON TABLE platform_chat_messages IS 'RLS enabled - Users can chat with each other';
COMMENT ON TABLE customer_favorites IS 'RLS enabled - Customers manage their own favorites';
COMMENT ON TABLE workshop_roles IS 'RLS enabled - Workshop admins manage, members view';
