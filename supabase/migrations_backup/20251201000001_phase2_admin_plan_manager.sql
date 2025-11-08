-- Phase 2: Admin Plan Manager
-- Extends service_plans for subscriptions and creates admin configuration tables
-- Migration date: 2025-12-01

-- ============================================================================
-- PART 0: Enable required extensions
-- ============================================================================

-- Enable btree_gist extension for EXCLUDE constraints with mixed types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- PART 1: Extend service_plans table for subscription support
-- ============================================================================

DO $$
BEGIN
  -- Add subscription-specific columns to service_plans
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_plans' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE public.service_plans ADD COLUMN plan_type TEXT DEFAULT 'payg';
    COMMENT ON COLUMN public.service_plans.plan_type IS 'Type of plan: payg (pay-as-you-go) or subscription';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_plans' AND column_name = 'credit_allocation'
  ) THEN
    ALTER TABLE public.service_plans ADD COLUMN credit_allocation INTEGER DEFAULT 0;
    COMMENT ON COLUMN public.service_plans.credit_allocation IS 'Monthly credits for subscription plans (0 for PAYG)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_plans' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE public.service_plans ADD COLUMN billing_cycle TEXT;
    COMMENT ON COLUMN public.service_plans.billing_cycle IS 'Billing cycle: monthly, annual, or NULL for PAYG';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_plans' AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE public.service_plans ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0;
    COMMENT ON COLUMN public.service_plans.discount_percent IS 'Discount percentage for subscription plans (e.g., 5.00, 10.00, 15.00)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_plans' AND column_name = 'max_rollover_credits'
  ) THEN
    ALTER TABLE public.service_plans ADD COLUMN max_rollover_credits INTEGER DEFAULT 0;
    COMMENT ON COLUMN public.service_plans.max_rollover_credits IS 'Maximum credits that can rollover to next month';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_plans' AND column_name = 'show_on_homepage'
  ) THEN
    ALTER TABLE public.service_plans ADD COLUMN show_on_homepage BOOLEAN DEFAULT true;
    COMMENT ON COLUMN public.service_plans.show_on_homepage IS 'Whether to display this plan on homepage';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_plans' AND column_name = 'marketing_badge'
  ) THEN
    ALTER TABLE public.service_plans ADD COLUMN marketing_badge TEXT;
    COMMENT ON COLUMN public.service_plans.marketing_badge IS 'Marketing label: POPULAR, BEST VALUE, NEW, etc.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_plans' AND column_name = 'stripe_subscription_price_id'
  ) THEN
    ALTER TABLE public.service_plans ADD COLUMN stripe_subscription_price_id TEXT;
    COMMENT ON COLUMN public.service_plans.stripe_subscription_price_id IS 'Stripe recurring price ID for subscriptions';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Create credit_pricing table
-- ============================================================================

-- Drop table if it exists from previous failed migrations
DROP TABLE IF EXISTS credit_pricing CASCADE;

CREATE TABLE credit_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type TEXT NOT NULL CHECK (session_type IN ('quick', 'video', 'diagnostic')),
  is_specialist BOOLEAN NOT NULL DEFAULT false,
  credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure no duplicate pricing at same effective_from timestamp
  CONSTRAINT unique_pricing_start UNIQUE (session_type, is_specialist, effective_from)
  -- Note: Application layer will handle overlapping date ranges and effective_until validation
);

-- Create index for efficient pricing lookups
CREATE INDEX idx_credit_pricing_lookup ON credit_pricing(session_type, is_specialist, effective_from DESC);

-- Enable RLS
ALTER TABLE credit_pricing ENABLE ROW LEVEL SECURITY;

-- Public can view active pricing
CREATE POLICY "Anyone can view active credit pricing"
  ON credit_pricing
  FOR SELECT
  USING (effective_until IS NULL OR effective_until > NOW());

