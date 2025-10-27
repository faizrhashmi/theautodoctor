-- Add about_me column to mechanics table for profile descriptions
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS about_me TEXT;

-- Add comment
COMMENT ON COLUMN mechanics.about_me IS 'Mechanic profile description shown to customers - no contact information allowed';
