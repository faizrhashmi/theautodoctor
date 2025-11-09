-- Create session_reviews table
CREATE TABLE IF NOT EXISTS session_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_session_reviews_session_id ON session_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reviews_mechanic_id ON session_reviews(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_session_reviews_customer_user_id ON session_reviews(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_session_reviews_rating ON session_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_session_reviews_created_at ON session_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE session_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
-- Mechanics can view their own reviews
CREATE POLICY "Mechanics can view their own reviews"
  ON session_reviews
  FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE user_id = auth.uid()
    )
  );

-- Customers can view their own reviews
CREATE POLICY "Customers can view their own reviews"
  ON session_reviews
  FOR SELECT
  USING (customer_user_id = auth.uid());

-- Customers can create reviews for their sessions
CREATE POLICY "Customers can create reviews"
  ON session_reviews
  FOR INSERT
  WITH CHECK (
    customer_user_id = auth.uid()
    AND session_id IN (
      SELECT id FROM diagnostic_sessions WHERE customer_user_id = auth.uid()
    )
  );

-- Customers can update their own reviews
CREATE POLICY "Customers can update their own reviews"
  ON session_reviews
  FOR UPDATE
  USING (customer_user_id = auth.uid())
  WITH CHECK (customer_user_id = auth.uid());

-- Customers can delete their own reviews
CREATE POLICY "Customers can delete their own reviews"
  ON session_reviews
  FOR DELETE
  USING (customer_user_id = auth.uid());

-- Admin can do everything
CREATE POLICY "Admins can do everything with reviews"
  ON session_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_session_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_reviews_updated_at
  BEFORE UPDATE ON session_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_session_reviews_updated_at();
