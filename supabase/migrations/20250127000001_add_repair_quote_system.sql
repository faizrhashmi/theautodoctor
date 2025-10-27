-- ============================================
-- PHASE 1: Repair Quote & Fee Management System
-- Created: 2025-01-27
-- Description: Complete database schema for workshop/independent mechanic
--              quote management, dynamic fee calculation, and role-based permissions
-- ============================================

-- ============================================
-- 1. WORKSHOP ROLES & PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS workshop_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'mechanic', 'service_advisor')),

  -- Permissions
  can_diagnose BOOLEAN DEFAULT false,
  can_send_quotes BOOLEAN DEFAULT false,
  can_see_pricing BOOLEAN DEFAULT false,
  can_manage_mechanics BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(workshop_id, user_id)
);

CREATE INDEX idx_workshop_roles_workshop ON workshop_roles(workshop_id);
CREATE INDEX idx_workshop_roles_user ON workshop_roles(user_id);

COMMENT ON TABLE workshop_roles IS 'Role-based permissions for workshop team members';

-- ============================================
-- 2. DIAGNOSTIC SESSIONS (Enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,
  workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  vehicle_id UUID,

  -- Session type
  session_type TEXT NOT NULL CHECK (session_type IN ('chat', 'video', 'upgraded_from_chat', 'mobile_visit')),

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  upgrade_price DECIMAL(10,2), -- If upgraded from chat to video
  total_price DECIMAL(10,2) NOT NULL,

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),

  -- Timing
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,

  -- Diagnosis outcome
  diagnosis_summary TEXT,
  recommended_services TEXT[],
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  service_type TEXT, -- 'brakes', 'oil_change', 'diagnostic', etc.

  -- Photos/evidence
  photos JSONB DEFAULT '[]'::jsonb,

  -- Next steps
  quote_sent BOOLEAN DEFAULT false,
  quote_id UUID, -- Links to repair_quotes

  -- Metadata
  vehicle_info JSONB, -- Store year, make, model, etc.
  issue_description TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_diagnostic_sessions_customer ON diagnostic_sessions(customer_id);
CREATE INDEX idx_diagnostic_sessions_mechanic ON diagnostic_sessions(mechanic_id);
CREATE INDEX idx_diagnostic_sessions_workshop ON diagnostic_sessions(workshop_id);
CREATE INDEX idx_diagnostic_sessions_status ON diagnostic_sessions(status);
CREATE INDEX idx_diagnostic_sessions_type ON diagnostic_sessions(session_type);

COMMENT ON TABLE diagnostic_sessions IS 'Video/chat diagnostic sessions with mechanics';

-- ============================================
-- 3. IN-PERSON VISITS
-- ============================================

CREATE TABLE IF NOT EXISTS in_person_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,

  -- Related diagnostic
  diagnostic_session_id UUID REFERENCES diagnostic_sessions(id) ON DELETE SET NULL,

  -- Visit type
  visit_type TEXT NOT NULL CHECK (visit_type IN ('workshop_inspection', 'mobile_visit')),

  -- Location (for mobile visits)
  customer_location TEXT,
  customer_coordinates POINT,
  trip_fee DECIMAL(10,2) DEFAULT 0.00,

  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled')),

  -- Findings
  inspection_notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,

  -- Quote
  quote_sent BOOLEAN DEFAULT false,
  quote_id UUID, -- Links to repair_quotes

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_in_person_visits_customer ON in_person_visits(customer_id);
CREATE INDEX idx_in_person_visits_workshop ON in_person_visits(workshop_id);
CREATE INDEX idx_in_person_visits_mechanic ON in_person_visits(mechanic_id);
CREATE INDEX idx_in_person_visits_status ON in_person_visits(status);
CREATE INDEX idx_in_person_visits_scheduled ON in_person_visits(scheduled_at);

COMMENT ON TABLE in_person_visits IS 'In-person inspection visits (workshop or mobile)';

