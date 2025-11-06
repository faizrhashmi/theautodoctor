-- Check if session_assignments is in the publication
SELECT 
  schemaname, 
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'session_assignments';

-- List all tables in publication (for debugging)
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check replica identity
SELECT 
  c.relname AS table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'DEFAULT'
    WHEN 'n' THEN 'NOTHING'
    WHEN 'f' THEN 'FULL'
    WHEN 'i' THEN 'INDEX'
  END AS replica_identity
FROM pg_class c
WHERE c.relname = 'session_assignments';
