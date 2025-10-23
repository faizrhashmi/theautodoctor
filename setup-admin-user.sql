-- Setup Admin User
-- Run this in your Supabase SQL Editor

-- Option 1: Convert an existing user to admin
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- Option 2: Create a brand new admin user
-- First, create the auth user in Supabase Dashboard > Authentication > Users
-- Then run this to set their role:
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE email = 'new-admin@example.com';

-- Verify admin user was created:
SELECT id, email, role, created_at
FROM profiles
WHERE role = 'admin';
