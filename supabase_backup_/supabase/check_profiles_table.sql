-- Check if profiles table exists and what's in it
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check your user profile if table exists
SELECT * FROM profiles LIMIT 5;

-- Get your auth user ID
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;
