-- Enable Realtime for mechanic dashboard and chat
-- Run this in Supabase SQL Editor

-- Note: This SQL just verifies the setup.
-- You must enable Realtime via the Dashboard UI:
-- Database → Replication → Enable for these tables

-- Check which tables have Realtime enabled
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('sessions', 'session_participants', 'chat_messages')
ORDER BY tablename;

-- Expected output: All three tables should be listed
-- If any are missing, go to Database → Replication in Supabase Dashboard

-- Verify the tables exist and have correct structure
SELECT
  t.table_name,
  COUNT(c.column_name) as column_count
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON c.table_name = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('sessions', 'session_participants', 'chat_messages')
GROUP BY t.table_name
ORDER BY t.table_name;

-- Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sessions', 'session_participants', 'chat_messages')
ORDER BY tablename;

-- All should show rowsecurity = true

SELECT '✅ Setup verification complete! Now enable Realtime in Dashboard → Replication' AS status;
