-- Add is_workshop column to mechanics table
-- This distinguishes workshop mechanics (physical + virtual) from virtual-only mechanics

ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS is_workshop BOOLEAN DEFAULT FALSE;

-- Add optional workshop-specific fields
ALTER TABLE mechanics
ADD COLUMN IF NOT EXISTS shop_address TEXT,
ADD COLUMN IF NOT EXISTS shop_hours JSONB,
ADD COLUMN IF NOT EXISTS accepts_physical_bookings BOOLEAN DEFAULT FALSE;

-- Create index for efficient workshop filtering
CREATE INDEX IF NOT EXISTS idx_mechanics_is_workshop ON mechanics(is_workshop) WHERE is_workshop = TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN mechanics.is_workshop IS 'TRUE if mechanic has a physical workshop and can accept in-person repairs. FALSE for virtual-only mechanics. Both types can offer virtual sessions.';

COMMENT ON COLUMN mechanics.shop_address IS 'Physical address of the workshop (if is_workshop = TRUE)';

COMMENT ON COLUMN mechanics.shop_hours IS 'Workshop operating hours in JSON format: {"monday": {"open": "08:00", "close": "17:00"}, ...}';

COMMENT ON COLUMN mechanics.accepts_physical_bookings IS 'Whether the workshop currently accepts physical repair bookings';