-- ============================================
-- 4. REPAIR QUOTES
-- ============================================

CREATE TABLE IF NOT EXISTS repair_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID,
  diagnostic_session_id UUID REFERENCES diagnostic_sessions(id) ON DELETE SET NULL,
  in_person_visit_id UUID REFERENCES in_person_visits(id) ON DELETE SET NULL,

  -- Provider (workshop vs independent)
  workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL, -- For independent mechanics

  -- Who created the quote
  diagnosing_mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL, -- Who diagnosed
  quoting_user_id UUID REFERENCES mechanics(id) ON DELETE SET NULL, -- Who created quote (service advisor or independent mechanic)

  -- Quote details
  line_items JSONB NOT NULL,
  /*
    [
      {
        type: 'labor',
        description: 'Brake pad replacement',
        hours: 1.5,
        rate: 95,
        subtotal: 142.50
      },
      {
        type: 'parts',
        description: 'Front brake pads (ceramic)',
        quantity: 1,
        unit_cost: 165,
        subtotal: 165,
        in_stock: true  // For mobile mechanics
      }
    ]
  */

  -- Totals
  labor_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  parts_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(10,2) NOT NULL,

  -- Dynamic fees
  platform_fee_percent DECIMAL(5,2) NOT NULL, -- e.g., 12.00
  platform_fee_amount DECIMAL(10,2) NOT NULL,
  fee_rule_applied TEXT, -- Name of the fee rule that was used

  -- Final amounts
  customer_total DECIMAL(10,2) NOT NULL,
  provider_receives DECIMAL(10,2) NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'approved', 'declined', 'modified', 'in_progress', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  customer_responded_at TIMESTAMP WITH TIME ZONE,
  work_started_at TIMESTAMP WITH TIME ZONE,
  work_completed_at TIMESTAMP WITH TIME ZONE,

  -- Customer response
  customer_response TEXT CHECK (customer_response IN ('approved', 'declined', 'requested_changes')),
  customer_notes TEXT,
  decline_reason TEXT,

  -- Quote modifications
  modification_reason TEXT,
  previous_quote_id UUID REFERENCES repair_quotes(id) ON DELETE SET NULL,
  is_modification BOOLEAN DEFAULT false,

  -- Warranty
  warranty_days INTEGER DEFAULT 90,
  warranty_expires_at TIMESTAMP WITH TIME ZONE,

  -- Additional
  notes TEXT,
  internal_notes TEXT, -- For workshop use only
  estimated_completion_hours DECIMAL(5,2),

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_repair_quotes_customer ON repair_quotes(customer_id);
CREATE INDEX idx_repair_quotes_workshop ON repair_quotes(workshop_id);
CREATE INDEX idx_repair_quotes_mechanic ON repair_quotes(mechanic_id);
CREATE INDEX idx_repair_quotes_status ON repair_quotes(status);
CREATE INDEX idx_repair_quotes_diagnostic ON repair_quotes(diagnostic_session_id);
CREATE INDEX idx_repair_quotes_created ON repair_quotes(created_at DESC);

COMMENT ON TABLE repair_quotes IS 'Repair quotes sent to customers for approval';

