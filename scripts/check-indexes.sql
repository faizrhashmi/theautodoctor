-- Check existing indexes on sessions table
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sessions', 'session_assignments', 'intakes')
ORDER BY tablename, indexname;
