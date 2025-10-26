-- Migration: Create organizations table for workshops and corporate accounts
-- Date: 2025-01-24
-- Purpose: Support B2B2C (workshops) and B2B SaaS (corporate) business models

-- ============================================================================
-- Create organizations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization type
  organization_type TEXT NOT NULL CHECK (organization_type IN ('corporate', 'workshop')),

  -- Basic information
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- For URLs: abc-auto-shop.askautodoctor.com
  description TEXT,
  logo_url TEXT,

  -- Contact information
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,

  -- Address
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',

  -- Business details
  business_registration_number TEXT,
  tax_id TEXT, -- GST/HST number
  industry TEXT,

  -- Workshop-specific fields
  coverage_postal_codes TEXT[], -- Postal codes this workshop serves
  service_radius_km INTEGER, -- Service radius in kilometers
  mechanic_capacity INTEGER DEFAULT 10, -- Max number of mechanics
  commission_rate DECIMAL(5,2) DEFAULT 10.00, -- Workshop's commission % (default 10%)

  -- Corporate-specific fields
  employee_count TEXT, -- '1-10', '11-50', '51-200', '201+'
  fleet_size TEXT, -- '1-10', '11-25', '26-50', '51-100', '100+'

  -- Subscription management (for corporate B2B SaaS)
  subscription_status TEXT DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'none')),
  subscription_tier TEXT
    CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Stripe Connect (for workshop payouts)
  stripe_account_id TEXT,
  stripe_account_status TEXT
    CHECK (stripe_account_status IN ('pending', 'verified', 'restricted', 'rejected')),
  stripe_onboarding_completed BOOLEAN DEFAULT FALSE,

  -- Status and verification
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  verification_status TEXT DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  verification_notes TEXT,

  -- Settings and preferences
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription ON organizations(subscription_status, subscription_tier);
CREATE INDEX IF NOT EXISTS idx_organizations_coverage ON organizations USING GIN (coverage_postal_codes);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account ON organizations(stripe_account_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Note: Additional RLS policies that reference organization_members will be created
-- in migration 20250124000002_create_organization_members.sql after that table exists

-- Policy: Platform admins can manage all organizations
CREATE POLICY "Platform admins can manage organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Functions and triggers
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on row changes
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Function: Generate unique slug from name
CREATE OR REPLACE FUNCTION generate_organization_slug(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Convert name to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Check if slug exists, append number if needed
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE organizations IS 'Organizations for workshops (B2B2C) and corporate accounts (B2B SaaS)';

COMMENT ON COLUMN organizations.organization_type IS 'Type: workshop (service provider) or corporate (customer)';
COMMENT ON COLUMN organizations.slug IS 'Unique URL-safe identifier for the organization';
COMMENT ON COLUMN organizations.coverage_postal_codes IS 'Postal code prefixes this workshop serves (e.g., ["M5V", "M5G"])';
COMMENT ON COLUMN organizations.service_radius_km IS 'Maximum service radius in kilometers from workshop address';
COMMENT ON COLUMN organizations.mechanic_capacity IS 'Maximum number of mechanics this workshop can have';
COMMENT ON COLUMN organizations.commission_rate IS 'Percentage of session revenue that goes to workshop (default 10%)';
COMMENT ON COLUMN organizations.subscription_status IS 'Corporate subscription status (workshops use "none")';
COMMENT ON COLUMN organizations.stripe_account_id IS 'Stripe Connect account ID for receiving payouts (workshops only)';
COMMENT ON COLUMN organizations.verification_status IS 'Admin verification status for new organizations';
COMMENT ON COLUMN organizations.settings IS 'Organization-specific settings and preferences';
COMMENT ON COLUMN organizations.metadata IS 'Additional metadata for feature flags and custom data';