-- Admins can manage pricing
CREATE POLICY "Admins can manage credit pricing"
  ON credit_pricing
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed initial credit pricing (standard rates)
INSERT INTO credit_pricing (session_type, is_specialist, credit_cost, notes) VALUES
  ('quick', false, 3, 'Quick Chat session - standard mechanic'),
  ('quick', true, 10, 'Quick Chat session - brand specialist'),
  ('video', false, 10, 'Video session - standard mechanic'),
  ('video', true, 17, 'Video session - brand specialist (+7 credits premium)'),
  ('diagnostic', false, 17, 'Full diagnostic - standard mechanic'),
  ('diagnostic', true, 27, 'Full diagnostic - brand specialist (+10 credits premium)')
ON CONFLICT DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_credit_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_pricing_updated_at
  BEFORE UPDATE ON credit_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_pricing_updated_at();

COMMENT ON TABLE credit_pricing IS 'Credit cost configuration for each session type and mechanic tier';

-- ============================================================================
-- PART 3: Create feature_flags table (for toggleable features like RFQ)
-- ============================================================================

-- Drop table if it exists from previous failed migrations
DROP TABLE IF EXISTS feature_flags CASCADE;

CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_for_roles TEXT[] DEFAULT '{admin}', -- Which roles can access when enabled
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_feature_flags_enabled ON feature_flags(flag_key, is_enabled);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Public can view enabled features
CREATE POLICY "Anyone can view enabled feature flags"
  ON feature_flags
  FOR SELECT
  USING (is_enabled = true);

-- Admins can manage features
CREATE POLICY "Admins can manage feature flags"
  ON feature_flags
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed initial feature flags
INSERT INTO feature_flags (flag_key, flag_name, description, is_enabled, enabled_for_roles) VALUES
  ('rfq_system', 'RFQ Multi-Workshop Bidding', 'Allow customers to request repair quotes from multiple workshops', false, '{customer,admin}'),
  ('brand_specialists', 'Brand Specialist Discovery', 'Enable brand-specific mechanic matching and specialist pricing', true, '{customer,admin}'),
  ('subscriptions', 'Subscription Plans', 'Enable credit-based subscription plans for customers', false, '{customer,admin}'),
  ('referral_program', 'Referral Program', 'Customer referral and rewards system', false, '{customer,admin}'),
  ('credit_gifting', 'Credit Gifting', 'Allow subscription users to gift credits to others', false, '{customer,admin}'),
  ('enhanced_analytics', 'Enhanced Analytics', 'Advanced customer analytics and vehicle health reports', false, '{customer,admin}')
ON CONFLICT (flag_key) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

COMMENT ON TABLE feature_flags IS 'Feature toggle system for gradual rollout and A/B testing';

-- ============================================================================
-- PART 4: Create homepage_config table
-- ============================================================================

-- Drop table if it exists from previous failed migrations
DROP TABLE IF EXISTS homepage_config CASCADE;

CREATE TABLE homepage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  section_name TEXT NOT NULL,
  section_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_homepage_config_active ON homepage_config(is_active, display_order);

-- Enable RLS
ALTER TABLE homepage_config ENABLE ROW LEVEL SECURITY;

-- Public can view active config
CREATE POLICY "Anyone can view active homepage config"
  ON homepage_config
  FOR SELECT
  USING (is_active = true);

-- Admins can manage config
CREATE POLICY "Admins can manage homepage config"
  ON homepage_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed initial homepage configuration
INSERT INTO homepage_config (section_key, section_name, section_value, display_order) VALUES
  (
    'hero_section',
    'Hero Section',
    '{
      "title": "Expert Automotive Help, Anytime",
      "subtitle": "Connect with certified mechanics instantly via chat or video",
      "cta_text": "Get Started Free",
      "cta_link": "/signup",
      "background_image": "/hero-bg.jpg",
      "show_availability": true
    }'::jsonb,
    1
  ),
  (
    'featured_plans',
    'Featured Service Plans',
    '{
      "plan_ids": ["free", "quick", "standard", "diagnostic"],
      "max_display": 4,
      "show_badges": true,
      "highlight_popular": "standard"
    }'::jsonb,
    2
  ),
  (
    'trust_indicators',
    'Trust & Social Proof',
    '{
      "total_mechanics": "500+",
      "total_sessions": "10,000+",
      "avg_rating": "4.9",
      "response_time": "< 2 minutes"
    }'::jsonb,
    3
  ),
  (
    'promotional_banner',
    'Promotional Banner',
    '{
      "enabled": true,
      "text": "Save up to 15% with monthly subscription plans",
      "cta_text": "View Plans",
      "cta_link": "/pricing",
      "banner_type": "info"
    }'::jsonb,
    4
  )
