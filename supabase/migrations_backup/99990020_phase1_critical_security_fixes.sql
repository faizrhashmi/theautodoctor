-- ============================================================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- ============================================================================
-- Purpose: Add missing RLS policies and critical indexes
-- Priority: P0 - These fixes prevent unauthorized data access
-- Date: 2025-10-28
--
-- Based on actual database state - only fixes what's missing
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENABLE RLS ON TABLES MISSING PROTECTION
-- ============================================================================

-- Mechanic earnings (MISSING RLS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mechanic_earnings') THEN
    ALTER TABLE public.mechanic_earnings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Mechanics can view their earnings" ON public.mechanic_earnings;
    CREATE POLICY "Mechanics can view their earnings" ON public.mechanic_earnings
      FOR SELECT
      USING (mechanic_id IN (
        SELECT m.id FROM public.mechanics m
        INNER JOIN public.mechanic_sessions ms ON ms.mechanic_id = m.id
        WHERE ms.token = current_setting('request.cookie.aad_mech', true)
          AND ms.expires_at > now()
      ));

    RAISE NOTICE 'RLS enabled on mechanic_earnings';
  END IF;
END $$;

-- Workshop earnings (MISSING RLS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workshop_earnings') THEN
    ALTER TABLE public.workshop_earnings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Workshop admins can view their earnings" ON public.workshop_earnings;
    CREATE POLICY "Workshop admins can view their earnings" ON public.workshop_earnings
      FOR SELECT
      USING (
        workshop_id IN (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
      );

    RAISE NOTICE 'RLS enabled on workshop_earnings';
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: ADD CRITICAL INDEXES (Performance & Security)
-- ============================================================================

-- Indexes for foreign keys (improve join performance)
CREATE INDEX IF NOT EXISTS idx_sessions_mechanic_id ON public.sessions(mechanic_id) WHERE mechanic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_customer_user_id ON public.sessions(customer_user_id) WHERE customer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_files_session_id ON public.session_files(session_id);
CREATE INDEX IF NOT EXISTS idx_session_files_uploaded_by ON public.session_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_session_requests_customer_id ON public.session_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON public.session_requests(status);
CREATE INDEX IF NOT EXISTS idx_session_requests_created_at ON public.session_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_mechanic_id ON public.mechanic_sessions(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_token ON public.mechanic_sessions(token);
CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_expires_at ON public.mechanic_sessions(expires_at);

-- Note: intakes table does not have customer_user_id (stores contact info only)
CREATE INDEX IF NOT EXISTS idx_intakes_created_at ON public.intakes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intakes_status ON public.intakes(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intakes_email ON public.intakes(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- SECTION 3: ADD UPDATED_AT TRIGGERS (Audit Trail)
-- ============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at column
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'updated_at'
      AND table_name IN ('sessions', 'intakes', 'mechanics', 'profiles', 'organizations', 'service_plans')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', tbl, tbl);
    RAISE NOTICE 'Updated_at trigger added to %', tbl;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled on critical tables
DO $$
DECLARE
  tbl_record RECORD;
  rls_enabled BOOLEAN;
  missing_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================== RLS VERIFICATION ====================';

  FOR tbl_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('sessions', 'session_files', 'profiles', 'intakes', 'mechanics',
                        'mechanic_sessions', 'service_plans', 'mechanic_earnings',
                        'workshop_earnings', 'admin_logs', 'admin_errors', 'mechanic_time_off')
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = tbl_record.tablename
      AND relnamespace = 'public'::regnamespace;

    IF rls_enabled THEN
      RAISE NOTICE '✓ RLS enabled on: %', tbl_record.tablename;
    ELSE
      RAISE WARNING '✗ RLS NOT enabled on: % - SECURITY RISK!', tbl_record.tablename;
      missing_rls := array_append(missing_rls, tbl_record.tablename);
    END IF;
  END LOOP;

  IF array_length(missing_rls, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE WARNING 'Tables missing RLS: %', array_to_string(missing_rls, ', ');
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'All critical tables have RLS enabled!';
  END IF;

  RAISE NOTICE '==========================================================';
END $$;

-- Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('sessions', 'session_files', 'profiles', 'intakes', 'mechanics',
                    'mechanic_earnings', 'workshop_earnings')
GROUP BY tablename
ORDER BY policy_count DESC;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Phase 1 critical security fixes completed successfully!
-- All RLS policies, indexes, and triggers have been applied.
--
-- Next steps:
-- 1. Review the output above for any warnings
-- 2. Verify all tables show "RLS enabled" in the verification section
-- 3. Test application functionality to ensure nothing broke
-- ============================================================================
