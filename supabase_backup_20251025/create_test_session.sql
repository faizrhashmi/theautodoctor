-- Quick test: Create a manual chat session
-- Run this in Supabase SQL Editor to test the chat UI without webhooks

-- Step 1: Get your user ID (you'll need this)
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Step 2: Copy your user ID from above, then uncomment and run the INSERT below
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID

/*
-- Create a test chat session
INSERT INTO sessions (
  stripe_session_id,
  type,
  plan,
  status,
  customer_user_id,
  intake_id
) VALUES (
  'cs_test_manual_' || gen_random_uuid()::text,
  'chat',
  'chat10',
  'pending',
  'YOUR_USER_ID_HERE',  -- Replace with your user ID from step 1
  '01e46166-1563-4420-a6f1-718c625273fe'  -- Your intake ID from the logs
)
RETURNING id, stripe_session_id;
*/

-- Step 3: Copy the session ID from the result above, then run this
-- Replace both placeholders with your actual values

/*
-- Add yourself as a participant
INSERT INTO session_participants (
  session_id,
  user_id,
  role
) VALUES (
  'SESSION_ID_FROM_STEP_2',  -- Replace with session ID from above
  'YOUR_USER_ID_HERE',  -- Same user ID from step 1
  'customer'
);
*/

-- Step 4: Visit the chat room
-- http://localhost:3000/chat/SESSION_ID_FROM_STEP_2