ON CONFLICT (section_key) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_homepage_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER homepage_config_updated_at
  BEFORE UPDATE ON homepage_config
  FOR EACH ROW
  EXECUTE FUNCTION update_homepage_config_updated_at();

COMMENT ON TABLE homepage_config IS 'Admin-configurable homepage content and layout';

-- ============================================================================
-- PART 5: Seed subscription plans
-- ============================================================================

-- Add subscription plans to service_plans table
INSERT INTO service_plans (
  slug, name, price, duration_minutes, description, perks, recommended_for,
  display_order, is_active, plan_category, features, routing_preference,
  plan_type, credit_allocation, billing_cycle, discount_percent, max_rollover_credits,
  show_on_homepage, marketing_badge
) VALUES
(
  'starter',
  'Starter Subscription',
  85.00,
  0, -- Not session-based, monthly subscription
  'Perfect for occasional car questions and light maintenance guidance.',
  '["30 credits per month", "5% discount on all sessions", "Rollover up to 5 unused credits", "Cancel anytime"]'::jsonb,
  'Ideal for car owners with basic maintenance needs',
  5,
  false, -- Initially disabled, enable via feature flag
  'subscription',
  '{"subscription": true, "credit_rollover": true, "priority_support": false}'::jsonb,
  'any',
  'subscription',
  30, -- 30 credits per month
  'monthly',
  5.00, -- 5% discount
  5, -- Max 5 credits rollover
  true,
  NULL
),
(
  'regular',
  'Regular Subscription',
  216.00,
  0,
  'Best value for regular maintenance and troubleshooting needs.',
  '["80 credits per month", "10% discount on all sessions", "Rollover up to 15 unused credits", "Priority mechanic matching", "Cancel anytime"]'::jsonb,
  'Perfect for active car owners and small fleets',
  6,
  false,
  'subscription',
  '{"subscription": true, "credit_rollover": true, "priority_support": true, "priority_matching": true}'::jsonb,
  'any',
  'subscription',
  80, -- 80 credits per month
  'monthly',
  10.00, -- 10% discount
  15, -- Max 15 credits rollover
  true,
  'POPULAR'
),
(
  'premium',
  'Premium Subscription',
  459.00,
  0,
  'Unlimited support for serious car enthusiasts and multi-vehicle owners.',
  '["180 credits per month", "15% discount on all sessions", "Rollover up to 30 unused credits", "Priority mechanic matching", "Dedicated support line", "Cancel anytime"]'::jsonb,
  'Best for car enthusiasts and fleet managers',
  7,
  false,
  'subscription',
  '{"subscription": true, "credit_rollover": true, "priority_support": true, "priority_matching": true, "dedicated_support": true}'::jsonb,
  'any',
  'subscription',
  180, -- 180 credits per month
  'monthly',
  15.00, -- 15% discount
  30, -- Max 30 credits rollover
  true,
  'BEST VALUE'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PART 6: Create helper functions
-- ============================================================================

-- Function to get active credit pricing for a session type
CREATE OR REPLACE FUNCTION get_credit_cost(
  p_session_type TEXT,
  p_is_specialist BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
DECLARE
  v_cost INTEGER;
BEGIN
  SELECT credit_cost INTO v_cost
  FROM credit_pricing
  WHERE session_type = p_session_type
    AND is_specialist = p_is_specialist
    AND (effective_until IS NULL OR effective_until > NOW())
  ORDER BY effective_from DESC
  LIMIT 1;

  RETURN COALESCE(v_cost, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_credit_cost IS 'Returns the current credit cost for a given session type and specialist flag';

-- Function to check if a feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_flag_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT is_enabled INTO v_enabled
  FROM feature_flags
  WHERE flag_key = p_flag_key;

  RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_feature_enabled IS 'Returns whether a feature flag is currently enabled';

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Phase 2: Admin Plan Manager migration completed successfully!' AS status;
