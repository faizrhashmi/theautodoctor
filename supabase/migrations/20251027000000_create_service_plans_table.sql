-- Create service_plans table for universal plan management
CREATE TABLE IF NOT EXISTS service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- e.g., 'free', 'quick', 'standard', 'diagnostic'
  name TEXT NOT NULL, -- e.g., 'Free Session', 'Quick Chat'
  price DECIMAL(10,2) NOT NULL DEFAULT 0, -- e.g., 9.99
  duration_minutes INTEGER NOT NULL, -- e.g., 30, 45, 60
  description TEXT NOT NULL,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of perk strings
  recommended_for TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0, -- For sorting in UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for active plans
CREATE INDEX idx_service_plans_active ON service_plans(is_active, display_order);

-- Insert default plans
INSERT INTO service_plans (slug, name, price, duration_minutes, description, perks, recommended_for, display_order, is_active) VALUES
(
  'free',
  'Free Session',
  0.00,
  5,
  'Try AskAutoDoctor with a short text-only session.',
  '["Text chat with a mechanic", "Share one photo or video clip", "Quick first impressions and advice"]'::jsonb,
  'Use when you want to sample the platform or ask a quick yes/no question.',
  1,
  true
),
(
  'quick',
  'Quick Chat',
  9.99,
  30,
  'Fast triage over private chat with a certified mechanic.',
  '["Direct chat for photos, videos, and codes", "Action plan delivered before chat ends", "Great for warning lights or quick questions"]'::jsonb,
  'Ideal when you need quick reassurance or guidance.',
  2,
  true
),
(
  'standard',
  'Standard Video',
  29.99,
  45,
  'Live video consultation to walk through complex issues.',
  '["HD video with screen sharing", "Step-by-step troubleshooting and next steps", "Recording link after the call"]'::jsonb,
  'Perfect for noises, leaks, or guided inspections.',
  3,
  true
),
(
  'diagnostic',
  'Full Diagnostic',
  49.99,
  60,
  'Comprehensive video session with written diagnostic report.',
  '["Advanced testing walkthroughs", "Multi-system coverage in one call", "Summary email with repair roadmap"]'::jsonb,
  'Best for recurring issues or pre-purchase inspections.',
  4,
  true
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_service_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_plans_updated_at
  BEFORE UPDATE ON service_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_service_plans_updated_at();

-- Enable RLS
ALTER TABLE service_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read for active plans
CREATE POLICY "Anyone can view active service plans"
  ON service_plans
  FOR SELECT
  USING (is_active = true);

-- Admin full access (add admin check later)
CREATE POLICY "Admins can manage service plans"
  ON service_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE service_plans IS 'Universal service plan management - admins can add, modify, or delete plans';
