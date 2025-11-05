-- Check if the function exists and show its details
SELECT
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  p.prosrc as source_code_snippet
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'end_session_with_semantics'
  AND n.nspname = 'public';

-- Also check function signature details
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'end_session_with_semantics';

-- Check parameter details
SELECT
  specific_name,
  parameter_name,
  parameter_mode,
  data_type,
  ordinal_position
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE '%end_session_with_semantics%'
ORDER BY ordinal_position;
