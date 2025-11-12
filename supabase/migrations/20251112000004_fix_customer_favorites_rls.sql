-- =====================================================
-- Fix Customer Favorites RLS Policies
-- Created: 2025-11-12
-- Purpose: Add proper RLS policies to allow customers to manage their own favorites
-- =====================================================

-- Enable RLS on customer_favorites (if not already enabled)
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "customers_view_own_favorites" ON customer_favorites;
DROP POLICY IF EXISTS "customers_insert_own_favorites" ON customer_favorites;
DROP POLICY IF EXISTS "customers_delete_own_favorites" ON customer_favorites;

-- Policy: Customers can view their own favorites
CREATE POLICY "customers_view_own_favorites"
  ON customer_favorites
  FOR SELECT
  USING (
    customer_id = auth.uid()
  );

-- Policy: Customers can insert their own favorites
CREATE POLICY "customers_insert_own_favorites"
  ON customer_favorites
  FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
  );

-- Policy: Customers can delete their own favorites
CREATE POLICY "customers_delete_own_favorites"
  ON customer_favorites
  FOR DELETE
  USING (
    customer_id = auth.uid()
  );

-- Optional: Allow admins to view all favorites (for support/debugging)
CREATE POLICY "admins_view_all_favorites"
  ON customer_favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add helpful comment
COMMENT ON TABLE customer_favorites IS 'Customer favorite mechanics - RLS enabled to ensure customers can only manage their own favorites';
