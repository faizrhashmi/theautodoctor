-- ============================================================================
-- PHASE 3.1: ADD JSONB VALIDATION CONSTRAINTS
-- ============================================================================
-- This migration adds CHECK constraints to validate JSONB field structure.
-- Currently no validation exists, allowing malformed data that crashes code.
--
-- Critical Fields:
-- - repair_quotes.line_items (MUST be array)
-- - organization_members.permissions (MUST be object)
-- - diagnostic_sessions.photos (MUST be array)
-- - corporate_businesses.session_ids (MUST be array)
--
-- Date: 2025-10-27
-- Priority: MEDIUM-HIGH
-- ============================================================================

-- ============================================================================
-- 1. REPAIR_QUOTES - line_items must be array
-- ============================================================================

ALTER TABLE repair_quotes
ADD CONSTRAINT line_items_is_array
CHECK (jsonb_typeof(line_items) = 'array');

-- ============================================================================
-- 2. DIAGNOSTIC_SESSIONS - photos must be array
-- ============================================================================

ALTER TABLE diagnostic_sessions
ADD CONSTRAINT photos_is_array
CHECK (photos IS NULL OR jsonb_typeof(photos) = 'array');

ALTER TABLE diagnostic_sessions
ADD CONSTRAINT vehicle_info_is_object
CHECK (vehicle_info IS NULL OR jsonb_typeof(vehicle_info) = 'object');

-- ============================================================================
-- 3. ORGANIZATION_MEMBERS - permissions must be object
-- ============================================================================

ALTER TABLE organization_members
ADD CONSTRAINT permissions_is_object
CHECK (jsonb_typeof(permissions) = 'object');

-- ============================================================================
-- 4. ORGANIZATIONS - settings and metadata must be objects
-- ============================================================================

ALTER TABLE organizations
ADD CONSTRAINT settings_is_object
CHECK (jsonb_typeof(settings) = 'object');

ALTER TABLE organizations
ADD CONSTRAINT metadata_is_object
CHECK (jsonb_typeof(metadata) = 'object');

-- ============================================================================
-- 5. CORPORATE_BUSINESSES - session_ids must be array
-- ============================================================================

ALTER TABLE corporate_businesses
ADD CONSTRAINT session_ids_is_array
CHECK (jsonb_typeof(session_ids) = 'array');

-- ============================================================================
-- 6. WORKSHOP_EVENTS - metadata must be object
-- ============================================================================

ALTER TABLE workshop_events
ADD CONSTRAINT metadata_is_object
CHECK (jsonb_typeof(metadata) = 'object');

-- ============================================================================
-- 7. SESSION_FILES - metadata must be object
-- ============================================================================

ALTER TABLE session_files
ADD CONSTRAINT metadata_is_object
CHECK (jsonb_typeof(metadata) = 'object');

-- ============================================================================
-- 8. SESSION_RECORDINGS - metadata must be object
-- ============================================================================

ALTER TABLE session_recordings
ADD CONSTRAINT metadata_is_object
CHECK (jsonb_typeof(metadata) = 'object');

-- ============================================================================
-- 9. ADMIN_LOGS - metadata must be object
-- ============================================================================

ALTER TABLE admin_logs
ADD CONSTRAINT metadata_is_object
CHECK (jsonb_typeof(metadata) = 'object');

-- ============================================================================
-- 10. SYSTEM_HEALTH_CHECKS - summary must be object
-- ============================================================================

ALTER TABLE system_health_checks
ADD CONSTRAINT summary_is_object
CHECK (jsonb_typeof(summary) = 'object');

-- ============================================================================
-- 11. MECHANICS - other_certifications must be object
-- ============================================================================

ALTER TABLE mechanics
ADD CONSTRAINT other_certifications_is_object
CHECK (jsonb_typeof(other_certifications) = 'object');

ALTER TABLE mechanics
ADD CONSTRAINT application_draft_is_object
CHECK (application_draft IS NULL OR jsonb_typeof(application_draft) = 'object');

-- ============================================================================
-- 12. WORKSHOP_ANALYTICS_METRICS - metadata must be object
-- ============================================================================

ALTER TABLE workshop_analytics_metrics
ADD CONSTRAINT metadata_is_object
CHECK (jsonb_typeof(metadata) = 'object');

-- ============================================================================
-- 13. PARTNERSHIP_PROGRAMS - approved_terms must be object
-- ============================================================================

ALTER TABLE partnership_programs
ADD CONSTRAINT approved_terms_is_object
CHECK (approved_terms IS NULL OR jsonb_typeof(approved_terms) = 'object');

-- ============================================================================
-- 14. PARTNERSHIP_CONTRACTS - terms must be object
-- ============================================================================

ALTER TABLE partnership_contracts
ADD CONSTRAINT terms_is_object
CHECK (jsonb_typeof(terms) = 'object');

-- ============================================================================
-- 15. QUOTE_MODIFICATIONS - arrays must be arrays
-- ============================================================================

ALTER TABLE quote_modifications
ADD CONSTRAINT added_items_is_array
CHECK (added_items IS NULL OR jsonb_typeof(added_items) = 'array');

ALTER TABLE quote_modifications
ADD CONSTRAINT removed_items_is_array
CHECK (removed_items IS NULL OR jsonb_typeof(removed_items) = 'array');

ALTER TABLE quote_modifications
ADD CONSTRAINT modified_items_is_array
CHECK (modified_items IS NULL OR jsonb_typeof(modified_items) = 'array');

-- ============================================================================
-- 16. PLATFORM_CHAT_MESSAGES - attachments must be array
-- ============================================================================

ALTER TABLE platform_chat_messages
ADD CONSTRAINT attachments_is_array
CHECK (jsonb_typeof(attachments) = 'array');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  constraint_count INTEGER;
  test_failed BOOLEAN := false;
BEGIN
  RAISE NOTICE '=== Verifying JSONB Validation Constraints ===';

  -- Count CHECK constraints added
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE contype = 'c'
  AND (
    conname LIKE '%_is_array'
    OR conname LIKE '%_is_object'
  );

  IF constraint_count >= 20 THEN
    RAISE NOTICE '✓ Added % JSONB validation constraints', constraint_count;
  ELSE
    RAISE WARNING '✗ Only % JSONB validation constraints found (expected 20+)', constraint_count;
  END IF;

  -- Test that invalid data is rejected
  BEGIN
    -- This should fail: line_items must be array, not object
    INSERT INTO repair_quotes (
      diagnostic_session_id,
      workshop_id,
      line_items
    ) VALUES (
      gen_random_uuid(),
      gen_random_uuid(),
      '{"invalid": "structure"}'::jsonb
    );
    test_failed := true;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✓ line_items constraint working: rejected object when array required';
  END;

  IF test_failed THEN
    RAISE WARNING '✗ JSONB validation is not working!';
  END IF;

  RAISE NOTICE '=== JSONB validation constraints complete ===';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT line_items_is_array ON repair_quotes IS 'Ensures line_items is a JSON array';
COMMENT ON CONSTRAINT photos_is_array ON diagnostic_sessions IS 'Ensures photos is a JSON array';
COMMENT ON CONSTRAINT permissions_is_object ON organization_members IS 'Ensures permissions is a JSON object';
COMMENT ON CONSTRAINT session_ids_is_array ON corporate_businesses IS 'Ensures session_ids is a JSON array';
