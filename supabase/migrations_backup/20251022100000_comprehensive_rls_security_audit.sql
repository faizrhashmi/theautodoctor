-- ============================================================================
-- COMPREHENSIVE RLS SECURITY AUDIT & FIX
-- ============================================================================
-- This migration ensures ALL tables have proper Row Level Security (RLS)
-- policies to prevent unauthorized data access.
--
-- CRITICAL SECURITY: Without proper RLS, users can access data belonging
-- to other users, violating data privacy and security requirements.
--
-- Date: 2025-10-22
-- Purpose: Security hardening - enforce role-based access control at database level
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (for signup)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- 2. INTAKES TABLE
-- ============================================================================

ALTER TABLE IF EXISTS public.intakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own intakes" ON public.intakes;
DROP POLICY IF EXISTS "Users can insert their own intakes" ON public.intakes;
DROP POLICY IF EXISTS "Users can update their own intakes" ON public.intakes;
DROP POLICY IF EXISTS "Admins can view all intakes" ON public.intakes;
DROP POLICY IF EXISTS "Mechanics can view intakes for their sessions" ON public.intakes;

-- Policy: Users can view their own intakes
CREATE POLICY "Users can view their own intakes"
  ON public.intakes
  FOR SELECT
  USING (auth.uid() = customer_user_id);

-- Policy: Users can insert their own intakes
CREATE POLICY "Users can insert their own intakes"
  ON public.intakes
  FOR INSERT
  WITH CHECK (auth.uid() = customer_user_id);

-- Policy: Users can update their own intakes
CREATE POLICY "Users can update their own intakes"
  ON public.intakes
  FOR UPDATE
  USING (auth.uid() = customer_user_id)
  WITH CHECK (auth.uid() = customer_user_id);

-- Policy: Admins can view all intakes
CREATE POLICY "Admins can view all intakes"
  ON public.intakes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Policy: Mechanics can view intakes for sessions they're assigned to
-- Note: Mechanics don't use Supabase auth, so this is for future use
CREATE POLICY "Mechanics can view intakes for their sessions"
  ON public.intakes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.intake_id = intakes.id
      AND s.mechanic_id IN (
        SELECT id FROM public.mechanics m
        INNER JOIN public.mechanic_sessions ms ON ms.mechanic_id = m.id
        WHERE ms.token = current_setting('request.cookie.aad_mech', true)
        AND ms.expires_at > now()
      )
    )
  );

-- ============================================================================
-- 3. SESSIONS TABLE
-- ============================================================================

ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Customers can insert their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Customers can update their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sessions;
DROP POLICY IF EXISTS "Mechanics can view assigned sessions" ON public.sessions;
DROP POLICY IF EXISTS "Mechanics can update assigned sessions" ON public.sessions;

-- Policy: Customers can view their own sessions
CREATE POLICY "Customers can view their own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = customer_user_id);

-- Policy: Customers can insert their own sessions
CREATE POLICY "Customers can insert their own sessions"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = customer_user_id);

-- Policy: Customers can update their own sessions
CREATE POLICY "Customers can update their own sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = customer_user_id)
  WITH CHECK (auth.uid() = customer_user_id);

-- Policy: Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON public.sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Policy: Mechanics can view sessions assigned to them
-- Note: Mechanics use custom auth, so this uses mechanic_sessions table
CREATE POLICY "Mechanics can view assigned sessions"
  ON public.sessions
  FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM public.mechanics m
      INNER JOIN public.mechanic_sessions ms ON ms.mechanic_id = m.id
      WHERE ms.token = current_setting('request.cookie.aad_mech', true)
      AND ms.expires_at > now()
    )
  );

-- Policy: Mechanics can update sessions assigned to them
CREATE POLICY "Mechanics can update assigned sessions"
  ON public.sessions
  FOR UPDATE
  USING (
    mechanic_id IN (
      SELECT id FROM public.mechanics m
      INNER JOIN public.mechanic_sessions ms ON ms.mechanic_id = m.id
      WHERE ms.token = current_setting('request.cookie.aad_mech', true)
      AND ms.expires_at > now()
    )
  )
  WITH CHECK (
    mechanic_id IN (
      SELECT id FROM public.mechanics m
      INNER JOIN public.mechanic_sessions ms ON ms.mechanic_id = m.id
      WHERE ms.token = current_setting('request.cookie.aad_mech', true)
      AND ms.expires_at > now()
    )
  );

-- ============================================================================
-- 4. SESSION_PARTICIPANTS TABLE
-- ============================================================================

ALTER TABLE IF EXISTS public.session_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own participations" ON public.session_participants;
DROP POLICY IF EXISTS "Users can insert their own participations" ON public.session_participants;
DROP POLICY IF EXISTS "Admins can view all participations" ON public.session_participants;

-- Policy: Users can view sessions they're participating in
CREATE POLICY "Users can view their own participations"
  ON public.session_participants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can join sessions (insert participation)
CREATE POLICY "Users can insert their own participations"
  ON public.session_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all participations
CREATE POLICY "Admins can view all participations"
  ON public.session_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- 5. VEHICLES TABLE
-- ============================================================================

ALTER TABLE IF EXISTS public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;

-- Policy: Users can view their own vehicles
CREATE POLICY "Users can view their own vehicles"
  ON public.vehicles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own vehicles
