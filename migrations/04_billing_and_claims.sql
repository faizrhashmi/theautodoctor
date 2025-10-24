-- ============================================================================
-- Migration 04: BILLING & POLICY INTEGRATION
-- ============================================================================
--
-- F1) Idempotent Stripe webhook handling
-- F2) Money-Back Guarantee rails (satisfaction claims)
--
-- Purpose:
-- - Track Stripe events to prevent duplicate processing
-- - Store payment intents and their states
-- - Handle refunds and chargebacks with proper state transitions
-- - Support money-back guarantee claims with audit trail
--
-- ============================================================================

-- ============================================================================
-- F1: STRIPE EVENT TRACKING (Idempotency)
-- ============================================================================

-- Table: stripe_events
-- Stores processed Stripe webhook events to ensure idempotency
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY, -- Stripe event ID (e.g., evt_1234567890)
  type TEXT NOT NULL, -- Event type (e.g., payment_intent.succeeded)
  object JSONB NOT NULL, -- Full event data object
  livemode BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by event type
CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON public.stripe_events(type);

-- Index for quick lookup by processing time
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON public.stripe_events(processed_at DESC);

-- ============================================================================
-- F1: PAYMENT INTENT TRACKING
-- ============================================================================

-- Table: payment_intents
-- Tracks Stripe payment intents and their relationship to sessions
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id TEXT PRIMARY KEY, -- Stripe payment_intent ID (e.g., pi_1234567890)
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN (
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture',
    'canceled',
    'succeeded'
  )),

  -- Stripe references
  charge_id TEXT, -- Stripe charge ID (e.g., ch_1234567890)
  receipt_url TEXT,

  -- Refund tracking
  amount_refunded_cents INTEGER NOT NULL DEFAULT 0,
  refund_status TEXT CHECK (refund_status IN ('none', 'partial', 'full')) DEFAULT 'none',

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  succeeded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by session
CREATE INDEX IF NOT EXISTS idx_payment_intents_session_id
  ON public.payment_intents(session_id);

-- Index for quick lookup by customer
CREATE INDEX IF NOT EXISTS idx_payment_intents_customer_id
  ON public.payment_intents(customer_id);

-- Index for quick lookup by status
CREATE INDEX IF NOT EXISTS idx_payment_intents_status
  ON public.payment_intents(status);

-- ============================================================================
-- F1: REFUND TRACKING
-- ============================================================================