-- ============================================
-- 5. QUOTE MODIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS quote_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  original_quote_id UUID REFERENCES repair_quotes(id) ON DELETE CASCADE,
  new_quote_id UUID REFERENCES repair_quotes(id) ON DELETE CASCADE,

  -- Changes
  added_items JSONB,
  removed_items JSONB,
  modified_items JSONB,

  -- Pricing changes
  old_subtotal DECIMAL(10,2) NOT NULL,
  new_subtotal DECIMAL(10,2) NOT NULL,
  old_customer_total DECIMAL(10,2) NOT NULL,
  new_customer_total DECIMAL(10,2) NOT NULL,

  -- Reason
  reason TEXT NOT NULL,
  created_by UUID REFERENCES mechanics(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  customer_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quote_modifications_original ON quote_modifications(original_quote_id);
CREATE INDEX idx_quote_modifications_new ON quote_modifications(new_quote_id);
CREATE INDEX idx_quote_modifications_status ON quote_modifications(status);

COMMENT ON TABLE quote_modifications IS 'Track changes to quotes during work (e.g., additional issues found)';

-- ============================================
-- 6. PLATFORM FEE RULES
-- ============================================

CREATE TABLE IF NOT EXISTS platform_fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('flat', 'percentage', 'tiered', 'service_based')),
  description TEXT,

  -- Conditions
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'workshop', 'independent', 'mobile')),
  min_job_value DECIMAL(10,2),
  max_job_value DECIMAL(10,2),
  service_categories TEXT[], -- ['brakes', 'oil_change', 'diagnostics']

  -- Fee structure
  fee_percentage DECIMAL(5,2), -- e.g., 12.00 for 12%
  flat_fee DECIMAL(10,2), -- Alternative to percentage

  -- Tiered structure (for graduated fees)
  tiers JSONB,
  /*
    [
      { "max_value": 100, "fee_percent": 15 },
      { "max_value": 500, "fee_percent": 12 },
      { "max_value": null, "fee_percent": 10 }  // Above $500
    ]
  */

  -- Priority (higher = checked first)
  priority INTEGER DEFAULT 0,

  -- Active/Inactive
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID, -- Admin who created this rule
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_platform_fee_rules_active ON platform_fee_rules(is_active, priority DESC);
CREATE INDEX idx_platform_fee_rules_applies_to ON platform_fee_rules(applies_to);
CREATE INDEX idx_platform_fee_rules_service_categories ON platform_fee_rules USING gin(service_categories);

COMMENT ON TABLE platform_fee_rules IS 'Dynamic fee calculation rules configurable by admin';

-- ============================================
-- 7. REPAIR PAYMENTS (Escrow)
-- ============================================

CREATE TABLE IF NOT EXISTS repair_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  quote_id UUID REFERENCES repair_quotes(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,

  -- Amounts
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  provider_amount DECIMAL(10,2) NOT NULL,

  -- Escrow status
  escrow_status TEXT DEFAULT 'held' CHECK (escrow_status IN ('held', 'released', 'refunded', 'disputed', 'partially_refunded')),

  -- Timestamps
  held_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,

  -- Dispute
  dispute_reason TEXT,
  dispute_resolved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_repair_payments_quote ON repair_payments(quote_id);
CREATE INDEX idx_repair_payments_customer ON repair_payments(customer_id);
CREATE INDEX idx_repair_payments_provider ON repair_payments(workshop_id, mechanic_id);
CREATE INDEX idx_repair_payments_escrow_status ON repair_payments(escrow_status);
CREATE INDEX idx_repair_payments_stripe_intent ON repair_payments(stripe_payment_intent_id);

COMMENT ON TABLE repair_payments IS 'Payment escrow for repair orders';

-- ============================================
-- 8. PLATFORM CHAT MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS platform_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation
  conversation_id UUID NOT NULL, -- Can be diagnostic_session_id or quote_id
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('diagnostic', 'quote', 'service')),

  -- Sender
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'mechanic', 'workshop', 'system')),

  -- Message
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  /*
    [
      { "type": "image", "url": "...", "name": "..." },
      { "type": "document", "url": "...", "name": "..." }
    ]
  */

  -- Status
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  is_system_message BOOLEAN DEFAULT false
);

CREATE INDEX idx_chat_messages_conversation ON platform_chat_messages(conversation_id, sent_at DESC);
CREATE INDEX idx_chat_messages_sender ON platform_chat_messages(sender_id);
CREATE INDEX idx_chat_messages_unread ON platform_chat_messages(conversation_id, read_at) WHERE read_at IS NULL;

