-- Check actual column names in sessions, intakes, and session_assignments tables
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sessions', 'intakes', 'session_assignments')
ORDER BY table_name, ordinal_position;
