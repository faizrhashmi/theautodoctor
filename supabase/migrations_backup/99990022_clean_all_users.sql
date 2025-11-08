-- ============================================================================
-- CLEAN ALL USERS - START FRESH
-- ============================================================================
-- Purpose: Delete all users and related data to start fresh
-- Date: 2025-10-28
-- ============================================================================

-- Disable triggers temporarily to avoid conflicts
SET session_replication_role = 'replica';

-- ============================================================================
-- DELETE ALL USER DATA
-- ============================================================================

-- Delete session-related data
DELETE FROM public.session_requests;
DELETE FROM public.diagnostic_sessions;
DELETE FROM public.chat_messages;

-- Delete customer data
DELETE FROM public.customer_vehicles;
DELETE FROM public.customers;

-- Delete mechanic data
DELETE FROM public.mechanic_documents;
DELETE FROM public.mechanic_time_off;
DELETE FROM public.mechanics;

-- Delete workshop/organization data
DELETE FROM public.workshop_mechanics;
DELETE FROM public.organizations;

-- Delete auth users (this is the Supabase auth table)
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- RESET SEQUENCES (Optional - for clean IDs)
-- ============================================================================

-- Reset auto-increment sequences if needed
-- ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS mechanics_id_seq RESTART WITH 1;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  auth_user_count INTEGER;
  customer_count INTEGER;
  mechanic_count INTEGER;
  org_count INTEGER;
  session_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================== CLEANUP VERIFICATION ====================';

  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  SELECT COUNT(*) INTO customer_count FROM public.customers;
  SELECT COUNT(*) INTO mechanic_count FROM public.mechanics;
  SELECT COUNT(*) INTO org_count FROM public.organizations;
  SELECT COUNT(*) INTO session_count FROM public.diagnostic_sessions;

  RAISE NOTICE 'Remaining records:';
  RAISE NOTICE '  - Auth users: %', auth_user_count;
  RAISE NOTICE '  - Customers: %', customer_count;
  RAISE NOTICE '  - Mechanics: %', mechanic_count;
  RAISE NOTICE '  - Organizations: %', org_count;
  RAISE NOTICE '  - Sessions: %', session_count;

  IF auth_user_count = 0 AND customer_count = 0 AND mechanic_count = 0 THEN
    RAISE NOTICE '✓ Database cleaned successfully - ready for fresh start!';
  ELSE
    RAISE WARNING '⚠ Some records remain - check foreign key constraints';
  END IF;

  RAISE NOTICE '==============================================================';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
