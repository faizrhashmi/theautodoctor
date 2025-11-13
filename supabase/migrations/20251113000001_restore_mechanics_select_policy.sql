-- Restore missing SELECT policy for mechanics table
-- This was accidentally removed in 20251112000007_lock_specialist_fields.sql
-- Created: 2025-11-13

-- The mechanics table needs a SELECT policy to allow public/authenticated users to view mechanics
-- This is critical for:
-- 1. Customer booking wizard (viewing available mechanics)
-- 2. Admin dashboards (managing mechanics)
-- 3. Workshop owner dashboards (viewing team)
-- 4. Mechanic profiles (viewing own profile)

-- Create public SELECT policy for mechanics
-- This allows anyone to view approved mechanics for the booking flow
CREATE POLICY "Public can view approved mechanics"
  ON mechanics FOR SELECT
  USING (
    -- Public can see approved mechanics with active accounts
    application_status = 'approved'
    AND account_status = 'active'
  );

-- Create authenticated SELECT policy for mechanics
-- This allows authenticated users (mechanics, workshop owners, admins) to see more
CREATE POLICY "Authenticated users can view mechanics"
  ON mechanics FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Add helpful comments
COMMENT ON POLICY "Public can view approved mechanics" ON mechanics IS
  'Allows public access to view approved and active mechanics for the booking wizard and mechanic discovery features.';

COMMENT ON POLICY "Authenticated users can view mechanics" ON mechanics IS
  'Allows authenticated users (mechanics, customers, workshop owners, admins) to view all mechanics they have access to.';
