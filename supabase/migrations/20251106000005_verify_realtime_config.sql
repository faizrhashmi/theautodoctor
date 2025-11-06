-- ============================================================================
-- VERIFY REALTIME CONFIGURATION
-- Run this to check everything is set up correctly
-- ============================================================================

-- 1. Check if table is in publication
SELECT
  'Publication Check' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_assignments'
    ) THEN '✅ session_assignments is in supabase_realtime publication'
    ELSE '❌ session_assignments is NOT in publication'
  END as status;

-- 2. Check replica identity
SELECT
  'Replica Identity' as check_type,
  CASE c.relreplident
    WHEN 'f' THEN '✅ FULL (correct for realtime)'
    WHEN 'd' THEN '❌ DEFAULT (needs to be FULL)'
    ELSE '⚠️ ' || c.relreplident
  END as status
FROM pg_class c
WHERE c.relname = 'session_assignments';

-- 3. Check RLS is enabled
SELECT
  'RLS Status' as check_type,
  CASE
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'session_assignments';

-- 4. List all tables in supabase_realtime publication
SELECT
  'Tables in Publication' as check_type,
  string_agg(tablename, ', ') as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public';

-- 5. Show RLS policies for session_assignments
SELECT
  'RLS Policies' as check_type,
  COUNT(*)::text || ' policies found' as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'session_assignments';
