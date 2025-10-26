-- Helpful SQL queries for testing and managing sessions

-- ========================================
-- VIEW RECENT SESSIONS
-- ========================================

-- View all recent sessions with participant counts
SELECT
  s.id,
  s.type,
  s.plan,
  s.status,
  s.created_at,
  s.stripe_session_id,
  s.customer_user_id,
  COUNT(sp.user_id) as participant_count,
  COUNT(sp.user_id) FILTER (WHERE sp.role = 'mechanic') as mechanic_count
FROM sessions s
LEFT JOIN session_participants sp ON sp.session_id = s.id
GROUP BY s.id
ORDER BY s.created_at DESC
LIMIT 10;

-- ========================================
-- VIEW CHAT SESSIONS WITHOUT MECHANICS
-- ========================================

SELECT
  s.id,
  s.created_at,
  s.customer_user_id,
  au.email as customer_email
FROM sessions s
LEFT JOIN auth.users au ON au.id = s.customer_user_id
WHERE s.type = 'chat'
  AND NOT EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = s.id AND sp.role = 'mechanic'
  )
ORDER BY s.created_at DESC;

-- ========================================
-- VIEW ALL USERS (FOR MECHANIC ASSIGNMENT)
-- ========================================

SELECT
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- ========================================
-- ASSIGN MECHANIC TO SESSION
-- ========================================

-- First, get the session ID and mechanic user ID from queries above
-- Then run this with your actual IDs:

-- INSERT INTO session_participants (session_id, user_id, role)
-- VALUES (
--   'SESSION_ID_HERE',  -- Replace with actual session ID
--   'MECHANIC_USER_ID_HERE',  -- Replace with actual mechanic user ID
--   'mechanic'
-- );

-- Example:
-- INSERT INTO session_participants (session_id, user_id, role)
-- VALUES (
--   '123e4567-e89b-12d3-a456-426614174000',
--   '987fcdeb-51a2-43f7-b123-456789abcdef',
--   'mechanic'
-- );

-- ========================================
-- VIEW CHAT MESSAGES FOR A SESSION
-- ========================================

-- Replace SESSION_ID_HERE with your actual session ID
-- SELECT
--   cm.id,
--   cm.created_at,
--   cm.content,
--   cm.sender_id,
--   au.email as sender_email,
--   sp.role as sender_role
-- FROM chat_messages cm
-- LEFT JOIN auth.users au ON au.id = cm.sender_id
-- LEFT JOIN session_participants sp ON sp.user_id = cm.sender_id
--   AND sp.session_id = cm.session_id
-- WHERE cm.session_id = 'SESSION_ID_HERE'
-- ORDER BY cm.created_at ASC;

-- ========================================
-- VIEW SESSION PARTICIPANTS
-- ========================================

-- Replace SESSION_ID_HERE with your actual session ID
-- SELECT
--   sp.id,
--   sp.role,
--   sp.created_at,
--   au.email,
--   au.id as user_id
-- FROM session_participants sp
-- LEFT JOIN auth.users au ON au.id = sp.user_id
-- WHERE sp.session_id = 'SESSION_ID_HERE'
-- ORDER BY sp.created_at;

-- ========================================
-- COUNT MESSAGES PER SESSION
-- ========================================

SELECT
  s.id,
  s.type,
  s.plan,
  s.status,
  COUNT(cm.id) as message_count,
  MIN(cm.created_at) as first_message,
  MAX(cm.created_at) as last_message
FROM sessions s
LEFT JOIN chat_messages cm ON cm.session_id = s.id
WHERE s.type = 'chat'
GROUP BY s.id
ORDER BY s.created_at DESC;

-- ========================================
-- FIND SESSIONS BY CUSTOMER EMAIL
-- ========================================

-- SELECT
--   s.id,
--   s.type,
--   s.plan,
--   s.status,
--   s.created_at,
--   au.email
-- FROM sessions s
-- LEFT JOIN auth.users au ON au.id = s.customer_user_id
-- WHERE au.email ILIKE '%SEARCH_EMAIL_HERE%'
-- ORDER BY s.created_at DESC;

-- ========================================
-- CLEAN UP TEST DATA (USE WITH CAUTION!)
-- ========================================

-- Delete all chat sessions created in the last hour (for testing cleanup)
-- UNCOMMENT TO USE - BE CAREFUL!
-- DELETE FROM sessions
-- WHERE type = 'chat'
--   AND created_at > NOW() - INTERVAL '1 hour';

-- ========================================
-- UPDATE SESSION STATUS
-- ========================================

-- Mark session as active
-- UPDATE sessions
-- SET status = 'active'
-- WHERE id = 'SESSION_ID_HERE';

-- Mark session as completed
-- UPDATE sessions
-- SET status = 'completed'
-- WHERE id = 'SESSION_ID_HERE';

-- ========================================
-- CREATE A TEST MECHANIC USER
-- ========================================

-- NOTE: You can't directly insert into auth.users via SQL
-- Instead, create a new user via:
-- 1. Supabase Dashboard → Authentication → Users → Add User
-- 2. Or use the sign-up flow in your app
-- 3. Then use the user ID in the ASSIGN MECHANIC query above

-- ========================================
-- CHECK RLS POLICIES
-- ========================================

-- View all policies on sessions table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('sessions', 'session_participants', 'chat_messages')
ORDER BY tablename, policyname;

-- ========================================
-- VERIFY REALTIME IS ENABLED
-- ========================================

-- Check if realtime is enabled for chat_messages
SELECT
  schemaname,
  tablename,
  pg_class.oid
FROM pg_publication_tables ppt
JOIN pg_class ON pg_class.relname = ppt.tablename
WHERE ppt.pubname = 'supabase_realtime'
  AND ppt.tablename = 'chat_messages';

-- If no rows returned, realtime is NOT enabled
-- Go to Supabase Dashboard → Database → Replication to enable it
