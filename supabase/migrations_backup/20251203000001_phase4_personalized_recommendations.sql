-- =====================================================
-- PHASE 4: PERSONALIZED RECOMMENDATIONS SYSTEM
-- =====================================================
-- Created: 2025-12-03
-- Purpose: Add personalized recommendations and customer preferences
-- Features:
--   - Customer preferences (favorite mechanics, notification settings)
--   - Vehicle maintenance recommendations based on history
--   - Mechanic recommendations based on ratings and history
--   - Service recommendations based on vehicle data
--   - Recommendation tracking and feedback

-- =====================================================
-- 1. CUSTOMER PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Notification Preferences
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  sms_notifications BOOLEAN NOT NULL DEFAULT false,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,

  -- Session Preferences
  preferred_session_type TEXT CHECK (preferred_session_type IN ('chat', 'video', 'diagnostic')),
  auto_accept_specialist_match BOOLEAN NOT NULL DEFAULT false,

  -- Favorite Mechanics (array of mechanic user IDs)
  favorite_mechanics UUID[] DEFAULT '{}',
  blocked_mechanics UUID[] DEFAULT '{}',

  -- Communication Preferences
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'sms', 'phone', 'app')) DEFAULT 'email',
  preferred_contact_time TEXT, -- e.g., "9am-5pm EST"

  -- Maintenance Reminders
  maintenance_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_frequency_days INTEGER DEFAULT 30,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_customer_preferences UNIQUE (customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_preferences_customer ON public.customer_preferences(customer_id);

-- RLS Policies
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

-- Customers can only view/edit their own preferences
CREATE POLICY customer_preferences_select ON public.customer_preferences
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY customer_preferences_insert ON public.customer_preferences
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY customer_preferences_update ON public.customer_preferences
  FOR UPDATE USING (auth.uid() = customer_id);

-- Admins can view all preferences
CREATE POLICY admin_customer_preferences_select ON public.customer_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_customer_preferences_updated_at
  BEFORE UPDATE ON public.customer_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. VEHICLE MAINTENANCE RECOMMENDATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vehicle_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Recommendation Details
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'scheduled_maintenance',
    'preventive_service',
    'recall_check',
    'seasonal_prep',
    'diagnostic_scan',
    'fluid_replacement',
    'tire_rotation',
    'brake_inspection',
    'battery_check',
    'other'
  )),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',

  -- Recommendation Basis
  based_on_mileage BOOLEAN NOT NULL DEFAULT false,
  based_on_age BOOLEAN NOT NULL DEFAULT false,
  based_on_history BOOLEAN NOT NULL DEFAULT false,
  based_on_season BOOLEAN NOT NULL DEFAULT false,

  -- Scheduling
  recommended_date DATE,
  due_by_date DATE,
  due_by_mileage INTEGER,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('active', 'scheduled', 'completed', 'dismissed', 'expired')) DEFAULT 'active',

  -- Customer Actions
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  scheduled_session_id UUID REFERENCES public.sessions(id),
  completed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_recommendations_vehicle ON public.vehicle_recommendations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_recommendations_customer ON public.vehicle_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_recommendations_status ON public.vehicle_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_recommendations_priority ON public.vehicle_recommendations(priority);

-- RLS Policies
ALTER TABLE public.vehicle_recommendations ENABLE ROW LEVEL SECURITY;

-- Customers can view/manage their own recommendations
CREATE POLICY vehicle_recommendations_select ON public.vehicle_recommendations
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY vehicle_recommendations_update ON public.vehicle_recommendations
  FOR UPDATE USING (auth.uid() = customer_id);

