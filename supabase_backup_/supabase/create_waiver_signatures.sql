-- Create waiver_signatures table to track legal compliance
-- Run this in Supabase SQL Editor or via migration

-- Drop table if exists (for development - remove in production)
-- DROP TABLE IF EXISTS waiver_signatures CASCADE;

CREATE TABLE IF NOT EXISTS waiver_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES intakes(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  waiver_version VARCHAR(20) DEFAULT '1.0' NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE NOT NULL,
  full_name TEXT NOT NULL, -- Name typed during signature
  email TEXT NOT NULL, -- Email at time of signing
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_user_id ON waiver_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_intake_id ON waiver_signatures(intake_id);
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_signed_at ON waiver_signatures(signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_is_valid ON waiver_signatures(is_valid);

-- RLS Policies
ALTER TABLE waiver_signatures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own waiver signatures" ON waiver_signatures;
DROP POLICY IF EXISTS "Users can insert own waiver signatures" ON waiver_signatures;
DROP POLICY IF EXISTS "Admins can view all waiver signatures" ON waiver_signatures;
DROP POLICY IF EXISTS "Admins can update waiver signatures" ON waiver_signatures;

-- Users can view their own waiver signatures
CREATE POLICY "Users can view own waiver signatures"
  ON waiver_signatures
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own waiver signatures
CREATE POLICY "Users can insert own waiver signatures"
  ON waiver_signatures
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all waiver signatures
CREATE POLICY "Admins can view all waiver signatures"
  ON waiver_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update waiver validity
CREATE POLICY "Admins can update waiver signatures"
  ON waiver_signatures
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_waiver_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waiver_signatures_updated_at ON waiver_signatures;

CREATE TRIGGER waiver_signatures_updated_at
  BEFORE UPDATE ON waiver_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_waiver_signatures_updated_at();

-- Add comments for documentation
COMMENT ON TABLE waiver_signatures IS 'Stores digital waiver signatures for legal compliance tracking';
COMMENT ON COLUMN waiver_signatures.signature_data IS 'Base64 encoded PNG image of signature';
COMMENT ON COLUMN waiver_signatures.waiver_version IS 'Version of waiver terms signed (for tracking changes)';
COMMENT ON COLUMN waiver_signatures.is_valid IS 'Admin can invalidate if needed';

-- Verify table was created
SELECT
  'waiver_signatures table created successfully' as status,
  COUNT(*) as row_count
FROM waiver_signatures;