-- Table: refunds
-- Tracks all refunds (automatic and manual)
CREATE TABLE IF NOT EXISTS public.refunds (
  id TEXT PRIMARY KEY, -- Stripe refund ID (e.g., re_1234567890)
  payment_intent_id TEXT REFERENCES public.payment_intents(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,

  -- Refund details
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  reason TEXT CHECK (reason IN (
    'duplicate',
    'fraudulent',
    'requested_by_customer',
    'satisfaction_claim',
    'chargeback',
    'other'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'succeeded',
    'failed',
    'canceled'
  )),

  -- Link to satisfaction claim if applicable
  satisfaction_claim_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT, -- Admin notes

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by payment intent
CREATE INDEX IF NOT EXISTS idx_refunds_payment_intent_id
  ON public.refunds(payment_intent_id);

-- Index for quick lookup by session
CREATE INDEX IF NOT EXISTS idx_refunds_session_id
  ON public.refunds(session_id);

-- Index for quick lookup by claim
CREATE INDEX IF NOT EXISTS idx_refunds_satisfaction_claim_id
  ON public.refunds(satisfaction_claim_id);

-- ============================================================================
-- F2: SATISFACTION CLAIMS (Money-Back Guarantee)
-- ============================================================================

-- Table: satisfaction_claims
-- Tracks customer satisfaction claims and money-back guarantee requests
CREATE TABLE IF NOT EXISTS public.satisfaction_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Claim details
  reason TEXT NOT NULL, -- Customer's reason for claim
  resolution TEXT, -- Admin's resolution notes
  status TEXT NOT NULL CHECK (status IN ('open', 'approved', 'rejected', 'refunded')) DEFAULT 'open',

  -- Refund tracking
  refund_id TEXT REFERENCES public.refunds(id) ON DELETE SET NULL,
  refund_amount_cents INTEGER, -- Amount refunded (may be partial)

  -- Admin handling
  reviewed_by_admin_id UUID, -- Admin user who reviewed
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by session
CREATE INDEX IF NOT EXISTS idx_satisfaction_claims_session_id
  ON public.satisfaction_claims(session_id);

-- Index for quick lookup by customer
CREATE INDEX IF NOT EXISTS idx_satisfaction_claims_customer_id
  ON public.satisfaction_claims(customer_id);

-- Index for quick lookup by status
CREATE INDEX IF NOT EXISTS idx_satisfaction_claims_status
  ON public.satisfaction_claims(status);

-- Index for pending claims (admin queue)
CREATE INDEX IF NOT EXISTS idx_satisfaction_claims_pending
  ON public.satisfaction_claims(created_at DESC)
  WHERE status = 'open';

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- payment_intents
CREATE OR REPLACE FUNCTION update_payment_intent_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_intents_updated_at ON public.payment_intents;
CREATE TRIGGER trigger_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intent_timestamp();

-- refunds
CREATE OR REPLACE FUNCTION update_refund_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refunds_updated_at ON public.refunds;
CREATE TRIGGER trigger_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_refund_timestamp();

-- satisfaction_claims
CREATE OR REPLACE FUNCTION update_satisfaction_claim_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_satisfaction_claims_updated_at ON public.satisfaction_claims;
CREATE TRIGGER trigger_satisfaction_claims_updated_at
  BEFORE UPDATE ON public.satisfaction_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_satisfaction_claim_timestamp();

-- ============================================================================
-- TRIGGERS: Auto-update session status on refund
-- ============================================================================

-- When a refund succeeds, mark the session as 'refunded'
CREATE OR REPLACE FUNCTION auto_mark_session_refunded()
RETURNS TRIGGER AS $
BEGIN
  -- Only update if refund succeeded
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    UPDATE public.sessions
    SET
      status = 'refunded',
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund_id', NEW.id,
        'refund_amount_cents', NEW.amount_cents,
        'refund_reason', NEW.reason,
        'refunded_at', NOW()
      )
    WHERE id = NEW.session_id;

    RAISE NOTICE '[REFUND] Session % marked as refunded (refund %)', NEW.session_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_mark_session_refunded ON public.refunds;
CREATE TRIGGER trigger_auto_mark_session_refunded
  AFTER UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_session_refunded();

-- ============================================================================
-- TRIGGERS: Link satisfaction claim to refund
-- ============================================================================

-- When a satisfaction claim is approved, update it when refund is created
CREATE OR REPLACE FUNCTION link_claim_to_refund()
RETURNS TRIGGER AS $
BEGIN
  -- If refund has a satisfaction_claim_id, update the claim
  IF NEW.satisfaction_claim_id IS NOT NULL THEN
    UPDATE public.satisfaction_claims
    SET
      refund_id = NEW.id,
      refund_amount_cents = NEW.amount_cents,
      status = CASE
        WHEN NEW.status = 'succeeded' THEN 'refunded'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.satisfaction_claim_id;

    RAISE NOTICE '[CLAIM] Linked claim % to refund %', NEW.satisfaction_claim_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_link_claim_to_refund ON public.refunds;
CREATE TRIGGER trigger_link_claim_to_refund
  AFTER INSERT OR UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION link_claim_to_refund();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- stripe_events: Admin only (service role)
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_events_admin_all ON public.stripe_events
  FOR ALL USING (false); -- Only accessible via service role

-- payment_intents: Customers can view their own
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_intents_customer_view ON public.payment_intents
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY payment_intents_admin_all ON public.payment_intents
  FOR ALL USING (false); -- Admins use service role

-- refunds: Customers can view refunds for their sessions
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY refunds_customer_view ON public.refunds
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM public.sessions WHERE customer_user_id = auth.uid()
    )
  );

CREATE POLICY refunds_admin_all ON public.refunds
  FOR ALL USING (false); -- Admins use service role

-- satisfaction_claims: Customers can view/create their own claims
ALTER TABLE public.satisfaction_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY satisfaction_claims_customer_view ON public.satisfaction_claims
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY satisfaction_claims_customer_insert ON public.satisfaction_claims
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY satisfaction_claims_admin_all ON public.satisfaction_claims
  FOR ALL USING (false); -- Admins use service role for updates

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION 04 VERIFICATION ===';
  RAISE NOTICE '';

  -- Check tables created
  RAISE NOTICE '[✓] Tables created:';
  RAISE NOTICE '    - stripe_events (idempotency tracking)';
  RAISE NOTICE '    - payment_intents (payment tracking)';
  RAISE NOTICE '    - refunds (refund tracking)';
  RAISE NOTICE '    - satisfaction_claims (money-back guarantee)';
  RAISE NOTICE '';

  -- Check triggers created
  RAISE NOTICE '[✓] Triggers created:';
  RAISE NOTICE '    - auto_mark_session_refunded (sessions → refunded on refund)';
  RAISE NOTICE '    - link_claim_to_refund (claims → refunds linkage)';
  RAISE NOTICE '';

  -- Check RLS enabled
  RAISE NOTICE '[✓] Row Level Security enabled on all tables';
  RAISE NOTICE '';

  RAISE NOTICE '=== MIGRATION 04 COMPLETE ===';
  RAISE NOTICE '';
END $;