-- Admins can view all recommendations
CREATE POLICY admin_vehicle_recommendations_all ON public.vehicle_recommendations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_vehicle_recommendations_updated_at
  BEFORE UPDATE ON public.vehicle_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. MECHANIC RECOMMENDATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mechanic_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Recommendation Score (0-100)
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),

  -- Scoring Factors
  past_sessions_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),
  specialty_match BOOLEAN DEFAULT false,
  availability_match BOOLEAN DEFAULT false,
  location_proximity BOOLEAN DEFAULT false,

  -- Recommendation Reasons (array of strings)
  reasons TEXT[] DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  CONSTRAINT unique_mechanic_recommendation UNIQUE (customer_id, mechanic_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mechanic_recommendations_customer ON public.mechanic_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_recommendations_score ON public.mechanic_recommendations(score DESC);
CREATE INDEX IF NOT EXISTS idx_mechanic_recommendations_expires ON public.mechanic_recommendations(expires_at);

-- RLS Policies
ALTER TABLE public.mechanic_recommendations ENABLE ROW LEVEL SECURITY;

-- Customers can view their own recommendations
CREATE POLICY mechanic_recommendations_select ON public.mechanic_recommendations
  FOR SELECT USING (auth.uid() = customer_id);

-- Admins can view all recommendations
CREATE POLICY admin_mechanic_recommendations_select ON public.mechanic_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_mechanic_recommendations_updated_at
  BEFORE UPDATE ON public.mechanic_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. RECOMMENDATION FEEDBACK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Reference to recommendation (polymorphic)
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('vehicle', 'mechanic', 'service')),
  recommendation_id UUID NOT NULL,

  -- Feedback
  action TEXT NOT NULL CHECK (action IN ('accepted', 'dismissed', 'scheduled', 'helpful', 'not_helpful')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_customer ON public.recommendation_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_type ON public.recommendation_feedback(recommendation_type, recommendation_id);

-- RLS Policies
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- Customers can insert their own feedback
CREATE POLICY recommendation_feedback_insert ON public.recommendation_feedback
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Customers can view their own feedback
CREATE POLICY recommendation_feedback_select ON public.recommendation_feedback
  FOR SELECT USING (auth.uid() = customer_id);

-- Admins can view all feedback
CREATE POLICY admin_recommendation_feedback_select ON public.recommendation_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get customer's favorite mechanics with stats
CREATE OR REPLACE FUNCTION get_customer_favorite_mechanics(p_customer_id UUID)
RETURNS TABLE (
  mechanic_id UUID,
  mechanic_name TEXT,
  mechanic_email TEXT,
  total_sessions INTEGER,
  avg_rating DECIMAL,
  last_session_date TIMESTAMPTZ,
  specialties TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS mechanic_id,
    p.full_name AS mechanic_name,
    p.email AS mechanic_email,
    COUNT(s.id)::INTEGER AS total_sessions,
    AVG(sr.rating)::DECIMAL(3,2) AS avg_rating,
    MAX(s.created_at) AS last_session_date,
    COALESCE(p.specialties, '{}'::TEXT[]) AS specialties
  FROM public.customer_preferences cp
  CROSS JOIN UNNEST(cp.favorite_mechanics) AS fav_mech_id
  JOIN public.profiles p ON p.id = fav_mech_id
  LEFT JOIN public.sessions s ON s.mechanic_user_id = p.id AND s.customer_user_id = p_customer_id
  LEFT JOIN public.session_reviews sr ON sr.session_id = s.id
  WHERE cp.customer_id = p_customer_id
  GROUP BY p.id, p.full_name, p.email, p.specialties;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate vehicle maintenance recommendations
CREATE OR REPLACE FUNCTION generate_vehicle_recommendations(p_vehicle_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_vehicle RECORD;
  v_customer_id UUID;
  v_current_mileage INTEGER;
  v_vehicle_age INTEGER;
  v_recommendations_created INTEGER := 0;
BEGIN
  -- Get vehicle details
  SELECT v.*, v.customer_id INTO v_vehicle
  FROM public.vehicles v
  WHERE v.id = p_vehicle_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_customer_id := v_vehicle.customer_id;
  v_current_mileage := COALESCE(v_vehicle.odometer, 0);
  v_vehicle_age := EXTRACT(YEAR FROM NOW()) - COALESCE(v_vehicle.year, EXTRACT(YEAR FROM NOW()));

  -- Oil Change Recommendation (every 5000 miles or 6 months)
  IF v_current_mileage > 0 AND v_current_mileage % 5000 <= 1000 THEN
    INSERT INTO public.vehicle_recommendations (
      vehicle_id, customer_id, recommendation_type, title, description,
      priority, based_on_mileage, due_by_mileage
    )
    VALUES (
      p_vehicle_id, v_customer_id, 'scheduled_maintenance',
      'Oil Change Due Soon',
      'Your vehicle is approaching the recommended oil change interval. Regular oil changes help maintain engine health and performance.',
      'medium', true, v_current_mileage + 1000
    )
    ON CONFLICT DO NOTHING;

    v_recommendations_created := v_recommendations_created + 1;
  END IF;

  -- Tire Rotation (every 6 months or 7500 miles)
  IF v_current_mileage > 0 AND v_current_mileage % 7500 <= 1000 THEN
    INSERT INTO public.vehicle_recommendations (
      vehicle_id, customer_id, recommendation_type, title, description,
      priority, based_on_mileage, due_by_mileage
    )
    VALUES (
      p_vehicle_id, v_customer_id, 'scheduled_maintenance',
      'Tire Rotation Recommended',
      'Regular tire rotations extend tire life and improve vehicle handling. Consider scheduling a tire rotation service.',
      'low', true, v_current_mileage + 1000
    )
    ON CONFLICT DO NOTHING;

    v_recommendations_created := v_recommendations_created + 1;
  END IF;

  -- Battery Check (vehicles older than 3 years)
  IF v_vehicle_age >= 3 THEN
    INSERT INTO public.vehicle_recommendations (
      vehicle_id, customer_id, recommendation_type, title, description,
      priority, based_on_age
    )
    VALUES (
      p_vehicle_id, v_customer_id, 'preventive_service',
      'Battery Health Check',
      'Your vehicle battery may be approaching the end of its typical lifespan. Consider having it tested to avoid unexpected failures.',
      'medium', true
    )
    ON CONFLICT DO NOTHING;

    v_recommendations_created := v_recommendations_created + 1;
  END IF;

  RETURN v_recommendations_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate mechanic recommendation score
CREATE OR REPLACE FUNCTION calculate_mechanic_recommendation_score(
  p_customer_id UUID,
  p_mechanic_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_past_sessions INTEGER;
  v_avg_rating DECIMAL;
  v_specialty_match BOOLEAN;
BEGIN
  -- Count past sessions
  SELECT COUNT(*)::INTEGER INTO v_past_sessions
  FROM public.sessions
  WHERE customer_user_id = p_customer_id
    AND mechanic_user_id = p_mechanic_id
    AND status = 'completed';

  -- Get average rating
  SELECT AVG(sr.rating)::DECIMAL(3,2) INTO v_avg_rating
  FROM public.sessions s
  JOIN public.session_reviews sr ON sr.session_id = s.id
  WHERE s.customer_user_id = p_customer_id
    AND s.mechanic_user_id = p_mechanic_id;

  -- Base score on past sessions (0-40 points)
  v_score := v_score + LEAST(v_past_sessions * 10, 40);

  -- Rating bonus (0-30 points)
  IF v_avg_rating IS NOT NULL THEN
    v_score := v_score + (v_avg_rating * 6)::INTEGER;
  END IF;

  -- Overall mechanic rating bonus (0-20 points)
  SELECT (AVG(sr.rating) * 4)::INTEGER INTO v_score
  FROM public.session_reviews sr
  JOIN public.sessions s ON s.id = sr.session_id
  WHERE s.mechanic_user_id = p_mechanic_id;

  -- Availability bonus (0-10 points)
  -- Check if mechanic is currently available
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_mechanic_id
      AND role = 'mechanic'
      AND status = 'available'
  ) INTO v_specialty_match;

  IF v_specialty_match THEN
    v_score := v_score + 10;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. SEED DEFAULT PREFERENCES FOR EXISTING CUSTOMERS
-- =====================================================

-- Create default preferences for existing customers who don't have them
INSERT INTO public.customer_preferences (customer_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.customer_preferences cp ON cp.customer_id = p.id
WHERE p.role = 'customer'
  AND cp.id IS NULL
ON CONFLICT (customer_id) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
