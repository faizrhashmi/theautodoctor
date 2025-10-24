-- Migration 09: CRM Tracking and Upsell Recommendations
-- Adds conversion funnel tracking and upsell recommendation system

-- Create CRM interactions tracking table
CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  -- Interaction types: 'intake', 'session_started', 'session_completed', 'summary_viewed', 'upsell_shown', 'upsell_clicked', 'follow_up_created'
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for CRM interactions
CREATE INDEX IF NOT EXISTS idx_crm_interactions_customer_id ON public.crm_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_session_id ON public.crm_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON public.crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at ON public.crm_interactions(created_at DESC);

-- Create upsell recommendations table
CREATE TABLE IF NOT EXISTS public.upsell_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  -- Recommendation types: 'follow_up', 'maintenance_plan', 'premium_upgrade', 'diagnostic_package'
  service_title text NOT NULL,
  service_description text,
  price_cents int CHECK (price_cents >= 0),
  shown_at timestamptz DEFAULT now(),
  clicked_at timestamptz,
  purchased_at timestamptz,
  dismissed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for upsell recommendations
CREATE INDEX IF NOT EXISTS idx_upsell_recommendations_customer_id ON public.upsell_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_upsell_recommendations_session_id ON public.upsell_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_upsell_recommendations_type ON public.upsell_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_upsell_recommendations_shown_at ON public.upsell_recommendations(shown_at DESC);

-- RLS policies for crm_interactions
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

-- Customers can only read their own interactions
CREATE POLICY "Customers can read own CRM interactions"
  ON public.crm_interactions
  FOR SELECT
  USING (customer_id = auth.uid());

-- Service role and admin can read all interactions
CREATE POLICY "Service role can read all CRM interactions"
  ON public.crm_interactions
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- System can insert interactions (will be done via service role)
CREATE POLICY "Service role can insert CRM interactions"
  ON public.crm_interactions
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses this anyway

-- RLS policies for upsell_recommendations
ALTER TABLE public.upsell_recommendations ENABLE ROW LEVEL SECURITY;

-- Customers can read their own upsells
CREATE POLICY "Customers can read own upsells"
  ON public.upsell_recommendations
  FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can update their own upsell interactions (click, dismiss)
CREATE POLICY "Customers can update own upsells"
  ON public.upsell_recommendations
  FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Service role can manage all upsells
CREATE POLICY "Service role can manage upsells"
  ON public.upsell_recommendations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to track interaction
CREATE OR REPLACE FUNCTION track_crm_interaction(
  p_customer_id uuid,
  p_interaction_type text,
  p_session_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $
DECLARE
  interaction_id uuid;
BEGIN
  INSERT INTO public.crm_interactions (customer_id, interaction_type, session_id, metadata)
  VALUES (p_customer_id, p_interaction_type, p_session_id, p_metadata)
  RETURNING id INTO interaction_id;

  RETURN interaction_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create upsell recommendation
CREATE OR REPLACE FUNCTION create_upsell_recommendation(
  p_customer_id uuid,
  p_session_id uuid,
  p_recommendation_type text,
  p_service_title text,
  p_service_description text DEFAULT NULL,
  p_price_cents int DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $
DECLARE
  recommendation_id uuid;
BEGIN
  INSERT INTO public.upsell_recommendations (
    customer_id,
    session_id,
    recommendation_type,
    service_title,
    service_description,
    price_cents,
    metadata
  )
  VALUES (
    p_customer_id,
    p_session_id,
    p_recommendation_type,
    p_service_title,
    p_service_description,
    p_price_cents,
    p_metadata
  )
  RETURNING id INTO recommendation_id;

  RETURN recommendation_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.crm_interactions IS 'Tracks customer journey and conversion funnel events';
COMMENT ON TABLE public.upsell_recommendations IS 'Personalized service recommendations for customers';
COMMENT ON FUNCTION track_crm_interaction IS 'Helper function to track CRM interaction events';
COMMENT ON FUNCTION create_upsell_recommendation IS 'Helper function to create upsell recommendations for customers';
