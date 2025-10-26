-- Run this first to see what's currently in your database

-- Check if sessions table exists and its structure
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sessions'
ORDER BY ordinal_position;

-- Check if the enum types exist
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('session_type', 'session_participant_role')
ORDER BY t.typname, e.enumsortorder;

-- Check all tables starting with 'session'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'session%';