COMMENT ON TABLE platform_chat_messages IS 'Chat messages between customers and mechanics/workshops';

-- ============================================
-- 9. CUSTOMER FAVORITES
-- ============================================

CREATE TABLE IF NOT EXISTS customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stats
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_service_at TIMESTAMP WITH TIME ZONE,
  total_services INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,

  UNIQUE(customer_id, mechanic_id),
  UNIQUE(customer_id, workshop_id)
);

CREATE INDEX idx_customer_favorites_customer ON customer_favorites(customer_id);
CREATE INDEX idx_customer_favorites_mechanic ON customer_favorites(mechanic_id);
CREATE INDEX idx_customer_favorites_workshop ON customer_favorites(workshop_id);

COMMENT ON TABLE customer_favorites IS 'Customer favorite mechanics/workshops for quick rebooking';

-- ============================================
-- 10. TRIGGERS & FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_workshop_roles_updated_at BEFORE UPDATE ON workshop_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnostic_sessions_updated_at BEFORE UPDATE ON diagnostic_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_in_person_visits_updated_at BEFORE UPDATE ON in_person_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repair_quotes_updated_at BEFORE UPDATE ON repair_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_fee_rules_updated_at BEFORE UPDATE ON platform_fee_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repair_payments_updated_at BEFORE UPDATE ON repair_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. DEFAULT FEE RULES
-- ============================================

-- Standard workshop fee (12%)
INSERT INTO platform_fee_rules (rule_name, rule_type, applies_to, fee_percentage, priority, description)
VALUES (
  'Standard Workshop Fee',
  'percentage',
  'workshop',
  12.00,
  0,
  'Default 12% fee for all workshop services'
) ON CONFLICT (rule_name) DO NOTHING;

-- Standard independent mechanic fee (12%)
INSERT INTO platform_fee_rules (rule_name, rule_type, applies_to, fee_percentage, priority, description)
VALUES (
  'Standard Independent Fee',
  'percentage',
  'independent',
  12.00,
  0,
  'Default 12% fee for independent mechanics'
) ON CONFLICT (rule_name) DO NOTHING;

-- Mobile mechanic fee (12%)
INSERT INTO platform_fee_rules (rule_name, rule_type, applies_to, fee_percentage, priority, description)
VALUES (
  'Standard Mobile Fee',
  'percentage',
  'mobile',
  12.00,
  0,
  'Default 12% fee for mobile mechanics'
) ON CONFLICT (rule_name) DO NOTHING;

-- Low-value routine maintenance (8% - for oil changes, etc.)
INSERT INTO platform_fee_rules (rule_name, rule_type, applies_to, fee_percentage, max_job_value, service_categories, priority, description)
VALUES (
  'Routine Maintenance Fee',
  'service_based',
  'all',
  8.00,
  150.00,
  ARRAY['oil_change', 'tire_rotation', 'air_filter', 'wiper_blades'],
  10,
  'Lower 8% fee for routine maintenance under $150'
) ON CONFLICT (rule_name) DO NOTHING;

-- High-value complex repairs (10% - incentivize large jobs)
INSERT INTO platform_fee_rules (rule_name, rule_type, applies_to, fee_percentage, min_job_value, priority, description)
VALUES (
  'Large Repair Discount Fee',
  'percentage',
  'all',
  10.00,
  1000.00,
  5,
  'Reduced 10% fee for repairs over $1000'
) ON CONFLICT (rule_name) DO NOTHING;

-- ============================================
-- 12. GRANT PERMISSIONS (if using RLS)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE workshop_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_person_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be defined based on your specific auth setup
-- Example policies would go here if needed

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250127000001_add_repair_quote_system.sql completed successfully';
  RAISE NOTICE 'Tables created: 9';
  RAISE NOTICE 'Default fee rules added: 5';
  RAISE NOTICE 'Next steps: Run Phase 1 Week 2 - Fee Calculation Engine';
END $$;
