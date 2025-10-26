-- Add workshop association to mechanics table
-- This enables mechanics to be linked to workshops for the B2B2C model

-- Add workshop_id column to mechanics table
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add account_type to clearly distinguish mechanic types
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'independent'
  CHECK (account_type IN ('independent', 'workshop'));

-- Add invited_by to track who invited the mechanic (for workshop invites)
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add invite_accepted_at timestamp
ALTER TABLE public.mechanics
ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMP WITH TIME ZONE;

-- Create index for workshop lookups (important for routing)
CREATE INDEX IF NOT EXISTS mechanics_workshop_id_idx ON public.mechanics(workshop_id);
CREATE INDEX IF NOT EXISTS mechanics_account_type_idx ON public.mechanics(account_type);
CREATE INDEX IF NOT EXISTS mechanics_invited_by_idx ON public.mechanics(invited_by);

-- Add composite index for workshop + availability queries (performance)
CREATE INDEX IF NOT EXISTS mechanics_workshop_available_idx
  ON public.mechanics(workshop_id, is_available)
  WHERE workshop_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.mechanics.workshop_id IS 'Workshop this mechanic belongs to (NULL for independent mechanics)';
COMMENT ON COLUMN public.mechanics.account_type IS 'Type of mechanic account: independent or workshop-affiliated';
COMMENT ON COLUMN public.mechanics.invited_by IS 'Organization ID that invited this mechanic';
COMMENT ON COLUMN public.mechanics.invite_accepted_at IS 'When the mechanic accepted workshop invitation';

-- Update existing mechanics to be 'independent' type
UPDATE public.mechanics
SET account_type = 'independent'
WHERE account_type IS NULL;

-- Create view for workshop mechanics (helpful for queries)
CREATE OR REPLACE VIEW public.workshop_mechanics AS
SELECT
  m.*,
  o.name as workshop_name,
  o.email as workshop_email,
  o.status as workshop_status
FROM public.mechanics m
INNER JOIN public.organizations o ON m.workshop_id = o.id
WHERE m.workshop_id IS NOT NULL
  AND o.organization_type = 'workshop';

-- Add comment for view
COMMENT ON VIEW public.workshop_mechanics IS 'View of all mechanics belonging to workshops with workshop details';

-- Create function to auto-link mechanic to workshop on invite acceptance
CREATE OR REPLACE FUNCTION link_mechanic_to_workshop()
RETURNS TRIGGER AS $$
BEGIN
  -- If invite_accepted_at is set and workshop_id is NULL, link the mechanic
  IF NEW.invite_accepted_at IS NOT NULL
     AND NEW.invited_by IS NOT NULL
     AND OLD.workshop_id IS NULL THEN

    NEW.workshop_id := NEW.invited_by;
    NEW.account_type := 'workshop';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically link mechanics
DROP TRIGGER IF EXISTS auto_link_mechanic_to_workshop ON public.mechanics;
CREATE TRIGGER auto_link_mechanic_to_workshop
  BEFORE UPDATE ON public.mechanics
  FOR EACH ROW
  EXECUTE FUNCTION link_mechanic_to_workshop();

-- Add RLS policy for workshop admins to view their mechanics
CREATE POLICY "Workshop admins can view their mechanics"
  ON public.mechanics
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT id FROM public.organizations
      WHERE id = workshop_id
    )
  );

-- Create helper function to get available mechanics for a workshop
CREATE OR REPLACE FUNCTION get_available_workshop_mechanics(workshop_uuid UUID)
RETURNS TABLE (
  mechanic_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  is_available BOOLEAN,
  rating NUMERIC,
  completed_sessions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.email,
    m.full_name,
    m.phone,
    m.is_available,
    m.rating,
    m.completed_sessions
  FROM public.mechanics m
  WHERE m.workshop_id = workshop_uuid
    AND m.application_status = 'approved'
    AND m.is_available = TRUE
  ORDER BY m.rating DESC NULLS LAST, m.completed_sessions DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_workshop_mechanics IS 'Returns all available mechanics for a specific workshop';