CREATE POLICY "Users can insert their own vehicles"
  ON public.vehicles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own vehicles
CREATE POLICY "Users can update their own vehicles"
  ON public.vehicles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own vehicles
CREATE POLICY "Users can delete their own vehicles"
  ON public.vehicles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. MECHANICS TABLE
-- ============================================================================

ALTER TABLE IF EXISTS public.mechanics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mechanics can view their own profile" ON public.mechanics;
DROP POLICY IF EXISTS "Mechanics can update their own profile" ON public.mechanics;
DROP POLICY IF EXISTS "Admins can view all mechanics" ON public.mechanics;

-- Policy: Mechanics can view their own profile
-- Uses mechanic_sessions table for custom auth
CREATE POLICY "Mechanics can view their own profile"
  ON public.mechanics
  FOR SELECT
  USING (
    id IN (
      SELECT mechanic_id FROM public.mechanic_sessions
      WHERE token = current_setting('request.cookie.aad_mech', true)
      AND expires_at > now()
    )
  );

-- Policy: Mechanics can update their own profile
CREATE POLICY "Mechanics can update their own profile"
  ON public.mechanics
  FOR UPDATE
  USING (
    id IN (
      SELECT mechanic_id FROM public.mechanic_sessions
      WHERE token = current_setting('request.cookie.aad_mech', true)
      AND expires_at > now()
    )
  )
  WITH CHECK (
    id IN (
      SELECT mechanic_id FROM public.mechanic_sessions
      WHERE token = current_setting('request.cookie.aad_mech', true)
      AND expires_at > now()
    )
  );

-- Policy: Admins can view all mechanics
CREATE POLICY "Admins can view all mechanics"
  ON public.mechanics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- 7. MECHANIC_SESSIONS TABLE
-- ============================================================================

ALTER TABLE IF EXISTS public.mechanic_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mechanics can view their own sessions" ON public.mechanic_sessions;
DROP POLICY IF EXISTS "Mechanics can delete their own sessions" ON public.mechanic_sessions;

-- Policy: Mechanics can view their own sessions
CREATE POLICY "Mechanics can view their own sessions"
  ON public.mechanic_sessions
  FOR SELECT
  USING (
    mechanic_id IN (
      SELECT mechanic_id FROM public.mechanic_sessions ms
      WHERE ms.token = current_setting('request.cookie.aad_mech', true)
      AND ms.expires_at > now()
    )
  );

-- Policy: Mechanics can delete their own sessions (logout)
CREATE POLICY "Mechanics can delete their own sessions"
  ON public.mechanic_sessions
  FOR DELETE
  USING (
    mechanic_id IN (
      SELECT mechanic_id FROM public.mechanic_sessions ms
      WHERE ms.token = current_setting('request.cookie.aad_mech', true)
      AND ms.expires_at > now()
    )
  );

-- ============================================================================
-- 8. CHAT_MESSAGES TABLE (if exists)
-- ============================================================================

ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their sessions" ON public.chat_messages;

-- Policy: Users can view messages in sessions they're part of
CREATE POLICY "Users can view messages in their sessions"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = chat_messages.session_id
      AND sp.user_id = auth.uid()
    )
  );

-- Policy: Users can send messages in sessions they're part of
CREATE POLICY "Users can insert messages in their sessions"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = chat_messages.session_id
      AND sp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. INTAKE_DELETIONS TABLE (if exists)
-- ============================================================================

ALTER TABLE IF EXISTS public.intake_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view deletion logs" ON public.intake_deletions;

-- Policy: Only admins can view deletion logs
CREATE POLICY "Admins can view deletion logs"
  ON public.intake_deletions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- 10. CONTACT_REQUESTS TABLE (if exists)
-- ============================================================================

ALTER TABLE IF EXISTS public.contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Admins can view contact requests" ON public.contact_requests;

-- Policy: Anyone can submit contact requests (even unauthenticated)
CREATE POLICY "Anyone can insert contact requests"
  ON public.contact_requests
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view contact requests
CREATE POLICY "Admins can view contact requests"
  ON public.contact_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- SECURITY VERIFICATION
-- ============================================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
  table_record RECORD;
  rls_enabled BOOLEAN;
BEGIN
  RAISE NOTICE 'Verifying RLS is enabled on all public tables...';

  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_record.tablename
    AND relnamespace = 'public'::regnamespace;

    IF rls_enabled THEN
      RAISE NOTICE '✓ RLS enabled on: %', table_record.tablename;
    ELSE
      RAISE WARNING '✗ RLS NOT enabled on: % - SECURITY RISK!', table_record.tablename;
    END IF;
  END LOOP;

  RAISE NOTICE 'RLS verification complete.';
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant authenticated users access to tables (RLS will restrict based on policies)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.intakes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated;
GRANT SELECT, INSERT ON public.session_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

-- Anonymous users should have very limited access
GRANT INSERT ON public.contact_requests TO anon;
GRANT SELECT ON public.session_files TO anon; -- For file downloads via signed URLs

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'RLS enabled - users can only access their own profile';
COMMENT ON TABLE public.intakes IS 'RLS enabled - users can only access their own intakes';
COMMENT ON TABLE public.sessions IS 'RLS enabled - users can only access their own sessions';
COMMENT ON TABLE public.session_participants IS 'RLS enabled - users can only access their own participations';
