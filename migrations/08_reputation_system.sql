-- Migration 08: Reputation System
-- Adds mechanic profiles with ratings, specialties, reviews, and SLAs

-- Extend mechanics table with profile fields
ALTER TABLE public.mechanics
  ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avg_rating decimal(3,2) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  ADD COLUMN IF NOT EXISTS total_reviews int DEFAULT 0 CHECK (total_reviews >= 0),
  ADD COLUMN IF NOT EXISTS response_sla_minutes int DEFAULT 5 CHECK (response_sla_minutes > 0),
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS years_experience int CHECK (years_experience IS NULL OR years_experience >= 0),
  ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Create mechanic_reviews table
CREATE TABLE IF NOT EXISTS public.mechanic_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  mechanic_id uuid REFERENCES public.mechanics(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  helpful_count int DEFAULT 0 CHECK (helpful_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id) -- One review per session
);

-- Create index for mechanic reviews lookup
CREATE INDEX IF NOT EXISTS idx_mechanic_reviews_mechanic_id ON public.mechanic_reviews(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_reviews_customer_id ON public.mechanic_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_reviews_created_at ON public.mechanic_reviews(created_at DESC);

-- RLS policies for mechanic_reviews
ALTER TABLE public.mechanic_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (for public mechanic profiles)
CREATE POLICY "Anyone can read reviews"
  ON public.mechanic_reviews
  FOR SELECT
  USING (true);

-- Only the customer who had the session can create a review
CREATE POLICY "Customers can create reviews for their sessions"
  ON public.mechanic_reviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_id
      AND sessions.customer_user_id = auth.uid()
      AND sessions.status = 'completed'
    )
  );

-- Only the review author can update their review
CREATE POLICY "Customers can update their own reviews"
  ON public.mechanic_reviews
  FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Only the review author can delete their review (optional)
CREATE POLICY "Customers can delete their own reviews"
  ON public.mechanic_reviews
  FOR DELETE
  USING (customer_id = auth.uid());

-- Function to update mechanic rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_mechanic_rating()
RETURNS TRIGGER AS $
DECLARE
  new_avg decimal(3,2);
  review_count int;
BEGIN
  -- Calculate new average and count for the mechanic
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO new_avg, review_count
  FROM public.mechanic_reviews
  WHERE mechanic_id = COALESCE(NEW.mechanic_id, OLD.mechanic_id);

  -- Update mechanic record
  UPDATE public.mechanics
  SET
    avg_rating = ROUND(new_avg, 2),
    total_reviews = review_count,
    updated_at = now()
  WHERE id = COALESCE(NEW.mechanic_id, OLD.mechanic_id);

  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update mechanic rating
DROP TRIGGER IF EXISTS update_mechanic_rating_trigger ON public.mechanic_reviews;
CREATE TRIGGER update_mechanic_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.mechanic_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_mechanic_rating();

-- Add comment for documentation
COMMENT ON TABLE public.mechanic_reviews IS 'Customer reviews and ratings for mechanics after completed sessions';
COMMENT ON COLUMN public.mechanics.specialties IS 'Array of mechanic specialties (e.g., {engine, transmission, electrical})';
COMMENT ON COLUMN public.mechanics.avg_rating IS 'Average rating from customer reviews (0-5 scale)';
COMMENT ON COLUMN public.mechanics.total_reviews IS 'Total number of customer reviews received';
COMMENT ON COLUMN public.mechanics.response_sla_minutes IS 'Target response time in minutes for accepting requests';
COMMENT ON COLUMN public.mechanics.bio IS 'Mechanic bio/description for public profile';
COMMENT ON COLUMN public.mechanics.years_experience IS 'Years of automotive experience';
