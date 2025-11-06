-- ============================================================================
-- DEBUG REALTIME CONFIGURATION
-- Comprehensive check of realtime setup
-- ============================================================================

-- Check publication configuration
SELECT
  'Publication Check' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND tablename = 'session_assignments'
    ) THEN '✅ Table in publication'
    ELSE '❌ Table NOT in publication'
  END as status;

-- Check replica identity
SELECT
  'Replica Identity' as check_name,
  CASE c.relreplident
    WHEN 'f' THEN '✅ FULL (correct)'
    WHEN 'd' THEN '⚠️ DEFAULT (needs FULL)'
    ELSE '❌ ' || c.relreplident || ' (incorrect)'
  END as status
FROM pg_class c
WHERE c.relname = 'session_assignments';

-- Check RLS policies
SELECT
  'RLS Policies' as check_name,
  COUNT(*)::text || ' policies found' as status
FROM pg_policies
WHERE tablename = 'session_assignments';

-- List all policies
SELECT
  policyname,
  cmd as command,
  roles,
  CASE
    WHEN permissive = 'PERMISSIVE' THEN '✅'
    ELSE '⚠️'
  END as type
FROM pg_policies
WHERE tablename = 'session_assignments'
ORDER BY cmd, policyname;

-- Check if RLS is enabled
SELECT
  'RLS Enabled' as check_name,
  CASE rowsecurity
    WHEN true THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as status
FROM pg_tables
WHERE tablename = 'session_assignments';
